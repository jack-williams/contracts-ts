/*

  Implementations of first-order (flat) contracts. Each implementation
  maps to a flat spec in contractTypes.ts

*/

import {
    Top,
} from "./types";

import * as T from "./ContractTypes";

/**
 * Number predicate on values. Does not count NaN, +Infinity, and
 * -Infinity as numbers.
 */
function isNumber(value: Top): value is number  {
    return typeof value === "number" && isFinite(value);
}

/**
 * Boolean predicate.
 */
function isBoolean(value: Top): value is boolean  {
    return typeof value === "boolean";
}

/**
 * String predicate.
 */
function isString(value: Top): value is string  {
    return typeof value === "string";
}

/**
 * Object predicte. The predicate only accepts pure objects, excluding
 * values that are callable.
 */
function isObject(value: Top): value is object {
      return value !== null && typeof value === "object";
}

/**
 * Function predicate.
 */
function isFunction(value: Top): value is (...args: any[]) => any {
    return value !== null && typeof value === "function";
}

/**
 * Map type from flat specification types to their implementation types.
 */
interface SpecMap {
    [T.FlatSpec.Number]: (x: Top) => x is number;
    [T.FlatSpec.Boolean]: (x: Top) => x is boolean;
    [T.FlatSpec.String]: (x: Top) => x is string;
    [T.FlatSpec.Object]: (x: Top) => x is object;
    [T.FlatSpec.Function]: (x: Top) => x is (...args: any[]) => any;
}

/**
 * Mapping from flat specification types to their implementations.
 */
export const specMap: SpecMap = {
    [T.FlatSpec.Number]: isNumber,
    [T.FlatSpec.Boolean]: isBoolean,
    [T.FlatSpec.String]: isString,
    [T.FlatSpec.Object]: isObject,
    [T.FlatSpec.Function]: isFunction
}
