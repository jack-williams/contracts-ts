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

export function seal<T>(x: T, key: string, owner: B.BlameNode): T {
    if (isSeal(x)) {
        addSealData(x, key, owner);
        return x;
    }
    const coffer: any = () => undefined;
    const seal = new Proxy(coffer, makeSealHandler(wrap(x), owner));
    sealedValues.set(seal,x);
    addSealData(seal, key, owner);
    return seal;
}

function wrap(x: Top): Top {
     switch (typeof x) {
         case "number":
         case "string":
         case "boolean":
         case "symbol":
         case "undefined":
             return new (Wrapper as any)(x);
         default:
             return x;
     }
}

function Wrapper(this: any, n: any) {
    this.value = n;
}
Wrapper.prototype.valueOf = function () {
    return this.value;
}

function makeSealHandler(value: any, p: B.BlameNode): ProxyHandler<any> {
    return  {
        getPrototypeOf: function(target) {
            B.blame(p, handleBlame);
            return Reflect.getPrototypeOf(value);
        },
        setPrototypeOf: function(target, prototype) {
            B.blame(p, handleBlame);
            return Reflect.setPrototypeOf(value, prototype);
        },
        isExtensible: function(target) {
            B.blame(p, handleBlame);
            return Reflect.isExtensible(value);
        },
        preventExtensions: function(target) {
            B.blame(p, handleBlame);
            return Reflect.preventExtensions(value);
        },
        getOwnPropertyDescriptor: function(target, prop) {
            B.blame(p, handleBlame);
            return Reflect.getOwnPropertyDescriptor(value, prop);
        },
        has: function(target, prop) {
            B.blame(p, handleBlame);
            return Reflect.has(value, prop);
        },
        get: function (target: any, name: any, receiver: any): any {
            B.blame(p, handleBlame);
            return Reflect.get(value,name,receiver);
        },
        set: function (target: any, name: string, val: any, receiver: any): boolean {
            B.blame(p, handleBlame);
            return Reflect.set(value, name, val);
        },
        deleteProperty: function(target, property) {
            B.blame(p, handleBlame);
            return Reflect.deleteProperty(value, property);
        },
        defineProperty: function(target, property, descriptor) {
            B.blame(p, handleBlame);
            return Reflect.defineProperty(value, property, descriptor);
        },
        ownKeys: function(target) {
            B.blame(p, handleBlame);
            return Reflect.ownKeys(value);
        },
        apply: function (target: any, thisValue: any, args: any[]): any {
            B.blame(p, handleBlame);
            return Reflect.apply(value, thisValue, args);
        },
        construct: function(target, argumentsList, newTarget) {
            B.blame(p, handleBlame);
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
        }
        else {
            sealData.set(x,newSealData as NonEmptyArray<SealData>);
        }
        return result;
    }
    console.log("no seal found");
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
        B.blame(p, handleBlame);
        addSealData(x, sealInfo.key, sealInfo.owner);
        return f(x);
    }, scope);
}
