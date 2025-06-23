// environment.ts

import { Parameter, BlockStatement } from "./ast.ts";
import { evaluate } from "./interpreter.ts";

// ─── Runtime Value Types ────────────────────────────────────────────────────

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
  entries: Map<string, RuntimeVal>;
}

export interface FunctionVal {
  type: "function";
  parameters: Parameter[];
  body: BlockStatement;
  closure: Environment;
}

export interface BuiltinFunctionVal {
  type: "builtin-function";
  name: string;
  call(args: RuntimeVal[], env?: Environment): RuntimeVal;
}

export type RuntimeVal =
  | NumberVal
  | StringVal
  | BooleanVal
  | NullVal
  | ListVal
  | MapVal
  | FunctionVal
  | BuiltinFunctionVal;

// ─── Environment ───────────────────────────────────────────────────────────

export class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeVal> = new Map();
  private constants: Set<string> = new Set();
  private types: Map<string, string | undefined> = new Map();

  constructor(parentEnv?: Environment) {
    this.parent = parentEnv;
  }

  /**
   * Declare a new variable in this scope.
   * @param name variable name
   * @param value initial RuntimeVal
   * @param isConstant true if 'final'
   * @param varType optional annotation string (e.g. "int", "string", "bool", "list", "map")
   */
  public declareVar(
    name: string,
    value: RuntimeVal,
    isConstant: boolean,
    varType?: string
  ): RuntimeVal {
    if (this.variables.has(name)) {
      throw new Error(`Variable '${name}' already declared in this scope.`);
    }
    // enforce type annotation if present
    if (varType) {
      enforceType(value, varType);
    }
    this.variables.set(name, value);
    this.types.set(name, varType);
    if (isConstant) {
      this.constants.add(name);
    }
    return value;
  }

  /**
   * Assign to an existing variable.
   * Looks up the variable in nearest scope; if constant or type mismatch, throws.
   */
  public assignVar(name: string, value: RuntimeVal): RuntimeVal {
    const env = this.resolve(name);
    if (env.constants.has(name)) {
      throw new Error(`Cannot assign to constant variable '${name}'.`);
    }
    const expectedType = env.types.get(name);
    if (expectedType) {
      enforceType(value, expectedType);
    }
    env.variables.set(name, value);
    return value;
  }

  /**
   * Look up a variable value, searching parent scopes if needed.
   * Throws if not found.
   */
  public lookupVar(name: string): RuntimeVal {
    const env = this.resolve(name);
    const val = env.variables.get(name);
    if (val === undefined) {
      // This shouldn't happen if resolve succeeded
      throw new Error(`Variable '${name}' has no value.`);
    }
    return val;
  }

  /**
   * Resolve the Environment in which `name` is declared.
   * Throws if not found.
   */
  private resolve(name: string): Environment {
    if (this.variables.has(name)) {
      return this;
    }
    if (this.parent) {
      return this.parent.resolve(name);
    }
    throw new Error(`Variable '${name}' is not defined.`);
  }
}

// ─── Runtime Type Enforcement ───────────────────────────────────────────────

/**
 * Check at runtime that `val` matches annotation `typeName`.
 * Supported annotations: "int"/"float"/"number", "string"/"str", "bool"/"boolean",
 * "list", "map".
 * Throws Error if mismatch or unknown annotation.
 */
export function enforceType(val: RuntimeVal, typeName: string): void {
  const normalized = typeName.toLowerCase();
  let ok = false;
  switch (normalized) {
    case "int":
    case "float":
    case "number":
      ok = val.type === "number";
      break;
    case "string":
    case "str":
      ok = val.type === "string";
      break;
    case "bool":
    case "boolean":
      ok = val.type === "boolean";
      break;
    case "list":
      ok = val.type === "list";
      break;
    case "map":
      ok = val.type === "map";
      break;
    default:
      throw new Error(`Unknown type annotation '${typeName}'.`);
  }
  if (!ok) {
    throw new Error(
      `Type mismatch: expected '${typeName}', got '${val.type}'.`
    );
  }
}

// ─── Built-in Functions ─────────────────────────────────────────────────────

/**
 * Creates a fresh global environment with built-in functions registered.
 * Built-ins: print, len, sum, list, range, map, filter.
 */
export function createGlobalEnv(): Environment {
  const env = new Environment();

  const makeBuiltin = (
    name: string,
    fn: (args: RuntimeVal[], env?: Environment) => RuntimeVal
  ): BuiltinFunctionVal => ({
    type: "builtin-function",
    name,
    call: fn,
  });

  // Helper: format a RuntimeVal for printing
  function formatRuntimeVal(val: RuntimeVal): string {
    switch (val.type) {
      case "null":
        return "null";
      case "number":
        return String((val as NumberVal).value);
      case "string":
        return (val as StringVal).value;
      case "boolean":
        return String((val as BooleanVal).value);
      case "list":
        return (
          "[" +
          (val as ListVal).elements.map((e) => formatRuntimeVal(e)).join(", ") +
          "]"
        );
      case "map": {
        const entries: string[] = [];
        for (const [k, v] of (val as MapVal).entries) {
          entries.push(`${k}: ${formatRuntimeVal(v)}`);
        }
        return "{" + entries.join(", ") + "}";
      }
      case "function":
        return "<function>";
      case "builtin-function":
        return `<builtin ${(val as BuiltinFunctionVal).name}>`;
      default:
        return "<unknown>";
    }
  }

  // print(...)
  env.declareVar(
    "print",
    makeBuiltin("print", (args) => {
      const out = args.map((a) => formatRuntimeVal(a)).join(" ");
      console.log(out);
      return { type: "null", value: null };
    }),
    true
  );

  // len(x)
  env.declareVar(
    "len",
    makeBuiltin("len", ([arg]) => {
      if (arg.type === "list") {
        return { type: "number", value: (arg as ListVal).elements.length };
      }
      if (arg.type === "string") {
        return { type: "number", value: (arg as StringVal).value.length };
      }
      throw new Error("len() only works on lists and strings");
    }),
    true
  );

  // sum(list)
  env.declareVar(
    "sum",
    makeBuiltin("sum", ([arg]) => {
      if (arg.type !== "list") {
        throw new Error("sum() requires a list");
      }
      let total = 0;
      for (const el of (arg as ListVal).elements) {
        if (el.type !== "number") {
          throw new Error("sum() only works on lists of numbers");
        }
        total += (el as NumberVal).value;
      }
      return { type: "number", value: total };
    }),
    true
  );

  // list(x)
  env.declareVar(
    "list",
    makeBuiltin("list", ([arg]) => {
      if (arg.type === "list") {
        return arg;
      }
      if (arg.type === "string") {
        const elems: RuntimeVal[] = [];
        for (const ch of (arg as StringVal).value) {
          elems.push({ type: "string", value: ch });
        }
        return { type: "list", elements: elems };
      }
      throw new Error("list() can only convert a string or list");
    }),
    true
  );

  // range(...)
  env.declareVar(
    "range",
    makeBuiltin("range", (args) => {
      let start = 0;
      let end: number;
      let step = 1;
      if (args.length === 1) {
        if (args[0].type !== "number")
          throw new Error("range() argument must be a number");
        end = (args[0] as NumberVal).value;
      } else if (args.length === 2) {
        if (args[0].type !== "number" || args[1].type !== "number") {
          throw new Error("range() arguments must be numbers");
        }
        start = (args[0] as NumberVal).value;
        end = (args[1] as NumberVal).value;
      } else if (args.length === 3) {
        if (
          args[0].type !== "number" ||
          args[1].type !== "number" ||
          args[2].type !== "number"
        ) {
          throw new Error("range() arguments must be numbers");
        }
        start = (args[0] as NumberVal).value;
        end = (args[1] as NumberVal).value;
        step = (args[2] as NumberVal).value;
      } else {
        throw new Error("range() takes 1 to 3 numeric arguments");
      }
      if (step === 0) throw new Error("range() step must not be 0");
      const result: RuntimeVal[] = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) {
          result.push({ type: "number", value: i });
        }
      } else {
        for (let i = start; i > end; i += step) {
          result.push({ type: "number", value: i });
        }
      }
      return { type: "list", elements: result };
    }),
    true
  );

  // map(func, list)
  env.declareVar(
    "map",
    makeBuiltin("map", ([fnArg, listArg], e) => {
      if (fnArg.type !== "function" && fnArg.type !== "builtin-function") {
        throw new Error("map() requires a function as the first argument");
      }
      if (listArg.type !== "list") {
        throw new Error("map() requires a list as the second argument");
      }

      const outElems: RuntimeVal[] = [];

      for (const el of (listArg as ListVal).elements) {
        let mapped: RuntimeVal;

        if (fnArg.type === "builtin-function") {
          mapped = fnArg.call([el], e);
        } else {
          const fn = fnArg as FunctionVal;
          const callEnv = new Environment(fn.closure);

          if (fn.parameters.length < 1) {
            throw new Error(
              "map() function must accept at least one parameter"
            );
          }

          const param = fn.parameters[0];
          if (param.paramType) enforceType(el, param.paramType);

          callEnv.declareVar(param.name, el, false, param.paramType);
          mapped = evaluate(fn.body, callEnv);
        }

        outElems.push(mapped);
      }

      return { type: "list", elements: outElems };
    }),
    true
  );

  // filter(func, list)
  env.declareVar(
    "filter",
    makeBuiltin("filter", ([fnArg, listArg], e) => {
      if (fnArg.type !== "function" && fnArg.type !== "builtin-function") {
        throw new Error("filter() requires a function as the first argument");
      }
      if (listArg.type !== "list") {
        throw new Error("filter() requires a list as the second argument");
      }

      const outElems: RuntimeVal[] = [];

      for (const el of (listArg as ListVal).elements) {
        let result: RuntimeVal;

        if (fnArg.type === "builtin-function") {
          result = fnArg.call([el], e);
        } else {
          const fn = fnArg as FunctionVal;
          const callEnv = new Environment(fn.closure);

          if (fn.parameters.length < 1) {
            throw new Error(
              "filter() function must accept at least one parameter"
            );
          }

          const param = fn.parameters[0];
          if (param.paramType) enforceType(el, param.paramType);

          callEnv.declareVar(param.name, el, false, param.paramType);
          result = evaluate(fn.body, callEnv);
        }

        if (result.type !== "boolean") {
          throw new Error("filter() function must return a boolean");
        }

        if ((result as BooleanVal).value) {
          outElems.push(el);
        }
      }

      return { type: "list", elements: outElems };
    }),
    true
  );

  return env;
}
