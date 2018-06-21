export const enum TypeKind {
    Flat,
    Function,
    Intersection,
    Union,
    And,
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

export interface AnyType {
    kind: TypeKind.Any;
}

export type IntersectionType = BranchType<TypeKind.Intersection>;
export type UnionType = BranchType<TypeKind.Union>;
export type AndType = BranchType<TypeKind.And>;
export type ContractType = FlatType | FunctionType | IntersectionType | UnionType | AndType | AnyType;


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
