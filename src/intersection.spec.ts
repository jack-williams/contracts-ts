import * as contract from "./index";
const Base = contract.Base;
const Type = contract.Type;

import { expect } from 'chai';
import * as mocha from 'mocha';

/*
 * Setup some types
 */
const posToBoolean = Type.and(Base.function, Type.fun([Base.positive], Base.boolean));
const evenToString = Type.and(Base.function, Type.fun([Base.even], Base.string));
const overload1 = Type.and(Base.function, Type.fun([posToBoolean], Base.number));
const overload2 = Type.and(Base.function, Type.fun([evenToString], Base.string));
const functionType = Type.intersection(overload1, overload2);
const numToNum = Type.and(Base.function, Type.fun([Base.number], Base.number));
const booleanNegate = Type.and(Base.function, Type.fun([Base.boolean], Base.boolean));
const plus = Type.and(Base.function, Type.fun([Base.number], numToNum));
const plusOrNegateType = Type.intersection(plus, booleanNegate);
const trueThenNumber = Type.and(Base.function, Type.fun([Base.true], Base.number));
const falseThenString = Type.and(Base.function, Type.fun([Base.false], Base.string));
const ifThenNumberElseString = Type.intersection(trueThenNumber, falseThenString);
const evenThenTrue = Type.and(Base.function, Type.fun([Base.even], Base.true));
const oddThenFalse = Type.and(Base.function, Type.fun([Base.odd], Base.false));
const stringThenNtoN = Type.and(Base.function, Type.fun([Base.string], numToNum));

describe("Intersection", () => {
    describe("with higher-order overload", () => {
        function impl(f: any) {
            const result = f(4);
            if (typeof result === "boolean") return result ? 1 : 0;
            return result;
        }

        const implWrap = contract.assert(impl, functionType);
        it("should not throw when given correct overload (left)", () => {
            expect(() => implWrap((x: any) => x < 100)).to.not.throw();
        });
        it("should not throw when given correct overload (right)", () => {
            expect(() => implWrap((x: any) => x + "a string")).to.not.throw();
        });

        function badImpl(f: any) {
            const result = f(4);
            const result2 = f(3);
            if (typeof result === "boolean") return result ? 1 : 0;
            return result;
        }

        const implBad = contract.assert(badImpl, functionType);
        it("should throw when applying the input to a bad argument", () => {
            expect(() => implBad((x: any) => x < 100)).to.throw();
        });
    });

    describe("with higher-order return type", () => {
        function plusOrNegate(x: any): any {
            if (typeof x === "number") {
                return (y: any) => x + y;
            }
            return !x;
        }

        const plusOrNegateWrapped = contract.assert(
            plusOrNegate, "plus or negate", plusOrNegateType);

        it("should not throw when correctly applied twice", () => {
            expect(() => plusOrNegateWrapped(3)(4)).to.not.throw();
        });

        it("should not throw when correctly applied once with first-order return", () => {
            expect(() => plusOrNegateWrapped(true)).to.not.throw();
            expect(() => plusOrNegateWrapped(false)).to.not.throw();
        });

        it("should throw when second application violates domain", () => {
            expect(() => plusOrNegateWrapped(1)(true)).to.throw();
            expect(() => plusOrNegateWrapped(true)(1)).to.throw();
        });
    });

    describe("with singleton types for conditionals", () => {
        function cond(x: any): any {
            return x ? 10 : "ten";
        }
        const wrappedConditional = contract.assert(cond, "conditional", ifThenNumberElseString);

        it("should not throw when given true or false", () => {
            expect(() => wrappedConditional(true)).to.not.throw();
            expect(() => wrappedConditional(false)).to.not.throw();
        });

        it("should throw when given non-boolean", () => {
            expect(() => wrappedConditional(0)).to.throw();
            expect(() => wrappedConditional("true")).to.throw();
        });
    });

    describe("with nesting", () => {
        const mega =
            Type.intersection(
                trueThenNumber,
                Type.intersection(
                    falseThenString,
                    Type.intersection(
                        evenThenTrue,
                        Type.intersection(
                            oddThenFalse,
                            stringThenNtoN
                        )
                    )
                )
            );

        function bigSwitch(x: any): any {
            switch (typeof x) {
                case "boolean": return x ? 1 : "hello world";
                case "number": return x % 2 === 0;
                case "string": return (y: any) => y + x.length;
            }
        }

        const bigSwitchWrapped = contract.assert(bigSwitch, "nested intersection", mega);

        it("should not throw when given correct input", () => {
            expect(() => bigSwitchWrapped(true)).to.not.throw();
            expect(() => bigSwitchWrapped(false)).to.not.throw();
            expect(() => bigSwitchWrapped(0)).to.not.throw();
            expect(() => bigSwitchWrapped(1)).to.not.throw();
            expect(() => bigSwitchWrapped("a long string")(42)).to.not.throw();

        });

        it("should throw when given undefined", () => {
            expect(() => bigSwitchWrapped(undefined)).to.throw();
        });

        it("should throw when supplying non-number to string overload return function", () => {
            expect(() => bigSwitchWrapped("a string")("another string")).to.throw();
        });
    });
});
