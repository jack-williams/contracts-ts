import {
    Top,
    Debug,
    isFunction,
    isObject
} from "./common";

import * as T from "./contractTypes";
import * as B from './blame';
import * as M from './monitors';

type Contract = (p: B.BlameNode) => <A>(val: A) => A;

/**
 * Mutable reference to the blame handler that can be changed at a
 * later date via `setHandler`.
 */
let handleBlame: (root: B.RootNode, errorString: string) => void =
    (root, errorString) => { throw ("\n" + errorString + "\n"); }

function flat(pred: (val: Top) => boolean): Contract {
    return p => val => pred(val) ? val : B.blame(val, p, "Flat err", handleBlame);
}

function fun(dom: Contract, cod: Contract): Contract {
    return p => val => {
        if (!isFunction(val) && !isObject(val)) {
            return val;
        }
        const makeContext = () => B.makeAppNodes(p, 1);
        const argHandler = <X>(ctx: B.ApplicationNodes, args: X[]) => {
            /*
              Do not wrap the arguments if the arity check
              failed. Technically we do not need to wrap the return
              type as it cannot be blamed, but the machinery to do
              this conditional wrapping can make things messy.
            */
            if (args.length > 1) {
                const message = `Expecting 1 argument, received ${args.length}.`;
                return B.blame(args, ctx.dom[1], message, handleBlame);
            }
            if (args.length < 1) {
                const message = `Expecting 1 argument, received ${args.length}.`;
                return B.blame(args, ctx.dom[args.length], message, handleBlame);
            }
            return [dom(ctx.dom[0])(args[0])]
        }
        const returnHandler = <X>(ctx: B.ApplicationNodes, v: X) => cod(ctx.cod)(v);
        return M.createFunctionMonitor(val, makeContext, argHandler, returnHandler);
    }
}

function branch(type: T.BranchKind, left: Contract, right: Contract): Contract {
    return p => {
        const [l, r] = B.makeBranchNodes(type, p);
        const leftContract = left(l);
        const rightContract = right(r);
        return val => rightContract(leftContract(val));
    }
}


function foo(x: any): any {
    return typeof x === "number" ? x + 1 : 10;
}

const number = flat(x => typeof x === "number");
const boolean = flat(x => typeof x === "boolean");
const nToN = fun(number, number);
const bToB = fun(boolean, boolean);
const i = branch(T.TypeKind.Intersection, nToN, bToB);
const bar = i(B.makeRootNode(B.label('foo'), T.any))(foo);

bar(3);
bar(true);


