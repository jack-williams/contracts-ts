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


// Pretty Printing

function baseToString(type: BaseType): string {
    return type.description;
}

function functionToSimpleObj(type: FunctionType): object {
    const args = type.argumentTypes.map(typeToSimpleObj);
    const ret = typeToSimpleObj(type.returnType);
    return { args, ret };
}

function branchingToSimpleObj(type: BranchType<BranchKind>): object {
    const left = typeToSimpleObj(type.left);
    const right = typeToSimpleObj(type.right);
    let branch: string;
    switch (type.kind) {
        case TypeKind.And: branch = "and"; break;
        case TypeKind.Intersection: branch = "intersection"; break;
        case TypeKind.Union: branch = "union"; break;
    }
    return { branch: branch!, left, right };
}

function typeToSimpleObj(type: ContractType): any {
    switch (type.kind) {
        case TypeKind.Base:
            return baseToString(type);

        case TypeKind.Function:
            return functionToSimpleObj(type)

        case TypeKind.Intersection:
        case TypeKind.Union:
        case TypeKind.And:
            return branchingToSimpleObj(type);

        case TypeKind.Any:
            return "any";
    }
}

export function typeToString(type: ContractType): string {
    return JSON.stringify(typeToSimpleObj(type), undefined, 2);
}
