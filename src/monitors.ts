type ArgumentHandler<Context> = <X>(c: Context, args: X[]) => X[];
type ReturnHandler<Context> = <X>(c: Context, ret: X) => X;

/**
 * Construct a function handler for a function contract. The handler
 * will intercept the `apply` trap and wrap the arguments and result
 * using the specific handlers.
 *
 * @param v
 * @param makeContext
 * @param argHandler
 * @param returnHandler
 */
function makeFunctionHandler<T extends object, CTX>(
    v: T,
    makeContext: () => CTX,
    argHandler: ArgumentHandler<CTX>,
    returnHandler: ReturnHandler<CTX>
): ProxyHandler<T> {
    return {
        apply(target: T, thisArg: any, args: any[]) {
            const context = makeContext();
            const checkedArgs = argHandler(context, args);
            const result = Reflect.apply(v as Function, thisArg, checkedArgs);
            return returnHandler(context, result);
        }
    }
}

/**
 * Construct a function monitor that will wrap an object and intercept
 * application. We use `Proxy` object to implement the intercession.
 *
 * @param v
 * @param makeContext
 * @param argHandler
 * @param returnHandler
 */
export function createFunctionMonitor<T extends object, CTX>(
    v: T,
    makeContext: () => CTX,
    argHandler: ArgumentHandler<CTX>,
    returnHandler: ReturnHandler<CTX>
): T {
    return new Proxy(v, makeFunctionHandler(v, makeContext, argHandler, returnHandler));
}
