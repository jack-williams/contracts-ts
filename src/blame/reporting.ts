/*
 * Blame Error Reporting 
 */

import {
    BlameNode,
    RootNode,
    BranchNode,
    isRoot,
    isPositive,
    Direction
} from "./tracking";

import { RouteInfo, RouteKind } from "./contextTracking";

import { typeToString } from '../contractTypes';

function routeToString(route: RouteInfo): string {
    switch (route.kind) {
        case RouteKind.Domain: return "DOM";
        case RouteKind.Codomain: return "COD";
    }
}

function pathToString(path: RouteInfo[]): string {
    return path.map(routeToString).join("/");
}

/**
 * String representation of root node `p`.
 * @param p
 */
function rootNodeToString(p: RootNode): string {
    const charge = isPositive(p) ? "Positive" : "Negative";
    const message = `${charge} blame @ label ${p.info.label.toString()}`;
    return message;
}

export function reportError(p: RootNode, message: string): string {
    return `${rootNodeToString(p)}
Reason: ${message}
Type: ${typeToString(p.info.type)}`;
}
