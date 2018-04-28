import { TypeKind } from "../contractTypes";

import {
    BlameNode,
    BranchNode,
    isRoot,
    isPositive,
    parent
} from "./tracking";

import {
    modifyPath,
    someCompatiblePath,
    matchingElimination
} from "./contextTracking";

function assign(node: BlameNode): boolean {
    if(someCompatiblePath(0, node.path, node.info.negate.blameState)) { return false; }
    modifyPath(node.info.blameState, () => true, node.path);
    return resolve(node);
}

function resolvePositiveBranch(node: BranchNode): boolean {
    switch(node.info.type) {
        case TypeKind.Intersection:
        case TypeKind.And:
            return assign(parent(node));
        case TypeKind.Union:
            return node.info.flip.blameState.value ? assign(parent(node)) : false;
    }
}

function resolveNegativeBranch(node: BranchNode): boolean {
    switch(node.info.type) {
        case TypeKind.Union:
        case TypeKind.And:
            return assign(parent(node));
        case TypeKind.Intersection:
            const otherInfo = node.info.flip;
            if(node.path.length === 0) {
                throw new Error("assertion error: should not have negative blame on empty path");
            }
            return matchingElimination(node.path[0], otherInfo.blameState) ?
                assign(parent(node)) : false;
    }
}

function resolve(node: BlameNode): boolean {
    if(isRoot(node)) {
        return true;    
    }
    return isPositive(node) ? resolvePositiveBranch(node) : resolveNegativeBranch(node)
}

export function blame<R>(node: BlameNode, withResolution: (reachedRoot: boolean) => R): R {
    return withResolution(assign(node));
}
