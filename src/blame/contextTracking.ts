import { Top } from "../types";

const enum RouteKind {
    Domain,
    Codomain
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

export type RouteInfo = DomainRoute | CodomainRoute;

type IntegerMap<A> = { [i: number]: A | undefined };

interface EmptyRouteMap<A> {
    value: undefined;
    [RouteKind.Domain]: undefined;
    [RouteKind.Codomain]: undefined;
}

interface TotalRouteMap<A> {
    value: A | undefined;
    [RouteKind.Domain]: (IntegerMap<RouteMap<A>>)[];
    [RouteKind.Codomain]: IntegerMap<RouteMap<A>>;
}

export type RouteMap<A> = EmptyRouteMap<A> | TotalRouteMap<A>;

function isTotalRouteMap<A>(routeMap: RouteMap<A>): routeMap is TotalRouteMap<A> {
    return routeMap[RouteKind.Domain] !== undefined;
}

function initIntMap<A>(): IntegerMap<A> {
    return {};
}

export function initRouteMap<A>(): EmptyRouteMap<A> {
    return {
        value: undefined,
        [RouteKind.Domain]: undefined,
        [RouteKind.Codomain]: undefined,
    };
}

function populateEmptyRouteMap<A>(routeMap: EmptyRouteMap<A>): TotalRouteMap<A> {
    const totalRouteMap: TotalRouteMap<A> = routeMap as any;
    totalRouteMap[RouteKind.Domain] = [];
    totalRouteMap[RouteKind.Codomain] = initIntMap();
    return totalRouteMap;
}


//// Constructor Functions

export function makeDomainRoute(arg: number, id: number): DomainRoute {
    return { kind: RouteKind.Domain, id, arg }
}

export function makeCodomainRoute(id: number): CodomainRoute {
    return { kind: RouteKind.Codomain, id };
}


//// Traversal

function getOrInitPointer<T extends IntegerMap<Top>>(context: T, k: number, init: () => NonNullable<T[number]>): NonNullable<T[number]> {
    // This can be written with less code, but this way doesn't require casts.
    const val: T[number] = context[k];
    if (val !== undefined) {
        return val!;
    }
    const res = init();
    context[k] = res;
    return res;
}

function lookupRoute<A>(context: TotalRouteMap<A>, route: RouteInfo): RouteMap<A> {
    if (route.kind === RouteKind.Domain) {
        const argPointer = getOrInitPointer(context[route.kind], route.arg, initIntMap);
        return getOrInitPointer(argPointer, route.id, initRouteMap);
    }
    return getOrInitPointer(context[route.kind], route.id, initRouteMap);
}

function nextPointer<A>(context: RouteMap<A>, route: RouteInfo): RouteMap<A> {
    if (!isTotalRouteMap(context)) {
        return lookupRoute(populateEmptyRouteMap(context), route);
    }
    return lookupRoute(context, route);
}

export function modifyLeaf<A>(context: RouteMap<A>, update: (a: A | undefined) => A, path: RouteInfo[]): A | undefined {
    let currentPointer: RouteMap<A> = context;
    for (let i = 0; i < path.length; i++) {
        currentPointer = nextPointer(currentPointer, path[i]);
    }
    const result = currentPointer.value;
    currentPointer.value = update(result);
    return result;
}

export function modifyPath<A>(context: RouteMap<A>, update: (a: A | undefined) => A, path: RouteInfo[]): A | undefined {
    let currentPointer: RouteMap<A> = context;
    for (let i = 0; i < path.length; i++) {
        currentPointer.value = update(currentPointer.value);
        currentPointer = nextPointer(currentPointer, path[i]);
    }
    const result = currentPointer.value;
    currentPointer.value = update(result);
    return result;
}

function getRouteValue<A>(route: RouteInfo, stateMap: IntegerMap<RouteMap<A>>): A | undefined {
    const routeMap = stateMap[route.id];
    return routeMap === undefined ? routeMap : routeMap.value;
}

export function someCompatiblePath(n: number, path: RouteInfo[], blameState: RouteMap<boolean>): boolean {
    // At the end of the path we are done and haven't found a compatible path.
    if (n >= path.length) { return false };
    const route = path[n];
    // If the route is partial then it cannot have been blamed for any subroute.
    if (blameState[RouteKind.Domain] === undefined) {
        return false;
    }
    let totalPointer: TotalRouteMap<boolean> = blameState as TotalRouteMap<boolean>;
    if (route.kind === RouteKind.Domain) {
        const codomainCompatible = getRouteValue(route, totalPointer[RouteKind.Codomain]);
        if (codomainCompatible) { return true };
        const argCompatible = totalPointer[route.kind].some((state, i) => i !== route.arg && !!getRouteValue(route, state));
        if (argCompatible) { return true };
        const thisArgMap = totalPointer[route.kind][route.arg];
        if (thisArgMap === undefined) { return false; }
        const thisRouteMap = thisArgMap[route.id];
        if (thisRouteMap === undefined) {
            return false
        }
        return someCompatiblePath(n + 1, path, thisRouteMap);
    } else {
        const argCompatible = totalPointer[RouteKind.Domain].some((state) => !!getRouteValue(route, state));
        if (argCompatible) { return true };
        const thisRouteMap = totalPointer[route.kind][route.id];
        if (thisRouteMap === undefined) {
            console.log(JSON.stringify(blameState));
            return false
        }
        return someCompatiblePath(n + 1, path, thisRouteMap);
    }
}

export function matchingElimination(route: RouteInfo, blameState: RouteMap<boolean>): boolean {
    if (isTotalRouteMap(blameState)) {
        if (getRouteValue(route, blameState[RouteKind.Codomain])) {
            return true;
        }
        return blameState[RouteKind.Domain].some(state => !!getRouteValue(route, state));
    }
    return false;
}
