import {
    Top,
    NonEmptyArray
} from "./types";

import * as B from "./blame";

interface SealData {
    key: symbol;
    owner: B.BlameNode
}

type Seal = {__seal: any};

const sealedValues: WeakMap<Seal,Top> = new WeakMap();
const sealData: WeakMap<Seal, NonEmptyArray<SealData>> = new WeakMap();

function isSeal(x: Top): x is Seal  {
    return typeof x === "function" && sealedValues.has(x);
}

function addSealData(seal: Seal, key: symbol, owner: B.BlameNode): void {
    if (!sealData.has(seal)) {
        sealData.set(seal, [{key, owner}]);
        return;
    }
    sealData.get(seal)!.push({key, owner});
    return;
}

export function seal<T>(x: T, key: symbol, owner: B.BlameNode): T {
    if (isSeal(x)) {
        addSealData(x, key, owner);
        return x;
    }
    const coffer: any = () => undefined;
    const seal = new Proxy(coffer, makeSealHandler(wrap(x), B.negate(owner)));
    sealedValues.set(seal,x);
    addSealData(seal, key, B.negate(owner));
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

export function unseal(candidate: Top, key: symbol, owner: B.BlameNode): Top {
    if (isSeal(candidate)) {
        const sealInfo = sealData.get(candidate)!;
        const lastSealInfo = sealInfo.pop()!;
        if (key === lastSealInfo.key) {
            if (sealInfo.length === 0) {
                const unsealed = sealedValues.get(candidate);
                sealedValues.delete(candidate);
                sealData.delete(candidate);
                return unsealed;
            } else {
                return candidate;
            }
        }
        B.blame(owner, handleBlame);
        sealInfo.push(lastSealInfo);
        return candidate;
    }
    B.blame(owner, handleBlame);
    return candidate;
}


export function applyNonParametricContract(x: any, p: B.BlameNode, f: (x: any) => any) {
    if (isSeal(x)) {
        const rawValue = sealedValues.get(x)!;
        const info = sealData.get(x)!;
        const newSealInfo = [];
        for (let i = info.length - 1; i !== 0; i--) {
            const sealInfo = info[i];
            if(B.areCommutable(sealInfo.owner, p)) {
                newSealInfo.push(sealInfo);
            }
            B.blame(sealInfo.owner, handleBlame);
        }
        if (newSealInfo.length === 0) {
            sealedValues.delete(x);
            sealData.delete(x);
            return f(rawValue);
        } else {
            sealData.set(x, newSealInfo as NonEmptyArray<SealData>);
//            sealedValues.set(x,f(rawValue));
            return x;
        }
    }
    return f(x);
}
