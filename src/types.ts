/*

  Type Utils

*/


/**
   Top Type - everything is a subtype of this type, but prevents
   down-casting like `any`.
*/
export type Top = {} | void | null;


export type NonEmptyArray<A> = A[] & { 0: A };
