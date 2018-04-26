import * as T from "./contractTypes";
import * as B from "./blame";
import * as S from "./seal";
import {check} from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);

const X = T.makeVariable("X");

const NandNtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER,NUMBER], NUMBER));
const BandBtoB: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([BOOLEAN,BOOLEAN], BOOLEAN));

const p = B.makeRootNode(B.makeLabel("add"));
const q = B.makeRootNode(B.makeLabel("id"));
const q2 = B.makeRootNode(B.makeLabel("id2"));

const ident = T.makeForallType("X", T.makeFunctionType([X],X));
const NtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER], NUMBER));

let f = (x: any) => x + 1;


f = check(f, p, T.makeUnionType(ident, NtoN));


f(32);
// f(true);
