// environment.ts

import { evaluate } from "./interpreter.ts";
import { BlockStatement, ReturnStatement } from "./ast.ts";

export type RuntimeVal =
  | NumberVal
  | StringVal
  | BooleanVal
  | NullVal
  | ListVal
  | MapVal
  | FunctionVal
  | BuiltinFunctionVal;

export interface NumberVal {
  type: "number";
  value: number;
}
export interface StringVal {
  type: "string";
  value: string;
}
export interface BooleanVal {
  type: "boolean";
  value: boolean;
}
export interface NullVal {
  type: "null";
  value: null;
}
export interface ListVal {
  type: "list";
  elements: RuntimeVal[];
}
export interface MapVal {
  type: "map";
  map: Map<string, RuntimeVal>;
}
export interface FunctionVal {
  type: "function";
  parameters: string[];
  body: BlockStatement;
  closure: Environment;
}
export interface BuiltinFunctionVal {
  type: "builtin";
  call: (args: RuntimeVal[], env?: Environment) => RuntimeVal;
}

type VariableEntry = {
  value: RuntimeVal;
  isFinal: boolean;
};

export class Environment {
  private parent?: Environment;
  private variables: Map<string, VariableEntry> = new Map();

  constructor(parentEnv?: Environment) {
    this.parent = parentEnv;
  }

  public declareVar(name: string, value: RuntimeVal, isFinal = false): void {
    if (this.variables.has(name)) {
      throw new Error(`Variable '${name}' already declared`);
    }
    this.variables.set(name, { value, isFinal });
  }

  public assignVar(name: string, value: RuntimeVal): void {
    const env = this.resolve(name);
    const entry = env.variables.get(name)!;
    if (entry.isFinal) {
      throw new Error(`Cannot reassign final variable '${name}'`);
    }
    env.variables.set(name, { value, isFinal: false });
  }

  public lookupVar(name: string): RuntimeVal {
    const env = this.resolve(name);
    return env.variables.get(name)!.value;
  }

  private resolve(name: string): Environment {
    if (this.variables.has(name)) return this;
    if (this.parent) return this.parent.resolve(name);
    throw new Error(`Variable '${name}' is not defined`);
  }
}

// Type enforcement
export function enforceType(value: RuntimeVal, type: string): void {
  const resolved = resolveTypeAlias(type);
  switch (resolved) {
    case "int":
    case "float":
      if (value.type !== "number") {
        throw new Error(`Expected ${resolved}, got ${value.type}`);
      }
      break;
    case "string":
      if (value.type !== "string") {
        throw new Error(`Expected string, got ${value.type}`);
      }
      break;
    case "boolean":
      if (value.type !== "boolean") {
        throw new Error(`Expected boolean, got ${value.type}`);
      }
      break;
    case "list":
      if (value.type !== "list") {
        throw new Error(`Expected list, got ${value.type}`);
      }
      break;
    case "map":
      if (value.type !== "map") {
        throw new Error(`Expected map, got ${value.type}`);
      }
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

function resolveTypeAlias(type: string): string {
  switch (type) {
    case "bool":
      return "boolean";
    case "str":
      return "string";
    default:
      return type;
  }
}

// Built-in registration
export function registerBuiltins(env: Environment) {
  // Formatter for print
  const fmt = (v: RuntimeVal): string => {
    switch (v.type) {
      case "number":
      case "string":
      case "boolean":
        return String(v.value);
      case "null":
        return "null";
      case "list":
        return "[" + v.elements.map(fmt).join(", ") + "]";
      case "map": {
        const entries: string[] = [];
        for (const [k, val] of v.map.entries()) {
          entries.push(`${k}: ${fmt(val)}`);
        }
        return `{${entries.join(", ")}}`;
      }
      case "function":
        return "<function>";
      case "builtin":
        return "<builtin>";
      default:
        return "<unknown>";
    }
  };

  // print(...)
  env.declareVar(
    "print",
    {
      type: "builtin",
      call: (args: RuntimeVal[]) => {
        console.log(...args.map(fmt));
        return { type: "null", value: null };
      },
    },
    true
  );

  // len(x)
  env.declareVar(
    "len",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 1) {
          throw new Error("len expects exactly 1 argument");
        }
        const v = args[0];
        if (v.type === "list") {
          return { type: "number", value: v.elements.length };
        }
        if (v.type === "string") {
          return { type: "number", value: (v.value as string).length };
        }
        if (v.type === "map") {
          return { type: "number", value: v.map.size };
        }
        throw new Error(`len expects list, string, or map; got ${v.type}`);
      },
    },
    true
  );

  // range(n) or range(start, end)
  env.declareVar(
    "range",
    {
      type: "builtin",
      call: (args) => {
        if (args.length === 1 && args[0].type === "number") {
          const n = args[0].value;
          const arr: RuntimeVal[] = [];
          for (let i = 0; i < n; i++) {
            arr.push({ type: "number", value: i });
          }
          return { type: "list", elements: arr };
        } else if (
          args.length === 2 &&
          args[0].type === "number" &&
          args[1].type === "number"
        ) {
          const [start, end] = [args[0].value, args[1].value];
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

  // sum(list)
  env.declareVar(
    "sum",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 1 || args[0].type !== "list") {
          throw new Error("sum expects exactly 1 list argument");
        }
        let total = 0;
        for (const el of args[0].elements) {
          if (el.type !== "number") {
            throw new Error("sum expects list of numbers");
          }
          total += el.value;
        }
        return { type: "number", value: total };
      },
    },
    true
  );

  // map(fn, list)
  env.declareVar(
    "map",
    {
      type: "builtin",
      call: (args, env) => {
        if (args.length !== 2) {
          throw new Error("map expects 2 arguments: function and list");
        }
        const fn = args[0];
        const lst = args[1];
        if (fn.type !== "function" && fn.type !== "builtin") {
          throw new Error("First argument to map must be a function");
        }
        if (lst.type !== "list") {
          throw new Error("Second argument to map must be a list");
        }
        const result: RuntimeVal[] = [];
        for (const item of lst.elements) {
          let val: RuntimeVal;
          if (fn.type === "builtin") {
            val = fn.call([item], env);
          } else {
            const scope = new Environment(fn.closure);
            scope.declareVar(fn.parameters[0], item, false);
            val = evalBlockForBuiltin(fn.body, scope);
          }
          result.push(val);
        }
        return { type: "list", elements: result };
      },
    },
    true
  );

  // filter(fn, list)
  env.declareVar(
    "filter",
    {
      type: "builtin",
      call: (args, env) => {
        if (args.length !== 2) {
          throw new Error("filter expects 2 arguments: function and list");
        }
        const fn = args[0];
        const lst = args[1];
        if (fn.type !== "function" && fn.type !== "builtin") {
          throw new Error("First argument to filter must be a function");
        }
        if (lst.type !== "list") {
          throw new Error("Second argument to filter must be a list");
        }
        const result: RuntimeVal[] = [];
        for (const item of lst.elements) {
          let keep: RuntimeVal;
          if (fn.type === "builtin") {
            keep = fn.call([item], env);
          } else {
            const scope = new Environment(fn.closure);
            scope.declareVar(fn.parameters[0], item, false);
            keep = evalBlockForBuiltin(fn.body, scope);
          }
          if (keep.type !== "boolean") {
            throw new Error("filter function must return boolean");
          }
          if (keep.value) {
            result.push(item);
          }
        }
        return { type: "list", elements: result };
      },
    },
    true
  );

  // HashMap constructor
  env.declareVar(
    "HashMap",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 0) {
          throw new Error("HashMap constructor takes no arguments");
        }
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
      call: (args) => {
        if (args.length !== 3) {
          throw new Error("put expects 3 arguments: map, key, value");
        }
        const m = args[0];
        const key = args[1];
        const value = args[2];
        if (m.type !== "map") {
          throw new Error("First argument to put must be a map");
        }
        let keyStr: string;
        if (key.type === "string") {
          keyStr = key.value;
        } else if (key.type === "number" || key.type === "boolean") {
          keyStr = String(key.value);
        } else {
          throw new Error("Map keys must be string, number, or boolean");
        }
        m.map.set(keyStr, value);
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
      call: (args) => {
        if (args.length !== 2) {
          throw new Error("get expects 2 arguments: map, key");
        }
        const m = args[0];
        const key = args[1];
        if (m.type !== "map") {
          throw new Error("First argument to get must be a map");
        }
        let keyStr: string;
        if (key.type === "string") {
          keyStr = key.value;
        } else if (key.type === "number" || key.type === "boolean") {
          keyStr = String(key.value);
        } else {
          throw new Error("Map keys must be string, number, or boolean");
        }
        if (m.map.has(keyStr)) {
          return m.map.get(keyStr)!;
        }
        return { type: "null", value: null };
      },
    },
    true
  );

  // hasKey(map, key)
  env.declareVar(
    "hasKey",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 2) {
          throw new Error("hasKey expects 2 arguments: map, key");
        }
        const m = args[0];
        const key = args[1];
        if (m.type !== "map") {
          throw new Error("First argument to hasKey must be a map");
        }
        let keyStr: string;
        if (key.type === "string") {
          keyStr = key.value;
        } else if (key.type === "number" || key.type === "boolean") {
          keyStr = String(key.value);
        } else {
          throw new Error("Map keys must be string, number, or boolean");
        }
        return { type: "boolean", value: m.map.has(keyStr) };
      },
    },
    true
  );

  // remove(map, key)
  env.declareVar(
    "remove",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 2) {
          throw new Error("remove expects 2 arguments: map, key");
        }
        const m = args[0];
        const key = args[1];
        if (m.type !== "map") {
          throw new Error("First argument to remove must be a map");
        }
        let keyStr: string;
        if (key.type === "string") {
          keyStr = key.value;
        } else if (key.type === "number" || key.type === "boolean") {
          keyStr = String(key.value);
        } else {
          throw new Error("Map keys must be string, number, or boolean");
        }
        m.map.delete(keyStr);
        return { type: "null", value: null };
      },
    },
    true
  );

  // keys(map)
  env.declareVar(
    "keys",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 1) {
          throw new Error("keys expects 1 argument: map");
        }
        const m = args[0];
        if (m.type !== "map") {
          throw new Error("Argument to keys must be a map");
        }
        const out: RuntimeVal[] = [];
        for (const k of m.map.keys()) {
          out.push({ type: "string", value: k });
        }
        return { type: "list", elements: out };
      },
    },
    true
  );

  // values(map)
  env.declareVar(
    "values",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 1) {
          throw new Error("values expects 1 argument: map");
        }
        const m = args[0];
        if (m.type !== "map") {
          throw new Error("Argument to values must be a map");
        }
        const out: RuntimeVal[] = [];
        for (const v of m.map.values()) {
          out.push(v);
        }
        return { type: "list", elements: out };
      },
    },
    true
  );

  // entries(map)
  env.declareVar(
    "entries",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 1) {
          throw new Error("entries expects 1 argument: map");
        }
        const m = args[0];
        if (m.type !== "map") {
          throw new Error("Argument to entries must be a map");
        }
        const out: RuntimeVal[] = [];
        for (const [k, v] of m.map.entries()) {
          out.push({
            type: "list",
            elements: [{ type: "string", value: k }, v],
          });
        }
        return { type: "list", elements: out };
      },
    },
    true
  );

  // mergeMaps(map1, map2)
  env.declareVar(
    "mergeMaps",
    {
      type: "builtin",
      call: (args) => {
        if (args.length !== 2) {
          throw new Error("mergeMaps expects 2 arguments: map1, map2");
        }
        const m1 = args[0];
        const m2 = args[1];
        if (m1.type !== "map" || m2.type !== "map") {
          throw new Error("Arguments to mergeMaps must be maps");
        }
        const newMap = new Map<string, RuntimeVal>();
        for (const [k, v] of m1.map.entries()) {
          newMap.set(k, v);
        }
        for (const [k, v] of m2.map.entries()) {
          newMap.set(k, v);
        }
        return { type: "map", map: newMap };
      },
    },
    true
  );
}

// Helper to evaluate user function bodies in built-ins (map/filter)
function evalBlockForBuiltin(
  body: BlockStatement,
  env: Environment
): RuntimeVal {
  let result: RuntimeVal = { type: "null", value: null };
  for (const stmt of body.body) {
    result = evaluate(stmt, env);
    if (stmt.kind === "ReturnStatement") {
      return result;
    }
  }
  return result;
}
