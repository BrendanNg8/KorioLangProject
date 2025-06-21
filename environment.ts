// environment.ts
import { BlockStatement, Statement, Expression } from "./ast.ts";

// Runtime values used during interpretation
export type RuntimeVal =
  | NumberVal
  | StringVal
  | NullVal
  | FunctionVal
  | ListVal
  | BuiltinFunctionVal;

export interface NumberVal {
  type: "number";
  value: number;
}

export interface StringVal {
  type: "string";
  value: string;
}

export interface NullVal {
  type: "null";
  value: null;
}

export interface FunctionVal {
  type: "function";
  parameters: string[];
  body: BlockStatement;
  closure: Environment;
}

export interface ListVal {
  type: "list";
  elements: RuntimeVal[];
}

export interface BuiltinFunctionVal {
  type: "builtin";
  call: (...args: RuntimeVal[]) => RuntimeVal;
}

// Signature of the interpreter's evaluate(...) function
export type EvalFnType = (
  ast: Statement | Expression,
  env: Environment
) => RuntimeVal;

// Module-scoped variable to hold the evaluate function once set
let evaluate: EvalFnType | undefined;

/**
 * Must be called before creating any Environment instances,
 * so built-ins (e.g., map/filter) can invoke evaluate(...).
 */
export function setEvaluateFn(fn: EvalFnType) {
  evaluate = fn;
}

export class Environment {
  private parent?: Environment;
  private vars: Map<string, RuntimeVal> = new Map();

  constructor(parent?: Environment) {
    this.parent = parent;
    if (!parent) {
      this.setupBuiltins();
    }
  }

  private setupBuiltins() {
    // Helper to format a RuntimeVal into string for printing
    const formatVal = (val: RuntimeVal): string => {
      switch (val.type) {
        case "string":
        case "number":
          return String(val.value);
        case "null":
          return "null";
        case "list":
          // Recursively format elements
          return "[" + val.elements.map(formatVal).join(", ") + "]";
        case "function":
          return "<function>";
        case "builtin":
          return "<builtin>";
      }
    };

    // print(...)
    this.declareVar("print", {
      type: "builtin",
      call: (...args: RuntimeVal[]): RuntimeVal => {
        console.log(args.map(formatVal).join(" "));
        return { type: "null", value: null };
      },
    });

    // len(list)
    this.declareVar("len", {
      type: "builtin",
      call: (listVal: RuntimeVal): RuntimeVal => {
        if (listVal.type !== "list") {
          throw new Error("len() expects a list");
        }
        return { type: "number", value: listVal.elements.length };
      },
    });

    // sum(list)
    this.declareVar("sum", {
      type: "builtin",
      call: (listVal: RuntimeVal): RuntimeVal => {
        if (listVal.type !== "list") {
          throw new Error("sum() expects a list");
        }
        const total = listVal.elements.reduce((acc, el) => {
          if (el.type !== "number") {
            throw new Error("sum() requires all elements to be numbers");
          }
          return acc + el.value;
        }, 0);
        return { type: "number", value: total };
      },
    });

    // range(end) or range(start, end)
    this.declareVar("range", {
      type: "builtin",
      call: (...args: RuntimeVal[]): RuntimeVal => {
        let start = 0;
        let end: number;
        if (args.length === 1) {
          const [endVal] = args;
          if (endVal.type !== "number") {
            throw new Error("range(end) expects a number");
          }
          end = endVal.value;
        } else if (args.length === 2) {
          const [startVal, endVal] = args;
          if (startVal.type !== "number" || endVal.type !== "number") {
            throw new Error("range(start, end) expects two numbers");
          }
          start = startVal.value;
          end = endVal.value;
        } else {
          throw new Error("range() expects 1 or 2 arguments");
        }
        const elements: RuntimeVal[] = [];
        for (let i = start; i < end; i++) {
          elements.push({ type: "number", value: i });
        }
        return { type: "list", elements };
      },
    });

    // map(list, func)
    this.declareVar("map", {
      type: "builtin",
      call: (listVal: RuntimeVal, funcVal: RuntimeVal): RuntimeVal => {
        if (!evaluate) {
          throw new Error(
            "Interpreter evaluate() not set before Environment creation"
          );
        }
        if (listVal.type !== "list") {
          throw new Error("map() first argument must be a list");
        }
        if (funcVal.type !== "function") {
          throw new Error("map() second argument must be a function");
        }
        const fn = funcVal as FunctionVal;
        return {
          type: "list",
          elements: listVal.elements.map((el) => {
            const callEnv = new Environment(fn.closure);
            if (fn.parameters.length < 1) {
              throw new Error(
                "map() function must have at least one parameter"
              );
            }
            callEnv.declareVar(fn.parameters[0], el);
            return evaluate!(fn.body, callEnv);
          }),
        };
      },
    });

    // filter(list, func)
    this.declareVar("filter", {
      type: "builtin",
      call: (listVal: RuntimeVal, funcVal: RuntimeVal): RuntimeVal => {
        if (!evaluate) {
          throw new Error(
            "Interpreter evaluate() not set before Environment creation"
          );
        }
        if (listVal.type !== "list") {
          throw new Error("filter() first argument must be a list");
        }
        if (funcVal.type !== "function") {
          throw new Error("filter() second argument must be a function");
        }
        const fn = funcVal as FunctionVal;
        return {
          type: "list",
          elements: listVal.elements.filter((el) => {
            const callEnv = new Environment(fn.closure);
            if (fn.parameters.length < 1) {
              throw new Error(
                "filter() function must have at least one parameter"
              );
            }
            callEnv.declareVar(fn.parameters[0], el);
            const result = evaluate!(fn.body, callEnv);
            return result.type === "number" && result.value !== 0;
          }),
        };
      },
    });
  }

  declareVar(name: string, value: RuntimeVal): void {
    this.vars.set(name, value);
  }

  assignVar(name: string, value: RuntimeVal): void {
    if (this.vars.has(name)) {
      this.vars.set(name, value);
    } else if (this.parent) {
      this.parent.assignVar(name, value);
    } else {
      throw new Error(`Undefined variable '${name}'`);
    }
  }

  lookupVar(name: string): RuntimeVal {
    if (this.vars.has(name)) {
      return this.vars.get(name)!;
    }
    if (this.parent) {
      return this.parent.lookupVar(name);
    }
    throw new Error(`Undefined variable '${name}'`);
  }
}
