import {
    Debug,
    isFunction,
    isObject
} from "./common";

import * as T from "./contractTypes";
import * as B from './blame';
import * as M from './monitors';

declare const ERROR_TAG: unique symbol;
type ERROR_TAG = typeof ERROR_TAG;

declare const TYPE_TAG: unique symbol;
type TYPE_TAG = typeof TYPE_TAG;

interface Contract<E, T = unknown> {
    (p: B.BlameNode): <A>(val: A) => (A & T) | E;
    [ERROR_TAG]: E
    [TYPE_TAG]: T
}

type ContractInstantiator<E> = (context: ContractContext<E>) => Contracts<E>

interface ContractContext<E> {
    handleBlame<A>(root: B.RootNode, value: A): A | E
}

interface Contracts<E> {
    flat(pred: (val: unknown) => boolean): Contract<E>;
    flat<PRED>(pred: (val: unknown) => val is PRED): Contract<E, PRED>;
    fun<U extends Contract<unknown>[], COD extends Contract<unknown, unknown>>(cod: COD, ...dom: U): Contract<U[number][ERROR_TAG] | COD[ERROR_TAG] | E, (...args: any[]) => COD[TYPE_TAG]>;
    intersection<L extends Contract<unknown, unknown>, R extends Contract<unknown, unknown>>(left: L, right: R): Contract<L[ERROR_TAG] | R[ERROR_TAG], L[TYPE_TAG] & R[TYPE_TAG]>;
    union<EL, ER>(left: Contract<EL>, right: Contract<ER>): Contract<EL | ER>;
    and<EL, ER>(left: Contract<EL>, right: Contract<ER>): Contract<EL | ER>
    any: Contract<never>
}


const handleBlame: <X>(root: B.RootNode, value: X) => never =
    (root, value) => { throw ("\n Bad value:" + value + "\n"); }

function branch<EL, ER>(type: T.BranchKind, left: Contract<EL>, right: Contract<ER>): Contract<EL | ER> {
    return (p => {
        const [l, r] = B.makeBranchNodes(type, p);
        const leftContract = left(l);
        const rightContract = right(r);
        return val => rightContract(leftContract(val));
    }) as Contract<EL | ER>
}

function instantiateContracts<E = never>(context: ContractContext<E>): Contracts<E> {
    const contracts: Contracts<E> = {
        /*
         * Flat Contracts
         */
        flat<PRED>(pred: (val: unknown) => val is PRED): Contract<E, PRED> {
            return (p =>
                <X>(val: X) =>
                    pred(val) ? val : B.blame<X, E>(val, p, "Flat err", context.handleBlame)) as Contract<E, PRED>;
        },

        /*
         * Function Contracts
         */
        fun<U extends Contract<unknown>[], COD extends Contract<unknown, unknown>>(cod: COD, ...dom: U): Contract<U[number][ERROR_TAG] | COD[ERROR_TAG] | E, (...args: any[]) => COD[TYPE_TAG]> {
            type EDOM = U[number][ERROR_TAG];
            type ECOD = COD[ERROR_TAG];
            return (p => <X>(val: X) => {
                if (!isFunction(val) && !isObject(val)) {
                    return val;
                }
                const makeContext = () => B.makeAppNodes(p, 1);
                const argHandler = <X>(ctx: B.ApplicationNodes, args: X[]): (X | E | EDOM)[] => {
                    /*
                      Do not wrap the arguments if the arity check
                      failed. Technically we do not need to wrap the return
                      type as it cannot be blamed, but the machinery to do
                      this conditional wrapping can make things messy.
                    */
                    if (args.length > 1) {
                        const message = `Expecting 1 argument, received ${args.length}.`;
                        return [B.blame<X, E>(args[1], ctx.dom[1], message, context.handleBlame)];
                    }
                    if (args.length < 1) {
                        const message = `Expecting 1 argument, received ${args.length}.`;
                        return [B.blame<X, E>(args[0], ctx.dom[args.length],
                            message, context.handleBlame)];
                    }
                    return dom.map((c, i) => c(ctx.dom[i])(args[i]));
                }
                const returnHandler = <X>(ctx: B.ApplicationNodes, v: X) => cod(ctx.cod)(v);
                return M.createFunctionMonitor<X & object,
                    B.ApplicationNodes,
                    E | EDOM | ECOD>(val, makeContext, argHandler, returnHandler);
            }) as Contract<ECOD | EDOM | E, (...args: any[]) => COD[TYPE_TAG]>
        },

        /*
         * Intersection Contracts
         */
        intersection<L extends Contract<unknown, unknown>, R extends Contract<unknown, unknown>>(left: L, right: R): Contract<L[ERROR_TAG] | R[ERROR_TAG], L[TYPE_TAG] & R[TYPE_TAG]> {
            return branch(T.TypeKind.Intersection, left, right);
        },

        /*
         * Union Contracts
         */
        union<EL, ER>(left: Contract<EL>, right: Contract<ER>): Contract<EL | ER> {
            return branch(T.TypeKind.Union, left, right);
        },

        /*
         * And Contracts
         */
        and<EL, ER>(left: Contract<EL>, right: Contract<ER>): Contract<EL | ER> {
            return branch(T.TypeKind.And, left, right);
        },

        /*
         * The Any Contract
         */
        any: (p => val => val) as Contract<never>

    }
    return contracts;
}



function foo(x: any): any {
    return typeof x === "number" ? x > 3 : 10;
}

const { flat, fun, intersection, and } = instantiateContracts({
    handleBlame: (p, v) => 3
});

const { flat: flat2, fun: fun2, intersection: intersection2 } = instantiateContracts({
    handleBlame: (p, v) => true
});

const number = flat<number>((x): x is number => typeof x === "number");
const boolean = flat<boolean>((x): x is boolean => typeof x === "boolean");
const isFun = flat(x => typeof x === "function");
const nToN = fun(number, boolean);
const bToB = fun(boolean, number);
const i = intersection(nToN, bToB);
const f = and(isFun, bToB);
const bar = i(B.makeRootNode(B.label('foo'), T.any))(foo);

if (typeof bar === "function") {
    console.log(bar(3));
}
