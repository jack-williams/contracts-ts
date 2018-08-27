/*

  Run-time representations of types used to build contracts. Supports
  higher-order function, intersection, and union.

*/

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

/**
 * Base types consist of a predicate function and textual description.
 */
export interface BaseType {
    kind: TypeKind.Base;
    description: string;
    spec: (val: unknown) => boolean;
}

/**
 * N-ary Function Types.
 */
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

/**
 * The dynamic type.
 */
export interface AnyType {
    kind: TypeKind.Any;
}

export type IntersectionType = BranchType<TypeKind.Intersection>;
export type UnionType = BranchType<TypeKind.Union>;
export type AndType = BranchType<TypeKind.And>;

/**
 * Contract Types for specifying runtime assertions.
 */
export type ContractType =
    BaseType | AnyType |                     // Base
    FunctionType |                           // Function
    IntersectionType | UnionType | AndType;  // Branching


// Constructors

/**
 * The `any` type can be implement using a base type with a spec that
 * always returns true. For parity with the paper, and for performance
 * reasons, it is nice to have it built-in so that it truely is the
 * identity function.
 */
export const any: AnyType = { kind: TypeKind.Any };

/**
 * Construct a base type.
 * @param description
 * @param spec
 */
export function makeBaseType(description: string, spec: (val: unknown) => boolean): BaseType {
    return { kind: TypeKind.Base, description, spec };
}

/**
 * Construct a fuction type.
 * @param argumentTypes
 * @param returnType
 */
export function fun(argumentTypes: ContractType[], returnType: ContractType): FunctionType {
    return { kind: TypeKind.Function, argumentTypes, returnType };
}

/**
 * Construct a branch type (and/intersection/union). The type is
 * specified by the `branch` parameter.
 * @param branch
 * @param left
 * @param right
 */
function makeBranchType<B extends BranchKind>(
    branch: B,
    left: ContractType,
    right: ContractType
): BranchType<B> {
    return { kind: branch, left, right };
}

/**
 * Construct an intersection type.
 * @param left
 * @param right
 */
export function intersection(left: ContractType, right: ContractType): IntersectionType {
    return makeBranchType(TypeKind.Intersection, left, right);
}

/**
 * Construct a union type.
 * @param left
 * @param right
 */
export function union(left: ContractType, right: ContractType): UnionType {
    return makeBranchType(TypeKind.Union, left, right);
}

/**
 * Construct an and type.
 * @param left
 * @param right
 */
export function and(left: ContractType, right: ContractType): AndType {
    return makeBranchType(TypeKind.And, left, right);
}


// Pretty Printing


/**
 * Base type to string. Extracts the description.
 * @param type
 */
function baseToString(type: BaseType): string {
    return type.description;
}

/**
 * Construct a simple object representation of a function type.
 * @param type
 */
function functionToSimpleObj(type: FunctionType): object {
    const args = type.argumentTypes.map(typeToSimpleObj);
    const ret = typeToSimpleObj(type.returnType);
    return { args, ret };
}

/**
 * Construct a simple object representation of a branch type.
 * @param type
 */
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

/**
 * Create a simplified object representing a type. We use this for
 * serialisation via JSON.stringify.
 * @param type
 */
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

/**
 * Return a string representation of a type for logging.
 * @param type
 */
export function typeToString(type: ContractType): string {
    return JSON.stringify(typeToSimpleObj(type), undefined, 2);
}
