/*

  Run-time representations of types used to build contracts. Supports
  higher-order function, intersection, and union.

*/

import { Top } from './common';

/** Descriminators for types */
export const enum TypeKind {
    Base,
    Function,
    Intersection,
    Union,
    And,
    Any,
}

/**
 * Subset of type kinds that describe branching types.
 */
export type BranchKind = TypeKind.Intersection | TypeKind.Union | TypeKind.And;

export interface BaseType {
    kind: TypeKind.Base;
    description: string;
    spec: (val: Top) => boolean;
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
    BaseType | AnyType |                     // Base
    FunctionType |                           // Function
    IntersectionType | UnionType | AndType;  // Branching


/**
 * The `any` type can be implement using a base type with a spec that
 * always returns true. For parity with the paper, and for performance
 * reasons, it is nice to have it built-in so that it truely is the
 * identity function.
 */
export const any: AnyType = { kind: TypeKind.Any };

export function makeBaseType(description: string, spec: (val: Top) => boolean): BaseType {
    return { kind: TypeKind.Base, description, spec };
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
