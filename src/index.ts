import * as T from "./contractTypes";
import * as B from "./blame";
import { Base } from "./base";
import { contract } from "./contracts";

const EtoE: T.ContractType = T.and(T.fun([T.any, Base.string], Base.string), Base.function);
const PtoP: T.ContractType = T.and(T.fun([Base.string, T.any], Base.string), Base.function);
const Example: T.ContractType = T.intersection(EtoE, PtoP);

function f(x: any, y: any): any {
    return x + y;
}

let w = contract(f, "example", Example);

// w("uthe");
w("44", 3);
w(3, 3);
// w(false);
