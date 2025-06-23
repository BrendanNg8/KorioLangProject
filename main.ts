// main.ts

import { tokenize } from "./ast.ts"; // or "./ast.ts" if you placed lexer there
import { Parser } from "./parser.ts";
import { evaluate } from "./interpreter.ts";
import {
  createGlobalEnv,
  Environment,
  RuntimeVal,
  ListVal,
  MapVal,
} from "./environment.ts";

function formatRuntimeVal(val: RuntimeVal): string {
  switch (val.type) {
    case "number":
    case "string":
    case "boolean":
      return String((val as any).value);
    case "null":
      return "null";
    case "list":
      return `[${(val as ListVal).elements.map(formatRuntimeVal).join(", ")}]`;
    case "map": {
      const entries = Array.from((val as MapVal).entries.entries()).map(
        ([k, v]) => `${k}: ${formatRuntimeVal(v)}`
      );
      return `{${entries.join(", ")}}`;
    }
    case "function":
      return "<function>";
    case "builtin-function":
      return `<builtin ${(val as any).name || ""}>`;
    default:
      return "<unknown>";
  }
}

async function main() {
  const args = Deno.args;
  if (args.length < 1) {
    console.error("Usage: deno run --allow-read main.ts <source-file>");
    Deno.exit(1);
  }
  const filename = args[0];
  let source: string;
  try {
    source = await Deno.readTextFile(filename);
  } catch (e) {
    console.error("Error reading file:", e instanceof Error ? e.message : e);
    Deno.exit(1);
  }

  const env: Environment = createGlobalEnv();

  // 1. Tokenize:
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (e) {
    console.error("Lexing error:", e instanceof Error ? e.message : e);
    Deno.exit(1);
  }

  // 2. Parse tokens:
  let ast;
  try {
    const parser = new Parser(tokens);
    ast = parser.parse();
  } catch (e) {
    console.error("Parse error:", e instanceof Error ? e.message : e);
    Deno.exit(1);
  }

  // 3. Evaluate:
  try {
    const result = evaluate(ast, env);
    if (result.type !== "null") {
      console.log("Program result:", formatRuntimeVal(result));
    }
  } catch (e) {
    console.error("Runtime error:", e instanceof Error ? e.message : e);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}

//deno run --allow-read main.ts test.txt
