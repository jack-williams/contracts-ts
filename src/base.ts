/*

  Implementations of first-order (flat) contracts.

*/

import * as T from "./contractTypes";

/**
 * Number predicate on values. Does not count NaN, +Infinity, and
 * -Infinity as numbers.
 */
function isNumber(value: unknown): value is number {
    return typeof value === "number" && isFinite(value);
}

/**
 * Boolean predicate.
 */
function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

/**
 * String predicate.
 */
function isString(value: unknown): value is string {
    return typeof value === "string";
}

/**
 * Object predicte. The predicate only accepts pure objects, rejecting
 * values that are callable.
 */
function isObject(value: unknown): value is object {
    return value !== null && typeof value === "object";
}

/**
 * Function predicate.
 */
function isFunction(value: unknown): value is (...args: any[]) => any {
    return value !== null && typeof value === "function";
}


/**
 * A selection of base types.
 */
export const Base = {
    number: T.makeBaseType("number", isNumber),
    boolean: T.makeBaseType("boolean", isBoolean),
    string: T.makeBaseType("string", isString),
    object: T.makeBaseType("object", isObject),
    function: T.makeBaseType("function", isFunction),
    undefined: T.makeBaseType("undefined", (val: unknown) => val === undefined),
    even: T.makeBaseType("even", (val: unknown) => isNumber(val) && val % 2 === 0),
    odd: T.makeBaseType("odd", (val: unknown) => isNumber(val) && val % 2 !== 0),
    positive: T.makeBaseType("positive", (val: unknown) => isNumber(val) && val > 0),
    negative: T.makeBaseType("negative", (val: unknown) => isNumber(val) && val < 0),
    true: T.makeBaseType("true", (val: unknown) => isBoolean(val) && val),
    false: T.makeBaseType("false", (val: unknown) => isBoolean(val) && !val),
    any: T.makeBaseType("any", (_: any) => true), // another way to implement any
    never: T.makeBaseType("never", (_: any) => false),
}
