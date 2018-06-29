/*
 * Example from the introduction in the paper.
 */

const contract = require('../dist/');
const Base = contract.Base;
const Type = contract.Type;

function f(x) {
    if(typeof x === 'boolean') {
        if (x) return  "hello world"; return !x
    }
    return x*10;
}

const stringOrBoolean = Type.union(Base.string, Base.boolean);
const booleanToSorB = Type.and(Base.function, Type.fun([Base.boolean], stringOrBoolean));
const numToNum = Type.and(Base.function, Type.fun([Base.number], Base.number));

// Wrap the function
f = contract.assert(f, Type.intersection(booleanToSorB, numToNum));

// Try some legal fuction calls
console.log("f(true): " + f(true));
console.log("f(false): " + f(false));
console.log("f(42): " + f(42));


// Some illegal function calls

try {
    // Negative blame because input is not boolean or number
    f("a string")
} catch (e) {
    console.log(e);
}

try {
    // Negative blame for too many arguments
    f(true, false)
} catch (e) {
    console.log(e);
}

// A faulty function implementation

function fBad(x) {
    if(typeof x === 'boolean') {
        if (x) return  "hello world"; return 42;
    }
    return "I should be a number";
}

f = contract.assert(fBad, Type.intersection(booleanToSorB, numToNum));

try {
    // Positive blame because the context supplied a boolean so it
    // must be overload: Boolean -> (String or Boolean),
    // however the function returns a number.
    f(false)
} catch (e) {
    console.log(e);
}

try {
    // Positive blame because the context supplied a number so it
    // must be overload: Number -> Number,
    // however the function returns a string.
    f(33)
} catch (e) {
    console.log(e);
}
