/*

  Common Functionality

*/


/**
   Top Type - everything is a subtype of this type, but prevents
   down-casting like `any`.
*/
export type Top = {} | void | null;


interface Debug {
    fail(message: string): never;
    trace(message: string): void;
}

export const Debug: Debug = {
    fail: (message: string) => { throw Error("Debug.fail: " + message) },
    trace: (message: string) => { console.log(message) },
}

export function isFunction(value: Top): value is (...args: any[]) => any {
    return typeof value === "function";
}

export function isObject(value: Top): value is object {
    return typeof value === "object";
}
