/*

  Common Functionality

*/

interface Debug {
    fail(message: string): never;
    trace(message: string): void;
}

export const Debug: Debug = {
    fail: (message: string) => { throw Error("Debug.fail: " + message) },
    trace: (message: string) => { console.log(message) },
}

export function isFunction(value: unknown): value is (...args: any[]) => any {
    return typeof value === "function";
}

export function isObject(value: unknown): value is object {
    return typeof value === "object";
}
