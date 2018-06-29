import { Debug, isFunction, isObject } from './common';

import * as T from "./contractTypes";
import * as M from './monitors';
import * as B from './blame';

/**
 * Apply a contract to value.
 *
 * @param v
 * @param label
 * @param type
 */
export function assert<X>(v: X, type: T.ContractType): X;
export function assert<X>(v: X, label: string, type: T.ContractType): X;
export function assert<X>(v: X, labelOrType: string | T.ContractType, type?: T.ContractType): X {
    if (typeof labelOrType === "string" && type !== undefined) {
        return check(v, B.makeRootNode(B.label(labelOrType)), type);
    }
    if (type !== undefined) {
        return check(v, B.makeRootNode(B.label()), type);
    }
    return Debug.fail("Illegal parameters to contract");

}

function check<X>(v: X, p: B.BlameNode, type: T.ContractType): X {
    switch (type.kind) {
        case T.TypeKind.Base:
            return checkFlat(v, p, type);

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

function handleBlame(p: B.RootNode): void {
    const stack = new Error().stack;
    if (stack) {
        console.log(stack.split('\n')[2]);
    }
    console.log(p);
    throw new Error("blame " + (p.info.charge ? "pos" : "neg"));

}

function checkFlat<X>(v: X, p: B.BlameNode, type: T.BaseType): X {
    if (type.spec(v)) {
        return v;
    }
    B.blame(p, handleBlame);
    return v;
}

function checkFunction<X>(v: X, p: B.BlameNode, type: T.FunctionType): X {
    if (isFunction(v) || isObject(v)) {
        const makeContext = () => B.makeAppNodes(p, type.argumentTypes.length);
        const argHandler = <X>(ctx: B.ApplicationNodes, args: X[]) => {
            /*
              Do not wrap the arguments if the arity check
              failed. Technically we do not need to wrap the return
              type as it cannot be blamed, but the machinery to do
              this conditional wrapping can make things messy.
            */
            if (args.length > type.argumentTypes.length) {
                B.blame(ctx.dom[type.argumentTypes.length], handleBlame);
                return args;
            }
            if (args.length < type.argumentTypes.length) {
                B.blame(ctx.dom[args.length], handleBlame);
                return args;
            }
            return args.map((v, n) => check(v, ctx.dom[n], type.argumentTypes[n]));
        }
        const returnHandler = <X>(ctx: B.ApplicationNodes, v: X) => check(v, ctx.cod, type.returnType);
        return M.createFunctionMonitor(v, makeContext, argHandler, returnHandler);
    }
    return v;
}

/**
 * Check a branching type (Intersection, Union, And) by checking both
 * branches.
 *
 * Left is checked before right, but this should not matter.
 */
function checkBranching<B extends T.BranchKind, X>(v: X, p: B.BlameNode, type: T.BranchType<B>): X {
    const [l, r] = B.makeBranchNodes(type.kind, p);
    return check(check(v, l, type.left), r, type.right);
}
