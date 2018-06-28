import {
    Top,
} from "./types";

import * as T from "./ContractTypes";

function isNumber(value: Top): value is number  {
    return typeof value === 'number';
}

function isBoolean(value: Top): value is boolean  {
    return typeof value === 'boolean';
}

function isString(value: Top): value is string  {
    return typeof value === 'string';
}

function isObject(value: Top): value is object {
      return value !== null && typeof value === 'object';
}

function isFunction(value: Top): value is (...args: any[]) => any {
    return value !== null && typeof value === 'function';
}


interface SpecMap {
    [T.FlatSpec.Number]: (x: Top) => x is number;
    [T.FlatSpec.Boolean]: (x: Top) => x is boolean;
    [T.FlatSpec.String]: (x: Top) => x is string;
    [T.FlatSpec.Object]: (x: Top) => x is object;
    [T.FlatSpec.Function]: (x: Top) => x is (...args: any[]) => any;
}

export const specMap: SpecMap = {
    [T.FlatSpec.Number]: isNumber,
    [T.FlatSpec.Boolean]: isBoolean,
    [T.FlatSpec.String]: isString,
    [T.FlatSpec.Object]: isObject,
    [T.FlatSpec.Function]: isFunction
}
