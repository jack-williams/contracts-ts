import {
    Top,
} from "./types";

type Seal = {};

const sealStore: WeakMap<object,Top> = new WeakMap();

function isSeal(x: object): boolean  {
    return sealStore.has(x);
}

export function makeSeal(x: any): any  {
    return new Proxy({},{
        get(target, prop, receiver) {
            throw new Error("blame");
        }
    });
}
