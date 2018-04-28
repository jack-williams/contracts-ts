import { BranchKind } from "../contractTypes";

import * as Context from "./contextTracking"

const enum Direction {
    Left,
    Right
}

const enum NodeKind {
    Root,
    Branch
}

export type Label = symbol & {__label: any};

type BlamePath = Context.RouteInfo[];
type BlameState = Context.RouteMap<boolean>;
type ContextTracker = Context.RouteMap<number>;

type Positive = true & {__charge: any};
type Negative = false & {__charge: any};
type Charge = Positive | Negative;

export const positive: Positive = true as Positive;
export const negative: Negative = false as Negative;

type Negate<C extends Charge> = C extends Positive ? Negative : Positive;

interface BlameNodeInfo {
    kind: NodeKind;
    charge: Charge;
    negate: this;
    blameState: BlameState,
    contextTracker: ContextTracker;
}

interface UnlinkedBlameNodeInfo {
    kind: NodeKind;
    charge: Charge;
    negate: this | undefined;
    blameState: BlameState,
    contextTracker: ContextTracker;
}

interface UnlinkedRootNodeInfo extends UnlinkedBlameNodeInfo {
    kind: NodeKind.Root;
    label: Label;    
}

interface RootNodeInfo extends BlameNodeInfo {
    kind: NodeKind.Root;
    label: Label;
}

interface UnlinkedBranchNodeInfo extends UnlinkedBlameNodeInfo {
    kind: NodeKind.Branch;
    direction: Direction;
    flip: UnlinkedBranchNodeInfo | undefined;
    type: BranchKind;
}

interface BranchNodeInfo extends BlameNodeInfo {
    kind: NodeKind.Branch;
    direction: Direction;
    flip: BranchNodeInfo;
    type: BranchKind;
}

export interface RootNode {
    info: RootNodeInfo;
    path: BlamePath;
}

export interface BranchNode {
    parent: BlameNode;
    info: BranchNodeInfo;
    path: BlamePath;
}

export type BlameNode = RootNode | BranchNode;


//// Constructor Functions 

export function label(id: string): Label {
    return Symbol(id) as Label; 
}

function initRootNodeInfo(label: Label, charge: Charge): UnlinkedRootNodeInfo {
    return {
        kind: NodeKind.Root,
        label,
        negate: undefined,
        charge,
        blameState: Context.initRouteMap<boolean>(),
        contextTracker: Context.initRouteMap<number>()
    };
}

function makeRootNodeInfo(label: Label): RootNodeInfo {
    const pos = initRootNodeInfo(label,positive);
    const neg = initRootNodeInfo(label,negative);
    pos.negate = neg;
    neg.negate = pos;
    // Linking complete
    return pos as RootNodeInfo;
}

function initBranchNodeInfo(type: BranchKind, charge: Charge, direction: Direction): UnlinkedBranchNodeInfo {
    return {
        kind: NodeKind.Branch,
        negate: undefined,
        flip: undefined,
        type,
        direction,
        charge,
        blameState: Context.initRouteMap<boolean>(),
        contextTracker: Context.initRouteMap<number>()
    };
}

function makeBranchNodeInfo(type: BranchKind): [BranchNodeInfo, BranchNodeInfo] {
    const leftPos = initBranchNodeInfo(type, positive, Direction.Left);
    const rightPos = initBranchNodeInfo(type, positive, Direction.Right);
    const leftNeg = initBranchNodeInfo(type, negative, Direction.Left);
    const rightNeg = initBranchNodeInfo(type, negative, Direction.Right);
    leftPos.flip = rightPos;
    rightPos.flip = leftPos;
    leftNeg.flip = rightNeg;
    rightNeg.flip = leftNeg;
    leftPos.negate = leftNeg;
    leftNeg.negate = leftPos;
    rightPos.negate = rightNeg;
    rightNeg.negate = rightPos;
    // Linking complete
    return [leftPos as BranchNodeInfo, rightPos as BranchNodeInfo];
}

function makeRootNodeFull(info: RootNodeInfo, path: BlamePath): BlameNode {
    return {info, path};
}

export function makeRootNode(label: Label): BlameNode {
    return makeRootNodeFull(makeRootNodeInfo(label), []);
}

function makeBranchNode(parent: BlameNode, info: BranchNodeInfo, path: BlamePath): BlameNode {
    return { parent, info, path };
}

export function makeBranchNodes(type: BranchKind, parent: BlameNode): [BlameNode, BlameNode] {
    const [left,right] = makeBranchNodeInfo(type);
    return [makeBranchNode(parent, left, []), makeBranchNode(parent, right, [])];
}

export interface ApplicationNodes {
    dom: BlameNode[];
    cod: BlameNode;
}

export function makeAppNodes(p: BlameNode, numberOfArgs: number): ApplicationNodes {
    // Add an extra arg on the end for the case where too
    // many arguments ar supplied.
    const i = delta(p);
    const dom: BlameNode[] = [];
    const negativeP = negate(p);
    for(let argNum = 0; argNum < numberOfArgs + 1; argNum++) {
        dom.push(extend(negativeP, Context.makeDomainRoute(argNum, i)));
    }
    const cod = extend(p, Context.makeCodomainRoute(i));
    return { dom, cod };
}

//// Predicates

export function isRoot(p: BlameNode): p is RootNode {
    return !isBranch(p);
}

export function isBranch(p: BlameNode): p is BranchNode {
    return "parent" in p;
}

export function isPositive(p: BlameNode): boolean {
    return p.info.charge;
}

//// Operations

export function negate(node: BlameNode): BlameNode {
    if(isRoot(node)) {
        return makeRootNodeFull(node.info.negate, node.path);
    }
    return makeBranchNode(negate(node.parent), node.info.negate, node.path);
}

function incNumOrUndefined(n: number | undefined): number {
    return n === undefined ? 1 : n + 1;
}

function delta(node: BlameNode): number  {
    const i = Context.modifyLeaf(node.info.contextTracker, incNumOrUndefined, node.path);
    return i === undefined ? 0 : i;
}

function extend(node: BlameNode, context: Context.RouteInfo): BlameNode {
    if(isRoot(node)) {
        return makeRootNodeFull(node.info, node.path.concat([context]));
    }
    return makeBranchNode(node.parent, node.info, node.path.concat([context]));
}

export function parent(branchNode: BranchNode): BlameNode {
    if(isBranch(branchNode.parent) && branchNode.parent.path.length === 0) {
        return makeBranchNode(branchNode.parent.parent, branchNode.parent.info, branchNode.path);
    }
    return branchNode.parent;
}

function foldNode<A>(node: BlameNode, f: (a: A, node: BranchNode) => A, init: A): A  {
    return isBranch(node) ? f(foldNode(node.parent, f, init), node) : init;
}

function length(node: BlameNode): number {
    return foldNode(node, (n,_) => 1 + n, 1);
}

function shorten(n: number, node: BlameNode): BlameNode {
    if(n <= 0) return node;
    if(isBranch(node)) return shorten(n - 1, node.parent);
    return node;
}

function hasCommonBranchPoint(n1: BlameNode, n2: BlameNode): boolean {
    if(isBranch(n1) && isBranch(n2)) {
        if(n1.info.flip === n2.info || n1.info.flip === n2.info.negate) {
            return true;
        }
        return hasCommonBranchPoint(n1.parent, n2.parent);
    }
    return false;
}

function obliviousNodes(n1: BlameNode, n2: BlameNode): boolean {
    const l1 = length(n1);
    const l2 = length(n2);
    if(l2 > l1) {
        return hasCommonBranchPoint(n1, shorten(l2 - l1, n2));
    }
    if(l1 > l2) {
        return hasCommonBranchPoint(shorten(l1 - l2, n1),n2);
    }
    return hasCommonBranchPoint(n1,n2);
}

export function areCommutable(left: BlameNode, right: BlameNode): boolean {
    return obliviousNodes(left, right);
}
