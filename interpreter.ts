import {
  Program,
  Statement,
  Expression,
  NumericLiteral,
  StringLiteral,
  Identifier,
  BinaryExpression,
  VarDeclaration,
  FunctionDeclaration,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  BlockStatement,
  CallExpression,
  ListLiteral,
  FunctionExpression,
} from "./ast.ts";

import {
  Environment,
  RuntimeVal,
  NumberVal,
  StringVal,
  NullVal,
  FunctionVal,
  ListVal,
  BuiltinFunctionVal,
} from "./environment.ts";

export function evaluateProgram(
  program: Program,
  env: Environment
): RuntimeVal {
  let lastVal: RuntimeVal = { type: "null", value: null };
  for (const stmt of program.body) {
    lastVal = evaluate(stmt, env);
  }
  return lastVal;
}

export function evaluate(
  ast: Statement | Expression,
  env: Environment
): RuntimeVal {
  switch (ast.kind) {
    case "NumericLiteral":
      return { type: "number", value: (ast as NumericLiteral).value };

    case "StringLiteral":
      return { type: "string", value: (ast as StringLiteral).value };

    case "Identifier":
      return env.lookupVar((ast as Identifier).symbol);

    case "VarDeclaration": {
      const decl = ast as VarDeclaration;
      const val = evaluate(decl.value, env);
      env.declareVar(decl.identifier, val);
      return val;
    }

    case "BinaryExpr": {
      const bin = ast as BinaryExpression;
      const left = evaluate(bin.left, env) as NumberVal;
      const right = evaluate(bin.right, env) as NumberVal;
      switch (bin.operator) {
        case "+":
          return { type: "number", value: left.value + right.value };
        case "-":
          return { type: "number", value: left.value - right.value };
        case "*":
          return { type: "number", value: left.value * right.value };
        case "/":
          return { type: "number", value: left.value / right.value };
        case "%":
          return { type: "number", value: left.value % right.value };
        case "==":
          return { type: "number", value: left.value === right.value ? 1 : 0 };
        case "!=":
          return { type: "number", value: left.value !== right.value ? 1 : 0 };
        case "<":
          return { type: "number", value: left.value < right.value ? 1 : 0 };
        case "<=":
          return { type: "number", value: left.value <= right.value ? 1 : 0 };
        case ">":
          return { type: "number", value: left.value > right.value ? 1 : 0 };
        case ">=":
          return { type: "number", value: left.value >= right.value ? 1 : 0 };
        default:
          throw new Error(`Unknown operator ${bin.operator}`);
      }
    }

    case "Block": {
      const block = ast as BlockStatement;
      const localEnv = new Environment(env);
      let result: RuntimeVal = { type: "null", value: null };
      for (const stmt of block.body) {
        result = evaluate(stmt, localEnv);
      }
      return result;
    }

    case "IfStatement": {
      const ifStmt = ast as IfStatement;
      const condition = evaluate(ifStmt.condition, env);
      if ((condition as NumberVal).value !== 0) {
        return evaluate(ifStmt.thenBranch, env);
      } else if (ifStmt.elseBranch) {
        return evaluate(ifStmt.elseBranch, env);
      }
      return { type: "null", value: null };
    }

    case "WhileStatement": {
      const whileStmt = ast as WhileStatement;
      let result: RuntimeVal = { type: "null", value: null };
      while ((evaluate(whileStmt.condition, env) as NumberVal).value !== 0) {
        result = evaluate(whileStmt.body, env);
      }
      return result;
    }

    case "ForStatement": {
      const forStmt = ast as ForStatement;
      const iterable = evaluate(forStmt.range, env);
      if (iterable.type !== "list") throw new Error("for loop expects a list");
      let result: RuntimeVal = { type: "null", value: null };
      for (const elem of iterable.elements) {
        const loopEnv = new Environment(env);
        loopEnv.declareVar(forStmt.iterator, elem);
        result = evaluate(forStmt.body, loopEnv);
      }
      return result;
    }

    case "FunctionDeclaration": {
      const fn = ast as FunctionDeclaration;
      const func: FunctionVal = {
        type: "function",
        parameters: fn.parameters,
        body: fn.body,
        closure: env,
      };
      env.declareVar(fn.name, func);
      return func;
    }

    case "FunctionExpression": {
      const fn = ast as FunctionExpression;
      return {
        type: "function",
        parameters: fn.parameters,
        body: fn.body,
        closure: env,
      };
    }

    case "CallExpr": {
      const call = ast as CallExpression;
      const func = evaluate(call.caller, env);

      const args = call.arguments.map((arg) => evaluate(arg, env));

      if (func.type === "builtin") {
        return func.call(...args);
      }

      if (func.type !== "function") {
        throw new Error("Cannot call non-function value");
      }

      const scope = new Environment(func.closure);
      func.parameters.forEach((param, i) => {
        scope.declareVar(param, args[i]);
      });

      return evaluate(func.body, scope);
    }

    case "ReturnStatement":
      return evaluate((ast as ReturnStatement).value, env);

    case "ListLiteral":
      return {
        type: "list",
        elements: (ast as ListLiteral).elements.map((e) => evaluate(e, env)),
      };

    case "ExpressionStatement":
      return evaluate(ast.expression, env);

    default:
      throw new Error(`Unknown AST node kind: ${(ast as any).kind}`);
  }
}

export type EvalFnType = (
  ast: Statement | Expression,
  env: Environment
) => RuntimeVal;
