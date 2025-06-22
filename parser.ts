// parser.ts

import {
  Token,
  TokenType,
  Expression,
  Statement,
  Program,
  VarDeclaration,
  BinaryExpression,
  UnaryExpression,
  Identifier,
  NumericLiteral,
  StringLiteral,
  BooleanLiteral,
  FunctionDeclaration,
  FunctionExpression,
  CallExpression,
  IfStatement,
  WhileStatement,
  ForStatement,
  BlockStatement,
  ReturnStatement,
  ListLiteral,
  MapLiteral,
  AssignmentExpression,
  IndexExpression,
} from "./ast.ts";
import { tokenize } from "./ast.ts";

export default class Parser {
  private tokens: Token[] = [];
  private current = 0;

  public produceAST(source: string): Program {
    this.tokens = tokenize(source);
    this.current = 0;
    const program: Program = { kind: "Program", body: [] };
    while (!this.isAtEnd()) {
      this.skipSeparators();
      if (this.isAtEnd()) break;
      program.body.push(this.parseStatement());
    }
    return program;
  }

  // ─── Statement parsing ───────────────────────────────────────────────────────

  private parseStatement(): Statement {
    this.skipSeparators();

    if (this.match(TokenType.Let, TokenType.Final)) {
      return this.parseVarDeclaration();
    }
    if (this.match(TokenType.Def)) {
      return this.parseFunctionDeclaration();
    }
    if (this.match(TokenType.If)) {
      return this.parseIfStatement();
    }
    if (this.match(TokenType.While)) {
      return this.parseWhileStatement();
    }
    if (this.match(TokenType.For)) {
      return this.parseForStatement();
    }
    if (this.match(TokenType.Return)) {
      return this.parseReturnStatement();
    }
    if (this.match(TokenType.OpenBrace)) {
      return this.parseBlock();
    }
    // Otherwise expression statement
    const expr = this.parseExpression();
    return { kind: "ExpressionStatement", expression: expr };
  }

  private parseVarDeclaration(): VarDeclaration {
    // previous() is Let or Final
    const isFinal = this.previous().type === TokenType.Final;
    let varType: string | undefined = undefined;
    // Optional type annotation before identifier
    if (this.check(TokenType.Identifier)) {
      const peekVal = this.peek().value;
      if (
        [
          "int",
          "float",
          "string",
          "str",
          "bool",
          "boolean",
          "list",
          "map",
        ].includes(peekVal)
      ) {
        varType = this.advance().value;
      }
    }
    const identifierToken = this.consume(
      TokenType.Identifier,
      "Expected variable name"
    );
    const identifier = identifierToken.value;
    this.consume(TokenType.Equals, "Expected '=' in variable declaration");
    const value = this.parseExpression();
    return { kind: "VarDeclaration", identifier, value, isFinal, varType };
  }

  private parseFunctionDeclaration(): FunctionDeclaration {
    // previous() was 'def'
    const nameToken = this.consume(
      TokenType.Identifier,
      "Expected function name"
    );
    const name = nameToken.value;
    const parameters = this.parseParameterList();
    const body = this.parseBlock();
    return { kind: "FunctionDeclaration", name, parameters, body };
  }

  private parseReturnStatement(): ReturnStatement {
    // previous() was 'return'
    const value = this.parseExpression();
    return { kind: "ReturnStatement", value };
  }

  private parseIfStatement(): IfStatement {
    // previous() was 'if'
    this.consume(TokenType.OpenParen, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.CloseParen, "Expected ')' after if condition");
    const thenBranch = this.parseStatement();
    let elseBranch: Statement | undefined = undefined;
    if (this.match(TokenType.Else)) {
      elseBranch = this.parseStatement();
    }
    return { kind: "IfStatement", condition, thenBranch, elseBranch };
  }

  private parseWhileStatement(): WhileStatement {
    // previous() was 'while'
    this.consume(TokenType.OpenParen, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.CloseParen, "Expected ')' after while condition");
    const body = this.parseStatement();
    return { kind: "WhileStatement", condition, body };
  }

  private parseForStatement(): ForStatement {
    // previous() was 'for'
    let iterator: string;
    let rangeExpr: Expression;

    if (this.match(TokenType.OpenParen)) {
      // for (x in xs)
      const iteratorToken = this.consume(
        TokenType.Identifier,
        "Expected loop variable in for"
      );
      iterator = iteratorToken.value;
      this.consume(TokenType.In, "Expected 'in' in for-loop");
      rangeExpr = this.parseExpression();
      this.consume(TokenType.CloseParen, "Expected ')' after for clause");
    } else {
      // for x in xs
      const iteratorToken = this.consume(
        TokenType.Identifier,
        "Expected loop variable in for"
      );
      iterator = iteratorToken.value;
      this.consume(TokenType.In, "Expected 'in' in for-loop");
      rangeExpr = this.parseExpression();
    }

    const body = this.parseStatement();
    return { kind: "ForStatement", iterator, range: rangeExpr, body };
  }

  private parseBlock(): BlockStatement {
    // Called when '{' has just been consumed
    // If parseStatement used match(OpenBrace), we've already advanced past '{'
    // If not, consume here:
    if (this.previous().type !== TokenType.OpenBrace) {
      this.consume(TokenType.OpenBrace, "Expected '{' to start block");
    }
    const body: Statement[] = [];
    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      this.skipSeparators();
      if (this.check(TokenType.CloseBrace) || this.isAtEnd()) break;
      body.push(this.parseStatement());
    }
    this.consume(TokenType.CloseBrace, "Expected '}' to close block");
    return { kind: "Block", body };
  }

  // ─── Expression parsing ──────────────────────────────────────────────────────

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const expr = this.parseLogicalOr();
    if (this.match(TokenType.Equals)) {
      const value = this.parseAssignment();
      if (expr.kind === "Identifier") {
        return { kind: "AssignmentExpr", assignee: expr, value };
      }
      throw new Error("Invalid assignment target");
    }
    return expr;
  }

  private parseLogicalOr(): Expression {
    let expr = this.parseLogicalAnd();
    while (this.match(TokenType.Or)) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      expr = { kind: "BinaryExpr", left: expr, right, operator };
    }
    return expr;
  }

  private parseLogicalAnd(): Expression {
    let expr = this.parseEquality();
    while (this.match(TokenType.And)) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      expr = { kind: "BinaryExpr", left: expr, right, operator };
    }
    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();
    while (this.match(TokenType.DoubleEquals, TokenType.NotEquals)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      expr = { kind: "BinaryExpr", left: expr, right, operator };
    }
    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseTerm();
    while (
      this.match(
        TokenType.Less,
        TokenType.LessEqual,
        TokenType.Greater,
        TokenType.GreaterEqual
      )
    ) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      expr = { kind: "BinaryExpr", left: expr, right, operator };
    }
    return expr;
  }

  private parseTerm(): Expression {
    let expr = this.parseFactor();
    while (this.match(TokenType.Plus, TokenType.Minus)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      expr = { kind: "BinaryExpr", left: expr, right, operator };
    }
    return expr;
  }

  private parseFactor(): Expression {
    let expr = this.parseUnary();
    while (this.match(TokenType.Star, TokenType.Slash, TokenType.Percent)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      expr = { kind: "BinaryExpr", left: expr, right, operator };
    }
    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.Bang, TokenType.Minus)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      return { kind: "UnaryExpression", operator, right };
    }
    return this.parsePostfix();
  }

  /**
   * parsePostfix handles both call and indexing, chaining:
   *   f(a)(b)[i][j] ...
   */
  private parsePostfix(): Expression {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match(TokenType.OpenParen)) {
        // Function call
        const args: Expression[] = [];
        if (!this.check(TokenType.CloseParen)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.Comma));
        }
        // Now must see ')'
        this.consume(TokenType.CloseParen, "Expected ')' after arguments");
        expr = { kind: "CallExpr", caller: expr, arguments: args };
      } else if (this.match(TokenType.OpenBracket)) {
        // Indexing/subscript: expr[ indexExpr ]
        const indexExpr = this.parseExpression();
        this.consume(TokenType.CloseBracket, "Expected ']' after index");
        expr = { kind: "IndexExpr", target: expr, index: indexExpr };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): Expression {
    // Lambda shorthand: Forge(params): expr
    if (this.check(TokenType.Identifier) && this.peek().value === "Forge") {
      this.advance(); // consume 'Forge'
      const parameters = this.parseParameterList();
      this.consume(TokenType.Colon, "Expected ':' after lambda parameters");
      const exprBody = this.parseExpression();
      const bodyBlock: BlockStatement = {
        kind: "Block",
        body: [{ kind: "ReturnStatement", value: exprBody }],
      };
      return { kind: "FunctionExpression", parameters, body: bodyBlock };
    }

    // Boolean literals: treat identifiers "true"/"false"
    if (this.match(TokenType.Identifier)) {
      const name = this.previous().value;
      if (name === "true") {
        return { kind: "BooleanLiteral", value: true };
      }
      if (name === "false") {
        return { kind: "BooleanLiteral", value: false };
      }
      // Otherwise a normal identifier
      return { kind: "Identifier", symbol: name };
    }

    if (this.match(TokenType.Number)) {
      const raw = this.previous().value;
      const num = Number(raw);
      if (isNaN(num)) {
        throw new Error(`Invalid number literal: ${raw}`);
      }
      return { kind: "NumericLiteral", value: num };
    }
    if (this.match(TokenType.String)) {
      return { kind: "StringLiteral", value: this.previous().value };
    }

    if (this.match(TokenType.Def)) {
      // Anonymous function expression: def(params) { ... }
      const parameters = this.parseParameterList();
      const body = this.parseBlock();
      return { kind: "FunctionExpression", parameters, body };
    }

    if (this.match(TokenType.OpenParen)) {
      const expr = this.parseExpression();
      this.consume(TokenType.CloseParen, "Expected ')' after expression");
      return expr;
    }

    if (this.match(TokenType.OpenBracket)) {
      // List literal
      const elements: Expression[] = [];
      if (!this.check(TokenType.CloseBracket)) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(TokenType.Comma));
      }
      this.consume(TokenType.CloseBracket, "Expected ']' after list elements");
      return { kind: "ListLiteral", elements };
    }

    if (this.match(TokenType.OpenBrace)) {
      // Possible map literal
      // If next is '}', empty map
      if (this.check(TokenType.CloseBrace)) {
        this.advance(); // consume '}'
        return { kind: "MapLiteral", entries: [] };
      }
      // If next indicates map entry: String or Identifier followed by Colon
      if (
        this.check(TokenType.String) ||
        (this.check(TokenType.Identifier) &&
          this.peekNext().type === TokenType.Colon)
      ) {
        const entries: { key: string; value: Expression }[] = [];
        do {
          let keyStr: string;
          if (this.match(TokenType.String)) {
            keyStr = this.previous().value;
          } else if (this.match(TokenType.Identifier)) {
            keyStr = this.previous().value;
          } else {
            throw new Error(
              "Invalid map key: expected string literal or identifier"
            );
          }
          this.consume(TokenType.Colon, "Expected ':' after map key");
          const valExpr = this.parseExpression();
          entries.push({ key: keyStr, value: valExpr });
        } while (this.match(TokenType.Comma));
        this.consume(TokenType.CloseBrace, "Expected '}' after map literal");
        return { kind: "MapLiteral", entries };
      }
      // Otherwise: `{` in expression position is invalid
      throw new Error(
        "Unexpected '{' in expression position (not a map literal)"
      );
    }

    throw new Error(`Unexpected token in expression: '${this.peek().value}'`);
  }

  private parseParameterList(): string[] {
    this.consume(TokenType.OpenParen, "Expected '(' before parameters");
    const params: string[] = [];
    if (!this.check(TokenType.CloseParen)) {
      do {
        const identToken = this.consume(
          TokenType.Identifier,
          "Expected parameter name"
        );
        params.push(identToken.value);
      } while (this.match(TokenType.Comma));
    }
    this.consume(TokenType.CloseParen, "Expected ')' after parameters");
    return params;
  }

  private skipSeparators(): void {
    // Skip semicolons between statements
    while (this.match(TokenType.Semicolon)) {
      // skip
    }
  }

  // ─── Utility methods ────────────────────────────────────────────────────────

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message}. Got '${this.peek().value}'`);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    if (this.current + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
