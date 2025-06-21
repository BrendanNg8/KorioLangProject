// ─── Token Types and Lexer ─────────────────────────────────────────────────────

export enum TokenType {
  Let,
  Def,
  If,
  Else,
  Elif,
  While,
  For,
  In,
  Return,
  Number,
  String,
  Identifier,
  Equals,
  DoubleEquals,
  NotEquals,
  Less,
  LessEqual,
  Greater,
  GreaterEqual,
  OpenParen,
  CloseParen,
  OpenBrace,
  CloseBrace,
  OpenBracket, // Added
  CloseBracket, // Added
  Comma,
  Semicolon,
  Colon,
  BinaryOperator,
  EOF,
}

export interface Token {
  value: string;
  type: TokenType;
}

const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.Let,
  def: TokenType.Def,
  if: TokenType.If,
  else: TokenType.Else,
  elif: TokenType.Elif,
  while: TokenType.While,
  for: TokenType.For,
  in: TokenType.In,
  return: TokenType.Return,
};

function isAlpha(char: string): boolean {
  return /^[a-zA-Z_]$/.test(char);
}

function isNumber(char: string): boolean {
  return /[0-9]/.test(char);
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace
    if (isWhitespace(char)) {
      i++;
      continue;
    }

    // Skip single-line comment: //
    if (char === "/" && input[i + 1] === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    // Skip block comment: /* ... */
    if (char === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
        i++;
      }
      if (i < input.length) i += 2;
      continue;
    }

    // Multi-character operators
    if (char === "=" && input[i + 1] === "=") {
      tokens.push({ value: "==", type: TokenType.DoubleEquals });
      i += 2;
      continue;
    }
    if (char === "!" && input[i + 1] === "=") {
      tokens.push({ value: "!=", type: TokenType.NotEquals });
      i += 2;
      continue;
    }
    if (char === "<" && input[i + 1] === "=") {
      tokens.push({ value: "<=", type: TokenType.LessEqual });
      i += 2;
      continue;
    }
    if (char === ">" && input[i + 1] === "=") {
      tokens.push({ value: ">=", type: TokenType.GreaterEqual });
      i += 2;
      continue;
    }

    // Single-character tokens
    switch (char) {
      case "(":
        tokens.push({ value: "(", type: TokenType.OpenParen });
        i++;
        continue;
      case ")":
        tokens.push({ value: ")", type: TokenType.CloseParen });
        i++;
        continue;
      case "{":
        tokens.push({ value: "{", type: TokenType.OpenBrace });
        i++;
        continue;
      case "}":
        tokens.push({ value: "}", type: TokenType.CloseBrace });
        i++;
        continue;
      case "[":
        tokens.push({ value: "[", type: TokenType.OpenBracket });
        i++;
        continue;
      case "]":
        tokens.push({ value: "]", type: TokenType.CloseBracket });
        i++;
        continue;
      case ",":
        tokens.push({ value: ",", type: TokenType.Comma });
        i++;
        continue;
      case ";":
        tokens.push({ value: ";", type: TokenType.Semicolon });
        i++;
        continue;
      case ":":
        tokens.push({ value: ":", type: TokenType.Colon });
        i++;
        continue;
      case "=":
        tokens.push({ value: "=", type: TokenType.Equals });
        i++;
        continue;
      case "<":
        tokens.push({ value: "<", type: TokenType.Less });
        i++;
        continue;
      case ">":
        tokens.push({ value: ">", type: TokenType.Greater });
        i++;
        continue;
    }

    // Binary operators
    if (/[+\-*/%]/.test(char)) {
      tokens.push({ value: char, type: TokenType.BinaryOperator });
      i++;
      continue;
    }

    // Number
    if (isNumber(char)) {
      let num = "";
      while (i < input.length && isNumber(input[i])) {
        num += input[i++];
      }
      tokens.push({ value: num, type: TokenType.Number });
      continue;
    }

    // String
    if (char === `"`) {
      i++; // skip "
      let str = "";
      while (i < input.length && input[i] !== `"`) {
        if (input[i] === "\\" && input[i + 1] === `"`) {
          str += `"`;
          i += 2;
        } else {
          str += input[i++];
        }
      }
      if (i >= input.length || input[i] !== `"`) {
        throw new Error("Unterminated string literal");
      }
      i++; // skip closing "
      tokens.push({ value: str, type: TokenType.String });
      continue;
    }

    // Identifier or keyword
    if (isAlpha(char)) {
      let ident = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i++];
      }
      const kw = KEYWORDS[ident];
      tokens.push({ value: ident, type: kw ?? TokenType.Identifier });
      continue;
    }

    throw new Error(`Unexpected character '${char}' at position ${i}`);
  }

  tokens.push({ value: "EOF", type: TokenType.EOF });
  return tokens;
}

// ─── AST Types ──────────────────────────────────────────────────────────────────

export type Statement =
  | VarDeclaration
  | FunctionDeclaration
  | ReturnStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | BlockStatement
  | ExpressionStatement;

export interface Program {
  kind: "Program";
  body: Statement[];
}

export interface ExpressionStatement {
  kind: "ExpressionStatement";
  expression: Expression;
}

export interface VarDeclaration {
  kind: "VarDeclaration";
  identifier: string;
  value: Expression;
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
  thenBranch: BlockStatement;
  elseBranch?: Statement;
}

export interface WhileStatement {
  kind: "WhileStatement";
  condition: Expression;
  body: BlockStatement;
}

export interface ForStatement {
  kind: "ForStatement";
  iterator: string;
  range: Expression;
  body: BlockStatement;
}

export interface BlockStatement {
  kind: "Block";
  body: Statement[];
}

// ─── Expressions ────────────────────────────────────────────────────────────────

export type Expression =
  | BinaryExpression
  | CallExpression
  | Identifier
  | NumericLiteral
  | StringLiteral
  | ListLiteral
  | FunctionExpression;

export interface BinaryExpression {
  kind: "BinaryExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface CallExpression {
  kind: "CallExpr";
  caller: Expression;
  arguments: Expression[];
}

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

export interface ListLiteral {
  kind: "ListLiteral";
  elements: Expression[];
}

export interface FunctionExpression {
  kind: "FunctionExpression";
  parameters: string[];
  body: BlockStatement;
}
