import * as T from "./contractTypes";
import * as B from "./blame";
import { contract } from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);
const STRING = T.makeFlatType(T.FlatSpec.String);

const NtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER], NUMBER));
const BtoBunionS: T.ContractType =    
    T.makeAndType(FUNCTION,T.makeFunctionType([BOOLEAN], T.makeUnionType(BOOLEAN, STRING)));
const Example: T.ContractType =
    T.makeIntersectionType(NtoN, BtoBunionS);

const p = B.makeRootNode(B.label("example"));

function f(x: any): any {
    if(typeof x === "boolean") {
        return x ? "hello world" : !x;
    }
    return x*10;
}

let w = contract(f, p, Example);

w(3);
w(true);
w(false);
