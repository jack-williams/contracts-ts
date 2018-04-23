import * as T from "./contractTypes";
import * as B from "./blame";
import {check} from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);

const NandNtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER,NUMBER], NUMBER));
const BandBtoB: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([BOOLEAN,BOOLEAN], BOOLEAN));

const p = B.makeRootNode(B.makeLabel("add"));

let add = (x: any, y: any) => {
    if(typeof x === "number") return x + y;
    return x && y;
}

add = check(add, p, T.makeIntersectionType(NandNtoN, BandBtoB));

for(let i = 0; i < 1000; i++) {
    if(i < 999) {
        add(3,4);
    } else {
        add(false,3);
    }
}
