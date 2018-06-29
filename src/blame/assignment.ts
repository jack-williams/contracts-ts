/*

  Blame assignment for Intersection and Union

*/

import { Debug } from "../common";

import { TypeKind } from "../contractTypes";

import {
    BlameNode,
    RootNode,
    BranchNode,
    isRoot,
    isPositive,
    parent,
    root
} from "./tracking";

import {
    modifyPath,
    someCompatiblePath,
    matchingElimination
} from "./contextTracking";

/**
 * Resolve blame for a positive branch.
 *
 * Intersection and And branches always assign blame to their parent.
 *
 * Union branches assign blame to their parent if the flipped branch
 * has also been assigned blame (along some path). Our choice to blame
 * at every level of a path means we only need to check the first
 * value in the blame state.
 *
 * @param node The blamed branch node.
 */
function resolvePositiveBranch(node: BranchNode): boolean {
    switch (node.info.type) {
        case TypeKind.Intersection:
        case TypeKind.And:
            return assign(parent(node));

        case TypeKind.Union:
            return !!node.info.flip.blameState.value && assign(parent(node));
    }
}

/**
 * Resolve blame for a negative branch.
 *
 * Union and And branches always assign blame to their parent.
 *
 * Intersection branches assign blame to their parent if the flipped
 * branch has also been assigned blame (along some path starting with
 * the same elimination context).
 *
 * @param node The blamed branch node.
 */
function resolveNegativeBranch(node: BranchNode): boolean {
    switch (node.info.type) {
        case TypeKind.Union:
        case TypeKind.And:
            return assign(parent(node));

        case TypeKind.Intersection:
            // This is an assertion error because for a node to be
            // negated it must have been applied, extending the path.
            if (node.path.length === 0) {
                return Debug.fail("Should never have negative blame on empty path");
            }
            return matchingElimination(node.path[0], node.info.flip.blameState)
                ? assign(parent(node)) : false;
    }
}

/**
 * Resolve blame for a node that has been assigned blame. Corresponds
 * very closely to /resolve/ in the paper. Returns true if blame
 * propagated to a root node.
 *
 * @param node The blame node that has been assigned blame -- now we
 * must resolve that blame.
 */
function resolve(node: BlameNode): boolean {
    return isRoot(node) ||
        (isPositive(node) ? resolvePositiveBranch(node) : resolveNegativeBranch(node));
}

// Define once.
const setBlame = () => true;

/**
 * Assign blame to the node's path.
 *
 * Unlike the paper, we blame at every level in the path rather than
 * just the end. So for the path dom_0/cod_1/dom_2, we blame:
 *
 * - dom_0
 * - dom_0/cod_1
 * - dom_0/cod_1/dom_2
 *
 * This makes it fast to check if there is some extension of a path
 * has been blamed, which is precisely what we need for intersection
 * and union types.
 *
 * @param node The blamed node -- mutates its state in place.
 * @returns The modifed blame node.
 */
function blamePath(node: BlameNode): BlameNode {
    modifyPath(node.info.blameState, setBlame, node.path);
    return node;
}

/**
 * Try to assign blame to `node` and return true if blame propagated
 * to a root. Corresponds very closely to /assign/ in the paper.
 *
 * @param node The blame node involved in violated contract.
 * @returns Boolean indicated whether blame propagated to a root.
 */
function assign(node: BlameNode): boolean {
    if (someCompatiblePath(0, node.path, node.info.negate.blameState)) {
        return false;
    }
    // Has side-effect of setting path in blame state.
    return resolve(blamePath(node));
}

export function blame<R>(node: BlameNode, withResolution: (p: RootNode) => void)
    : void {
    const assignment = assign(node);
    if (assignment) {
        withResolution(root(node));
    }
}
