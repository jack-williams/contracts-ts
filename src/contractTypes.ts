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

export interface ForallType {
    kind: TypeKind.Forall;
    binder: Ident;
    body: ContractType;
}

export interface Variable {
    kind: TypeKind.Variable;
    id: Ident;
}

export type GeneratedId = string;
export interface GenaratedName {
    kind: TypeKind.Variable;
    id: GeneratedId;
    covariant: boolean;
}

export function isName(i: Variable | GenaratedName): i is GenaratedName {
    return typeof i.id === "string" && (i as GenaratedName)["covariant"] !== undefined;
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


export const ANY: AnyType = { kind: TypeKind.Any };

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

export function makeName(id: GeneratedId, covariant: boolean): GenaratedName  {
    return {kind: TypeKind.Variable, id, covariant};
}

function substituteWithVariance(t: ContractType, i: Ident, n: GeneratedId, covariant: boolean): ContractType {
    switch (t.kind) {
        case TypeKind.Function:
            return makeFunctionType(
                t.argumentTypes.map(t1 => substituteWithVariance(t1, i, n, !covariant)),
                substituteWithVariance(t.returnType, i, n, covariant));
        case TypeKind.Intersection:
            return makeIntersectionType(
                substituteWithVariance(t.left, i, n, covariant),
                substituteWithVariance(t.right, i, n, covariant));
        case TypeKind.Union:
            return makeUnionType(
                substituteWithVariance(t.left, i, n, covariant),
                substituteWithVariance(t.right, i, n, covariant));
        case TypeKind.And:
            return makeAndType(
                substituteWithVariance(t.left, i, n, covariant),
                substituteWithVariance(t.right, i, n, covariant));
        case TypeKind.Forall:
            return t.binder === i ? t :
                makeForallType(t.binder, substituteWithVariance(t.body, i, n, covariant));
        case TypeKind.Variable:
            return t.id === i ? makeName(n, covariant) : t;
        case TypeKind.Flat:
        case TypeKind.Any:
            return t;
    }
}

let idGen = 0;
function freshName(source: string): GeneratedId {
    idGen++;
    return `${source}_${idGen}`;
}

export function forallConversion(t: ForallType): [ContractType, GeneratedId]  {
    const id = freshName(t.binder);
    return [substituteWithVariance(t.body, t.binder, id, true), id];
}
 
export const enum ScopeDirection {
    In,
    Out
}

export interface ScopeSet {
    [id: string]: ScopeDirection
}

export function makeScopeSet(): ScopeSet {
    return {};
}

export function addToScope(scope: ScopeSet, id: GeneratedId): ScopeSet  {
    const clone = Object.assign({}, scope);
    clone[id] = ScopeDirection.In;
    return clone;
}

export function invertScopeSet(scope: ScopeSet): ScopeSet {
    const result: ScopeSet = {};
    for(const id in scope) {
        result[id] = scope[id] === ScopeDirection.In ? ScopeDirection.Out : ScopeDirection.In;
    }
    return result;
}

