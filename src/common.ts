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
