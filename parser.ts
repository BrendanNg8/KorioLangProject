// parser.ts

import {
  Token,
  TokenType,
  Expression,
  Statement,
  Program,
  VarDeclaration,
  BinaryExpression,
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
  ExpressionStatement,
  ListLiteral,
  MapLiteral,
  AssignmentExpression,
  UnaryExpression,
  IndexExpression,
  Parameter,
  MapEntry,
} from "./ast.ts";

export class Parser {
  private tokens: Token[] = [];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private expectToken(type: TokenType, msg: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`Parse error at '${this.peek().value}': ${msg}`);
  }

  public parse(): Program {
    const body: Statement[] = [];
    while (!this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    return { kind: "Program", body };
  }

  private parseStatement(): Statement {
    // Disallow semicolons entirely
    if (this.match(TokenType.Semicolon)) {
      throw new Error("Semicolons are not allowed in Korio syntax");
    }

    let stmt: Statement;
    if (this.match(TokenType.Def)) {
      stmt = this.parseFunctionDeclaration();
    } else if (this.match(TokenType.Let, TokenType.Final)) {
      stmt = this.parseVarDeclaration();
    } else if (this.match(TokenType.If)) {
      stmt = this.parseIfStatement();
    } else if (this.match(TokenType.While)) {
      stmt = this.parseWhileStatement();
    } else if (this.match(TokenType.For)) {
      stmt = this.parseForStatement();
    } else if (this.match(TokenType.Return)) {
      stmt = this.parseReturnStatement();
    } else if (this.match(TokenType.OpenBrace)) {
      stmt = this.parseBlockStatement();
    } else {
      stmt = this.parseExpressionStatement();
    }

    // After parsing a statement, if a semicolon is encountered, error
    if (this.match(TokenType.Semicolon)) {
      throw new Error("Semicolons are not allowed in Korio syntax");
    }
    return stmt;
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expr = this.parseExpression();
    // If next token is semicolon, error
    if (this.match(TokenType.Semicolon)) {
      throw new Error("Semicolons are not allowed in Korio syntax");
    }
    return { kind: "ExpressionStatement", expression: expr };
  }

  private parseBlockStatement(): BlockStatement {
    // '{' was already consumed
    const body: Statement[] = [];
    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.Semicolon)) {
        throw new Error("Semicolons are not allowed in Korio syntax");
      }
      body.push(this.parseStatement());
    }
    this.expectToken(TokenType.CloseBrace, "Expected '}' after block");
    return { kind: "Block", body };
  }

  private parseFunctionDeclaration(): FunctionDeclaration {
    // 'def' was consumed
    const name = this.expectToken(
      TokenType.Identifier,
      "Expected function name"
    ).value;
    const parameters = this.parseFunctionParams();
    this.expectToken(
      TokenType.OpenBrace,
      "Expected '{' to start function body"
    );
    const body = this.parseBlockStatement();
    return { kind: "FunctionDeclaration", name, parameters, body };
  }

  private parseFunctionExpression(): FunctionExpression {
    // 'forge' was consumed
    const parameters = this.parseFunctionParams();
    // support arrow syntax: forge(x) -> { ... }
    if (this.match(TokenType.Arrow)) {
      this.expectToken(TokenType.OpenBrace, "Expected '{' after '->'");
      const body = this.parseBlockStatement();
      return { kind: "FunctionExpression", parameters, body };
    }
    // fallback: forge(x) { ... }
    this.expectToken(TokenType.OpenBrace, "Expected '{' to start lambda body");
    const body = this.parseBlockStatement();
    return { kind: "FunctionExpression", parameters, body };
  }

  private parseFunctionParams(): Parameter[] {
    this.expectToken(TokenType.OpenParen, "Expected '(' before parameters");
    const params: Parameter[] = [];
    if (!this.check(TokenType.CloseParen)) {
      do {
        const name = this.expectToken(
          TokenType.Identifier,
          "Expected parameter name"
        ).value;
        let paramType: string | undefined = undefined;
        if (this.match(TokenType.Colon)) {
          paramType = this.expectToken(
            TokenType.Identifier,
            "Expected type after ':'"
          ).value;
        }
        params.push({ name, paramType });
      } while (this.match(TokenType.Comma));
    }
    this.expectToken(TokenType.CloseParen, "Expected ')' after parameters");
    return params;
  }

  private parseVarDeclaration(): VarDeclaration {
    // 'let' or 'final' was consumed
    const isFinal = this.tokens[this.current - 1].type === TokenType.Final;
    const identifier = this.expectToken(
      TokenType.Identifier,
      "Expected variable name"
    ).value;
    let varType: string | undefined = undefined;
    if (this.match(TokenType.Colon)) {
      varType = this.expectToken(
        TokenType.Identifier,
        "Expected type after ':'"
      ).value;
    }
    this.expectToken(TokenType.Equal, "Expected '=' after variable name");
    const value = this.parseExpression();
    return { kind: "VarDeclaration", identifier, value, varType, isFinal };
  }

  private parseIfStatement(): IfStatement {
    // 'if' was consumed
    this.expectToken(TokenType.OpenParen, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.expectToken(TokenType.CloseParen, "Expected ')' after condition");
    this.expectToken(TokenType.OpenBrace, "Expected '{' to start 'if' body");
    const thenBranch = this.parseBlockStatement();
    let elseBranch: BlockStatement | undefined = undefined;
    if (this.match(TokenType.Else)) {
      this.expectToken(
        TokenType.OpenBrace,
        "Expected '{' to start 'else' body"
      );
      elseBranch = this.parseBlockStatement();
    }
    return { kind: "IfStatement", condition, thenBranch, elseBranch };
  }

  private parseWhileStatement(): WhileStatement {
    // 'while' was consumed
    this.expectToken(TokenType.OpenParen, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.expectToken(TokenType.CloseParen, "Expected ')' after condition");
    this.expectToken(TokenType.OpenBrace, "Expected '{' to start 'while' body");
    const body = this.parseBlockStatement();
    return { kind: "WhileStatement", condition, body };
  }

  private parseForStatement(): ForStatement {
    // 'for' was consumed
    this.expectToken(TokenType.OpenParen, "Expected '(' after 'for'");
    const iterator = this.expectToken(
      TokenType.Identifier,
      "Expected loop variable name"
    ).value;
    this.expectToken(TokenType.In, "Expected 'in'");
    const range = this.parseExpression();
    this.expectToken(TokenType.CloseParen, "Expected ')' after for clauses");
    this.expectToken(TokenType.OpenBrace, "Expected '{' to start 'for' body");
    const body = this.parseBlockStatement();
    return { kind: "ForStatement", iterator, range, body };
  }

  private parseReturnStatement(): ReturnStatement {
    // 'return' was consumed
    const value = this.parseExpression();
    return { kind: "ReturnStatement", value };
  }

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const expr = this.parseOr();
    if (this.match(TokenType.Equal)) {
      const value = this.parseAssignment();
      if (expr.kind === "Identifier" || expr.kind === "IndexExpr") {
        return {
          kind: "AssignmentExpr",
          assignee: expr as Identifier | IndexExpression,
          value,
        };
      } else {
        throw new Error("Invalid assignment target");
      }
    }
    return expr;
  }

  private parseOr(): Expression {
    let expr = this.parseAnd();
    while (this.match(TokenType.Or)) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseAnd();
      expr = { kind: "BinaryExpr", left: expr, operator, right };
    }
    return expr;
  }

  private parseAnd(): Expression {
    let expr = this.parseEquality();
    while (this.match(TokenType.And)) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseEquality();
      expr = { kind: "BinaryExpr", left: expr, operator, right };
    }
    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();
    while (this.match(TokenType.EqualEqual, TokenType.BangEqual)) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseComparison();
      expr = { kind: "BinaryExpr", left: expr, operator, right };
    }
    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseTerm();
    while (
      this.match(
        TokenType.Greater,
        TokenType.GreaterEqual,
        TokenType.Less,
        TokenType.LessEqual
      )
    ) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseTerm();
      expr = { kind: "BinaryExpr", left: expr, operator, right };
    }
    return expr;
  }

  private parseTerm(): Expression {
    let expr = this.parseFactor();
    while (this.match(TokenType.Plus, TokenType.Minus)) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseFactor();
      expr = { kind: "BinaryExpr", left: expr, operator, right };
    }
    return expr;
  }

  private parseFactor(): Expression {
    let expr = this.parseUnary();
    while (this.match(TokenType.Star, TokenType.Slash, TokenType.Percent)) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseUnary();
      expr = { kind: "BinaryExpr", left: expr, operator, right };
    }
    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.Bang, TokenType.Minus)) {
      const operator = this.tokens[this.current - 1].value;
      const right = this.parseUnary();
      return { kind: "UnaryExpression", operator, right };
    }
    return this.parseCall();
  }

  private parseCall(): Expression {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match(TokenType.OpenParen)) {
        const args: Expression[] = [];
        if (!this.check(TokenType.CloseParen)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.Comma));
        }
        this.expectToken(TokenType.CloseParen, "Expected ')' after arguments");
        expr = { kind: "CallExpr", caller: expr, arguments: args };
      } else if (this.match(TokenType.OpenBracket)) {
        const idx = this.parseExpression();
        this.expectToken(TokenType.CloseBracket, "Expected ']' after index");
        expr = { kind: "IndexExpr", target: expr, index: idx };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): Expression {
    if (this.match(TokenType.Number)) {
      return {
        kind: "NumericLiteral",
        value: parseFloat(this.tokens[this.current - 1].value),
      };
    }
    if (this.match(TokenType.String)) {
      return {
        kind: "StringLiteral",
        value: this.tokens[this.current - 1].value,
      };
    }
    if (this.match(TokenType.True)) {
      return { kind: "BooleanLiteral", value: true };
    }
    if (this.match(TokenType.False)) {
      return { kind: "BooleanLiteral", value: false };
    }
    if (this.match(TokenType.Identifier)) {
      return {
        kind: "Identifier",
        symbol: this.tokens[this.current - 1].value,
      };
    }
    if (this.match(TokenType.Forge)) {
      return this.parseFunctionExpression();
    }
    if (this.match(TokenType.OpenParen)) {
      const expr = this.parseExpression();
      this.expectToken(TokenType.CloseParen, "Expected ')' after expression");
      return expr;
    }
    if (this.match(TokenType.OpenBracket)) {
      const elements: Expression[] = [];
      if (!this.check(TokenType.CloseBracket)) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(TokenType.Comma));
      }
      this.expectToken(
        TokenType.CloseBracket,
        "Expected ']' after list elements"
      );
      return { kind: "ListLiteral", elements };
    }
    if (this.match(TokenType.OpenBrace)) {
      const entries: MapEntry[] = [];
      if (!this.check(TokenType.CloseBrace)) {
        do {
          const keyExpr = this.parseExpression();
          if (keyExpr.kind !== "StringLiteral") {
            throw new Error("Map literal key must be a string literal");
          }
          const key = (keyExpr as StringLiteral).value;
          this.expectToken(TokenType.Colon, "Expected ':' after map key");
          const valueExpr = this.parseExpression();
          entries.push({ key, value: valueExpr });
        } while (this.match(TokenType.Comma));
      }
      this.expectToken(TokenType.CloseBrace, "Expected '}' after map literal");
      return { kind: "MapLiteral", entries };
    }
    throw new Error(`Unexpected token: '${this.peek().value}'`);
  }
}
