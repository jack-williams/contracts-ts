export type Top = {} | void | null;

export type NonEmptyArray<A> = A[] & { 0: A };
