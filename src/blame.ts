import * as C from "./contractTypes";

const enum RouteKind {
    Domain,
    Codomain
}

const enum Direction {
    Left,
    Right
}

const enum NodeKind {
    Root,
    Branch
}

export type Label = string & {__label: any};

export function makeLabel(id: string): Label  {
    return id as Label;
}

interface DomainRoute {
    kind: RouteKind.Domain;
    id: number;
    arg: number;
}

interface CodomainRoute {
    kind: RouteKind.Codomain;
    id: number;
}

type RouteInfo = DomainRoute | CodomainRoute;
type BlamePath = RouteInfo[];

type IntegerMap<A> = {[i: number]: A | undefined};

interface EmptyRouteMap<A> {
    value: A | undefined;
    [RouteKind.Domain]: undefined;
    [RouteKind.Codomain]: undefined;
}

interface TotalRouteMap<A> {
    value: A | undefined;
    [RouteKind.Domain]: (IntegerMap<RouteMap<A>>)[];
    [RouteKind.Codomain]: IntegerMap<RouteMap<A>>;
}

type RouteMap<A> = (EmptyRouteMap<A> | TotalRouteMap<A>);


type BlameState = RouteMap<boolean>;
type ContextTracker = RouteMap<number>;

interface BlameNodeInfo {
    kind: NodeKind;
    charge: boolean;
    negate: this;
    blameState: BlameState,
    contextTracker: ContextTracker;
}

interface RootNodeInfo extends BlameNodeInfo {
    kind: NodeKind.Root;
    label: Label;
}

interface BranchNodeInfo extends BlameNodeInfo {
    kind: NodeKind.Branch;
    direction: Direction;
    flip: BranchNodeInfo;
    type: C.BranchKind;
}

interface RootNode {
    info: RootNodeInfo;
    path: BlamePath;
}

interface BranchNode {
    parent: BlameNode;
    info: BranchNodeInfo;
    path: BlamePath;
}

export type BlameNode = RootNode | BranchNode;

function initIntMap<A>(): IntegerMap<A>  {
    return {};
}

function initRouteMap<A>(): RouteMap<A> {
    return {
        value: undefined,
        [RouteKind.Domain]: undefined,
        [RouteKind.Codomain]: undefined,
    };
}

function getOrInitPointer<T extends {[i: number]: any}>(
    context: T, k: number, init: () => NonNullable<T[number]>): NonNullable<T[number]> {
    if(context[k] === undefined) {
        context[k] = init();
    }
    return context[k];
}

function nextPointer<A>(context: RouteMap<A>, route: RouteInfo): RouteMap<A> {
    if(context[RouteKind.Domain] === undefined) {
        context[RouteKind.Domain] = [];
        context[RouteKind.Codomain] = initIntMap();
    }
    let totalContext: TotalRouteMap<A> = context as TotalRouteMap<A>;
    let result: RouteMap<A>;
    if(route.kind === RouteKind.Domain) {
        const argPointer = getOrInitPointer(totalContext[route.kind], route.arg, initIntMap);
        result = getOrInitPointer(argPointer, route.id, initRouteMap);
    } else {
        result = getOrInitPointer(totalContext[route.kind], route.id, initRouteMap);
    }
    return result;
}

function modifyLeaf<A>(context: RouteMap<A>, update: (a: A | undefined) => A | undefined, path: BlamePath): A | undefined  {
    let currentPointer: RouteMap<A> = context;
    for(let i = 0; i < path.length; i++) {
        currentPointer = nextPointer(currentPointer, path[i]);
    }
    const result = currentPointer.value;
    currentPointer.value = update(result);
    return result;
}

function modifyPath<A>(context: RouteMap<A>, update: (a: A | undefined) => A | undefined, path: BlamePath): A | undefined  {
    let currentPointer: RouteMap<A> = context;
    for(let i = 0; i < path.length; i++) {
        currentPointer.value = update(currentPointer.value);
        currentPointer = nextPointer(currentPointer, path[i]);
    }
    const result = currentPointer.value;
    currentPointer.value = update(result);
    return result;
}

function makeRootNodeInfo(label: Label): RootNodeInfo {
    const pos: RootNodeInfo = {
        kind: NodeKind.Root,
        label,
        negate: undefined as any,
        charge: true,
        blameState: initRouteMap<boolean>(),
        contextTracker: initRouteMap<number>()
    };
    const neg: RootNodeInfo = {
        kind: NodeKind.Root,
        label,
        negate: undefined as any,
        charge: false,
        blameState: initRouteMap<boolean>(),
        contextTracker: initRouteMap<number>()
    };
    (pos as RootNodeInfo).negate = neg;
    (neg as RootNodeInfo).negate = pos;
    return pos;
}

function initBranchNodeInfo(type: C.BranchKind, direction: Direction, charge: boolean): BranchNodeInfo {
    return {
        kind: NodeKind.Branch,
        negate: undefined as any,
        flip: undefined as any,
        type,
        direction,
        charge,
        blameState: initRouteMap<boolean>(),
        contextTracker: initRouteMap<number>()
    };
}

function makeBranchNodeInfo(type: C.BranchKind): [BranchNodeInfo, BranchNodeInfo] {
    const leftPos = initBranchNodeInfo(type, Direction.Left, true);
    const rightPos = initBranchNodeInfo(type, Direction.Right, true);
    const leftNeg = initBranchNodeInfo(type, Direction.Left, false);
    const rightNeg = initBranchNodeInfo(type, Direction.Right, false);
    leftPos.flip = rightPos;
    rightPos.flip = leftPos;
    leftNeg.flip = rightNeg;
    rightNeg.flip = leftNeg;
    leftPos.negate = leftNeg;
    leftNeg.negate = leftPos;
    rightPos.negate = rightNeg;
    rightNeg.negate = rightPos;
    return [leftPos, rightPos];
}

function makeRootNodeFull(info: RootNodeInfo, path: BlamePath): BlameNode {
    return {info, path};
}

export function makeRootNode(label: Label): BlameNode {
    return makeRootNodeFull(makeRootNodeInfo(label), []);
}

function makeBranchNode(parent: BlameNode, info: BranchNodeInfo, path: BlamePath): BlameNode {
    return {parent, info, path};
}

export function makeBranchNodes(type: C.BranchKind, parent: BlameNode): [BlameNode, BlameNode] {
    const [left,right] = makeBranchNodeInfo(type);
    return [
        makeBranchNode(parent, left, []),
        makeBranchNode(parent, right, [])
    ];
}

export function makeDomainRoute(arg: number, id: number): DomainRoute  {
    return {kind: RouteKind.Domain, id, arg}
}

export function makeCodomainRoute(id: number): CodomainRoute  {
    return {kind: RouteKind.Codomain, id};
}

export function delta(node: BlameNode): number  {
    const i = modifyLeaf(
        node.info.contextTracker, (x) => x === undefined ? 1 : x + 1, node.path);
    return (i === undefined) ? 0 : i;
}

export function extend(node: BlameNode, context: RouteInfo): BlameNode {
    if("parent" in node) {
        return {parent: node.parent, info: node.info, path: node.path.concat([context])};
    }
    return {info: node.info, path: node.path.concat([context])};
}

export function negate(node: BlameNode): BlameNode {
    if("parent" in node) {
        return {parent: negate(node.parent), info: node.info.negate, path: node.path};
    }
    return {info: node.info.negate, path: node.path};
}

export function blame<R>(node: BlameNode, withResolution: (reachedRoot: boolean) => R): R {
    return withResolution(assign(node));
}

function testCompatibleState(id: number, stateMap: IntegerMap<BlameState>): boolean {
    return (stateMap[id] !== undefined) && (stateMap[id]!.value === true);
}

function someCompatiblePath(n: number, path: BlamePath, blameState: BlameState): boolean {
    // At the end of the path we are done and haven't found a compatible path.
    if(n >= path.length) { return false };
    const route = path[n];
    // If the route is partial then it cannot have been blamed for any subroute.
    if(blameState[RouteKind.Domain] === undefined) {
        return false;
    }
    let totalPointer: TotalRouteMap<boolean> = blameState as TotalRouteMap<boolean>;
    if(route.kind === RouteKind.Domain) {
        const codomainCompatible = testCompatibleState(route.id,totalPointer[RouteKind.Codomain]);
        if(codomainCompatible) { return true };
        const argCompatible = totalPointer[route.kind].some((state, i) => i !== route.arg && testCompatibleState(route.id, state));
        if(argCompatible) { return true };
        const thisArgMap = totalPointer[route.kind][route.arg];
        if(thisArgMap === undefined) { return false; }
        const thisRouteMap = thisArgMap[route.id];
        if(thisRouteMap === undefined) {
            return false
        }
        return someCompatiblePath(n+1, path, thisRouteMap);
    } else {
        const argCompatible = totalPointer[RouteKind.Domain].some((state, i) => testCompatibleState(route.id, state));
        if(argCompatible) { return true };
        const thisRouteMap = totalPointer[route.kind][route.id];
        if(thisRouteMap === undefined) {
            console.log(JSON.stringify(blameState));
            return false
        }
        return someCompatiblePath(n+1, path, thisRouteMap);
    }
}

function assign(node: BlameNode): boolean {
    if(someCompatiblePath(0, node.path, node.info.negate.blameState)) { return false; }
    modifyPath(node.info.blameState, () => true, node.path);
    return resolve(node);
}

function getParent(branchNode: BranchNode): BlameNode {
    if("parent" in branchNode.parent && branchNode.parent.path.length === 0) {
        return makeBranchNode(branchNode.parent.parent, branchNode.parent.info, branchNode.path);
    }
    return branchNode.parent;
}

function resolvePositiveBranch(node: BranchNode): boolean {
    switch(node.info.type) {
        case C.TypeKind.Intersection:
        case C.TypeKind.And:
            return assign(getParent(node));
        case C.TypeKind.Union:
            const otherInfo = node.info.flip;
            if(otherInfo.blameState.value === true) {
                return assign(getParent(node));
            }
            return false;
    }
}

function matchingElimination(route: RouteInfo, blameState: BlameState): boolean {
    if(blameState[RouteKind.Domain] === undefined) {
        return false;
    }
    let totalPointer: TotalRouteMap<boolean> = blameState as TotalRouteMap<boolean>;
    if(testCompatibleState(route.id, totalPointer[RouteKind.Codomain])) {
        return true;
    }
    if(totalPointer[RouteKind.Domain] === undefined) {
        return false;
    }
    return totalPointer[RouteKind.Domain].some(state => testCompatibleState(route.id, state));
}

function resolveNegativeBranch(node: BranchNode): boolean {
    switch(node.info.type) {
        case C.TypeKind.Union:
        case C.TypeKind.And:
            return assign(getParent(node));
        case C.TypeKind.Intersection:
            const otherInfo = node.info.flip;
            if(node.path.length === 0) {
                throw new Error("assertion error: should not have negative blame on empty path");
            }
            if(matchingElimination(node.path[0], otherInfo.blameState)) {
                return assign(getParent(node));
            }
            return false;
    }
}

function resolve(node: BlameNode): boolean {
    if("parent" in node) {
        return node.info.charge ? resolvePositiveBranch(node) : resolveNegativeBranch(node)
    }
    return true;
}

function chargeToString(charge: boolean): string {
    return charge ? "+" : "-";
}

function pathToString(path: BlamePath): string {
    return path.map(routeInfoToString).join("/");
}

function routeInfoToString(route: RouteInfo): string {
    switch(route.kind) {
        case RouteKind.Domain:
            return `DOM[${route.arg}][ID=${route.id}]`;
        case RouteKind.Codomain:
            return `COD[ID=${route.id}]`;
    }
}

function brancheNodeToString(branch: BranchNode): string {
    const dirString = branch.info.direction === Direction.Left ? "<|" : "|>";
    const parentStr = nodeToString(branch.parent);
    return `${parentStr} :: ${dirString}^${chargeToString(branch.info.charge)} . ${pathToString(branch.path)}`;

}

export function nodeToString(node: BlameNode): string {
    if("parent" in node) {
        return brancheNodeToString(node);
    }
    return `${node.info.label}[${chargeToString(node.info.charge)}] . ${pathToString(node.path)}`;
}
