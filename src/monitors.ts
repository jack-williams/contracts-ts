type ArgumentHandler<Context, E> = <X>(c: Context, args: X[]) => (X | E)[];
type ReturnHandler<Context, E> = <X>(c: Context, ret: X) => X | E;

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
function makeFunctionHandler<T extends object, CTX, E>(
    v: T,
    makeContext: () => CTX,
    argHandler: ArgumentHandler<CTX, E>,
    returnHandler: ReturnHandler<CTX, E>
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
export function createFunctionMonitor<T extends object, CTX, E>(
    v: T,
    makeContext: () => CTX,
    argHandler: ArgumentHandler<CTX, E>,
    returnHandler: ReturnHandler<CTX, E>
): T {
    return new Proxy(v, makeFunctionHandler(v, makeContext, argHandler, returnHandler));
}
