# Korio/Klang Language

Korio is a simple, lightweight scripting language with familiar imperative features, first-class functions (including lambdas), lists and maps (hashmaps), and a small standard library of built-ins (e.g., `print`, `len`, `range`, `map`, `filter`, `sum`, map operations, etc.). This document describes Klang’s syntax, semantics, built-ins, and how to run code and use the VSCode extension.

---

## Table of Contents

1. [Quick Start](#quick-start)  
2. [Syntax Overview](#syntax-overview)  
   - [Comments](#comments)  
   - [Variables & Declarations](#variables--declarations)  
   - [Basic Types & Literals](#basic-types--literals)  
   - [Expressions & Operators](#expressions--operators)  
   - [Control Flow](#control-flow)  
   - [Functions & Lambdas](#functions--lambdas)  
   - [Lists](#lists)  
   - [Maps (HashMaps)](#maps-hashmaps)  
   - [Indexing & Access](#indexing--access)  
3. [Built-in Functions](#built-in-functions)  
4. [Examples](#examples)  
5. [Tooling & Running Klang Code](#tooling--running-klang-code)  
   - [Interpreter Usage](#interpreter-usage)  
   - [VSCode Extension](#vscode-extension)  
6. [Language Reference Summary](#language-reference-summary)  
7. [Contributing & Development](#contributing--development)  
8. [License](#license)

---

## Quick Start

1. **Clone the repo** (or place your `.klang` files alongside the interpreter).  
2. **Write a Klang file**, e.g. `hello.klang`:

   ```klang
   // hello.klang
   let greeting = "Hello, Klang!";
   print(greeting);
Run via Deno (assuming main.ts is the interpreter driver):

bash
Copy
Edit
deno run --allow-read main.ts hello.klang
VSCode: Install or load the Klang extension in development mode. Open .klang files; syntax highlighting and a “Run” command become available.

Syntax Overview
Comments
Single-line: start with // and go to end of line.

klang
Copy
Edit
// This is a comment
let x = 10; // comment after code
Block comments: /* ... */

klang
Copy
Edit
/*
  Multi-line comment
*/
Variables & Declarations
Use let or final to declare variables. final makes them immutable (no reassignment).

Optional type annotation (currently informational; interpreter may ignore or enforce).

klang
Copy
Edit
let x = 5;
final y: 10;        // infer type from expression
let z: int = 42;    // optional annotation before identifier (e.g., int, float, string, bool, list, map)
Reassignment:

klang
Copy
Edit
let a = 1;
a = a + 2;
// final b = 3; b = 4; // Error: cannot reassign final
Basic Types & Literals
Numbers: integers or floats (e.g. 123, 3.14, 0.5).

Strings: double-quoted "...", with simple escapes \" and \\.

Boolean literals: true, false.

Null: represented as { type: "null" } internally. In code, you can use null only if supported; otherwise, functions return null.

Identifiers: [a-zA-Z_][a-zA-Z0-9_]*, excluding keywords.

Expressions & Operators
Arithmetic: +, -, *, /, %.

Numeric +: addition.

String concatenation: if either operand is string, + concatenates (converted to string).

Comparison: ==, !=, <, <=, >, >=.

Logical: && (and), || (or), unary ! (not).

Assignment: =. Right-associative for chained assignment: a = b = 5.

Parentheses: (expr) for grouping.

Precedence (high to low):

Primary: literals, identifiers, function expressions, list/map literals, parenthesized.

Unary: !, unary -.

Multiplicative: *, /, %.

Additive: +, -.

Comparison: <, <=, >, >=.

Equality: ==, !=.

Logical AND: &&.

Logical OR: ||.

Assignment: =.

Function calls: f(a, b, ...). Chained calls: f()(x).

Indexing: listExpr[indexExpr], mapExpr[keyExpr] if you evaluate get semantics manually or via built-ins.

Control Flow
If:

klang
Copy
Edit
if (condition) statement_or_block
else statement_or_block
Blocks are { ... }. Single statement without braces also allowed (but braces recommended).

While:

klang
Copy
Edit
while (condition) statement_or_block
For (over lists):

klang
Copy
Edit
// either with parentheses:
for (item in myList) {
  print(item);
}
// or without parentheses:
for item in myList {
  print(item);
}
In each iteration, item is bound to element of the list. The loop returns null.

Return (only valid inside functions):

klang
Copy
Edit
def foo(x) {
  if (x <= 1) return 1;
  return x * foo(x - 1);
}
Functions & Lambdas
Function declaration:

klang
Copy
Edit
def add(a, b) {
  return a + b;
}
let result = add(3, 4);  // 7
Anonymous function expression:

klang
Copy
Edit
let inc = def(x) { return x + 1; };
print(inc(5)); // 6
Lambda shorthand using Forge keyword:

klang
Copy
Edit
let double = Forge(x): x + x;
print(double(10));  // 20

// Multiple parameters:
let sum = Forge(a, b): a + b;
print(sum(3,4));    // 7
Internally equivalent to a function expression returning the single expression body.

First-class: functions can be passed as arguments, returned, assigned to variables.

Lists
Literal: [item1, item2, ...]. Empty: [].

klang
Copy
Edit
let nums = [1, 2, 3];
print(nums);            // [1, 2, 3]
let empty = [];
Indexing: via list[index], zero-based. Index expressions must evaluate to number. Out-of-bounds handling depends on interpreter (error or null).

Built-ins operate on lists: len(list), range(n), range(start, end), map(list, fn), filter(list, fn), sum(list), etc.

Maps (HashMaps)
Creation:

Using built-in: let m = HashMap();

Or literal: { "key1": expr1, key2: expr2, ... }. Keys must be string literal or identifier (unquoted key treated as string). Example:

klang
Copy
Edit
let person = { name: "Alice", age: 30 };
Built-ins:

put(map, key, value): insert or update. Key can be string/number/boolean (converted to string).

get(map, key): returns value or null if not present.

hasKey(map, key): boolean.

remove(map, key): deletes key.

keys(map): returns a list of string keys.

values(map): returns a list of values.

entries(map): returns a list of 2-element lists: [[key, value], ...].

mergeMaps(map1, map2): returns a new map containing all entries from both; if same key appears, map2 overrides.

Indexing via get: direct map[key] syntax is parsed as IndexExpr but semantics depend on interpreter: by default, use get built-in or interpreter can treat map[key] as get(map, key).

Indexing & Access
List indexing: myList[2] → third element.

Map indexing: if supported by interpreter: myMap["key"] → value or null.

If not built-in, use get(myMap, "key"). The parser supports IndexExpr, and the interpreter should check if target is map or list and handle accordingly.

Built-in Functions
Below is the standard library of built-ins registered in the environment:

print(...values)
Prints all arguments (converted via formatRuntimeVal) separated by spaces, followed by newline. Returns null.

len(x)

If x is string: length of string.

If x is list: number of elements.

If x is map: number of entries.

Else: runtime error.

range(n) or range(start, end)

range(n): returns list [0, 1, ..., n-1].

range(start, end): returns [start, start+1, ..., end-1].

Else: error.

HashMap()
Creates and returns an empty map.

put(map, key, value)
Inserts or updates map[key] = value. Key must be string/number/boolean; converted to string internally. Returns null.

get(map, key)
Returns value if key exists, else null.

hasKey(map, key)
Returns boolean whether key exists.

remove(map, key)
Deletes key from map. Returns null.

keys(map)
Returns list of string keys.

values(map)
Returns list of values.

entries(map)
Returns list of two-element lists [key, value] for each entry.

mergeMaps(map1, map2)
Returns new map merging entries from both; on conflict, map2’s value overrides.

map(list, fn)
Applies fn to each element; returns new list of results. fn can be builtin or user-defined function taking one parameter.

filter(list, fn)
Applies fn (one-parameter, returns boolean) to each element; returns list of elements where fn(el) is true.

sum(list)
Sums a list of numbers; returns numeric total. Error if any element not number.

(You can extend further by adding more built-ins in registerBuiltins.)

Examples
Below are some example snippets demonstrating Klang features.

Variables & Arithmetic
klang
Copy
Edit
let a = 10;
let b = 3.5;
let c = a + b * 2;
print("c =", c);  // c = 17.0
Control Flow
klang
Copy
Edit
let n = 5;
if (n % 2 == 0) {
  print(n, "is even");
} else {
  print(n, "is odd");
}

let i = 0;
while (i < 3) {
  print("i:", i);
  i = i + 1;
}

for (x in [10, 20, 30]) {
  print("x is", x);
}

for y in range(3) {
  print("y:", y);
}
Functions & Recursion
klang
Copy
Edit
def factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
print("5! =", factorial(5));  // 5! = 120

// Anonymous function assigned to variable
let square = def(x) {
  return x * x;
};
print("7^2 =", square(7));  // 49

// Lambda shorthand
let inc = Forge(x): x + 1;
print(inc(10));  // 11

let add = Forge(a, b): a + b;
print(add(2, 3));  // 5
Lists & Built-ins
klang
Copy
Edit
let numbers = [1, 2, 3, 4, 5];
print("length:", len(numbers));     // length: 5
print("sum:", sum(numbers));        // sum: 15

// map: square each
let squares = map(numbers, Forge(x): x * x);
print("squares:", squares);        // [1,4,9,16,25]

// filter: only even
let evens = filter(numbers, Forge(x): x % 2 == 0);
print("evens:", evens);            // [2,4]

// range
let r = range(3, 7);              // [3,4,5,6]
print("range(3,7):", r);
Maps (HashMaps)
klang
Copy
Edit
// Create empty map
let m = HashMap();
put(m, "name", "Alice");
put(m, "age", 30);
print("name:", get(m, "name"));      // name: Alice
print("has age?", hasKey(m, "age")); // has age? true
print("keys:", keys(m));             // keys: [ "name", "age" ]
print("values:", values(m));         // values: [ "Alice", 30 ]

// Literal map
let person = { name: "Bob", score: 88 };
print(person);                       // {name:Bob,score:88}
print(get(person, "score"));         // 88

// entries
let es = entries(person);
for (e in es) {
  // e is a two-element list [key, value]
  print("entry:", e[0], "=", e[1]);
}

// mergeMaps
let m1 = { a: 1, b: 2 };
let m2 = { b: 20, c: 3 };
let m3 = mergeMaps(m1, m2);
print(m3);  // {a:1,b:20,c:3}
Nested & Higher-Order Functions
klang
Copy
Edit
// Function returning a function
def makeAdder(x) {
  return def(y) { return x + y; };
}
let add5 = makeAdder(5);
print(add5(10));  // 15

// Using map with a named function
def twice(x) { return x * 2; }
let arr = [1,2,3];
print(map(arr, twice));  // [2,4,6]

// Chained calls: e.g., optional if functions return lists or functions
For-Loops Over Maps
While direct for (k in someMap) is not built-in by default, you can loop over keys:

klang
Copy
Edit
let m = {x: 1, y: 2};
for (k in keys(m)) {
  print(k, "=>", get(m, k));
}
Error Handling
Klang does not (yet) have try/catch; errors throw runtime exceptions that abort execution with a message. Use cautious coding or check with hasKey before get.

Tooling & Running Klang Code
Interpreter Usage
Assuming you have:

ast.ts, parser.ts, environment.ts, interpreter.ts, main.ts in a folder.

Deno installed.

Run:

bash
Copy
Edit
deno run --allow-read main.ts <your-file>.klang
If you pass no file, it prints usage: Usage: deno run --allow-read main.ts <source-file>.

On parse or runtime errors, you get Parse error: or Runtime error: with message and exit.

VSCode Extension
A companion VSCode extension provides:

Syntax highlighting (TextMate grammar in syntaxes/klang.tmLanguage.json).

File associations: .klang opens as Klang.

Snippets (in snippets/klang.json).

Commands: Run File (klang.runFile), Toggle Run on Save (klang.toggleAutoRunOnSave) if implemented.

Icon theme for .klang files (optional).

To load extension in development:

Open the extension folder (where package.json for the extension resides) in VSCode.

Press F5 to launch an Extension Development Host. In the new window, open a .klang file; syntax highlighting should apply, and commands appear in Command Palette (Ctrl+Shift+P) under “Klang: Run File”.

Configure settings: in your user/workspace settings:

json
Copy
Edit
{
  "files.associations": { "*.klang": "klang" },
  "klang.interpreterPath": "deno run --allow-read main.ts ${file}",
  "klang.runOnSave": false,
  "deno.enable": true,
  "deno.lint": true
}
To run the current file from VSCode: open Command Palette → “Klang: Run File”.

Language Reference Summary
Keywords
let, final

def, return

if, else

while

for, in

Forge (lambda shorthand)

Built-in function names: print, len, range, HashMap, put, get, hasKey, remove, keys, values, entries, mergeMaps, map, filter, sum, etc.

Operators
Arithmetic: +, -, *, /, %

Comparison: ==, !=, <, <=, >, >=

Logical: &&, ||, !

Assignment: = (note: no +=, -= etc. unless you extend)

Grouping: ( )

List literal: [ ... ]

Map literal: { key: value, ... }

Call: expr(args...)

Index: expr[index]

Lambda shorthand: Forge(params): expr

Statements
Variable declaration: let x = expr;, final y = expr;

Function declaration: def fname(params) { ... }

Return (inside function): return expr;

If/else: if (cond) stmtOrBlock else stmtOrBlock

While: while (cond) stmtOrBlock

For: for (item in list) stmtOrBlock or for item in list stmtOrBlock

Block: { stmt1; stmt2; ... }

Expression statement: any expression optionally ended by semicolon.

Types
Number: integer or float literal.

String: "..."

Boolean: true, false.

List: [e1, e2, ...].

Map: { k1: v1, k2: v2, ... } or HashMap() + put for dynamic.

Function: first-class.
