// main.ts

import Parser from "./parser.ts";
import { Environment } from "./environment.ts";
import { evaluate } from "./interpreter.ts";
import { RuntimeVal } from "./environment.ts";
import { BlockStatement } from "./ast.ts"; // for typing in built-in function implementations

// Helper: format runtime values for printing
function formatRuntimeVal(val: RuntimeVal): string {
  switch (val.type) {
    case "number":
    case "string":
    case "boolean":
      return String(val.value);
    case "null":
      return "null";
    case "list":
      return `[${val.elements.map(formatRuntimeVal).join(", ")}]`;
    case "map":
      // Represent map as {k:v, ...}
      const entries = Array.from(val.map.entries()).map(
        ([k, v]) => `${k}:${formatRuntimeVal(v)}`
      );
      return `{${entries.join(", ")}}`;
    case "function":
      return "<function>";
    case "builtin":
      return "<builtin>";
    default:
      return "<unknown>";
  }
}

// Helper: safely extract error message from unknown
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return "<unknown error>";
  }
}

// Register built-in functions into the environment
function registerBuiltins(env: Environment) {
  // print(...)
  env.declareVar(
    "print",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        const out = args.map(formatRuntimeVal).join(" ");
        console.log(out);
        return { type: "null", value: null };
      },
    },
    true
  );

  // len(x): string/list/map length
  env.declareVar(
    "len",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 1) throw new Error("len expects 1 argument");
        const v = args[0];
        if (v.type === "string") {
          return { type: "number", value: v.value.length };
        }
        if (v.type === "list") {
          return { type: "number", value: v.elements.length };
        }
        if (v.type === "map") {
          return { type: "number", value: v.map.size };
        }
        throw new Error("len() argument must be string, list, or map");
      },
    },
    true
  );

  // range(n) or range(start, end)
  env.declareVar(
    "range",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length === 1 && args[0].type === "number") {
          const n = args[0].value;
          const arr: RuntimeVal[] = [];
          for (let i = 0; i < n; i++) {
            arr.push({ type: "number", value: i });
          }
          return { type: "list", elements: arr };
        }
        if (
          args.length === 2 &&
          args[0].type === "number" &&
          args[1].type === "number"
        ) {
          const start = args[0].value;
          const end = args[1].value;
          const arr: RuntimeVal[] = [];
          for (let i = start; i < end; i++) {
            arr.push({ type: "number", value: i });
          }
          return { type: "list", elements: arr };
        }
        throw new Error("range expects 1 or 2 numeric arguments");
      },
    },
    true
  );

  // HashMap(): create empty map
  env.declareVar(
    "HashMap",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 0) throw new Error("HashMap() takes no arguments");
        return { type: "map", map: new Map<string, RuntimeVal>() };
      },
    },
    true
  );

  // put(map, key, value)
  env.declareVar(
    "put",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 3) throw new Error("put expects 3 arguments");
        const [mVal, keyVal, valueVal] = args;
        if (mVal.type !== "map")
          throw new Error("First arg to put must be map");
        let keyStr: string;
        if (keyVal.type === "string") {
          keyStr = keyVal.value;
        } else if (keyVal.type === "number" || keyVal.type === "boolean") {
          keyStr = String(keyVal.value);
        } else {
          throw new Error("Map key must be string/number/boolean");
        }
        mVal.map.set(keyStr, valueVal);
        return { type: "null", value: null };
      },
    },
    true
  );

  // get(map, key)
  env.declareVar(
    "get",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 2) throw new Error("get expects 2 arguments");
        const [mVal, keyVal] = args;
        if (mVal.type !== "map")
          throw new Error("First arg to get must be map");
        let keyStr: string;
        if (keyVal.type === "string") {
          keyStr = keyVal.value;
        } else if (keyVal.type === "number" || keyVal.type === "boolean") {
          keyStr = String(keyVal.value);
        } else {
          throw new Error("Map key must be string/number/boolean");
        }
        return mVal.map.has(keyStr)
          ? mVal.map.get(keyStr)!
          : { type: "null", value: null };
      },
    },
    true
  );

  // hasKey(map, key)
  env.declareVar(
    "hasKey",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 2) throw new Error("hasKey expects 2 arguments");
        const [mVal, keyVal] = args;
        if (mVal.type !== "map")
          throw new Error("First arg to hasKey must be map");
        let keyStr: string;
        if (keyVal.type === "string") {
          keyStr = keyVal.value;
        } else if (keyVal.type === "number" || keyVal.type === "boolean") {
          keyStr = String(keyVal.value);
        } else {
          throw new Error("Map key must be string/number/boolean");
        }
        return { type: "boolean", value: mVal.map.has(keyStr) };
      },
    },
    true
  );

  // remove(map, key)
  env.declareVar(
    "remove",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 2) throw new Error("remove expects 2 arguments");
        const [mVal, keyVal] = args;
        if (mVal.type !== "map")
          throw new Error("First arg to remove must be map");
        let keyStr: string;
        if (keyVal.type === "string") {
          keyStr = keyVal.value;
        } else if (keyVal.type === "number" || keyVal.type === "boolean") {
          keyStr = String(keyVal.value);
        } else {
          throw new Error("Map key must be string/number/boolean");
        }
        mVal.map.delete(keyStr);
        return { type: "null", value: null };
      },
    },
    true
  );

  // keys(map) -> list of string keys
  env.declareVar(
    "keys",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 1) throw new Error("keys expects 1 argument");
        const [mVal] = args;
        if (mVal.type !== "map")
          throw new Error("Argument to keys must be map");
        const arr = Array.from(mVal.map.keys()).map(
          (k) => ({ type: "string", value: k } as RuntimeVal)
        );
        return { type: "list", elements: arr };
      },
    },
    true
  );

  // values(map) -> list of values
  env.declareVar(
    "values",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 1) throw new Error("values expects 1 argument");
        const [mVal] = args;
        if (mVal.type !== "map")
          throw new Error("Argument to values must be map");
        const arr = Array.from(mVal.map.values());
        return { type: "list", elements: arr };
      },
    },
    true
  );

  // entries(map) -> list of [key, value]
  env.declareVar(
    "entries",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 1) throw new Error("entries expects 1 argument");
        const [mVal] = args;
        if (mVal.type !== "map")
          throw new Error("Argument to entries must be map");
        const arr = Array.from(mVal.map.entries()).map(
          ([k, v]) =>
            ({
              type: "list",
              elements: [{ type: "string", value: k }, v],
            } as RuntimeVal)
        );
        return { type: "list", elements: arr };
      },
    },
    true
  );

  // mergeMaps(map1, map2)
  env.declareVar(
    "mergeMaps",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 2) throw new Error("mergeMaps expects 2 arguments");
        const [m1, m2] = args;
        if (m1.type !== "map" || m2.type !== "map")
          throw new Error("mergeMaps args must be maps");
        const merged = new Map<string, RuntimeVal>();
        for (const [k, v] of m1.map) merged.set(k, v);
        for (const [k, v] of m2.map) merged.set(k, v);
        return { type: "map", map: merged };
      },
    },
    true
  );

  // map(list, fn)
  env.declareVar(
    "map",
    {
      type: "builtin",
      call: (args: RuntimeVal[], callEnv?: Environment): RuntimeVal => {
        if (args.length !== 2) {
          throw new Error("map expects 2 arguments: list and function");
        }
        const [lst, fn] = args;
        if (lst.type !== "list") {
          throw new Error("First arg to map must be a list");
        }
        if (fn.type !== "function" && fn.type !== "builtin") {
          throw new Error("Second arg to map must be a function");
        }
        const resultElements: RuntimeVal[] = [];
        for (const el of lst.elements) {
          let res: RuntimeVal;
          if (fn.type === "builtin") {
            res = fn.call([el], callEnv);
          } else {
            // user-defined function
            const scope = new Environment(fn.closure);
            const paramName = fn.parameters[0];
            scope.declareVar(paramName, el, false);
            res = evaluate(fn.body, scope);
          }
          resultElements.push(res);
        }
        return { type: "list", elements: resultElements };
      },
    },
    true
  );

  // filter(list, fn)
  env.declareVar(
    "filter",
    {
      type: "builtin",
      call: (args: RuntimeVal[], callEnv?: Environment): RuntimeVal => {
        if (args.length !== 2) {
          throw new Error("filter expects 2 arguments: list and function");
        }
        const [lst, fn] = args;
        if (lst.type !== "list") {
          throw new Error("First arg to filter must be a list");
        }
        if (fn.type !== "function" && fn.type !== "builtin") {
          throw new Error("Second arg to filter must be a function");
        }
        const resultElements: RuntimeVal[] = [];
        for (const el of lst.elements) {
          let cond: RuntimeVal;
          if (fn.type === "builtin") {
            cond = fn.call([el], callEnv);
          } else {
            const scope = new Environment(fn.closure);
            const paramName = fn.parameters[0];
            scope.declareVar(paramName, el, false);
            cond = evaluate(fn.body, scope);
          }
          if (cond.type !== "boolean") {
            throw new Error("filter function must return boolean");
          }
          if (cond.value) {
            resultElements.push(el);
          }
        }
        return { type: "list", elements: resultElements };
      },
    },
    true
  );

  // sum(list)
  env.declareVar(
    "sum",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        if (args.length !== 1) throw new Error("sum expects 1 argument: list");
        const [lst] = args;
        if (lst.type !== "list")
          throw new Error("Argument to sum must be list");
        let total = 0;
        for (const el of lst.elements) {
          if (el.type !== "number")
            throw new Error("sum list must contain numbers");
          total += el.value;
        }
        return { type: "number", value: total };
      },
    },
    true
  );

  // You can add more built-ins here...
}

// Main entry
async function main() {
  // 1. Read filename from args
  const filename = Deno.args[0];
  if (!filename) {
    console.error("Usage: deno run --allow-read main.ts <source-file>");
    Deno.exit(1);
  }

  // 2. Read source text
  let source: string;
  try {
    source = Deno.readTextFileSync(filename);
  } catch (e) {
    console.error("Error reading file:", getErrorMessage(e));
    Deno.exit(1);
  }

  // 3. Setup environment and built-ins
  const env = new Environment();
  registerBuiltins(env);

  // 4. Parse
  let ast;
  try {
    const parser = new Parser();
    ast = parser.produceAST(source);
  } catch (e) {
    console.error("Parse error:", getErrorMessage(e));
    Deno.exit(1);
  }

  // 5. Evaluate
  try {
    const result = evaluate(ast, env);
    // Only print final result if non-null:
    if (result.type !== "null") {
      console.log("Program result:", formatRuntimeVal(result));
    }
  } catch (e) {
    console.error("Runtime error:", getErrorMessage(e));
    Deno.exit(1);
  }
}

// Run if invoked directly
if (import.meta.main) {
  main();
}

//deno run --allow-read main.ts
//deno run --allow-read main.ts test.txt
