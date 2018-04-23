import * as T from "./contractTypes";
import * as C from './checks';
import * as M from './monitors';
import * as B from './blame';


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

function handleBlame(resolvedToTop: boolean): void  {
    if(resolvedToTop) {
        throw new Error("blame");
    }
}

function checkFlat<X>(v: X, p: B.BlameNode, type: T.FlatType): X {
    const spec = C.specMap[type.spec];
    if(spec(v)) {
        return v;
    }
    console.log(B.nodeToString(p));
    B.blame(p, (b) => { if(b) { console.log("blamed " + B.nodeToString(p)); } handleBlame(b) });
    return v;
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

function checkVariable<X>(v: X, p: B.BlameNode, type: T.Variable | T.GenaratedName): X {
    if(T.isName(type)) {
        if(type.contravariant) {
            // seal;
        } else {
            // unseal;
        }
    }
    return v;
}

function checkBranching<B extends T.BranchKind, X>(v: X, p: B.BlameNode, type: T.BranchType<B>): X {
    const [l, r] = B.makeBranchNodes(type.kind, p);
    return check(check(v, l, type.left), r, type.right);
}
