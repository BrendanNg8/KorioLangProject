// interpreter.ts

import {
  Program,
  Statement,
  Expression,
  NumericLiteral,
  StringLiteral,
  BooleanLiteral,
  Identifier,
  UnaryExpression,
  BinaryExpression,
  AssignmentExpression,
  CallExpression,
  IndexExpression,
  ListLiteral,
  MapLiteral,
  FunctionDeclaration,
  FunctionExpression,
  IfStatement,
  WhileStatement,
  ForStatement,
  ReturnStatement,
  BlockStatement,
  VarDeclaration,
  Parameter,
  // MapEntry not needed here
} from "./ast.ts";

import {
  RuntimeVal,
  NumberVal,
  StringVal,
  BooleanVal,
  NullVal,
  ListVal,
  MapVal,
  FunctionVal,
  BuiltinFunctionVal,
  Environment,
  enforceType,
} from "./environment.ts";

// Singleton null value
const NULL_VAL: NullVal = { type: "null", value: null };

// -----------------------------------------------------------------------------
// ReturnSignal: used to unwind out of nested statements when a return is encountered
// -----------------------------------------------------------------------------
class ReturnSignal {
  constructor(public value: RuntimeVal) {}
}

// Type guards for Expression variants
function isIdentifier(e: Expression): e is Identifier {
  return e.kind === "Identifier";
}
function isIndexExpression(e: Expression): e is IndexExpression {
  return e.kind === "IndexExpr";
}

/**
 * Main evaluate entry: can be Program, Statement, or Expression.
 */
export function evaluate(
  node: Program | Statement | Expression,
  env: Environment
): RuntimeVal {
  switch ((node as any).kind) {
    case "Program":
      return evalProgram(node as Program, env);

    case "Block":
      return evalBlock(node as BlockStatement, env);

    case "ExpressionStatement":
      return evaluate((node as any).expression as Expression, env);

    case "VarDeclaration":
      return evalVarDeclaration(node as VarDeclaration, env);

    case "FunctionDeclaration":
      return evalFunctionDeclaration(node as FunctionDeclaration, env);

    case "FunctionExpression":
      return evalFunctionExpression(node as FunctionExpression, env);

    case "ReturnStatement":
      return evalReturnStatement(node as ReturnStatement, env);

    case "IfStatement":
      return evalIfStatement(node as IfStatement, env);

    case "WhileStatement":
      return evalWhileStatement(node as WhileStatement, env);

    case "ForStatement":
      return evalForStatement(node as ForStatement, env);

    // Expressions:
    case "NumericLiteral":
      return { type: "number", value: (node as NumericLiteral).value };

    case "StringLiteral":
      return { type: "string", value: (node as StringLiteral).value };

    case "BooleanLiteral":
      return { type: "boolean", value: (node as BooleanLiteral).value };

    case "Identifier":
      return evalIdentifier(node as Identifier, env);

    case "UnaryExpression":
      return evalUnary(node as UnaryExpression, env);

    case "BinaryExpr":
      return evalBinary(node as BinaryExpression, env);

    case "AssignmentExpr":
      return evalAssignment(node as AssignmentExpression, env);

    case "CallExpr":
      return evalCall(node as CallExpression, env);

    case "IndexExpr":
      return evalIndex(node as IndexExpression, env);

    case "ListLiteral":
      return evalListLiteral(node as ListLiteral, env);

    case "MapLiteral":
      return evalMapLiteral(node as MapLiteral, env);

    default:
      throw new Error(`Unknown AST node kind: ${(node as any).kind}`);
  }
}

// ─── Statement evaluation ──────────────────────────────────────────

function evalProgram(prog: Program, env: Environment): RuntimeVal {
  // If you wish to allow top-level 'return', catch ReturnSignal here.
  // Otherwise you can remove the try/catch and let top-level return be an error.
  try {
    let result: RuntimeVal = NULL_VAL;
    for (const stmt of prog.body) {
      result = evaluate(stmt, env);
    }
    return result;
  } catch (e) {
    if (e instanceof ReturnSignal) {
      // Unwrap top-level return
      return e.value;
    }
    throw e;
  }
}

function evalBlock(block: BlockStatement, env: Environment): RuntimeVal {
  // Do NOT catch ReturnSignal here; let it propagate to the function-call boundary.
  const localEnv = new Environment(env);
  let result: RuntimeVal = NULL_VAL;
  for (const stmt of block.body) {
    result = evaluate(stmt, localEnv);
    // If a ReturnSignal is thrown inside evaluate(stmt,...), it propagates out of this function immediately.
  }
  return result;
}

function evalVarDeclaration(
  decl: VarDeclaration,
  env: Environment
): RuntimeVal {
  // Support recursive lambdas: if RHS is a FunctionExpression, pre-declare name first
  if (decl.value.kind === "FunctionExpression") {
    // Pre-declare with a placeholder so closure captures the name
    env.declareVar(
      decl.identifier,
      NULL_VAL,
      decl.isFinal ?? false,
      decl.varType
    );
    // Now evaluate the FunctionExpression, which captures env including this binding
    const fnVal = evaluate(decl.value, env) as FunctionVal;
    // Assign the real function value
    env.assignVar(decl.identifier, fnVal);
    return fnVal;
  }
  // Normal path
  const value = evaluate(decl.value, env);
  if (decl.varType) {
    enforceType(value, decl.varType);
  }
  env.declareVar(decl.identifier, value, decl.isFinal ?? false, decl.varType);
  return value;
}

function evalFunctionDeclaration(
  decl: FunctionDeclaration,
  env: Environment
): RuntimeVal {
  const fnVal: FunctionVal = {
    type: "function",
    parameters: decl.parameters,
    body: decl.body,
    closure: env,
  };
  // Declare as constant
  env.declareVar(decl.name, fnVal, true);
  return fnVal;
}

function evalFunctionExpression(
  expr: FunctionExpression,
  env: Environment
): RuntimeVal {
  // Create a function value capturing current env
  const fnVal: FunctionVal = {
    type: "function",
    parameters: expr.parameters,
    body: expr.body,
    closure: env,
  };
  return fnVal;
}

function evalReturnStatement(stmt: ReturnStatement, env: Environment): never {
  // Evaluate the returned expression, then throw ReturnSignal
  const val = evaluate(stmt.value, env);
  throw new ReturnSignal(val);
}

function evalIfStatement(stmt: IfStatement, env: Environment): RuntimeVal {
  const condVal = evaluate(stmt.condition, env);
  if (condVal.type !== "boolean") {
    throw new Error("Condition in if must be boolean");
  }
  if (condVal.value) {
    // New scope for then-branch
    return evaluate(stmt.thenBranch, new Environment(env));
  } else if (stmt.elseBranch) {
    return evaluate(stmt.elseBranch, new Environment(env));
  }
  return NULL_VAL;
}

function evalWhileStatement(
  stmt: WhileStatement,
  env: Environment
): RuntimeVal {
  while (true) {
    const condVal = evaluate(stmt.condition, env);
    if (condVal.type !== "boolean") {
      throw new Error("Condition in while must be boolean");
    }
    if (!condVal.value) break;
    // Evaluate body in new scope; if a ReturnSignal is thrown, it propagates out
    evaluate(stmt.body, new Environment(env));
  }
  return NULL_VAL;
}

function evalForStatement(stmt: ForStatement, env: Environment): RuntimeVal {
  const iterableVal = evaluate(stmt.range, env);

  if (iterableVal.type === "list") {
    for (const item of (iterableVal as ListVal).elements) {
      const loopEnv = new Environment(env);
      loopEnv.declareVar(stmt.iterator, item, false);
      evaluate(stmt.body, loopEnv);
    }
  } else if (iterableVal.type === "string") {
    for (const ch of (iterableVal as StringVal).value) {
      const charVal: RuntimeVal = { type: "string", value: ch };
      const loopEnv = new Environment(env);
      loopEnv.declareVar(stmt.iterator, charVal, false);
      evaluate(stmt.body, loopEnv);
    }
  } else if (iterableVal.type === "map") {
    for (const key of (iterableVal as MapVal).entries.keys()) {
      const keyVal: RuntimeVal = { type: "string", value: key };
      const loopEnv = new Environment(env);
      loopEnv.declareVar(stmt.iterator, keyVal, false);
      evaluate(stmt.body, loopEnv);
    }
  } else {
    throw new Error("For-loop expects a list, string, or map");
  }
  return NULL_VAL;
}

// ─── Expression evaluation ───────────────────────────────────────

function evalIdentifier(id: Identifier, env: Environment): RuntimeVal {
  return env.lookupVar(id.symbol);
}

function evalUnary(expr: UnaryExpression, env: Environment): RuntimeVal {
  const rightVal = evaluate(expr.right, env);
  switch (expr.operator) {
    case "-":
      if (rightVal.type !== "number") {
        throw new Error("Unary '-' expects a number");
      }
      return { type: "number", value: -(rightVal as NumberVal).value };
    case "!":
      if (rightVal.type !== "boolean") {
        throw new Error("Unary '!' expects a boolean");
      }
      return { type: "boolean", value: !(rightVal as BooleanVal).value };
    default:
      throw new Error(`Unsupported unary operator: ${expr.operator}`);
  }
}

function evalBinary(expr: BinaryExpression, env: Environment): RuntimeVal {
  const leftVal = evaluate(expr.left, env);
  const rightVal = evaluate(expr.right, env);
  const op = expr.operator;

  // Number operations
  if (leftVal.type === "number" && rightVal.type === "number") {
    const l = (leftVal as NumberVal).value;
    const r = (rightVal as NumberVal).value;
    switch (op) {
      case "+":
        return { type: "number", value: l + r };
      case "-":
        return { type: "number", value: l - r };
      case "*":
        return { type: "number", value: l * r };
      case "/":
        return { type: "number", value: l / r };
      case "%":
        return { type: "number", value: l % r };
      case "==":
        return { type: "boolean", value: l === r };
      case "!=":
        return { type: "boolean", value: l !== r };
      case "<":
        return { type: "boolean", value: l < r };
      case "<=":
        return { type: "boolean", value: l <= r };
      case ">":
        return { type: "boolean", value: l > r };
      case ">=":
        return { type: "boolean", value: l >= r };
    }
  }

  // String concatenation or comparison
  if (leftVal.type === "string" || rightVal.type === "string") {
    if (op === "+") {
      const lstr =
        leftVal.type === "string"
          ? (leftVal as StringVal).value
          : String((leftVal as any).value);
      const rstr =
        rightVal.type === "string"
          ? (rightVal as StringVal).value
          : String((rightVal as any).value);
      return { type: "string", value: lstr + rstr };
    }
    if (leftVal.type === "string" && rightVal.type === "string") {
      const lstr = (leftVal as StringVal).value;
      const rstr = (rightVal as StringVal).value;
      switch (op) {
        case "==":
          return { type: "boolean", value: lstr === rstr };
        case "!=":
          return { type: "boolean", value: lstr !== rstr };
        case "<":
          return { type: "boolean", value: lstr < rstr };
        case "<=":
          return { type: "boolean", value: lstr <= rstr };
        case ">":
          return { type: "boolean", value: lstr > rstr };
        case ">=":
          return { type: "boolean", value: lstr >= rstr };
      }
    }
  }

  // Boolean operations
  if (leftVal.type === "boolean" && rightVal.type === "boolean") {
    const lb = (leftVal as BooleanVal).value;
    const rb = (rightVal as BooleanVal).value;
    switch (op) {
      case "and":
      case "&&":
        return { type: "boolean", value: lb && rb };
      case "or":
      case "||":
        return { type: "boolean", value: lb || rb };
      case "==":
        return { type: "boolean", value: lb === rb };
      case "!=":
        return { type: "boolean", value: lb !== rb };
    }
  }

  // List concatenation
  if (op === "+" && leftVal.type === "list" && rightVal.type === "list") {
    return {
      type: "list",
      elements: [
        ...(leftVal as ListVal).elements,
        ...(rightVal as ListVal).elements,
      ],
    };
  }

  // Map merging
  if (op === "+" && leftVal.type === "map" && rightVal.type === "map") {
    const merged = new Map<string, RuntimeVal>();
    for (const [k, v] of (leftVal as MapVal).entries) merged.set(k, v);
    for (const [k, v] of (rightVal as MapVal).entries) merged.set(k, v);
    return { type: "map", entries: merged };
  }

  throw new Error(
    `Unsupported operation '${op}' on types ${leftVal.type} and ${rightVal.type}`
  );
}

function evalAssignment(
  expr: AssignmentExpression,
  env: Environment
): RuntimeVal {
  const value = evaluate(expr.value, env);

  // assignee can be Identifier or IndexExpression
  if (isIdentifier(expr.assignee)) {
    return env.assignVar(expr.assignee.symbol, value);
  }
  if (isIndexExpression(expr.assignee)) {
    const idxExpr = expr.assignee;
    const targetVal = evaluate(idxExpr.target, env);
    const indexVal = evaluate(idxExpr.index, env);

    // List assignment
    if (targetVal.type === "list") {
      if (indexVal.type !== "number") {
        throw new Error("List index must be a number");
      }
      const idx = (indexVal as NumberVal).value;
      const arr = (targetVal as ListVal).elements;
      if (!Number.isInteger(idx) || idx < 0 || idx >= arr.length) {
        throw new Error(`List index out of bounds: ${idx}`);
      }
      arr[idx] = value;
      return value;
    }
    // Map assignment
    if (targetVal.type === "map") {
      let keyStr: string;
      if (
        indexVal.type === "string" ||
        indexVal.type === "number" ||
        indexVal.type === "boolean"
      ) {
        keyStr = String((indexVal as any).value);
      } else {
        throw new Error("Map key must be string/number/boolean");
      }
      (targetVal as MapVal).entries.set(keyStr, value);
      return value;
    }
    throw new Error("Invalid assignment target");
  }
  throw new Error("Invalid assignment target");
}

function evalCall(expr: CallExpression, env: Environment): RuntimeVal {
  const calleeVal = evaluate(expr.caller, env);
  const argVals = expr.arguments.map((arg) => evaluate(arg, env));

  if (calleeVal.type === "builtin-function") {
    return (calleeVal as BuiltinFunctionVal).call(argVals, env);
  }
  if (calleeVal.type === "function") {
    const fn = calleeVal as FunctionVal;
    const callEnv = new Environment(fn.closure);
    // Bind parameters
    for (let i = 0; i < fn.parameters.length; i++) {
      const param: Parameter = fn.parameters[i];
      const argVal = argVals[i] ?? NULL_VAL;
      if (param.paramType) {
        enforceType(argVal, param.paramType);
      }
      callEnv.declareVar(param.name, argVal, false, param.paramType);
    }
    // Execute body: catch ReturnSignal here
    try {
      return evaluate(fn.body, callEnv);
    } catch (e) {
      if (e instanceof ReturnSignal) {
        return e.value;
      }
      throw e;
    }
  }
  throw new Error("Attempt to call non-function value");
}

function evalIndex(expr: IndexExpression, env: Environment): RuntimeVal {
  const targetVal = evaluate(expr.target, env);
  const indexVal = evaluate(expr.index, env);

  if (targetVal.type === "list") {
    if (indexVal.type !== "number") {
      throw new Error("List index must be a number");
    }
    const idx = (indexVal as NumberVal).value;
    const arr = (targetVal as ListVal).elements;
    if (!Number.isInteger(idx) || idx < 0 || idx >= arr.length) {
      throw new Error(`List index out of bounds: ${idx}`);
    }
    return arr[idx];
  }
  if (targetVal.type === "string") {
    if (indexVal.type !== "number") {
      throw new Error("String index must be a number");
    }
    const idx = (indexVal as NumberVal).value;
    const s = (targetVal as StringVal).value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= s.length) {
      throw new Error(`String index out of bounds: ${idx}`);
    }
    return { type: "string", value: s.charAt(idx) };
  }
  if (targetVal.type === "map") {
    let keyStr: string;
    if (
      indexVal.type === "string" ||
      indexVal.type === "number" ||
      indexVal.type === "boolean"
    ) {
      keyStr = String((indexVal as any).value);
    } else {
      throw new Error("Map key must be string/number/boolean");
    }
    const entry = (targetVal as MapVal).entries.get(keyStr);
    return entry !== undefined ? entry : NULL_VAL;
  }
  throw new Error("Cannot index into non-list/string/map");
}

function evalListLiteral(node: ListLiteral, env: Environment): RuntimeVal {
  const elems = node.elements.map((el) => evaluate(el, env));
  return { type: "list", elements: elems };
}

function evalMapLiteral(node: MapLiteral, env: Environment): RuntimeVal {
  const m = new Map<string, RuntimeVal>();
  for (const entry of node.entries) {
    // entry.key is parser-enforced string literal
    const val = evaluate(entry.value, env);
    m.set(entry.key, val);
  }
  return { type: "map", entries: m };
}
