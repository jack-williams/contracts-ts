import * as T from "./contractTypes";
import * as C from './checks';
import * as M from './monitors';
import * as B from './blame';

export function contract<X>(v: X, p: B.BlameNode, type: T.ContractType): X {
    return check(v, p, type);
}

function check<X>(v: X, p: B.BlameNode, type: T.ContractType): X {
    switch (type.kind) {
        case T.TypeKind.Flat:
            return checkFlat(v, p, type)
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

function handleBlame(p: B.BlameNode): (resolvedToTop: boolean) => void  {
    return (resolvedToTop: boolean) => {
        if (resolvedToTop) {
//            console.log(B.nodeToString(p));
            throw new Error("blame");
        }
    }
}

function checkFlat<X>(v: X, p: B.BlameNode, type: T.FlatType): X {
    const spec = C.specMap[type.spec];
    if(spec(v)) {
        return v;
    }
    B.blame(p, handleBlame(p));
    return v;
}

const isFunction = C.specMap[T.FlatSpec.Function];
const isObject = C.specMap[T.FlatSpec.Function];

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
                B.blame(ctx.dom[type.argumentTypes.length], handleBlame(ctx.dom[type.argumentTypes.length]));
                return args;
            }
            if (args.length < type.argumentTypes.length) {
                B.blame(ctx.dom[args.length], handleBlame(ctx.dom[args.length]));
                return args;
            }
            return args.map((v,n) => check(v, ctx.dom[n], type.argumentTypes[n]));
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
