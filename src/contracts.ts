import * as T from "./contractTypes";
import * as C from './checks';
import * as M from './monitors';
import * as B from './blame';
import * as S from './seal';


export function check<X>(v: X, p: B.BlameNode, type: T.ContractType): X {
    switch(type.kind) {
        case T.TypeKind.Flat:
            return checkFlat(v, p, type)
        case T.TypeKind.Function:
            return checkFunction(v, p, type);
        case T.TypeKind.Intersection:
        case T.TypeKind.Union:
        case T.TypeKind.And:
            return checkBranching(v, p, type);
        case T.TypeKind.Forall:
            return checkForall(v, p, type);
        case T.TypeKind.Variable:
            return checkVariable(v, p, type);
        case T.TypeKind.Any:
            return v;
    }
}

function handleBlame(p: B.BlameNode): (resolvedToTop: boolean) => void  {
    return (resolvedToTop: boolean) => {
        if(resolvedToTop) {
            console.log(B.nodeToString(p));
            throw new Error("blame");
        }
    }
}

function checkFlat<X>(v: X, p: B.BlameNode, type: T.FlatType): X {
    const spec = C.specMap[type.spec];
    const f = (val: any) => {
        if(spec(val)) {
            return val;
        }
        B.blame(p, handleBlame(p));
        return val;
    }
    return S.applyNonParametricContract(v, p, f);
}

function checkFunction<X>(v: X, p: B.BlameNode, type: T.FunctionType): X {
    const makeContext = () => B.delta(p);
    const wrapArg = <X>(i: number, v: X, n: number) =>
        check(v, B.extend(B.negate(p), B.makeDomainRoute(n, i)), type.argumentTypes[n]);
    const wrapRet = <X>(i: number, v: X) =>
        check(v, B.extend(p, B.makeCodomainRoute(i)), type.returnType);

    if(typeof v === "object" || typeof v === "function") {
        const argHandler = <X>(i: number, args: X[]) => {
            if(args.length !== type.argumentTypes.length) {
              // TODO: blame;
            }
            return args.map((v,n) => wrapArg(i,v,n));
        }
        return M.createFunctionMonitor(v as any, makeContext, argHandler, wrapRet);
    }
    return v;
}

function checkForall<X>(v: X, p: B.BlameNode, type: T.ForallType): X {
    return check(v, p, T.forallConversion(type));
}

function checkVariable(v: any, p: B.BlameNode, type: T.Variable | T.GenaratedName): any {
    if(T.isName(type)) {
        const op = type.covariant ? S.unseal : S.seal;
        return op(v, type.id, p);
    }
    return v; // Should never happen.
}

function checkBranching<B extends T.BranchKind, X>(v: X, p: B.BlameNode, type: T.BranchType<B>): X {
    const [l, r] = B.makeBranchNodes(type.kind, p);
    return check(check(v, l, type.left), r, type.right);
}
