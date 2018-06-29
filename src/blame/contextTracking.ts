import { Top } from "../common";

/**
 * Kinds of path elements, corresponding to the sub-contracts created
 * when wrapping function.
 */
const enum RouteKind {
    Domain,
    Codomain
}

/**
 * A path element is either a domain route or codomain route.
 */
export type RouteInfo = DomainRoute | CodomainRoute;

/**
 * A domain route includes the application id and the argument number
 * for the contract.
 */
interface DomainRoute {
    kind: RouteKind.Domain;
    id: number;
    arg: number;
}

/**
 * A codomain route includes the application id.
 */
interface CodomainRoute {
    kind: RouteKind.Codomain;
    id: number;
}

type IntegerMap<A> = { [i: number]: A | undefined };

/**
 * A route map is a tree structure encoding a set of paths (sequences
 * of routes). At each a level a value of type `A` may be stored.
 */
export type RouteMap<A> = EmptyRouteMap<A> | TotalRouteMap<A>;

/**
 * An empty map containing no paths.
 */
interface EmptyRouteMap<A> {
    value: undefined;
    [RouteKind.Domain]: undefined;
    [RouteKind.Codomain]: undefined;
}

/**
 * A populuated route map containing sub maps for the domain and
 * codomain paths. The domain mapping is a sequence of maps
 * corresponding to the arguments of a function.
 */
interface TotalRouteMap<A> {
    value: A | undefined;
    [RouteKind.Domain]: (IntegerMap<RouteMap<A>>)[];
    [RouteKind.Codomain]: IntegerMap<RouteMap<A>>;
}

/**
 * Type guard to distinguish initialised route maps.
 */
function isTotalRouteMap<A>(routeMap: RouteMap<A>): routeMap is TotalRouteMap<A> {
    return routeMap[RouteKind.Domain] !== undefined;
}

/**
 * Generate a fresh map integer map.
 */
function initIntMap<A>(): IntegerMap<A> {
    return {};
}

/**
 * Generate a fresh route map.
 */
export function initRouteMap<A>(): EmptyRouteMap<A> {
    return {
        value: undefined,
        [RouteKind.Domain]: undefined,
        [RouteKind.Codomain]: undefined,
    };
}

/**
 * Initialise the sub-map pointers in an empty route map.
 */
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

/**
 * Lookup a value in an integer indexable context. If the value is not
 * set in `context`, call `init` to set the value at the given index.
 *
 * @param context Mapping to query
 * @param k Index to acces
 * @param init Function to initialise undefined indices
 */
function getOrInitPointer<T extends IntegerMap<Top>>(
    context: T,
    k: number,
    init: () => NonNullable<T[number]>
): NonNullable<T[number]> {
    // This can be written with less code, but this way doesn't require casts.
    const val: T[number] = context[k];
    if (val !== undefined) {
        return val!;
    }
    const res = init();
    context[k] = res;
    return res;
}

/**
 * Lookup the route map for a given route in TotalRouteMap. If the
 * route is a domain element and the sub-map for that argument number
 * is not set, initialise it.
 *
 * @param context
 * @param route
 */
function lookupRoute<A>(context: TotalRouteMap<A>, route: RouteInfo): RouteMap<A> {
    if (route.kind === RouteKind.Domain) {
        const argPointer = getOrInitPointer(context[route.kind], route.arg, initIntMap);
        return getOrInitPointer(argPointer, route.id, initRouteMap);
    }
    return getOrInitPointer(context[route.kind], route.id, initRouteMap);
}

/**
 * Lookup the route map for a given route in a RouteMap. If the route
 * is not defined, initialise an empty map and query that.
 *
 * @param context
 * @param route
 */
function nextPointer<A>(context: RouteMap<A>, route: RouteInfo): RouteMap<A> {
    if (isTotalRouteMap(context)) {
        return lookupRoute(context, route);
    }
    return lookupRoute(populateEmptyRouteMap(context), route);
}

/**
 * Traverse a route map along `path`, initialising sub-maps if
 * necessary. Apply `update` to the value contained at the end of the
 * path. Returns the original value before update.
 *
 * @param context
 * @param update
 * @param path
 */
export function modifyLeaf<A>(
    context: RouteMap<A>,
    update: (a: A | undefined) => A,
    path: RouteInfo[]
): A | undefined {
    let currentPointer: RouteMap<A> = context;
    for (let i = 0; i < path.length; i++) {
        currentPointer = nextPointer(currentPointer, path[i]);
    }
    const result = currentPointer.value;
    currentPointer.value = update(result);
    return result;
}

/**
 * Traverse a route map along `path`, initialising sub-maps if
 * necessary. Apply `update` to every value along the path, including
 * the leaf. Returs the original leaf value before update.
 *
 * @param context
 * @param update
 * @param path
 */
export function modifyPath<A>(
    context: RouteMap<A>,
    update: (a: A | undefined) => A,
    path: RouteInfo[]
): A | undefined {
    let currentPointer: RouteMap<A> = context;
    for (let i = 0; i < path.length; i++) {
        currentPointer.value = update(currentPointer.value);
        currentPointer = nextPointer(currentPointer, path[i]);
    }
    const result = currentPointer.value;
    currentPointer.value = update(result);
    return result;
}



/**
 * Lookup the value for the given route in the map. Returns
 * `undefined` if the value is not set.
 *
 * @param route
 * @param stateMap
 */
function getRouteValue<A>(route: RouteInfo, stateMap: IntegerMap<RouteMap<A>>): A | undefined {
    const routeMap = stateMap[route.id];
    return routeMap === undefined ? routeMap : routeMap.value;
}

/**
 * Query a blame state to see if a route compatible with `path` has
 * been blamed. This is technically faithful to the paper, but the
 * implementation is slightly different because we encode the blame
 * state as a tree rather than a set of nodes.
 *
 * @param n Current path index we a checking.
 * @param path The total path we are checking.
 * @param blameState The blame state we are querying.
 */
export function someCompatiblePath(
    n: number,
    path: RouteInfo[],
    blameState: RouteMap<boolean>
): boolean {
    // At the end of the path we are done and haven't found a compatible path.
    if (n >= path.length) {
        return false
    };
    const route = path[n];

    // If the route is partial then it cannot have been blamed for any subroute.
    if (!isTotalRouteMap(blameState)) {
        return false;
    }

    /*
     * If the current path element we are querying is a domain we
     * first checking if the codomain has been blamed. If so, we are
     * because domains routes are compatible with codomain routes.
     */
    if (route.kind === RouteKind.Domain) {
        if (getRouteValue(route, blameState[RouteKind.Codomain])) {
            return true
        }
        /*
         * Otherwise we now need to see if any of the other arguments
         * have been blamed. Like the codomain, any domain route is
         * compatible if it represents a different argument
         * number. This is because any contracts that stem from the
         * two domain routes are guaranteed to be distinct.
         */
        const argCompatible = blameState[route.kind].some((state, i) => i !== route.arg && !!getRouteValue(route, state));
        if (argCompatible) {
            return true
        };
        /*
         * If we get to this point and haven't found a compatible
         * node, the only remaining option is try follow this route
         * and try to find a compatible subroute.
         */
        const thisArgMap = blameState[route.kind][route.arg];
        if (thisArgMap === undefined) {
            return false;
        }
        const thisRouteMap = thisArgMap[route.id];
        if (thisRouteMap === undefined) {
            return false
        }
        return someCompatiblePath(n + 1, path, thisRouteMap);
    }
    /* Codomain checking is a simpler version of domain
     * checking. First see if any domain is immediately compatible. If
     * not, traverse the codomain route to recursively find a
     * compatible sub-route.
     */
    if (blameState[RouteKind.Domain].some((state) => !!getRouteValue(route, state))) {
        return true
    };
    const thisRouteMap = blameState[route.kind][route.id];
    if (thisRouteMap === undefined) {
        return false
    }
    return someCompatiblePath(n + 1, path, thisRouteMap);
}

/**
 * Check if a matching elimination context has been blamed.
 *
 * Query the blame state to see if a route with the same application
 * id has been blamed. First we check if the codomain has been blamed
 * (for that id). Then we check if any argument has been blamed (for
 * that id).
 *
 * @param route
 * @param blameState
 */
export function matchingElimination(route: RouteInfo, blameState: RouteMap<boolean>): boolean {
    if (isTotalRouteMap(blameState)) {
        if (getRouteValue(route, blameState[RouteKind.Codomain])) {
            return true;
        }
        return blameState[RouteKind.Domain].some(state => !!getRouteValue(route, state));
    }
    return false;
}
