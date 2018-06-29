type ArgumentHandler<Context> = <X>(c: Context, args: X[]) => X[];
type ReturnHandler<Context> = <X>(c: Context, ret: X) => X;

function makeFunctionHandler<T extends object, CTX>(
    v: T,
    makeContext: () => CTX,
    argHandler: ArgumentHandler<CTX>,
    returnHandler: ReturnHandler<CTX>
): ProxyHandler<T> {
    return {
        apply(target: T, thisArg: any, args: any[]) {
            const stack = new Error().stack;
            if (stack) {
                console.log(args);
                console.log("LINE: " + stack.split('\n')[2]);
            }
            const context = makeContext();
            const checkedArgs = argHandler(context, args);
            const result = Reflect.apply(v as Function, thisArg, checkedArgs);
            return returnHandler(context, result);
        }
    }
}

export function createFunctionMonitor<T extends object, CTX>(
    v: T,
    makeContext: () => CTX,
    argHandler: ArgumentHandler<CTX>,
    returnHandler: ReturnHandler<CTX>
): T {
    return new Proxy(v, makeFunctionHandler(v, makeContext, argHandler, returnHandler));
}
