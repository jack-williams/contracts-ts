export const enum TypeKind {
    Flat,
    Function,
    Intersection,
    Union,
    And,
    Forall,
    Variable,
    Any,
}

export const enum FlatSpec {
    Number,
    Boolean,
    String,
    Function,
    Object
}

export type BranchKind = TypeKind.Intersection | TypeKind.Union | TypeKind.And;

export interface FlatType {
    kind: TypeKind.Flat;
    spec: FlatSpec;
}

export interface FunctionType {
    kind: TypeKind.Function;
    argumentTypes: ContractType[];
    returnType: ContractType;
}

export interface BranchType<Kind extends BranchKind> {
    kind: Kind;
    left: ContractType;
    right: ContractType;
}

type Ident = string;
type GenId = number & {__id: any};

export interface ForallType {
    kind: TypeKind.Forall;
    binder: Ident;
    body: ContractType;
}

export interface Variable {
    kind: TypeKind.Variable;
    id: Ident;
}

export interface GenaratedName {
    kind: TypeKind.Variable;
    id: GenId;
    contravariant: boolean;
}

export function isName(i: Variable | GenaratedName): i is GenaratedName {
    return ("contravariant" in i);
}

export interface AnyType {
    kind: TypeKind.Any;
}

export type IntersectionType = BranchType<TypeKind.Intersection>;
export type UnionType = BranchType<TypeKind.Union>;
export type AndType = BranchType<TypeKind.And>;
export type ContractType =
    FlatType | FunctionType | IntersectionType | UnionType | AndType |
    ForallType | Variable | GenaratedName | AnyType;


export function makeFlatType(spec: FlatSpec): FlatType {
    return {kind: TypeKind.Flat, spec};
}

export function makeFunctionType(argumentTypes: ContractType[], returnType: ContractType): FunctionType {
    return {kind: TypeKind.Function, argumentTypes: argumentTypes.slice(0), returnType};
}

function makeBranchType<B extends BranchKind>(branch: B, left: ContractType, right: ContractType): BranchType<B> {
    return {kind: branch, left, right};
}

export function makeIntersectionType(left: ContractType, right: ContractType): IntersectionType {
    return makeBranchType(TypeKind.Intersection, left, right);
}

export function makeUnionType(left: ContractType, right: ContractType): UnionType {
    return makeBranchType(TypeKind.Union, left, right);
}

export function makeAndType(left: ContractType, right: ContractType): AndType {
    return makeBranchType(TypeKind.And, left, right);
}

export function makeForallType(binder: Ident, body: ContractType): ContractType {
    return {kind: TypeKind.Forall, binder, body};
}

export function makeVariable(id: Ident): Variable {
    return {kind: TypeKind.Variable, id};
}

export function makeName(id: GenId, contravariant: boolean): GenaratedName  {
    return {kind: TypeKind.Variable, id, contravariant};
}

function substituteWithVariance(t: ContractType, i: Ident, n: GenId, contravariant: boolean): ContractType {
    switch(t.kind) {
        case TypeKind.Function:
            return makeFunctionType(
                t.argumentTypes.map(t1 => substituteWithVariance(t1, i, n, !contravariant)),
                substituteWithVariance(t.returnType, i, n, contravariant));
        case TypeKind.Intersection:
            return makeIntersectionType(
                substituteWithVariance(t.left, i, n, contravariant),
                substituteWithVariance(t.right, i, n, contravariant));
        case TypeKind.Union:
            return makeUnionType(
                substituteWithVariance(t.left, i, n, contravariant),
                substituteWithVariance(t.right, i, n, contravariant));
        case TypeKind.And:
            return makeAndType(
                substituteWithVariance(t.left, i, n, contravariant),
                substituteWithVariance(t.right, i, n, contravariant));
        case TypeKind.Forall:
            return t.binder === i ? t : makeForallType(t.binder, substituteWithVariance(t.body, i, n, contravariant));
        case TypeKind.Variable:
            return t.id === i ? makeName(n, contravariant) : t;
        case TypeKind.Flat:
        case TypeKind.Any:
            return t;
    }
}

export function forallConversion(t: ForallType): ContractType  {
    return substituteWithVariance(t.body, t.binder, freshName(), true);
}

const gensym: () => GenId = (() => {
    let gensymSeed: number = 0;
    return () => { return gensymSeed++ as GenId; }
})();

export const freshName: () => GenId = gensym;
