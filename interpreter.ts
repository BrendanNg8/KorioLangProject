// interpreter.ts

import {
  Program,
  Statement,
  Expression,
  NumericLiteral,
  StringLiteral,
  BooleanLiteral,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  ListLiteral,
  MapLiteral,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  IfStatement,
  WhileStatement,
  ForStatement,
  ReturnStatement,
  BlockStatement,
  AssignmentExpression,
  IndexExpression,
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

// ─── Runtime Helpers ──────────────────────────────────────────────────────────

// A singleton null value
const NULL: NullVal = { type: "null", value: null };

// Evaluate a Program: run each top-level statement in the given environment
function evalProgram(program: Program, env: Environment): RuntimeVal {
  let last: RuntimeVal = NULL;
  for (const stmt of program.body) {
    last = evaluate(stmt, env);
  }
  return last;
}

// Evaluate a block of statements. Caller should create a new Environment if needed.
function evalBlock(block: BlockStatement, env: Environment): RuntimeVal {
  let result: RuntimeVal = NULL;
  for (const stmt of block.body) {
    result = evaluate(stmt, env);
    // If this statement is a ReturnStatement, we bail out immediately.
    if (stmt.kind === "ReturnStatement") {
      return result;
    }
  }
  return result;
}

// Evaluate list literal
function evalListLiteral(node: ListLiteral, env: Environment): RuntimeVal {
  const elements: RuntimeVal[] = [];
  for (const el of node.elements) {
    elements.push(evaluate(el, env));
  }
  return { type: "list", elements };
}

// Evaluate map literal
function evalMapLiteral(node: MapLiteral, env: Environment): RuntimeVal {
  const resultMap = new Map<string, RuntimeVal>();
  for (const entry of node.entries) {
    const val = evaluate(entry.value, env);
    resultMap.set(entry.key, val);
  }
  return { type: "map", map: resultMap };
}

// Evaluate indexing expression: target[index]
function evalIndexExpr(node: IndexExpression, env: Environment): RuntimeVal {
  const targetVal = evaluate(node.target, env);
  const indexVal = evaluate(node.index, env);

  // List indexing
  if (targetVal.type === "list") {
    if (indexVal.type !== "number") {
      throw new Error("List index must be a number");
    }
    const idx = indexVal.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= targetVal.elements.length) {
      throw new Error(`List index out of bounds: ${idx}`);
    }
    return targetVal.elements[idx];
  }

  // String indexing: return substring of length 1
  if (targetVal.type === "string") {
    if (indexVal.type !== "number") {
      throw new Error("String index must be a number");
    }
    const idx = indexVal.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= targetVal.value.length) {
      throw new Error(`String index out of bounds: ${idx}`);
    }
    const ch = targetVal.value.charAt(idx);
    return { type: "string", value: ch };
  }

  // Map indexing: shorthand for get(map, key)
  if (targetVal.type === "map") {
    let keyStr: string;
    if (indexVal.type === "string") {
      keyStr = indexVal.value;
    } else if (indexVal.type === "number" || indexVal.type === "boolean") {
      keyStr = String(indexVal.value);
    } else {
      throw new Error("Map key must be string/number/boolean");
    }
    if (targetVal.map.has(keyStr)) {
      return targetVal.map.get(keyStr)!;
    }
    return NULL;
  }

  throw new Error("Cannot index into non-list/string/map");
}

// Evaluate unary expression: ! or -
function evalUnaryExpr(unop: UnaryExpression, env: Environment): RuntimeVal {
  const right = evaluate(unop.right, env);
  switch (unop.operator) {
    case "-":
      if (right.type !== "number") {
        throw new Error("Unary '-' expects a number");
      }
      return { type: "number", value: -right.value };
    case "!":
      if (right.type !== "boolean") {
        throw new Error("Unary '!' expects a boolean");
      }
      return { type: "boolean", value: !right.value };
    default:
      throw new Error(`Unsupported unary operator: ${unop.operator}`);
  }
}

// Evaluate binary expression with extended support
function evalBinaryExpr(binop: BinaryExpression, env: Environment): RuntimeVal {
  const left = evaluate(binop.left, env);
  const right = evaluate(binop.right, env);
  const op = binop.operator;

  // Number-number operations
  if (left.type === "number" && right.type === "number") {
    const l = left.value;
    const r = right.value;
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

  // String concatenation with primitives only: "foo" + 5 => "foo5", etc.
  if (op === "+") {
    if (left.type === "string" || right.type === "string") {
      let lstr: string;
      if (left.type === "string") {
        lstr = left.value;
      } else if (left.type === "number" || left.type === "boolean") {
        lstr = String(left.value);
      } else {
        throw new Error(`Cannot concatenate type '${left.type}' to string`);
      }
      let rstr: string;
      if (right.type === "string") {
        rstr = right.value;
      } else if (right.type === "number" || right.type === "boolean") {
        rstr = String(right.value);
      } else {
        throw new Error(`Cannot concatenate type '${right.type}' to string`);
      }
      return { type: "string", value: lstr + rstr };
    }
  }

  // Boolean-boolean operations
  if (left.type === "boolean" && right.type === "boolean") {
    switch (op) {
      case "&&":
        return { type: "boolean", value: left.value && right.value };
      case "||":
        return { type: "boolean", value: left.value || right.value };
      case "==":
        return { type: "boolean", value: left.value === right.value };
      case "!=":
        return { type: "boolean", value: left.value !== right.value };
    }
  }

  // List concatenation: list + list
  if (op === "+" && left.type === "list" && right.type === "list") {
    return {
      type: "list",
      elements: [...left.elements, ...right.elements],
    };
  }

  // Map merging: map + map
  if (op === "+" && left.type === "map" && right.type === "map") {
    const mergedMap = new Map<string, RuntimeVal>();
    for (const [k, v] of left.map) {
      mergedMap.set(k, v);
    }
    for (const [k, v] of right.map) {
      mergedMap.set(k, v);
    }
    return { type: "map", map: mergedMap };
  }

  // String comparisons lexically: "a" < "b", etc.
  if (
    left.type === "string" &&
    right.type === "string" &&
    ["==", "!=", "<", "<=", ">", ">="].includes(op)
  ) {
    const lstr = left.value;
    const rstr = right.value;
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

  // If none matched, unsupported combination
  throw new Error(
    `Unsupported binary operation: ${op} on types ${left.type} and ${right.type}`
  );
}

// Evaluate variable declaration
function evalVarDeclaration(
  decl: any /* VarDeclaration */,
  env: Environment
): RuntimeVal {
  const value = evaluate(decl.value, env);
  if (decl.varType) {
    enforceType(value, decl.varType);
  }
  env.declareVar(decl.identifier, value, decl.isFinal ?? false);
  return value;
}

// Evaluate identifier: look up in environment
function evalIdentifier(id: Identifier, env: Environment): RuntimeVal {
  return env.lookupVar(id.symbol);
}

// Evaluate function declaration: bind in env
function evalFunctionDeclaration(
  func: FunctionDeclaration,
  env: Environment
): RuntimeVal {
  const funcVal: FunctionVal = {
    type: "function",
    parameters: func.parameters,
    body: func.body,
    closure: env,
  };
  env.declareVar(func.name, funcVal, true);
  return funcVal;
}

// Evaluate function expression: create closure
function evalFunctionExpression(
  func: FunctionExpression,
  env: Environment
): RuntimeVal {
  const funcVal: FunctionVal = {
    type: "function",
    parameters: func.parameters,
    body: func.body,
    closure: env,
  };
  return funcVal;
}

// Evaluate call expression
function evalCallExpression(
  expr: CallExpression,
  env: Environment
): RuntimeVal {
  const fnVal = evaluate(expr.caller, env);
  const args = expr.arguments.map((arg) => evaluate(arg, env));
  if (fnVal.type === "builtin") {
    return fnVal.call(args, env);
  } else if (fnVal.type === "function") {
    const scope = new Environment(fnVal.closure);
    // Bind parameters
    for (let i = 0; i < fnVal.parameters.length; i++) {
      const paramName = fnVal.parameters[i];
      const argVal = args[i];
      scope.declareVar(paramName, argVal, false);
    }
    // Execute function body
    return evalBlock(fnVal.body, scope);
  } else {
    throw new Error("Tried to call non-function");
  }
}

// Evaluate if statement
function evalIfStatement(stmt: IfStatement, env: Environment): RuntimeVal {
  const cond = evaluate(stmt.condition, env);
  if (cond.type !== "boolean") {
    throw new Error("Condition must be boolean");
  }
  if (cond.value) {
    return evaluate(stmt.thenBranch, env);
  } else if (stmt.elseBranch) {
    return evaluate(stmt.elseBranch, env);
  }
  return NULL;
}

// Evaluate while statement
function evalWhileStatement(
  stmt: WhileStatement,
  env: Environment
): RuntimeVal {
  let result: RuntimeVal = NULL;
  while (true) {
    const cond = evaluate(stmt.condition, env);
    if (cond.type !== "boolean") {
      throw new Error("Condition must be boolean");
    }
    if (!cond.value) break;
    result = evaluate(stmt.body, env);
  }
  return result;
}

// Evaluate for statement: iterate over list
function evalForStatement(stmt: ForStatement, env: Environment): RuntimeVal {
  const iterable = evaluate(stmt.range, env);
  if (iterable.type !== "list") {
    throw new Error("For-loop expects a list");
  }
  for (const item of iterable.elements) {
    const scope = new Environment(env);
    scope.declareVar(stmt.iterator, item, false);
    evaluate(stmt.body, scope);
  }
  return NULL;
}

// Evaluate return statement
function evalReturnStatement(
  stmt: ReturnStatement,
  env: Environment
): RuntimeVal {
  return evaluate(stmt.value, env);
}

// ─── Main evaluate dispatch ───────────────────────────────────────────────────

export function evaluate(
  astNode: Statement | Expression | Program,
  env: Environment
): RuntimeVal {
  switch (astNode.kind) {
    case "Program":
      return evalProgram(astNode as Program, env);

    case "Block":
      return evalBlock(astNode as BlockStatement, env);

    case "ExpressionStatement":
      return evaluate((astNode as any).expression, env);

    case "NumericLiteral":
      return { type: "number", value: (astNode as NumericLiteral).value };

    case "StringLiteral":
      return { type: "string", value: (astNode as StringLiteral).value };

    case "BooleanLiteral":
      return { type: "boolean", value: (astNode as BooleanLiteral).value };

    case "ListLiteral":
      return evalListLiteral(astNode as ListLiteral, env);

    case "MapLiteral":
      return evalMapLiteral(astNode as MapLiteral, env);

    case "Identifier":
      return evalIdentifier(astNode as Identifier, env);

    case "VarDeclaration":
      return evalVarDeclaration(astNode as any, env);

    case "FunctionDeclaration":
      return evalFunctionDeclaration(astNode as FunctionDeclaration, env);

    case "FunctionExpression":
      return evalFunctionExpression(astNode as FunctionExpression, env);

    case "CallExpr":
      return evalCallExpression(astNode as CallExpression, env);

    case "BinaryExpr":
      return evalBinaryExpr(astNode as BinaryExpression, env);

    case "UnaryExpression":
      return evalUnaryExpr(astNode as UnaryExpression, env);

    case "IfStatement":
      return evalIfStatement(astNode as IfStatement, env);

    case "WhileStatement":
      return evalWhileStatement(astNode as WhileStatement, env);

    case "ForStatement":
      return evalForStatement(astNode as ForStatement, env);

    case "ReturnStatement":
      return evalReturnStatement(astNode as ReturnStatement, env);

    case "AssignmentExpr":
      // Evaluate right-hand side, then assign to variable
      const assignNode = astNode as AssignmentExpression;
      const val = evaluate(assignNode.value, env);
      env.assignVar(assignNode.assignee.symbol, val);
      return val;

    case "IndexExpr":
      return evalIndexExpr(astNode as IndexExpression, env);

    default:
      throw new Error(`Unknown AST node kind: ${(astNode as any).kind}`);
  }
}
