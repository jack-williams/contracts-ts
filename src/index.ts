import * as T from "./contractTypes";
import * as B from "./blame";
import * as S from "./seal";
import { check } from "./contracts";

const NUMBER = T.makeFlatType(T.FlatSpec.Number);
const FUNCTION = T.makeFlatType(T.FlatSpec.Function);
const BOOLEAN = T.makeFlatType(T.FlatSpec.Boolean);

const X = T.makeVariable("X");

const NandNtoN: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([NUMBER,NUMBER], NUMBER));
const BandBtoB: T.ContractType =
    T.makeAndType(FUNCTION,T.makeFunctionType([BOOLEAN,BOOLEAN], BOOLEAN));

const p = B.makeRootNode(B.label("add"));
const q = B.makeRootNode(B.label("id"));
const q2 = B.makeRootNode(B.label("id2"));

const ident = T.makeForallType("X", T.makeFunctionType([X],T.makeUnionType(X, NUMBER)));

let f = (x: any) => Math.random() > 0.5 ? x : 1;


f = check(f, p, ident);


f(32);
f("heuu");
f(true);
// f(true);
