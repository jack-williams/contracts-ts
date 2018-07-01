/*

  Core data-structures and functions for tracking blame.

*/

import { BranchKind, ContractType } from "../contractTypes";

import * as Context from "./contextTracking"

/**
 * Branch direction for an intersection/union/and sub-contract.
 */
export const enum Direction {
    Left,
    Right
}

const enum NodeKind {
    Root,
    Branch
}

/**
 * Pseudo-nominal type for a blame label.
 */
export type Label = symbol & { __label: any };

type BlamePath = Context.RouteInfo[];
type BlameState = Context.RouteMap<boolean>;
type ContextTracker = Context.RouteMap<number>;

/*
 * Pseudo-nominal types for blame charge.
 */
type Positive = true & { __charge: any };
type Negative = false & { __charge: any };
type Charge = Positive | Negative;

/** Positive Blame - The subject is at fault */
export const positive: Positive = true as Positive;

/** Negative Blame - The context is at fault */
export const negative: Negative = false as Negative;

/**
 * Data common to all blame nodes.
 */
interface BlameNodeInfo {
    charge: Charge;
    negate: this;
    blameState: BlameState,
    contextTracker: ContextTracker;
}

interface UnlinkedBlameNodeInfo {
    charge: Charge;
    negate: this | undefined;
    blameState: BlameState,
    contextTracker: ContextTracker;
}

interface UnlinkedRootNodeInfo extends UnlinkedBlameNodeInfo {
    label: Label;
    type: ContractType;
}

/**
 * Data specific to root (top-level) blame nodes.
 */
interface RootNodeInfo extends BlameNodeInfo {
    label: Label;
    type: ContractType
}

interface UnlinkedBranchNodeInfo extends UnlinkedBlameNodeInfo {
    direction: Direction;
    flip: UnlinkedBranchNodeInfo | undefined;
    type: BranchKind;
}

/**
 * Data specific to branch nodes.
 */
interface BranchNodeInfo extends BlameNodeInfo {
    direction: Direction;
    flip: BranchNodeInfo;
    type: BranchKind;
}

/**
 * Type for a root node.
 */
export interface RootNode {
    kind: NodeKind.Root;
    info: RootNodeInfo;
    path: BlamePath;
}

/**
 * Type for a branch node (attached to some sub-contract of a branch
 * type).
 */
export interface BranchNode {
    kind: NodeKind.Branch;
    parent: BlameNode;
    info: BranchNodeInfo;
    path: BlamePath;
}

export type BlameNode = RootNode | BranchNode;

//// Constructor Functions 

let gensym: number = 0;
export function label(id?: string): Label {
    if (id === undefined) {
        return Symbol(gensym++) as Label;
    }
    return Symbol(id) as Label;
}

function initRootNodeInfo(label: Label, charge: Charge, type: ContractType): UnlinkedRootNodeInfo {
    const info: UnlinkedRootNodeInfo = {
        label,
        type,
        negate: undefined,
        charge,
        blameState: Context.initRouteMap<boolean>(),
        contextTracker: Context.initRouteMap<number>(),
    };
    return info;
}

function makeRootNodeInfo(label: Label, type: ContractType): RootNodeInfo {
    const pos = initRootNodeInfo(label, positive, type);
    const neg = initRootNodeInfo(label, negative, type);
    pos.negate = neg;
    neg.negate = pos;
    // Linking complete
    return pos as RootNodeInfo;
}

function initBranchNodeInfo(type: BranchKind, charge: Charge, direction: Direction): UnlinkedBranchNodeInfo {
    const info: UnlinkedBranchNodeInfo = {
        negate: undefined,
        flip: undefined,
        type,
        direction,
        charge,
        blameState: Context.initRouteMap<boolean>(),
        contextTracker: Context.initRouteMap<number>(),
    };
    return info;
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
    return { kind: NodeKind.Root, info, path };
}

export function makeRootNode(label: Label, type: ContractType): BlameNode {
    return makeRootNodeFull(makeRootNodeInfo(label, type), []);
}

function makeBranchNode(parent: BlameNode, info: BranchNodeInfo, path: BlamePath): BlameNode {
    return { kind: NodeKind.Branch, parent, info, path };
}

export function makeBranchNodes(type: BranchKind, parent: BlameNode): [BlameNode, BlameNode] {
    const [left, right] = makeBranchNodeInfo(type);
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
    for (let argNum = 0; argNum < numberOfArgs + 1; argNum++) {
        dom.push(extend(negativeP, Context.makeDomainRoute(argNum, i)));
    }
    const cod = extend(p, Context.makeCodomainRoute(i));
    return { dom, cod };
}

//// Predicates

export function isRoot(p: BlameNode): p is RootNode {
    return p.kind === NodeKind.Root;
}

export function isBranch(p: BlameNode): p is BranchNode {
    return p.kind === NodeKind.Branch;
}

export function isPositive(p: BlameNode): boolean {
    return p.info.charge;
}

//// Operations

/**
 * Negate a blame node indicating that the responsibily has switch
 * from the subject to the context. Corresponding to operation -p in
 * the paper.
 * @param node
 */
export function negate(node: BlameNode): BlameNode {
    if (isRoot(node)) {
        return makeRootNodeFull(node.info.negate, node.path);
    }
    return makeBranchNode(negate(node.parent), node.info.negate, node.path);
}

function incNumOrUndefined(n: number | undefined): number {
    return n === undefined ? 1 : n + 1;
}

/**
 * Return the application index for a blame node and increment the
 * counter in the state. Corresponds to \delta in the paper, the the
 * context-tracker is implicit in the blame node here.
 * @param node
 */
function delta(node: BlameNode): number {
    const i = Context.modifyLeaf(node.info.contextTracker, incNumOrUndefined, node.path);
    return i === undefined ? 0 : i;
}

/**
 * Extend a blame node with context information. Occurs when a node is
 * used to wrap a function sub-contract. Corresponds to operation \gg
 * (>>) in the paper.
 * @param node
 * @param context
 */
function extend(node: BlameNode, context: Context.RouteInfo): BlameNode {
    if (isRoot(node)) {
        return makeRootNodeFull(node.info, node.path.concat([context]));
    }
    return makeBranchNode(node.parent, node.info, node.path.concat([context]));
}

/**
 * Return the parent of a branch node, hoisting context information in
 * the case of nested branch types that were conceptually eliminated
 * in the same context. Corresponds to the parent operation defined in
 * the paper.
 * @param branchNode
 */
export function parent(branchNode: BranchNode): BlameNode {
    if (isBranch(branchNode.parent) && branchNode.parent.path.length === 0) {
        return makeBranchNode(branchNode.parent.parent, branchNode.parent.info, branchNode.path);
    }
    return branchNode.parent;
}

/**
 * Return the root of a blame node.
 * @param node
 */
export function root(node: BlameNode): RootNode {
    let result: BlameNode = node;
    while (!isRoot(result)) {
        result = result.parent;
    }
    return result;
}
