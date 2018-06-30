import * as contract from "./index";
const Base = contract.Base;
const Type = contract.Type;

import { expect } from 'chai';
import * as mocha from 'mocha';

const posToBoolean = Type.and(Base.function, Type.fun([Base.positive], Base.boolean));
const evenToString = Type.and(Base.function, Type.fun([Base.even], Base.string));
const overload1 = Type.and(Base.function, Type.fun([posToBoolean], Base.number));
const overload2 = Type.and(Base.function, Type.fun([evenToString], Base.string));
const functionType = Type.intersection(overload1, overload2);

describe("Intersection", () => {
    describe("higher-order overload", () => {
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

    describe("higher-order return type", () => {
        const numToNum = Type.and(Base.function, Type.fun([Base.number], Base.number));
        const booleanNegate = Type.and(Base.function, Type.fun([Base.boolean], Base.boolean));

        const plus = Type.and(Base.function, Type.fun([Base.number], numToNum));

        const plusOrNegateType = Type.intersection(plus, booleanNegate);

        function plusOrNegate(x: any): any {
            if (typeof x === "number") {
                return (y: any) => x + y;
            }
            return !x;
        }

        const plusOrNegateWrapped = contract.assert(
            plusOrNegate, "plus or negate", plusOrNegateType);

        it("should not throw when correct applied twice", () => {
            expect(() => plusOrNegateWrapped(3)(4)).to.not.throw();
        });

        it("should not throw when correct applied once with first-order return", () => {
            expect(() => plusOrNegateWrapped(true)).to.not.throw();
            expect(() => plusOrNegateWrapped(false)).to.not.throw();
        });

        it("should throw when second application violates domain", () => {
            expect(() => plusOrNegateWrapped(1)(true)).to.throw();
            expect(() => plusOrNegateWrapped(true)(1)).to.throw();
        });
    });
});

/** 
const trueThenNumber = Type.and(Base.function, Type.fun([Base.true], Base.number));
const falseThenString = Type.and(Base.function, Type.fun([Base.false], Base.string));
const ifThenNumberElseString = Type.intersection(trueThenNumber, falseThenString);

function f(x) {
    return x ? 10 : "ten";
}

f = contract.assert(f, "conditional", ifThenNumberElseString);

console.log("f(true): " + f(true));
console.log("f(false): " + f(false))

try {
    // Not true or false, so negative blame!
    console.log("f(0): " + f(0));
} catch (e) {
    console.log(e);
}

const evenThenTrue = Type.and(Base.function, Type.fun([Base.even], Base.true));
const oddThenFalse = Type.and(Base.function, Type.fun([Base.odd], Base.false));
const stringThenNtoN = Type.and(Base.function, Type.fun([Base.string], numToNum));

const mega =
    Type.intersection(
        trueThenNumber,               // true -> Number
        Type.intersection(
            falseThenString,          // false -> String
            Type.intersection(
                evenThenTrue,         // Even -> true
                Type.intersection(
                    oddThenFalse,     // Odd -> false
                    stringThenNtoN    // String -> Number -> Number
                )
            )
        )
    );

console.log(mega);

function bigSwitch(x) {
    switch (typeof x) {
        case "boolean": return x ? 1 : "hello world";
        case "number": return x % 2 === 0;
        case "string": return y => y + x.length;
    }
}

bigSwitch = contract.assert(bigSwitch, "nested intersection", mega);

console.log("bigSwitch(true): " + bigSwitch(true));
console.log("bigSwitch(false): " + bigSwitch(false));
console.log("bigSwitch(0): " + bigSwitch(0));
console.log("bigSwitch(1): " + bigSwitch(1));
console.log("bigSwitch(\"a long string\")(29): " + bigSwitch("a long string")(29));

try {
    // Passing an undefined that does not satisfy any of the domain
    // types, yielding negative blame.
    bigSwitch(undefined);
} catch (e) {
    console.log(e);
}

try {
    // Passing a string selects the overload String -> Number ->
    // Number, however we supply a string as the second argument so
    // negative blame is raised.
    bigSwitch("a string")("another string");
} catch (e) {
    console.log(e);
}

*/
