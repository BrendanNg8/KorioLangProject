// ast.ts

// ─── Token Types ─────────────────────────────────────────────────────────────

export enum TokenType {
  // Single-character tokens
  OpenParen, // (
  CloseParen, // )
  OpenBrace, // {
  CloseBrace, // }
  OpenBracket, // [
  CloseBracket, // ]
  Comma, // ,
  Colon, // :
  Semicolon, // ;

  // One- or two-character tokens
  Equals, // =
  DoubleEquals, // ==
  NotEquals, // !=
  Less, // <
  LessEqual, // <=
  Greater, // >
  GreaterEqual, // >=
  Plus, // +
  Minus, // -
  Star, // *
  Slash, // /
  Percent, // %
  Bang, // !
  And, // &&
  Or, // ||

  // Literals
  Identifier,
  Number,
  String,

  // Keywords
  Let,
  Final,
  Def,
  If,
  Else,
  While,
  For,
  Return,
  In,

  // Special
  EOF,
}

// ─── Token ────────────────────────────────────────────────────────────────────

export interface Token {
  type: TokenType;
  value: string;
}

// ─── AST Node Kinds ──────────────────────────────────────────────────────────

// Expression and Statement kinds
export type Statement =
  | ExpressionStatement
  | VarDeclaration
  | FunctionDeclaration
  | ReturnStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | BlockStatement;

export type Expression =
  | Identifier
  | NumericLiteral
  | StringLiteral
  | BooleanLiteral
  | ListLiteral
  | MapLiteral
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | FunctionExpression
  | AssignmentExpression
  | IndexExpression;

export interface IndexExpression {
  kind: "IndexExpr";
  target: Expression;
  index: Expression;
}

// Program node
export interface Program {
  kind: "Program";
  body: Statement[];
}

// Statements

export interface ExpressionStatement {
  kind: "ExpressionStatement";
  expression: Expression;
}

export interface VarDeclaration {
  kind: "VarDeclaration";
  identifier: string;
  value: Expression;
  isFinal?: boolean;
  varType?: string;
}

export interface FunctionDeclaration {
  kind: "FunctionDeclaration";
  name: string;
  parameters: string[];
  body: BlockStatement;
}

export interface ReturnStatement {
  kind: "ReturnStatement";
  value: Expression;
}

export interface IfStatement {
  kind: "IfStatement";
  condition: Expression;
  thenBranch: Statement;
  elseBranch?: Statement;
}

export interface WhileStatement {
  kind: "WhileStatement";
  condition: Expression;
  body: Statement;
}

export interface ForStatement {
  kind: "ForStatement";
  iterator: string;
  range: Expression;
  body: Statement;
}

export interface BlockStatement {
  kind: "Block";
  body: Statement[];
}

// Expressions

export interface Identifier {
  kind: "Identifier";
  symbol: string;
}

export interface NumericLiteral {
  kind: "NumericLiteral";
  value: number;
}

export interface StringLiteral {
  kind: "StringLiteral";
  value: string;
}

export interface BooleanLiteral {
  kind: "BooleanLiteral";
  value: boolean;
}

export interface ListLiteral {
  kind: "ListLiteral";
  elements: Expression[];
}

export interface MapLiteral {
  kind: "MapLiteral";
  entries: { key: string; value: Expression }[];
}

export interface BinaryExpression {
  kind: "BinaryExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface UnaryExpression {
  kind: "UnaryExpression";
  operator: string;
  right: Expression;
}

export interface CallExpression {
  kind: "CallExpr";
  caller: Expression;
  arguments: Expression[];
}

export interface FunctionExpression {
  kind: "FunctionExpression";
  parameters: string[];
  body: BlockStatement;
}

export interface AssignmentExpression {
  kind: "AssignmentExpr";
  assignee: Identifier;
  value: Expression;
}

// ─── Lexer / Tokenizer ─────────────────────────────────────────────────────────

const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.Let,
  final: TokenType.Final,
  def: TokenType.Def,
  if: TokenType.If,
  else: TokenType.Else,
  while: TokenType.While,
  for: TokenType.For,
  return: TokenType.Return,
  in: TokenType.In,
  // Note: we do NOT map "true"/"false" here; parser handles them as boolean literals via Identifier check.
};

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const isAlpha = (ch: string) => /[a-zA-Z_]/.test(ch);
  const isAlphaNumeric = (ch: string) => /[a-zA-Z0-9_]/.test(ch);
  const isDigit = (ch: string) => /[0-9]/.test(ch);

  while (i < input.length) {
    const char = input[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Comments
    if (char === "/" && input[i + 1] === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }
    if (char === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
        i++;
      }
      i += 2; // skip "*/"
      continue;
    }

    // Strings
    if (char === '"') {
      i++;
      let value = "";
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "\\" && i + 1 < input.length) {
          // simple escape support: \" or \\
          const next = input[i + 1];
          if (next === '"' || next === "\\") {
            value += next;
            i += 2;
            continue;
          }
        }
        value += input[i++];
      }
      i++; // consume closing "
      tokens.push({ type: TokenType.String, value });
      continue;
    }

    // Numbers
    if (isDigit(char)) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i++];
      }
      tokens.push({ type: TokenType.Number, value: num });
      continue;
    }

    // Identifiers and Keywords
    if (isAlpha(char)) {
      let ident = "";
      while (i < input.length && isAlphaNumeric(input[i])) {
        ident += input[i++];
      }
      const keyword = KEYWORDS[ident];
      if (keyword !== undefined) {
        tokens.push({ type: keyword, value: ident });
      } else {
        tokens.push({ type: TokenType.Identifier, value: ident });
      }
      continue;
    }

    // Two-character operators: ==, !=, <=, >=, &&, ||
    if (char === "=" && input[i + 1] === "=") {
      tokens.push({ type: TokenType.DoubleEquals, value: "==" });
      i += 2;
      continue;
    }
    if (char === "!" && input[i + 1] === "=") {
      tokens.push({ type: TokenType.NotEquals, value: "!=" });
      i += 2;
      continue;
    }
    if (char === "<" && input[i + 1] === "=") {
      tokens.push({ type: TokenType.LessEqual, value: "<=" });
      i += 2;
      continue;
    }
    if (char === ">" && input[i + 1] === "=") {
      tokens.push({ type: TokenType.GreaterEqual, value: ">=" });
      i += 2;
      continue;
    }
    if (char === "&" && input[i + 1] === "&") {
      tokens.push({ type: TokenType.And, value: "&&" });
      i += 2;
      continue;
    }
    if (char === "|" && input[i + 1] === "|") {
      tokens.push({ type: TokenType.Or, value: "||" });
      i += 2;
      continue;
    }

    // Single-character tokens
    switch (char) {
      case "(":
        tokens.push({ type: TokenType.OpenParen, value: char });
        i++;
        break;
      case ")":
        tokens.push({ type: TokenType.CloseParen, value: char });
        i++;
        break;
      case "{":
        tokens.push({ type: TokenType.OpenBrace, value: char });
        i++;
        break;
      case "}":
        tokens.push({ type: TokenType.CloseBrace, value: char });
        i++;
        break;
      case "[":
        tokens.push({ type: TokenType.OpenBracket, value: char });
        i++;
        break;
      case "]":
        tokens.push({ type: TokenType.CloseBracket, value: char });
        i++;
        break;
      case ",":
        tokens.push({ type: TokenType.Comma, value: char });
        i++;
        break;
      case ":":
        tokens.push({ type: TokenType.Colon, value: char });
        i++;
        break;
      case ";":
        tokens.push({ type: TokenType.Semicolon, value: char });
        i++;
        break;
      case "+":
        tokens.push({ type: TokenType.Plus, value: char });
        i++;
        break;
      case "-":
        tokens.push({ type: TokenType.Minus, value: char });
        i++;
        break;
      case "*":
        tokens.push({ type: TokenType.Star, value: char });
        i++;
        break;
      case "%":
        tokens.push({ type: TokenType.Percent, value: char });
        i++;
        break;
      case "/":
        tokens.push({ type: TokenType.Slash, value: char });
        i++;
        break;
      case "=":
        tokens.push({ type: TokenType.Equals, value: "=" });
        i++;
        break;
      case "!":
        // single '!' → unary negation
        tokens.push({ type: TokenType.Bang, value: "!" });
        i++;
        break;
      case "<":
        tokens.push({ type: TokenType.Less, value: "<" });
        i++;
        break;
      case ">":
        tokens.push({ type: TokenType.Greater, value: ">" });
        i++;
        break;
      default:
        throw new Error(`Unexpected character '${char}' at position ${i}`);
    }
  }

  tokens.push({ type: TokenType.EOF, value: "EOF" });
  return tokens;
}
