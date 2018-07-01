import { Debug, isFunction, isObject } from './common';

import * as T from "./contractTypes";
import * as M from './monitors';
import * as B from './blame';

/**
 * Apply a contract to value.
 *
 * @param v The subject of the contract
 * @param label An optional string descriptor for the blame label
 * @param type The contract type
 */
export function assert<X>(v: X, type: T.ContractType): X;
export function assert<X>(v: X, label: string, type: T.ContractType): X;
export function assert<X>(v: X, labelOrType: string | T.ContractType, type?: T.ContractType): X {
    if (typeof labelOrType === "string" && type !== undefined) {
        return check(v, B.makeRootNode(B.label(labelOrType), type), type);
    }
    if (typeof labelOrType === "object") {
        return check(v, B.makeRootNode(B.label(), labelOrType), labelOrType);
    }
    return Debug.fail("Illegal parameters to contract");

}

/**
 * Check a value `v` against contract `type` with blame node `p`.
 *
 * @param v
 * @param p
 * @param type
 */
function check<X>(v: X, p: B.BlameNode, type: T.ContractType): X {
    switch (type.kind) {
        case T.TypeKind.Base:
            return checkBase(v, p, type);

        case T.TypeKind.Function:
            return checkFunction(v, p, type);

        case T.TypeKind.Intersection:
        case T.TypeKind.Union:
        case T.TypeKind.And:
            return checkBranching(v, p, type);

        case T.TypeKind.Any:
            return v;
    }
}

let handleBlame: (root: B.RootNode, errorString: string) => void =
    (root, errorString) => { throw ("\n" + errorString + "\n"); }

export function setHandler(handler: (root: B.RootNode, errorString: string) => void): void {
    handleBlame = handler;
}


/**
 * Apply a base contract to a value.
 *
 * Applies the predicate to the value. If the predicate returns false,
 * try to assign blame to the node.
 *
 * @param v
 * @param p
 * @param type
 */
function checkBase<X>(v: X, p: B.BlameNode, type: T.BaseType): X {
    const message = `Value not of expected type ${type.description}, received ${typeof v}.`;
    return type.spec(v) ? v : B.blame(v, p, message, handleBlame);
}

/**
 * Apply a function contract to a value.
 *
 * We try to be as faithful to the paper with a few caveats enforced
 * on us. The formalism allows function contracts to be applied to any
 * value; if you want to check a value /is/ a function then a base
 * contract can be used. However we cannot apply proxies (function
 * wrappers) to primitive values. Consequently if a function contract
 * is applied to a primitive then the function just behaves as the
 * identity.
 *
 * For traditional function contract use an AND contract.
 *
 * A -> B === T.and(Base.function, T.fun([A], B))
 *
 * @param v
 * @param p
 * @param type
 */
function checkFunction<X>(v: X, p: B.BlameNode, type: T.FunctionType): X {
    if (!isFunction(v) && !isObject(v)) {
        return v;
    }
    const makeContext = () => B.makeAppNodes(p, type.argumentTypes.length);
    const argHandler = <X>(ctx: B.ApplicationNodes, args: X[]) => {
        /*
          Do not wrap the arguments if the arity check
          failed. Technically we do not need to wrap the return
          type as it cannot be blamed, but the machinery to do
          this conditional wrapping can make things messy.
        */
        if (args.length > type.argumentTypes.length) {
            const message = `Expecting ${type.argumentTypes.length} arguments, received ${args.length}.`;
            return B.blame(args, ctx.dom[type.argumentTypes.length], message, handleBlame);
        }
        if (args.length < type.argumentTypes.length) {
            const message = `Expecting ${type.argumentTypes.length} arguments, received ${args.length}.`;
            return B.blame(args, ctx.dom[args.length], message, handleBlame);
        }
        return args.map((v, n) => check(v, ctx.dom[n], type.argumentTypes[n]));
    }
    const returnHandler = <X>(ctx: B.ApplicationNodes, v: X) =>
        check(v, ctx.cod, type.returnType);
    return M.createFunctionMonitor(v, makeContext, argHandler, returnHandler);
}

/**
 * Check a branching type (Intersection, Union, And) by checking both
 * branches.
 *
 * Left is checked before right, but this should not matter.
 &
 * @param v
 * @param p
 * @param type
 */
function checkBranching<B extends T.BranchKind, X>(v: X, p: B.BlameNode, type: T.BranchType<B>): X {
    const [l, r] = B.makeBranchNodes(type.kind, p);
    return check(check(v, l, type.left), r, type.right);
}
