/*
 * A range of examples involving intersection.
 */

const contract = require('../dist/');
const Base = contract.Base;
const Type = contract.Type;


// Pos -> Bool
const posToBoolean = Type.and(Base.function, Type.fun([Base.positive], Base.boolean));

// Even -> String
const evenToString = Type.and(Base.function, Type.fun([Base.even], Base.string));

const overload1 = Type.and(Base.function, Type.fun([posToBoolean], Base.number));
const overload2 = Type.and(Base.function, Type.fun([evenToString], Base.string));

// (Pos -> Bool) `intersection` (Even -> String)
const functionType = Type.intersection(overload1, overload2);

function impl(f) {
    const result = f(4);
    if(typeof result === "boolean") return result ? 1 : 0;
    return result;
}

impl = contract.assert(impl, functionType);

// Select the first overload by passing a function that returns a boolean
console.log("impl(x => x < 100): " + impl(x => x < 100));

// Select the second overload by passing a function that returns a string
console.log("impl(x => x + \"a string\"): " + impl(x => x + "a string"));

/*
 * The next example will exhibit higher order positive blame, and show
 * why compatibly (defined in the paper) must find the smallest
 * elimination context.
 *
 * Sometimes it as ok for an intersection branch to raise positive
 * blame, provided that the same branch has raised negative blame
 * (because that overload was removed). In the first example, applying
 * impl to x => x < 100, will raise positive blame on the codomain of
 * the right branch because the result is not a string. This is ok
 * because we have already seen negative blame on the right branch
 * (the input function returns a boolean, not a string.)
 *
 * However there are cases we it is not ok to raise positive blame,
 * even if negative blame has been raised in the same branch.
 */

function badImpl(f) {
    const result = f(4);

    /*
     * After applying f to 4 using the application in try/catch below,
     * negative blame will be raised on the path dom[0]/cod[0]. So is
     * it now ok for the function body to supply an argument that does
     * not respect the right branch? The answer is no. This
     * application is not safe in general because the context could
     * have chosen the second overload, in which case passing an odd
     * argument would be invalid. The body of this function is relying
     * on the argument picking the first overload, which it cannot
     * do. We correctly get positive blame for the second application.
     *
     * Try commenting out the call f(3) to see the blame disappear.
     *
     */
    const result2 = f(3);
    if(typeof result === "boolean") return result ? 1 : 0;
    return result;
}

impl = contract.assert(badImpl, functionType);

try {
    // Select the first overload by passing a function that returns a boolean
    console.log("impl(x => x < 100): " + impl(x => x < 100));
} catch (e) {
    console.log(e);
}

/*
 * The next example includes an overloaded function that may return
 * another function.
 */

const numToNum  = Type.and(Base.function, Type.fun([Base.number], Base.number));
const booleanNegate  = Type.and(Base.function, Type.fun([Base.boolean], Base.boolean));

const plus = Type.and(Base.function, Type.fun([Base.number], numToNum));

const plusOrNegateType = Type.intersection(plus, booleanNegate);

function plusOrNegate(x) {
    if(typeof x === "number") {
        return y => x + y;
    }
    return !x;
}

plusOrNegate = contract.assert(plusOrNegate, "plus or negate", plusOrNegateType);

// Select the first overload and then apply the result.
console.log("plusOrNegate(3)(4): " + plusOrNegate(3)(4));
console.log("plusOrNegate(40)(2): " + plusOrNegate(40)(2));

// Select the second overload.
console.log("plusOrNegate(true): " + plusOrNegate(true));
console.log("plusOrNegate(false): " + plusOrNegate(false));

try {
    // Negative blame because we try and use the first overload but
    // supply a boolean where a number is expected!
    console.log("plusOrNegate(1)(true): " + plusOrNegate(1)(true));
} catch (e) {
    console.log(e);
}

try {
    // Negative blame because we violate the arity in both overloads.
    console.log("plusOrNegate(true,1): " + plusOrNegate(true,1));
} catch (e) {
    console.log(e);
}

/*
 * Intersection types and singleton types for conditionals
 */

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



