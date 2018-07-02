## `contracts-ts` --- Contracts for higher-order intersection and union.

### Getting started

Ensure `node` and `npm` are installed and run the following command at the root of the directory:

```
npm install
```

To build the project run:

```
npm run build
```

this will compile the TypesScript files into `dist/`. The main file will be `./dist/index.js`.

To run the tests:

```
npm run test
```

### Examples

The `examples` directory contains a series of examples along with commentary. The aim of these files is to give an introduction to using the library, and also discuss some of the details of blame assignment for intersection and union.

### Usage

#### Importing the library

Point your client at the `dist/index.js` file. In many cases it is helpful to create aliase for the type constructors and pre-defined base types.

```js
const contract = require("path to dist/index.js");
const Base = contract.Base;
const Type = contract.Type;
```

#### Constructing Types

- **Base Types** are constructed from predicates (functions that take a value and return a `boolean`). For example:
```javascript
const zeroType = Type.makeBaseType("zero", x => x === 0);
```
There is one siginifcant caveat to making base types. Blame assignment will be incorrect for base types that apply their argument, for example:
```javascript
const zeroFunction = Type.makeBaseType("zeroFunction", f => f(0) === 0);
```
This is due to complexities in intersection and union contracts. Keil and Thiemann [1] present a solution to this problem but it is non-trivial to implement in practice.

- **Function Types** are constructed from a sequence of argument types and a return type. For example:
```javascript
const fnType = Type.fun([Base.number, zeroType], Base.string);
```
defines the contract type for the function that accepts two arguments, a number and 0, and returns a string. There is not support for optional or variadic functions, although optional arguments can be implemented using a union type with `null` and `undefined`.

Function types do not assert that the value is a function, only that domain are codomain are respected when the value is applied. To create a traditional function contract we can use `and`.

- **Branching Types** are constructed from two types. There are three branching types: and, intersection, and union. For example:
```javascript
// A type that checks the value is a function, and it respects the type [number,0] -> string.
const aFunctionType = Type.and(Base.function, fnType);
// Creates an intersection of function types, acting like an overloaded function.
const overloaded = Type.intersection(aFunctionType, Type.fun([Base.string, Base.string], Base.boolean));
// Creates a 'optional' number, something that can be a number or undefined.
const maybeNumber = Type.union(Base.number, Base.undefined);
```

#### Applying contracts
The main way to apply a contract is using `assert`. For example:
```javascript
const three = contract.assert(3, maybeNumber);
```
which will apply the `maybeNumber` contract to 3, returning the result. The assert function can be given a string to identify annotate the blame label:
```javascript
const maybeThree = contract.assert(undefined, "my blame label", maybeNumber);
```

Function can be wrapped by applying a function contract:
```javascript
function foo(x,y) {
    if(typeof x === "string") {
        return x.length > y.length
    }
    return x + y + x;
}

// Wrap the function
foo = contract.assert(foo, "contract for foo", overloaded);

// Apply the wrapped function
foo("a", "b");
foo(4, 0);
```

#### Blame Errors
When a contract is violated a blame error is throw, indicating if the blame was positive (inside the contract), or negative (due to the context of the contract). For example:

```javascript
foo(4, 1);

/*
Negative blame @ label Symbol(contract for foo)
Reason: Value not of expected type zeroType, received number.
Type: {
  "branch": "intersection",
  "left": {
    "branch": "and",
    "left": "function",
    "right": {
      "args": [
        "number",
        "zeroType"
      ],
      "ret": "string"
    }
  },
  "right": {
    "args": [
      "string",
      "string"
    ],
    "ret": "boolean"
  }
}
*/
```


[1] Matthias Keil and Peter Thiemann, Blame assignment for higher-order contracts with intersection and union
