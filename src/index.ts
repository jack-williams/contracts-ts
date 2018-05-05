import * as T from "./contractTypes";
import * as B from "./blame";
import * as S from "./seal";
import { contract } from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);

const X = T.makeVariable("X");

const NandNtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER,NUMBER], NUMBER));
const BandBtoB: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([BOOLEAN,BOOLEAN], BOOLEAN));

const p = B.makeRootNode(B.label("identUnionTest"));
const q = B.makeRootNode(B.label("numeber"));
const q2 = B.makeRootNode(B.label("id2"));

function checkNum<X>(x: X): X  {
    return contract(x, q, NUMBER);
}


const ident = T.makeForallType("X", T.makeFunctionType([NUMBER, X],T.makeUnionType(X, NUMBER)));

let f = (x: any, y: any) => true;

f = contract(f, p, ident);

let res = f(3, 32);

