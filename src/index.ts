import * as T from "./contractTypes";
import * as B from "./blame";
import { Base } from "./base";
import { assert } from "./contracts";

/**
 * Helper function to create 'normal' function contracts that check
 * boths both the first-order part and the higher-order part.
 */
function fun(c: T.FunctionType): T.ContractType  {
    return T.and(Base.function, c);
}

const EtoE: T.ContractType = fun(T.fun([Base.string, Base.string], Base.string))
const PtoP: T.ContractType = fun(T.fun([Base.number], Base.number))
const Example: T.ContractType = T.intersection(EtoE, PtoP);

function f(x?: any, y?: any): any {
    if(typeof x === 'number') {
        return x + 10;
    }
    return x+y;
}

let w = assert(f, "example", Example);

// w("uthe");
w("44", "theun");
w(3);
// w(false);
