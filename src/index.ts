import * as T from "./contractTypes";
import * as B from "./blame";
import * as S from "./seal";
import { contract } from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);

const X = T.makeVariable("X");

const NtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER], NUMBER));
const BandBtoB: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([BOOLEAN,BOOLEAN], BOOLEAN));
const ID: T.ContractType =
    T.makeAndType(FUNCTION,T.makeForallType("X", T.makeFunctionType([X], X)));

const p = B.makeRootNode(B.label("identUnionTest"));
const q = B.makeRootNode(B.label("number"));
const q2 = B.makeRootNode(B.label("id2"));

function checkNum<X>(x: X): X  {
    return contract(x, q, NUMBER);
}

let w = (x: any) => (x + checkNum(x + 1));

w = contract(w, p, T.makeUnionType(NtoN,ID));

console.log(w(4));
//console.log(5);
// w(true);
