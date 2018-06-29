/*
 * Example from the section on union types.
 */

const contract = require('../dist/');
const Base = contract.Base;
const Type = contract.Type;

/*
 * Union types have the very interesting property that in some cases
 * we need multiple applications of the same function to detect a
 * faultly function -- a single call in isolation is not enough.
 */

function faulty(x) {
    if(x) return 1;
    return x;
}

const booleanToNum = Type.and(Base.function, Type.fun([Base.boolean], Base.number));
const booleanToboolean = Type.and(Base.function, Type.fun([Base.boolean], Base.boolean));
const unionFunction = Type.union(booleanToboolean, booleanToNum);

faulty1 = contract.assert(faulty, "faulty1", unionFunction);

// This does not raise blame on it's own because it returns a number
// that satifies the right branch.
console.log("faulty1(true): " + faulty1(true));

// We use a new contract for the second application to isolate the call.

faulty2 = contract.assert(faulty, "faulty2", unionFunction);

// This does not raise blame on it's own because it returns a boolean
// that satifies the left branch.
console.log("faulty2(false): " + faulty2(false));

/*
 * However the type (B -> B) `union` (B -> N) says that it satifies
 * one of the function types, but it may not flip-flop between
 * both. However we cannot detect this unless we issue multipe calls.
 */

faulty3 = contract.assert(faulty, "faulty3", unionFunction);

// This single call is ok.
console.log("faulty3(true): " + faulty3(true));

try {
    // However when we apply the same function again we observe that
    // it has now flip-flopped and decided it wants to satisfy the
    // other branch. This is not allowed and we get positive blame.
    faulty3(false);
} catch (e) {
    console.log(e);
}

/*
 * We can give this function a meaningful type, however we must change
 * where the union type is introduced. Instead of:
 *
 * - (B -> B) `union` (B -> N)
 *
 * We shall let the function pick the union branch to satisfy /per/
 * application, using type:
 *
 * - B -> (B `union` N)
 *
 */

const booleanOrNumber = Type.union(Base.boolean, Base.number);
const correctType = Type.and(Base.function, Type.fun([Base.boolean], booleanOrNumber));
ok = contract.assert(faulty, "ok", correctType);

// Now issuing both calls are ok, as we can pick to satify boolean or
// number per application.

console.log("ok(true): " + ok(true));
console.log("ok(false): " + ok(false));
