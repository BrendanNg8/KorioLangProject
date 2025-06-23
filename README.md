# Korio Language

Korio is a small, lightweight scripting language with a clean, semicolon-free syntax, first-class functions, lambdas, lists, maps, and built-in higher-order functions (`map`, `filter`). It supports optional type annotations, runtime type enforcement, and familiar control flow constructs. This README documents Korio’s syntax, features, installation, usage, examples, and development instructions.

## Table of Contents

1. [Features](#features)  
2. [Syntax Overview](#syntax-overview)  
3. [Data Types](#data-types)  
4. [Variables & Constants](#variables--constants)  
5. [Expressions](#expressions)  
6. [Control Flow](#control-flow)  
7. [Functions & Lambdas](#functions--lambdas)  
8. [Built-in Functions](#built-in-functions)  
9. [Lists & Maps](#lists--maps)  
10. [Error Handling & Type Enforcement](#error-handling--type-enforcement)  
11. [Examples & Test Cases](#examples--test-cases)  
12. [Installation & Usage](#installation--usage)  
13. [Development & Testing](#development--testing)  
14. [Contributing](#contributing)  
15. [License](#license)  

## Features

- **Semicolon-free syntax**: Korio disallows semicolons; line breaks and braces define statement boundaries.
- **Optional type annotations**: `: number`, `: string`, `: boolean`, `: list`, `: map` on variables, function parameters.
- **First-class functions** and **named recursion** via `def` and **anonymous lambdas** via `forge(...) -> { ... }`.
- **Built-in higher-order functions**: `map`, `filter`, as well as `range`, `len`, `sum`, `list`, `print`.
- **Immutable strings**; **mutable lists** and **mutable maps** with indexing and assignment.
- **Control flow**: `if (cond) { ... } else { ... }`, `while (cond) { ... }`, `for (item in iterable) { ... }`.
- **Runtime type enforcement**: mismatched types yield runtime errors.
- **Clean AST and interpreter** written in TypeScript.
- **No semicolons allowed**: any `;` triggers a parse error.
- **Closure support**: lambdas capture surrounding variables, including support for recursive lambdas.
- **Error handling**: descriptive parse and runtime errors for invalid syntax, type mismatches, out-of-bounds indexing, etc.

## Syntax Overview

- **Statements**:
  - Variable declaration:  
    ```korio
    let x = 10
    let y: number = 3.14
    final name: string = "Alice"
    ```
  - Function declaration:
    ```korio
    def add(a: number, b: number) {
      return a + b
    }
    ```
  - Expression statement:
    ```korio
    print("Hello, world")
    ```
  - `return` only valid inside function bodies:
    ```korio
    def foo() {
      return 42
    }
    ```
  - **No semicolons**: writing `let x = 1;` produces a parse error.

- **Expressions**:
  - Literals: numbers (`123`, `4.5`), strings (`"hello"`), booleans (`true`, `false`), `null`.
  - Arithmetic: `+`, `-`, `*`, `/`, `%` on numbers; `+` concatenates strings/lists/maps.
  - Comparison: `<`, `<=`, `>`, `>=`, `==`, `!=`.
  - Logical: `and`, `or`, `!`.
  - Grouping: `( ... )`.
  - Assignment expressions:  
    ```korio
    a = 5
    lst[0] = 10
    m["key"] = "value"
    ```
    Can be used inside larger expressions: `let b = (a = 2) + 3`.

- **Control Flow**:
  - **If**:
    ```korio
    if (cond) {
      // then-branch
    } else {
      // else-branch
    }
    ```
    Parentheses around condition required.
  - **While**:
    ```korio
    while (cond) {
      // body
    }
    ```
  - **For** (over list, string, or map keys):
    ```korio
    for (item in iterable) {
      // body
    }
    ```
    - If `iterable` is a list: iterates elements.
    - If string: iterates characters as single-character strings.
    - If map: iterates keys (strings). Inside, `mapVar[key]` yields value or `null` if missing.

- **Functions & Lambdas**:
  - Named functions:
    ```korio
    def name(param1: Type, param2) {
      // body
      return ... 
    }
    ```
    - Parameters optionally annotated: `param: number`.
    - Body is a block `{ ... }`.
    - Recursive calls work normally.
  - Anonymous lambdas: `forge(...) -> { ... }`
    ```korio
    let f = forge(x: number, y) -> {
      return x + y
    }
    ```
    - Parentheses required even for zero parameters: `forge() -> { ... }`.
    - Body is always in braces `{ ... }`. Missing braces yields parse error.
    - Recursive lambdas: assign first, then reference inside:
      ```korio
      let fact = forge(n) -> {
        if (n <= 1) {
          return 1
        }
        return n * fact(n - 1)
      }
      ```
    - Higher-order functions accept lambdas: e.g., `map(forge(x) -> { x * 2 }, nums)`.

- **Built-in Functions**:
  - `print(...values)`: prints values separated by space; returns `null`.
  - `len(x)`: length of list or string; error otherwise.
  - `sum(list)`: sum of numeric list; returns `0` on empty list.
  - `list(x)`: converts string to list of single-character strings, or returns list unchanged.
  - `range(end)` or `range(start, end)` or `range(start, end, step)`: returns a list of numbers.
  - `map(func, list)`: applies `func` to each element, returns new list.
  - `filter(func, list)`: keeps elements where predicate returns `true`; returns new list.

- **Lists & Maps**:
  - **List literal**: `[expr1, expr2, ...]`. Empty list: `[]`.
  - **Indexing**: `lst[index]`. Zero-based. Out-of-bounds or non-integer index => runtime error.
  - **Mutation**: `lst[index] = newValue`.
  - **Concatenation**: `list1 + list2`.
  - **Map literal**: `{"key1": expr1, "key2": expr2, ...}`. Keys are string literals in source.
  - **Indexing**: `m["key"]`. If missing, returns `null`.
  - **Mutation**: `m["key"] = value`. Keys converted to string via runtime: if index expression yields number/boolean, converted to string.
  - **Merging**: `map1 + map2`: entries from `map2` override entries from `map1`.

- **Type Annotations & Enforcement**:
  - Variables and parameters may have optional annotations: `: number`, `: string`, `: boolean`, `: list`, `: map`.
  - On declaration or call, values are checked at runtime; mismatch raises error.
  - No compile-time static checking; errors thrown at runtime during evaluation.

- **Error Handling**:
  - **Parse errors**: invalid syntax, missing braces/parentheses, semicolon usage, unexpected tokens.
  - **Runtime errors**: type mismatch, calling non-function, indexing invalid types or out-of-bounds, assigning to undeclared or constant variables, predicate in `filter` not returning boolean, etc.
  - Error messages aim to be descriptive, indicating the nature of the error and location when possible.

## Data Types

- **number**: floating-point (all numeric operations use JavaScript `number` under the hood).
- **string**: immutable sequences of characters.
- **boolean**: `true` / `false`.
- **null**: single null value.
- **list**: mutable ordered sequences of `RuntimeVal`. Supports indexing, mutation, concatenation.
- **map**: mutable key-value collections; keys are strings internally; supports indexing, mutation, merging.
- **function**: user-defined or built-in. First-class: can be passed to `map`, returned from functions, closures supported.
- **builtin-function**: internal functions like `print`, `len`, etc.

## Examples & Test Cases

Below are illustrative examples covering all language features. You can copy-paste each snippet into your Korio environment (tokenize → parse → evaluate) and verify behavior matches the comments.

```korio
// Basic Arithmetic & Types
let x: number = 10
let y = 3.5
print("x + y =", x + y)        // Expect: x + y = 13.5
print("x > y?", x > y)         // Expect: true
let flag: boolean = (x % 2 == 0) and (y < 5)
print("flag:", flag)           // Expect: true
let s: string = "Korio"
print("greeting:", "Hello " + s) // Expect: Hello Korio
print("len(s):", len(s))       // Expect: 5

// Lists & Maps
let lst: list = [1, 2, 3]
print(lst[0], lst[2])          // Expect: 1 3
lst[1] = 20
print("mutated lst:", lst)     // Expect: [1,20,3]
let more: list = [4, 5]
print("concat:", lst + more)   // Expect: [1,20,3,4,5]
print("sum(lst+more):", sum(lst + more)) // Expect: 33

let chars: list = list("abc")
print(chars)                   // Expect: ["a","b","c"]

let m: map = {"a": 1, "b": 2}
print(m["a"])                  // Expect: 1
m["c"] = 3
print("m after:", m)           // Expect: {"a":1,"b":2,"c":3}
let defaults: map = {"host": "localhost", "port": 80}
let override: map = {"port": 8080, "secure": true}
let cfg: map = defaults + override
print("cfg:", cfg)             // Expect: {"host":"localhost","port":8080,"secure":true}
print("cfg['missing']:", cfg["missing"]) // Expect: null

// Control Flow
def categorize(n: number) {
  if (n < 0) {
    return "negative"
  } else {
    if (n == 0) {
      return "zero"
    } else {
      if (n % 2 == 0) {
        return "even"
      }
      return "odd"
    }
  }
}
print(categorize(-5), categorize(0), categorize(4), categorize(7))
// Expect: negative zero even odd

let count: number = 3
while (count > 0) {
  print("countdown:", count)
  count = count - 1
}
// Expect: countdown: 3; countdown: 2; countdown: 1

let arr: list = [10, 20, 30]
for (v in arr) {
  print("v:", v)
}
// Expect: v:10; v:20; v:30

for (ch in "ok") {
  print("ch:", ch)
}
// Expect: ch:o; ch:k

let mp: map = {"x": 1, "y": 2}
for (k in mp) {
  print(k, "=", mp[k])
}
// Expect: x=1; y=2 (order may vary)

// Functions & Recursion
def add(x: number, y: number) {
  return x + y
}
print("add:", add(5, 7))       // Expect: 12

def factorial(n: number) {
  if (n <= 1) {
    return 1
  }
  return n * factorial(n - 1)
}
print("factorial(6):", factorial(6)) // Expect: 720

def fib(n: number) {
  if (n <= 1) {
    return n
  }
  return fib(n - 1) + fib(n - 2)
}
print("fib(0..5):")
for (i in range(0, 6)) {
  print(i, "->", fib(i))
}
// Expect: 0->0, 1->1, 2->1, 3->2, 4->3, 5->5

def greet() {
  return "hello"
}
print(greet())                // Expect: hello

// Lambdas & Higher-Order Functions
let nums: list = [1, 2, 3, 4, 5]
let squares: list = map(forge(x) -> { x * x }, nums)
print("squares:", squares)       // Expect: [1,4,9,16,25]

let evens: list = filter(forge(x) -> { x % 2 == 0 }, nums)
print("evens:", evens)           // Expect: [2,4]

let alwaysZero = forge() -> { 0 }
print(alwaysZero())              // Expect: 0

let sumXY: number = (forge(x, y) -> { x + y })(7, 3)
print("sumXY:", sumXY)           // Expect: 10

let factLambda = forge(n) -> {
  if (n <= 1) {
    return 1
  }
  return n * factLambda(n - 1)
}
print("factLambda(5):", factLambda(5)) // Expect: 120

let factor: number = 4
let mult = forge(x) -> { x * factor }
print(mult(3))                    // Expect: 12
factor = 2
print(mult(3))                    // Expect: 6

def applyNTimes(f, n: number) {
  if (n <= 0) {
    return forge(x) -> { x }
  }
  return forge(x) -> { applyNTimes(f, n - 1)(f(x)) }
}
def inc(x: number) { return x + 1 }
print("applyNTimes inc:", applyNTimes(inc, 3)(5)) // Expect: 8

def compose(f, g) {
  return forge(x) -> { f(g(x)) }
}
def add2(x: number) { return x + 2 }
def mul3(x: number) { return x * 3 }
let fn = compose(mul3, add2)
print("compose:", fn(4))          // Expect: 18

// Nested Pipelines
let data: list = [1,2,3,4,5,6]
let pipeline: list = filter(
  forge(x) -> { x > 10 },
  map(
    forge(x) -> { x * x },
    filter(forge(x) -> { x % 2 == 0 }, data)
  )
)
print("pipeline result:", pipeline)  // Expect: [16,36]

// Complex Data Structures & Tree Traversal
let tree: map = {
  "value": 1,
  "children": [
    {"value": 2, "children": [
      {"value": 4, "children": []},
      {"value": 5, "children": []}
    ]},
    {"value": 3, "children": [
      {"value": 6, "children": []}
    ]}
  ]
}

def collectValues(node) {
  let vals: list = [node["value"]]
  let children: list = node["children"]
  for (c in children) {
    vals = vals + collectValues(c)
  }
  return vals
}
print("tree values:", collectValues(tree)) // Expect: [1,2,4,5,3,6]

def sumTree(node) {
  let total: number = node["value"]
  for (c in node["children"]) {
    total = total + sumTree(c)
  }
  return total
}
print("sumTree:", sumTree(tree))            // Expect: 21

// Shadowing & Scopes
let x: number = 100
def shadowTest(x: number) {
  print("param x:", x)            // Expect: passed-in value
  let x: number = x + 1
  print("inner x:", x)            // Expect: param+1
  return x
}
print("shadowTest:", shadowTest(10))   // Expect: prints 10, 11; returns 11
print("global x:", x)                  // Expect: 100

def outer(a: number) {
  def inner(b: number) {
    return a + b
  }
  return inner
}
let add5 = outer(5)
print("outer closure:", add5(7))        // Expect: 12

// Range & Loops
print("range examples:", range(0,5), range(3), range(2,10,3))
// Expect: [0,1,2,3,4] [0,1,2] [2,5,8]

print("Multiplication table 1..3:")
for (i in range(1,4)) {
  for (j in range(1,4)) {
    print(i, "*", j, "=", i*j)
  }
}

// Assignment Expressions
let a2: number = 1
let b2: number = (a2 = 5)
print("a2,b2 after assignment:", a2, b2) // Expect: 5 5

let cond: boolean = false
if ((cond = (b2 > 3)) and cond) {
  print("cond now:", cond)               // Expect: true
}

// Error Cases (Uncomment One at a Time)
// Semicolon usage: parse error
// let x = 1;               
// Assign to final: runtime error
// final y: number = 5
// y = 6                     
// Type mismatch: runtime error
// let bad: list = map(forge(x: string) -> { len(x) }, [1,2,3])
// Index out of bounds: runtime error
// print([1,2,3][5])
// Index non-list/string/map: runtime error
// print((5)[0])

## Installation & Usage

Korio is implemented in TypeScript. You can run it via Deno or Node.js + `ts-node` / compiled JavaScript.

### Prerequisites

- **Node.js** (v14+) with `ts-node` installed, or
- **Deno** (v1.x)

### Directory Layout

