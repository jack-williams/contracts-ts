/*

  Run-time representations of types used to build contracts. Supports
  higher-order function, intersection, and union.

*/

/** Descriminators for types */
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

/**
 * Subset of type kinds that describe branching types.
 */
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

export type ContractType =
    FlatType | AnyType |                     // Base
    FunctionType |                           // Function
    IntersectionType | UnionType | AndType;  // Branching


export const any: AnyType = { kind: TypeKind.Any };

export function makeFlatType(spec: FlatSpec): FlatType {
    return { kind: TypeKind.Flat, spec };
}

export function fun(argumentTypes: ContractType[], returnType: ContractType): FunctionType {
    return { kind: TypeKind.Function, argumentTypes, returnType };
}

function makeBranchType<B extends BranchKind>(
    branch: B,
    left: ContractType,
    right: ContractType
): BranchType<B> {
    return { kind: branch, left, right };
}

export function intersection(left: ContractType, right: ContractType): IntersectionType {
    return makeBranchType(TypeKind.Intersection, left, right);
}

export function union(left: ContractType, right: ContractType): UnionType {
    return makeBranchType(TypeKind.Union, left, right);
}

export function and(left: ContractType, right: ContractType): AndType {
    return makeBranchType(TypeKind.And, left, right);
}
