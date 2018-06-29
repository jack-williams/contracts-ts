import * as T from "./contractTypes";
import * as B from "./blame";
import { contract } from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);
const STRING = T.makeFlatType(T.FlatSpec.String);

const NtoN: T.ContractType = T.and(T.fun([NUMBER], NUMBER), FUNCTION);
const BtoB: T.ContractType = T.and(T.fun([BOOLEAN], BOOLEAN), FUNCTION);
const BtoBunionS: T.ContractType = T.and(FUNCTION, T.fun([BOOLEAN], T.union(STRING, BtoB)));
const Example: T.ContractType = T.intersection(NtoN, BtoBunionS);

function f(x: any): any {
    if(typeof x === "boolean") {
        return x ? "hello world" : (_: any) => true;
    }
    return x*10;
}

let w = contract(f, "example", Example);

// w("uthe");
w(false)(true);
// w(false);
