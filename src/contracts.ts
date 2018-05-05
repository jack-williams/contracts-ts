import * as T from "./contractTypes";
import * as C from './checks';
import * as M from './monitors';
import * as B from './blame';
import * as S from './seal';

export function contract<X>(v: X, p: B.BlameNode, type: T.ContractType): X {
    return check(v, p, type, T.makeScopeSet());
}

function check<X>(v: X, p: B.BlameNode, type: T.ContractType, scope: T.ScopeSet): X {
    switch (type.kind) {
        case T.TypeKind.Flat:
            return checkFlat(v, p, type, scope)
        case T.TypeKind.Function:
            return checkFunction(v, p, type, scope);
        case T.TypeKind.Intersection:
        case T.TypeKind.Union:
        case T.TypeKind.And:
            return checkBranching(v, p, type, scope);
        case T.TypeKind.Forall:
            return checkForall(v, p, type, scope);
        case T.TypeKind.Variable:
            return checkVariable(v, p, type, scope);
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

function checkFlat<X>(v: X, p: B.BlameNode, type: T.FlatType, scope: T.ScopeSet): X {
    const spec = C.specMap[type.spec];
    const f = (val: any) => {
        if (spec(val)) {
            return val;
        }
        B.blame(p, handleBlame(p));
        return val;
    }
    return S.applyNonParametricContract(v, p, f, scope);
}

function checkFunction<X>(v: X, p: B.BlameNode, type: T.FunctionType, scope: T.ScopeSet): X {
    return S.applyNonParametricContract(v, p, <X>(x: X) => wrapFunction(x, p, type, scope), scope);
}

function wrapFunction<X>(v: X, p: B.BlameNode, type: T.FunctionType, scope: T.ScopeSet): X {
    if (typeof v === "object" || typeof v === "function") {
        const makeContext = () => B.makeAppNodes(p, type.argumentTypes.length);
        const invertedScope = T.invertScopeSet(scope);
        const argHandler = <X>(ctx: B.ApplicationNodes, args: X[]) => {
            if (args.length > type.argumentTypes.length) {
                B.blame(ctx.dom[type.argumentTypes.length], handleBlame(ctx.dom[type.argumentTypes.length]));
                return args;
            }
            if (args.length < type.argumentTypes.length) {
                B.blame(ctx.dom[args.length], handleBlame(ctx.dom[args.length]));
                return args;
            }
            return args.map((v,n) => check(v, ctx.dom[n], type.argumentTypes[n], invertedScope));
        }
        const returnHandler = <X>(ctx: B.ApplicationNodes, v: X) => check(v, ctx.cod, type.returnType, scope);
        return M.createFunctionMonitor(v as any, makeContext, argHandler, returnHandler);
    }
    return v;
}

function checkForall<X>(v: X, p: B.BlameNode, type: T.ForallType, scope: T.ScopeSet): X {
    const [converted, id] = T.forallConversion(type);
    return check(v, p, converted, T.addToScope(scope,id));
}

function checkVariable(v: any, p: B.BlameNode, type: T.Variable | T.GenaratedName, scope: T.ScopeSet): any {
    if (T.isName(type)) {
        if(type.covariant) {
            return S.unseal(v, type.id, p, scope);
        }
        return S.seal(v, type.id, B.negate(p));
    }
    return v; // Should never happen.
}

function checkBranching<B extends T.BranchKind, X>(v: X, p: B.BlameNode, type: T.BranchType<B>, scope: T.ScopeSet): X {
    const [l, r] = B.makeBranchNodes(type.kind, p);
    return check(check(v, l, type.left, scope), r, type.right, scope);
}
