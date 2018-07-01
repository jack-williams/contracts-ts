import * as contract from "./index";
const Base = contract.Base;
const Type = contract.Type;

import { expect } from 'chai';
import * as mocha from 'mocha';

/*
 * Setup some types.
 */
const booleanToNum = Type.and(Base.function, Type.fun([Base.boolean], Base.number));
const booleanToboolean = Type.and(Base.function, Type.fun([Base.boolean], Base.boolean));
const unionFunction = Type.union(booleanToboolean, booleanToNum);
const booleanOrNumber = Type.union(Base.boolean, Base.number);
const unionReturn = Type.and(Base.function, Type.fun([Base.boolean], booleanOrNumber));

const PositiveBlame = new Error("Positive");
const NegativeBlame = new Error("Negative");

describe("Union", () => {
    before(() => {
        // Setup the handler to return blame charges. This lets us check we
        // blame the right party in the unit tests.
        contract.setHandler((root: contract.RootNode) => {
            if (root.info.charge) {
                throw PositiveBlame;
            }
            throw NegativeBlame
        });
    })

    function flipflop(x: any) {
        if (x) return 1;
        return x;
    }

    describe("of functions with disjoint codomain", () => {
        it("should not throw when applied once", () => {
            const flip = contract.assert(flipflop, "flip", unionFunction);
            const flop = contract.assert(flipflop, "flop", unionFunction);
            expect(() => flip(true)).to.not.throw();
            expect(() => flop(false)).to.not.throw();
        });

        it("should throw when applied twice", () => {
            const flipflopWrapped = contract.assert(flipflop, "flipflop", unionFunction);
            expect(() => flipflopWrapped(true)).to.not.throw();
            expect(() => flipflopWrapped(false)).to.throw(PositiveBlame);
        });

        it("should throw when applied twice (in other order)", () => {
            const flipflopWrapped = contract.assert(flipflop, "flipflop", unionFunction);
            expect(() => flipflopWrapped(false)).to.not.throw();
            expect(() => flipflopWrapped(true)).to.throw(PositiveBlame);
        });

        it("should throw when given any wrong input", () => {
            const flipflopWrapped = contract.assert(flipflop, "flipflop", unionFunction);
            expect(() => flipflopWrapped(0)).to.throw(NegativeBlame);
            expect(() => flipflopWrapped("hello")).to.throw(NegativeBlame);
        });

    });

    describe("in return type of function", () => {
        const fn = contract.assert(flipflop, "fn", unionReturn);
        it("should allow flip-flopping", () => {
            expect(() => fn(true)).to.not.throw();
            expect(() => fn(false)).to.not.throw();
            expect(() => fn(true)).to.not.throw();
            expect(() => fn(false)).to.not.throw();
        });
    });
});
