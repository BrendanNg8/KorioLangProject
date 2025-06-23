// ast.ts

// ─── Token Types & Token ─────────────────────────────────────────────────────

// All token types used by the lexer and parser:
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
  Dot, // .
  Minus, // -
  Plus, // +
  Semicolon, // ;
  Slash, // /
  Star, // *
  Percent, // %   <-- keep as in your old AST

  // One- or two-character tokens
  Bang, // !
  BangEqual, // !=
  Equal, // =
  EqualEqual, // ==
  Greater, // >
  GreaterEqual, // >=
  Less, // <
  LessEqual, // <=

  // Literals
  Identifier, // names
  String, // string literal (e.g. "foo")
  Number, // number literal (e.g. 123, 4.5)

  // Keywords
  And, // and
  Or, // or
  If, // if
  Else, // else
  While, // while
  For, // for
  In, // in
  Return, // return
  Let, // let
  Final, // final
  Def, // def
  Forge, // forge (lambda)
  True, // true
  False, // false

  EOF, // end of file/input
}

// Token interface returned by the lexer:
export interface Token {
  type: TokenType;
  value: string;
  // (optional) you can add line/column properties here if you track them.
}

// ─── Lexer / Tokenizer ──────────────────────────────────────────────────

/**
 * Lexical scanner: convert source string into an array of Tokens.
 * This handles:
 * - Whitespace skipping
 * - Identifiers and keywords
 * - Number literals (integer and decimals)
 * - String literals (double-quoted, with basic escape support)
 * - Operators and punctuation, including two-character operators: !=, ==, >=, <=
 * - Single-character tokens: parentheses, braces, brackets, comma, colon, dot, semicolon, plus, minus, star, slash, percent, etc.
 * - Keywords: and, or, if, else, while, for, in, return, let, final, def, forge, true, false
 * - Comments: // single-line, /* block *​/
 *
 * Returns a Token[] ending with an EOF token.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let start = 0;
  let current = 0;
  const length = source.length;

  function isAtEnd(): boolean {
    return current >= length;
  }

  function advance(): string {
    return source.charAt(current++);
  }

  function peek(): string {
    return isAtEnd() ? "\0" : source.charAt(current);
  }

  function peekNext(): string {
    return current + 1 >= length ? "\0" : source.charAt(current + 1);
  }

  function addToken(type: TokenType, value: string = ""): void {
    tokens.push({ type, value });
  }

  function match(expected: string): boolean {
    if (isAtEnd()) return false;
    if (source.charAt(current) !== expected) return false;
    current++;
    return true;
  }

  function skipWhitespace(): void {
    while (!isAtEnd()) {
      const c = peek();
      if (c === " " || c === "\r" || c === "\t" || c === "\n") {
        advance();
      } else if (c === "/" && peekNext() === "/") {
        // single-line comment
        while (peek() !== "\n" && !isAtEnd()) advance();
      } else if (c === "/" && peekNext() === "*") {
        // block comment
        advance(); // '/'
        advance(); // '*'
        while (!(peek() === "*" && peekNext() === "/") && !isAtEnd()) {
          advance();
        }
        if (!isAtEnd()) {
          advance(); // '*'
          advance(); // '/'
        }
      } else {
        break;
      }
    }
  }

  function stringLiteral(): void {
    // Starting quote already consumed
    let value = "";
    while (peek() !== '"' && !isAtEnd()) {
      if (peek() === "\\") {
        advance();
        const esc = peek();
        switch (esc) {
          case '"':
            value += '"';
            break;
          case "\\":
            value += "\\";
            break;
          case "n":
            value += "\n";
            break;
          case "r":
            value += "\r";
            break;
          case "t":
            value += "\t";
            break;
          default:
            value += esc;
            break;
        }
        advance();
      } else {
        value += advance();
      }
    }
    if (isAtEnd()) {
      throw new Error("Unterminated string literal");
    }
    advance(); // closing "
    addToken(TokenType.String, value);
  }

  function numberLiteral(firstDigit: string): void {
    let numStr = firstDigit;
    // integer part
    while (/\d/.test(peek())) {
      numStr += advance();
    }
    // fraction
    if (peek() === "." && /\d/.test(peekNext())) {
      numStr += advance(); // '.'
      while (/\d/.test(peek())) {
        numStr += advance();
      }
    }
    addToken(TokenType.Number, numStr);
  }

  function identifierOrKeyword(firstChar: string): void {
    let text = firstChar;
    while (/[A-Za-z0-9_]/.test(peek())) {
      text += advance();
    }
    // Check for keywords (case-sensitive)
    switch (text) {
      case "and":
        addToken(TokenType.And, text);
        return;
      case "or":
        addToken(TokenType.Or, text);
        return;
      case "if":
        addToken(TokenType.If, text);
        return;
      case "else":
        addToken(TokenType.Else, text);
        return;
      case "while":
        addToken(TokenType.While, text);
        return;
      case "for":
        addToken(TokenType.For, text);
        return;
      case "in":
        addToken(TokenType.In, text);
        return;
      case "return":
        addToken(TokenType.Return, text);
        return;
      case "let":
        addToken(TokenType.Let, text);
        return;
      case "final":
        addToken(TokenType.Final, text);
        return;
      case "def":
        addToken(TokenType.Def, text);
        return;
      case "forge":
        addToken(TokenType.Forge, text);
        return;
      case "true":
        addToken(TokenType.True, text);
        return;
      case "false":
        addToken(TokenType.False, text);
        return;
      default:
        addToken(TokenType.Identifier, text);
        return;
    }
  }

  while (!isAtEnd()) {
    skipWhitespace();
    if (isAtEnd()) break;
    start = current;
    const c = advance();
    switch (c) {
      // Single-character tokens
      case "(":
        addToken(TokenType.OpenParen, c);
        break;
      case ")":
        addToken(TokenType.CloseParen, c);
        break;
      case "{":
        addToken(TokenType.OpenBrace, c);
        break;
      case "}":
        addToken(TokenType.CloseBrace, c);
        break;
      case "[":
        addToken(TokenType.OpenBracket, c);
        break;
      case "]":
        addToken(TokenType.CloseBracket, c);
        break;
      case ",":
        addToken(TokenType.Comma, c);
        break;
      case ":":
        addToken(TokenType.Colon, c);
        break;
      case ".":
        addToken(TokenType.Dot, c);
        break;
      case ";":
        addToken(TokenType.Semicolon, c);
        break;
      case "+":
        addToken(TokenType.Plus, c);
        break;
      case "-":
        // Could be minus or arrow '->' if next is '>'
        if (peek() === ">") {
          advance();
          addToken(TokenType.Arrow, "->");
        } else {
          addToken(TokenType.Minus, c);
        }
        break;
      case "*":
        addToken(TokenType.Star, c);
        break;
      case "/":
        addToken(TokenType.Slash, c);
        break;
      case "%":
        addToken(TokenType.Percent, c);
        break;

      // One- or two-character tokens
      case "!":
        if (match("=")) {
          addToken(TokenType.BangEqual, "!=");
        } else {
          addToken(TokenType.Bang, "!");
        }
        break;
      case "=":
        if (match("=")) {
          addToken(TokenType.EqualEqual, "==");
        } else {
          addToken(TokenType.Equal, "=");
        }
        break;
      case "<":
        if (match("=")) {
          addToken(TokenType.LessEqual, "<=");
        } else {
          addToken(TokenType.Less, "<");
        }
        break;
      case ">":
        if (match("=")) {
          addToken(TokenType.GreaterEqual, ">=");
        } else {
          addToken(TokenType.Greater, ">");
        }
        break;

      // String literal
      case '"':
        stringLiteral();
        break;

      default:
        if (/\d/.test(c)) {
          numberLiteral(c);
        } else if (/[A-Za-z_]/.test(c)) {
          identifierOrKeyword(c);
        } else {
          throw new Error(`Unexpected character: '${c}'`);
        }
        break;
    }
  }

  // Append EOF token
  addToken(TokenType.EOF, "");
  return tokens;
}

// ─── AST Node Types ──────────────────────────────────────────────────────

// Top-level program
export interface Program {
  kind: "Program";
  body: Statement[];
}

// Statements
export type Statement =
  | ExpressionStatement
  | VarDeclaration
  | FunctionDeclaration
  | BlockStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | ReturnStatement;

// Expression statement: a bare expression as a statement
export interface ExpressionStatement {
  kind: "ExpressionStatement";
  expression: Expression;
}

// Variable declaration: let/ final
export interface VarDeclaration {
  kind: "VarDeclaration";
  identifier: string;
  value: Expression;
  varType?: string; // optional type annotation, e.g. ": int"
  isFinal?: boolean; // true if declared with 'final'
}

// Function declaration: def name(params) { body }
export interface Parameter {
  name: string;
  paramType?: string; // optional type annotation on parameter
}

export interface FunctionDeclaration {
  kind: "FunctionDeclaration";
  name: string;
  parameters: Parameter[];
  body: BlockStatement;
}

// Block statement: { ... }
export interface BlockStatement {
  kind: "Block";
  body: Statement[];
}

// If statement: if (condition) { thenBranch } [else { elseBranch }]
export interface IfStatement {
  kind: "IfStatement";
  condition: Expression;
  thenBranch: BlockStatement;
  elseBranch?: BlockStatement;
}

// While statement: while (condition) { body }
export interface WhileStatement {
  kind: "WhileStatement";
  condition: Expression;
  body: BlockStatement;
}

// For statement: for (iterator in range) { body }
export interface ForStatement {
  kind: "ForStatement";
  iterator: string;
  range: Expression;
  body: BlockStatement;
}

// Return statement: return expr
export interface ReturnStatement {
  kind: "ReturnStatement";
  value: Expression;
}

// Expressions
export type Expression =
  | Identifier
  | NumericLiteral
  | StringLiteral
  | BooleanLiteral
  | UnaryExpression
  | BinaryExpression
  | AssignmentExpression
  | CallExpression
  | IndexExpression
  | ListLiteral
  | MapLiteral
  | FunctionExpression;

// Identifier: variable or function name
export interface Identifier {
  kind: "Identifier";
  symbol: string;
}

// Numeric literal
export interface NumericLiteral {
  kind: "NumericLiteral";
  value: number;
}

// String literal
export interface StringLiteral {
  kind: "StringLiteral";
  value: string;
}

// Boolean literal
export interface BooleanLiteral {
  kind: "BooleanLiteral";
  value: boolean;
}

// Unary expression: !expr or -expr
export interface UnaryExpression {
  kind: "UnaryExpression";
  operator: string; // "!" or "-"
  right: Expression;
}

// Binary expression
export interface BinaryExpression {
  kind: "BinaryExpr";
  left: Expression;
  operator: string; // "+", "-", "*", "/", "%", "==", "!=", "<", "<=", ">", ">=", "and"/"or", etc.
  right: Expression;
}

// Assignment expression: assignee = value
export interface AssignmentExpression {
  kind: "AssignmentExpr";
  // Allow either Identifier or IndexExpression as assignee
  assignee: Identifier | IndexExpression;
  value: Expression;
}

// Call expression: caller(args...)
export interface CallExpression {
  kind: "CallExpr";
  caller: Expression;
  arguments: Expression[];
}

// Index expression: target[index]
export interface IndexExpression {
  kind: "IndexExpr";
  target: Expression;
  index: Expression;
}

// List literal: [elem1, elem2, ...]
export interface ListLiteral {
  kind: "ListLiteral";
  elements: Expression[];
}

// Map literal: { "key": valueExpr, ... }
export interface MapEntry {
  key: string;
  value: Expression;
}
export interface MapLiteral {
  kind: "MapLiteral";
  entries: MapEntry[];
}

// Lambda expression: forge(params) -> { body } or forge(params) { body }
export interface FunctionExpression {
  kind: "FunctionExpression";
  parameters: Parameter[];
  body: BlockStatement;
}
