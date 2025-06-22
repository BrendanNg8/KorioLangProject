# Korio (klang)

Korio (abbreviated `klang`) is a simple, dynamically typed scripting language implemented with a custom parser and interpreter in TypeScript/Deno. It supports variables, functions (including lambdas), control flow, lists, hash maps, and a set of built-in utilities for common tasks.

> **Note**: “Korio” is the full name; source files typically use the `.klang` extension and refer to the language as “klang” in tooling.

---

## Table of Contents

1. [Getting Started](#getting-started)  
   1.1. [Prerequisites](#prerequisites)  
   1.2. [Running Korio Programs](#running-korio-programs)  
2. [File Extension & Project Layout](#file-extension--project-layout)  
3. [Language Overview](#language-overview)  
   3.1. [Lexical Conventions](#lexical-conventions)  
   3.2. [Statements](#statements)  
   3.3. [Expressions](#expressions)  
   3.4. [Control Flow](#control-flow)  
   3.5. [Functions & Lambdas](#functions--lambdas)  
   3.6. [Data Structures](#data-structures)  
   3.7. [Operators](#operators)  
   3.8. [Comments](#comments)  
   3.9. [Semicolons](#semicolons)  
4. [Built-in Functions](#built-in-functions)  
5. [Examples](#examples)  
6. [Error Handling](#error-handling)  
7. [Extending & Customization](#extending--customization)  
8. [Development & Contribution](#development--contribution)  
9. [License](#license)

---

## Getting Started

### Prerequisites

- **Deno**: Korio’s reference interpreter uses Deno. Install Deno from https://deno.land if you haven’t already.
- **TypeScript/Node (optional)**: If you edit the interpreter code in TypeScript or run tests, have Node.js (for tooling, linting, packaging). But running Korio scripts only requires Deno and the compiled interpreter.

### Running Korio Programs

Assuming you have the interpreter files in your project (e.g. `main.ts`, `parser.ts`, `ast.ts`, `environment.ts`, `interpreter.ts`), you typically run:

```bash
deno run --allow-read main.ts <your-script>.klang
main.ts is the entry point that:

Reads the given .klang file

Parses it into an AST

Evaluates it in a fresh environment with built-in functions

Prints any non-null final result or errors.

You can also integrate into an editor or package as a VS Code extension, if desired.

File Extension & Project Layout
File extension: .klang

Project structure (example):

css
Copy
Edit
korio/
├── ast.ts
├── parser.ts
├── environment.ts
├── interpreter.ts
├── main.ts
├── README.md
├── test.klang
└── ... VS Code extension files if you provide highlighting/snippets/icons
In editor configs, associate *.klang files with the Korio language for syntax highlighting and tooling.

Language Overview
Korio is a simple dynamically typed language with familiar syntax elements:

Variables: let x = 42, final y = "hello"

Types: numbers, strings, booleans, null, lists, maps, functions

Control flow: if, else, while, for x in list { ... }

Functions: def f(a, b) { ... }, lambdas via Forge(a, b): expression

Data structures: lists [1, 2, 3]; hash maps via HashMap() and literal syntax { key1: value1, key2: value2 }

Built-ins: print, len, range, map, filter, sum, HashMap, put, get, hasKey, remove, keys, values, entries, mergeMaps, etc.

Operators: arithmetic + - * / %, comparison == != < <= > >=, logical && ||, unary ! -.

Semicolons are optional except to separate multiple statements on one line.

Lexical Conventions
Identifiers: begin with letter or underscore, followed by letters, digits, underscores.
Examples: x, _temp, myVar1.

Keywords: let, final, def, if, else, while, for, in, return, Null literals handled via null, booleans as true / false.

Literals:

Numbers: integer or floating (e.g. 123, 3.14).

Strings: double-quoted "hello", with basic escapes for \" and \\.

Booleans: true, false.

Null: null.

Comments:

Line comments: // this is a comment

Block comments: /* multi-line comment */

Statements
Variable Declaration

klang
Copy
Edit
let x = 10
final name = "Alice"
let count: int = 5       # optional type annotation `: int` parsed but enforced at runtime if provided
let declares a mutable variable; final declares an immutable (constant) variable.

Optional type annotation (e.g., int, float, string, bool, list, map) can be placed before identifier:

csharp
Copy
Edit
let int num = 123
let list arr = [1,2,3]
If type annotation is present, the runtime checks type at assignment.

Expression Statement
Any expression can be used as a statement (e.g. function call):

klang
Copy
Edit
print("Hello")
Function Declaration

klang
Copy
Edit
def add(a, b) {
  return a + b
}
Declares a named function; stored as a builtin variable in the environment.

Functions are first-class: can be passed to map, filter, etc.

Return Statement

klang
Copy
Edit
return expression
Only valid inside function bodies. Returns the value to the caller.

If Statement

klang
Copy
Edit
if (condition) {
  // then branch
} else {
  // else branch (optional)
}
Condition must evaluate to boolean; else branch is optional.

Can use without braces for single statement, but braces recommended:

klang
Copy
Edit
if (x > 0) print("positive") else print("non-positive")
While Statement

klang
Copy
Edit
while (condition) {
  // body
}
Repeats while condition is true.

For Statement

klang
Copy
Edit
for (item in listExpr) {
  // body uses `item`
}
Iterates over a list (array). The variable item is bound in each iteration.

Also supports shorthand without parentheses:

klang
Copy
Edit
for item in [1,2,3] {
  print(item)
}
Block Statement

klang
Copy
Edit
{
  stmt1
  stmt2
  ...
}
Introduces a new lexical scope for variables declared inside.

Empty / Separator

Semicolons (;) can be used to separate statements on the same line or to provide empty statements. They are optional when statements are on separate lines.

Expressions
Literals:

Numeric: 123, 3.14

String: "hello world"

Boolean: true, false

Null: null

List: [expr1, expr2, ...]

Map literal: { key1: expr1, key2: expr2, ... } where keys are string literals or identifiers (unquoted interpreted as string).

klang
Copy
Edit
let m = { "a": 1, b: 2 }
Identifier:

Variable access: x, myVar.

Binary Expressions:

Arithmetic: +, -, *, /, %

Comparison: ==, !=, <, <=, >, >=

Logical: &&, ||

The + operator is overloaded: if either operand is string, concatenates as strings; otherwise numeric addition.

Unary Expressions:

Logical NOT: !expr (expr must be boolean)

Negation: -expr (expr must be number)

Assignment Expression:

klang
Copy
Edit
x = expr
Only if left-hand side is a variable identifier. Returns the assigned value.

Function Call:

klang
Copy
Edit
f(arg1, arg2, ...)
Calls either a user-defined function or a built-in. Arguments are evaluated left to right.

Indexing Expression:

klang
Copy
Edit
listExpr[indexExpr]
If target is a list, returns element at numeric index.

(You may also support indexing into strings or maps depending on interpreter capabilities; typically list only.)

Grouping:

klang
Copy
Edit
(expr)
Lambda (shorthand):

klang
Copy
Edit
Forge(x): x + x
Forge(x, y): x * y + 1
Equivalent to an anonymous function expression. Internally produces a function with a body returning the expression after colon.

Alternatively, full anonymous function expression syntax:

klang
Copy
Edit
def(x, y) { return x + y }
if supported.

Control Flow
if / else as described. Conditions must evaluate to boolean or runtime error.

while loops until condition false.

for ... in loops over lists. Example:

klang
Copy
Edit
let nums = range(5)
for (n in nums) {
  print(n)
}
break/continue: if implemented? (If your interpreter supports break/continue, document here; if not, skip.)

Functions & Lambdas
Named functions:

klang
Copy
Edit
def greet(name) {
  print("Hello, " + name)
}
Use return to return a value. If no return encountered, function returns null.

Functions create a new scope for parameters and local variables.

Anonymous functions:

klang
Copy
Edit
let square = def(x) { return x * x }
Lambda shorthand:

klang
Copy
Edit
let double = Forge(x): x * 2
Forge keyword indicates a lambda expression with parameters in parentheses, colon, then a single expression body.

Internally equivalent to:

klang
Copy
Edit
def(x) { return x * 2 }
First-class: You can pass functions to built-ins like map, filter, or store them in variables, return from functions, etc.

Data Structures
List

Literal: [expr1, expr2, ...]

Built-in type: type: "list" with an array of elements.

Indexing: myList[i] (0-based indexing). Out-of-range may throw or return null depending on interpreter.

Built-ins that operate on lists:

len(list) → number of elements

range(n) or range(start, end) → list of numbers

map(list, fn) → list of results

filter(list, fn) → list of elements where fn(el) is true

sum(list) → numeric sum of elements (elements must be numbers)

Possibly more: push, pop, etc., if implemented.

Map (HashMap)

Creation:

Literal: {} or { key1: expr1, key2: expr2 }

Built-in constructor: HashMap() → empty map

Underlying runtime: a JavaScript Map<string, RuntimeVal> or similar.

Keys: usually strings (you may allow numbers/booleans converted to strings).

Operations (built-in functions):

put(map, key, value) → store value at key in map.

get(map, key) → retrieve value or null if not found.

hasKey(map, key) → boolean whether key exists.

remove(map, key) → delete key from map (returns null or no return).

keys(map) → list of string keys.

values(map) → list of values.

entries(map) → list of 2-element lists: [key, value].

mergeMaps(map1, map2) → new map merging entries (map2 overrides map1 on key collisions).

Example:

klang
Copy
Edit
let m = HashMap()
put(m, "a", 10)
put(m, "b", 20)
print(get(m, "a"))        # 10
print(hasKey(m, "c"))     # false
let allKeys = keys(m)     # ["a", "b"]
String

Immutable sequence of characters.

Concatenation via + if either side is string.

len(string) → length.

Indexing into strings may or may not be supported (depending on your interpreter).

Null

Literal null. Represents absence of value. Many built-in functions return null when no meaningful result (e.g., print returns null, put returns null).

Function

Runtime representation holds parameter names, body AST, and closure environment.

Built-in functions are represented as type "builtin" with a JS/TS callback.

Operators
Arithmetic:

+: number addition or string concatenation. If either operand is string, both are converted to string.

-, *, /, %: numeric only (if non-number, runtime error).

Comparison:

==, !=: equality/inequality. Numbers compared numerically, strings compared lexically, booleans compared, lists/maps/functions compared by reference or error? (Implement reference or deep-equals as you choose).

<, <=, >, >=: numeric comparison only (if non-numbers, runtime error).

Logical:

&&: logical AND; left and right must be boolean.

||: logical OR; left and right must be boolean.

Unary:

!expr: logical NOT; expr must be boolean.

-expr: numeric negation; expr must be number.

Assignment:

identifier = expr: assigns to an existing variable (declared via let/final). If final, runtime error on reassign.

Indexing:

expr[index]: if expr is list (or string?), index must be number.

Function call:

expr(arg1, arg2, ...)

Operator Precedence (highest to lowest):

Parentheses (...), function calls and indexing as postfix

Unary !, -

*, /, %

+, -

Comparison <, <=, >, >=

Equality ==, !=

Logical &&

Logical ||

Assignment = (right-associative)

Associativity:

Most binary operators left-associative (e.g. a - b - c is (a - b) - c).

Assignment is right-associative (a = b = 3 sets b to 3 then a to 3).

Comments
Line comment: // comment until end of line

Block comment: /* multi-line comment until closing */

Comments are discarded by the lexer.

Semicolons
Optional statement separators. You may omit semicolons when statements are on separate lines or clearly separated by keywords/braces.

Required (or strongly recommended) when placing multiple statements on a single line:

klang
Copy
Edit
let x = 1; let y = 2; print(x + y)
A stray semicolon is skipped (empty statement). The parser’s skipSeparators() logic ignores semicolons when seeking next statement.

Built-in Functions
Korio provides a variety of built-in functions registered at interpreter startup. Below is the list with signatures and behavior:

print(...)

Accepts any number of arguments. Converts each to string via formatRuntimeVal, joins with spaces, prints to stdout, returns null.

Example: print("Hello", 123, true)

len(x)

Returns length of x, where x may be:

String → number of characters

List → number of elements

Map → number of entries

Else runtime error.

range(n) or range(start, end)

If one numeric argument n: returns list [0, 1, 2, ..., n-1].

If two numeric args: [start, start+1, ..., end-1].

Else runtime error.

HashMap()

No arguments. Returns a new empty map.

Map operations:

put(map, key, value) → stores value under key in map. Returns null.

get(map, key) → returns value if exists, else null.

hasKey(map, key) → returns boolean.

remove(map, key) → deletes the key; returns null.

keys(map) → returns list of string keys.

values(map) → returns list of values.

entries(map) → returns list of two-element lists: [key, value].

mergeMaps(map1, map2) → returns a new map containing all entries of map1 and map2, with map2 overriding on key collisions.

List processing:

map(list, fn) → returns a new list where each element el is replaced by fn(el). fn may be a built-in or user-defined function taking 1 parameter.

filter(list, fn) → returns new list containing only those elements el for which fn(el) evaluates to boolean true.

sum(list) → expects a list of numbers, returns their sum as number.

(You may add push, pop, slice, etc. if extended.)

Other utilities:

You can register additional built-ins (e.g. math functions) by modifying registerBuiltins in main.ts or environment setup.

Examples
Below are small snippets illustrating various features. You can copy these into .klang files to test.

Variables & Types
klang
Copy
Edit
let x = 10
let name = "Korio"
let flag = true
let decimals = 3.14
let nothing = null

// Optional type annotations (runtime-checked):
let int a = 5
final string greeting = "Hello"
Arithmetic & Strings
klang
Copy
Edit
let sum = 1 + 2 * 3   // 7
let s = "Hello, " + "World!"
let mixed = "Answer: " + (sum)
print(s, mixed)       // prints: Hello, World! Answer: 7
Lists
klang
Copy
Edit
let nums = [1, 2, 3, 4]
print(len(nums))      // 4
print(nums[0])        // 1
// range example
let r = range(5)      // [0,1,2,3,4]
print(r)

// map/filter
let doubled = map(nums, Forge(x): x * 2)   // [2,4,6,8]
let evens = filter(nums, def(x) { return x % 2 == 0 })
print(doubled, evens)  // [2,4,6,8] [2,4]
print(sum(nums))       // 10
Maps (HashMap)
klang
Copy
Edit
let m = HashMap()
put(m, "a", 100)
put(m, "b", 200)
print(get(m, "a"))       // 100
print(hasKey(m, "c"))    // false
put(m, "c", 300)
print(keys(m))           // ["a","b","c"]
print(values(m))         // [100,200,300]
print(entries(m))        // [["a",100],["b",200],["c",300]]
remove(m, "b")
print(hasKey(m, "b"))    // false

let m2 = HashMap()
put(m2, "x", 1)
put(m2, "a", 500)
let merged = mergeMaps(m, m2)   // keys from m and m2; m2 overrides "a"
print(get(merged, "a"))         // 500
Control Flow
klang
Copy
Edit
let i = 0
while (i < 5) {
  print("i =", i)
  i = i + 1
}

if (i == 5) {
  print("Reached five")
} else {
  print("Something went wrong")
}

// for loop
let arr = range(3)   // [0,1,2]
for (n in arr) {
  print("n:", n)
}

// for shorthand without parentheses:
for j in [10,20,30] {
  print("j:", j)
}
Functions & Lambdas
klang
Copy
Edit
def add(a, b) {
  return a + b
}

print(add(3, 4))   // 7

// Using lambda shorthand Forge:
let double = Forge(x): x * 2
print(double(5))   // 10

// Higher-order example:
let squaredList = map(range(5), Forge(x): x * x)
print(squaredList) // [0,1,4,9,16]

// Closure example:
def makeAdder(a) {
  def inner(b) {
    return a + b
  }
  return inner
}
let add10 = makeAdder(10)
print(add10(5))    // 15
Combining Features
klang
Copy
Edit
// Count occurrences in a list using a map
def countOccurrences(lst) {
  let freq = HashMap()
  for (el in lst) {
    if (hasKey(freq, String(el))) {
      let prev = get(freq, String(el))
      put(freq, String(el), prev + 1)
    } else {
      put(freq, String(el), 1)
    }
  }
  return freq
}

let data = [1,2,2,3,3,3]
let freqs = countOccurrences(data)
print(entries(freqs))  // [["1",1],["2",2],["3",3]]
Indexing Expressions
If your interpreter supports indexing (e.g., lists or strings), you can write:

klang
Copy
Edit
let arr = [10,20,30]
print(arr[1])   // 20

// Possibly nested:
let matrix = [[1,2],[3,4]]
print(matrix[1][0])   // 3
If indexing into out-of-bounds, behavior may be runtime error or return null—adjust per your implementation.

Error Handling
Parse errors: The parser reports unexpected tokens or mismatched delimiters (e.g., missing } or )).

Runtime errors: Type mismatches (e.g., arithmetic on non-number), undefined variable, reassigning final, invalid function calls, etc.

Errors typically include a message and halt execution; you may extend with line/column info if your parser tracks positions.

Extending & Customization
Add built-ins: In main.ts or environment registration, add more built-in functions (e.g., math: sin, cos, etc.), I/O, file operations, etc.

Type system enhancements: Currently dynamic; you may add static checking or optional type annotations enforcement in parser or pre-runtime checks.

Standard library: You can provide a set of standard library functions in Korio files and import them before user code (if you implement modules/imports).

Modules/Imports: If desired, extend parser to support import statements and module resolution.

Error reporting: Enhance parser to track line/column for better diagnostics.

Optimizations: Use bytecode or AST caching to speed up repeated runs.

Development & Contribution
Clone the repository:

bash
Copy
Edit
git clone https://github.com/YourUser/KorioLangProject.git
cd KorioLangProject
Run tests: If you have test scripts (test.klang) and a test runner, execute via:

bash
Copy
Edit
deno test
or run individual Korio scripts:

bash
Copy
Edit
deno run --allow-read main.ts examples/example.kla​ng
Editor integration: A VS Code extension can provide syntax highlighting (klang.tmLanguage.json), snippets, and a “Run File” command. Place under vscode-klang/ and run in dev host.

Packaging: Use vsce package to produce a .vsix for publishing to the VS Code Marketplace.

Contribute: Open issues or PRs for bug fixes, feature requests, or documentation improvements.

License
This project is licensed under the MIT License. See LICENSE for details.

Summary of Features
Dynamic typing: numbers, strings, booleans, null, lists, maps, functions

Variables: let (mutable) and final (immutable) with optional runtime type annotation

Expressions: arithmetic, comparison, logical, assignment, function call, indexing

Control flow: if/else, while, for (item in list) loops

Functions: named, anonymous (def(...) { ... }), lambdas (Forge(...) : expression), closures

Data structures:

List: literal [ ... ], built-ins: len, range, map, filter, sum

Map: literal { ... }, constructor HashMap(), operations put, get, hasKey, remove, keys, values, entries, mergeMaps

Built-ins: print, plus above list/map utilities

Comments: // line, /* block */

Optional semicolons: used as separators when needed

Error handling: parse-time and runtime errors with clear messages

Extensible: easily add built-ins, libraries, modules, or features

Example “Hello, Korio” Program
klang
Copy
Edit
// Save this as hello.klang
def fib(n) {
  if (n <= 1) {
    return n
  } else {
    return fib(n - 1) + fib(n - 2)
  }
}

print("Fibonacci numbers up to 10:")
for (i in range(10)) {
  print(i, "->", fib(i))
}
Run with:

bash
Copy
Edit
deno run --allow-read main.ts hello.klang
Expected output:

rust
Copy
Edit
Fibonacci numbers up to 10:
0 -> 0
1 -> 1
2 -> 1
3 -> 2
4 -> 3
5 -> 5
6 -> 8
7 -> 13
8 -> 21
9 -> 34
