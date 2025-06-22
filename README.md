<p align="center">
  <img src="icon.png" width="128" height="128" alt="Korio Logo" />
</p>

<h1 align="center">🌋 Korio Programming Language</h1>

<p align="center"><i>Abbreviated as <strong>klang</strong> in file extensions</i></p>

---

## 🚀 Overview

**Korio** is a powerful, expressive, and cleanly-designed programming language inspired by Python, Java, and JavaScript. It's ideal for scripting, teaching, prototyping, and building interpretable, readable software.

- Clean syntax (no semicolons)
- Dynamically typed, with optional type annotations
- Supports functions, closures, lists, maps, and control flow
- Written in TypeScript, fully interpreted
- Strong runtime type enforcement
- Easy to read, easy to write

---

## 📦 Data Types

| Type         | Description                    | Aliases      |
|--------------|--------------------------------|--------------|
| `int`        | Integer values                 | —            |
| `float`      | Floating-point numbers         | —            |
| `string`     | Text strings                   | `str`        |
| `boolean`    | `true` / `false`               | `bool`       |
| `list`       | Ordered collection             | —            |
| `map`        | Key-value dictionary           | —            |

```korio
final int age = 25
let name = "Korio"
let isCool: bool = true
let list = [1, 2, 3]
let profile = { name: "Korio", active: true }
🧠 Variables
Use let for mutable variables

Use final for immutable constants

Optional type annotations supported

korio
Copy
Edit
let score = 100
let name: string = "Player"
final bool isAlive = true
⚙️ Expressions
Supports arithmetic, logical, string, list, and map operations.

Operators:
Arithmetic: +, -, *, /, %

Comparison: ==, !=, <, <=, >, >=

Logical: &&, ||, !

Indexing: list[0], map["key"]

Merging: list + list, map + map, "a" + 5

korio
Copy
Edit
let total = (5 + 3) * 2
let message = "Hi " + "there"
let merged = [1, 2] + [3, 4]
🔄 Control Flow
if / else
korio
Copy
Edit
if age >= 18 {
  print("Adult")
} else {
  print("Minor")
}
while
korio
Copy
Edit
let x = 0
while x < 3 {
  print(x)
  x = x + 1
}
for-in
korio
Copy
Edit
for item in [10, 20, 30] {
  print(item)
}
🧰 Functions
Function Declaration
korio
Copy
Edit
def greet(name) {
  return "Hello, " + name
}
print(greet("Korio"))
Function Expression (Anonymous)
korio
Copy
Edit
let add = def(a, b) { return a + b }
print(add(2, 3))
Lambda Shorthand (forge)
korio
Copy
Edit
let square = forge(x): x * x
print(square(5))  # 25
📚 Lists
Declare with [ ... ]

Index with [i]

Concatenate with +

korio
Copy
Edit
let items = [1, 2, 3]
print(items[0])  # 1
🗺️ Maps
Declare with { key: value }

Use strings or identifiers as keys

Index with map["key"]

korio
Copy
Edit
let user = { name: "Korio", active: true }
print(user["name"])  # "Korio"
🛠️ Built-in Functions
Function	Description
print(x)	Print to console
len(x)	Get length of string, list, or map
sum(x)	Sum of numeric list
range(n)	Returns [0, 1, ..., n-1]
map(fn, list)	Apply function to each element
filter(fn, xs)	Keep elements where fn(x) returns true
list(x)	Converts supported values to a list

korio
Copy
Edit
print(len("hello"))               # 5
print(sum([1, 2, 3]))             # 6
print(range(4))                   # [0, 1, 2, 3]
print(map(forge(x): x * 2, [1, 2]))  # [2, 4]
🔐 Type Safety
Korio allows optional type annotations. If you provide one, it’s strictly enforced at runtime.

korio
Copy
Edit
let age: int = 30
let name: string = "Korio"
An error will be thrown if the actual value doesn’t match the type.

🔄 Assignments
Korio supports variable reassignment (except for final variables).

korio
Copy
Edit
let x = 10
x = 20

final y = 5
y = 7  # ❌ Error: cannot assign to final variable
🧱 Blocks and Scoping
Blocks create their own scope:

korio
Copy
Edit
let x = 1
{
  let x = 2
  print(x)  # 2
}
print(x)  # 1
Functions also use closures and scoped variables.

🗃️ Files and Extensions
Use .klang as the extension for Korio source files:

bash
Copy
Edit
main.klang
🌈 Example Program
korio
Copy
Edit
final str language = "Korio"

def shout(word) {
  return word + "!"
}

for letter in list(language) {
  print(shout(letter))
}
🔮 Under the Hood
🧠 AST-driven interpreter written in TypeScript

🔁 Closures and environments using custom Environment class

📚 Unified file for AST and lexer: ast_lexer.ts

♻️ Fully recursive evaluate() function with runtime dispatch

✅ Strict final-variable enforcement and optional types

⚙️ Built-in functions implemented as BuiltinFunctionVal in runtime

🧭 Planned Features
Class-based OOP

Modules and imports

File I/O and async features

Type inference and optional strict typing mode

Compiler backend (Korio → JS or WASM)
