// Notes: I'm not sure that I have to track the direction of
// seals. Two questions are whether 1: tracking the direction is
// /wrong/. The other question is if it's not wrong, is it admissable.

import {
    Top,
    NonEmptyArray
} from "./types";

import * as T from "./contractTypes";
import * as B from "./blame";

interface SealData {
    key: string;
    owner: B.BlameNode
}

type Seal = {__seal: any};

const sealedValues: WeakMap<Seal,Top> = new WeakMap();
const sealData: WeakMap<Seal, NonEmptyArray<SealData>> = new WeakMap();

function isSeal(x: Top): x is Seal  {
    return typeof x === "function" && sealedValues.has(x);
}

function addSealData(seal: Seal, key: string, owner: B.BlameNode): void {
    if (!sealData.has(seal)) {
        sealData.set(seal, [{key, owner}]);
        return;
    }
    sealData.get(seal)!.push({key, owner});
    return;
}

/*
 * Is there a better way to do this, rather than having to create a
 * mutable box? I'm not sure there is without remaking the seal
 * handler (and therefore proxy) each time.
 */
function getSealOwnersFn(seal: [Seal]): () => B.BlameNode[] {
    return () => {
        const thisSealData = sealData.get(seal[0]);
        if(thisSealData) {
            return thisSealData.map(data => data.owner).reverse();
        }
        return [];
    }
}

export function seal<T>(x: T, key: string, owner: B.BlameNode): T {
    if (isSeal(x)) {
        addSealData(x, key, owner);
        return x;
    }
    const coffer: any = () => undefined;
    const sealBox: [Seal] = [undefined as any];
    const seal = new Proxy(coffer, makeSealHandler(wrap(x), getSealOwnersFn(sealBox)));
    sealedValues.set(seal,x);
    addSealData(seal, key, owner);
    sealBox[0] = seal;
    return seal;
}

function reseal(oldSeal: Seal, newVal: any, newSealInfo: NonEmptyArray<SealData>): Seal {
    sealedValues.delete(oldSeal);
    sealData.delete(oldSeal);
    const coffer: any = () => undefined;
    const sealBox: [Seal] = [undefined as any];
    const seal = new Proxy(coffer, makeSealHandler(wrap(newVal), getSealOwnersFn(sealBox)));
    sealedValues.set(seal,newVal);
    sealData.set(seal, newSealInfo);
    sealBox[0] = seal;
    return seal;
}

function wrap(x: Top): Top {
     switch (typeof x) {
         case "number":
         case "string":
         case "boolean":
         case "symbol":
         case "undefined":
             return Object(x);
         default:
             return x;
     }
}

// TODO: I need to blame all of the nodes associated with the seal. I
// need to basically create a pointer to the info on the seal and
// iterate through backwards blaming them.
function makeSealHandler(value: any, getOwners: () => B.BlameNode[]): ProxyHandler<any> {
    return  {
        getPrototypeOf: function(target) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.getPrototypeOf(value);
        },
        setPrototypeOf: function(target, prototype) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.setPrototypeOf(value, prototype);
        },
        isExtensible: function(target) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.isExtensible(value);
        },
        preventExtensions: function(target) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.preventExtensions(value);
        },
        getOwnPropertyDescriptor: function(target, prop) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.getOwnPropertyDescriptor(value, prop);
        },
        has: function(target, prop) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.has(value, prop);
        },
        get: function (target: any, name: any, receiver: any): any {
            getOwners().map(p => B.blame(p, handleBlame));
            if (name === "valueOf") {
                return Reflect.get(value,name,receiver).bind(value);
            }
            if (name === "toString") {
                return Reflect.get(value,name,receiver).bind(value);
            }
            return Reflect.get(value,name,receiver);
        },
        set: function (target: any, name: string, val: any, receiver: any): boolean {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.set(value, name, val);
        },
        deleteProperty: function(target, property) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.deleteProperty(value, property);
        },
        defineProperty: function(target, property, descriptor) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.defineProperty(value, property, descriptor);
        },
        ownKeys: function(target) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.ownKeys(value);
        },
        apply: function (target: any, thisValue: any, args: any[]): any {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.apply(value, thisValue, args);
        },
        construct: function(target, argumentsList, newTarget) {
            getOwners().map(p => B.blame(p, handleBlame));
            return Reflect.construct(value, argumentsList, newTarget);
        }
    };
}

function handleBlame(resolvedToTop: boolean): void  {
    if (resolvedToTop) {
        throw new Error("blame");
    }
}

export function traverseSeals(x: any, p: B.BlameNode, f: (x: any, info?: SealData) => any, scope: T.ScopeSet) {
    if (isSeal(x)) {
        const rawValue = sealedValues.get(x)!;
        const info = sealData.get(x)!;
        const newSealInfo = [];

        while(info.length > 0) {
            const sealInfo = info.pop()!;
            if (B.areCommutable(sealInfo.owner, p)) {
                newSealInfo.push(sealInfo);
            }
            else if (scope[sealInfo.key] !== undefined && scope[sealInfo.key] === T.ScopeDirection.In) {
                // This is ok, we blame the owner of the operation,
                // then add the seal back on and apply the function to
                // the result.
                return f(x, sealInfo);
            }
            else {
                B.blame(sealInfo.owner, handleBlame);
            }
        }
        if(info.length !== 0) {
            throw new Error("Assertion failed, seal data should be empty")
        }
        const result = f(rawValue);
        newSealInfo.reverse();
        const newSealData = info.concat(newSealInfo);
        if (newSealData.length === 0) {
            sealedValues.delete(x);
            sealData.delete(x);
            return result;
        }
        return reseal(x, result, newSealData as NonEmptyArray<SealData>);
    }
    return f(x);
}

function applyUnseal(candidate: Top, key: string, owner: B.BlameNode, sealInfo?: SealData): Top {
    if (isSeal(candidate) && sealInfo !== undefined) {
        if (key === sealInfo.key) {
            return candidate;
        }
        B.blame(owner, handleBlame);
        addSealData(candidate, sealInfo.key, sealInfo.owner);
        return candidate;
    }
    B.blame(owner, handleBlame);
    return candidate;
}

export function unseal(candidate: Top, key: string, owner: B.BlameNode, scope: T.ScopeSet): any {
    return traverseSeals(candidate, owner, (x: Top, info?: SealData) => applyUnseal(x, key, owner, info), scope);
}

export function applyNonParametricContract(x: any, p: B.BlameNode, f: (x: any) => any, scope: T.ScopeSet) {
    return traverseSeals(x, p, (x: any, sealInfo?:SealData) => {
        if (sealInfo === undefined) { return f(x); }
        // TODO: not sure this blame should be here. this only really
        // works because i assume it always fails (which it does), but
        // this doesn't seem like the right place. I should really
        // have a seal away typeof and use that in the flat checks.
        B.blame(p, handleBlame);
        addSealData(x, sealInfo.key, sealInfo.owner);
        return f(x);
    }, scope);
}
