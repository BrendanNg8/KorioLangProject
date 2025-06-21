import {
  Token,
  TokenType,
  Expression,
  Statement,
  Program,
  NumericLiteral,
  Identifier,
  BinaryExpression,
  VarDeclaration,
  CallExpression,
  ExpressionStatement,
  StringLiteral,
  ListLiteral,
  FunctionDeclaration,
  BlockStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  FunctionExpression,
  tokenize,
} from "./ast.ts";

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private at(): Token {
    return this.tokens[this.pos];
  }

  private eat(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType, err: string): Token {
    const prev = this.eat();
    if (prev.type !== type) {
      throw new Error(`${err}. Got: ${prev.value}`);
    }
    return prev;
  }

  public produceAST(): Program {
    const program: Program = {
      kind: "Program",
      body: [],
    };

    while (this.at().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      program.body.push(stmt);

      // OPTIONAL: skip trailing semicolon if user puts one
      if (this.at().type === TokenType.Semicolon) this.eat();
    }

    return program;
  }

  private parseStatement(): Statement {
    switch (this.at().type) {
      case TokenType.Let:
        return this.parseVarDeclaration();
      case TokenType.Def:
        return this.parseFunctionDeclaration();
      case TokenType.Return:
        return this.parseReturnStatement();
      case TokenType.If:
        return this.parseIfStatement();
      case TokenType.While:
        return this.parseWhileStatement();
      case TokenType.For:
        return this.parseForStatement();
      case TokenType.OpenBrace:
        return this.parseBlockStatement();
      default:
        return this.parseExpressionStatement();
    }
  }

  private parseVarDeclaration(): VarDeclaration {
    this.eat(); // 'let'
    const identifier = this.expect(
      TokenType.Identifier,
      "Expected identifier"
    ).value;
    this.expect(TokenType.Equals, "Expected '=' after identifier");
    const value = this.parseExpression();
    return {
      kind: "VarDeclaration",
      identifier,
      value,
    };
  }

  private parseFunctionDeclaration(): FunctionDeclaration {
    this.eat(); // 'def'
    const name = this.expect(
      TokenType.Identifier,
      "Expected function name"
    ).value;
    this.expect(TokenType.OpenParen, "Expected '(' after function name");

    const parameters: string[] = [];
    while (this.at().type !== TokenType.CloseParen) {
      const param = this.expect(
        TokenType.Identifier,
        "Expected parameter name"
      ).value;
      parameters.push(param);
      if (this.at().type === TokenType.Comma) this.eat();
    }
    this.expect(TokenType.CloseParen, "Expected ')' after parameters");
    const body = this.parseBlockStatement();

    return {
      kind: "FunctionDeclaration",
      name,
      parameters,
      body,
    };
  }

  private parseFunctionExpression(): FunctionExpression {
    this.eat(); // 'def'
    this.expect(TokenType.OpenParen, "Expected '(' after 'def'");
    const parameters: string[] = [];
    while (this.at().type !== TokenType.CloseParen) {
      const param = this.expect(
        TokenType.Identifier,
        "Expected parameter name"
      ).value;
      parameters.push(param);
      if (this.at().type === TokenType.Comma) this.eat();
    }
    this.expect(TokenType.CloseParen, "Expected ')' after parameters");
    const body = this.parseBlockStatement();
    return { kind: "FunctionExpression", parameters, body };
  }

  private parseReturnStatement(): ReturnStatement {
    this.eat(); // 'return'
    const value = this.parseExpression();
    return {
      kind: "ReturnStatement",
      value,
    };
  }

  private parseIfStatement(): IfStatement {
    this.eat(); // 'if'
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();
    let elseBranch: Statement | undefined = undefined;
    if (this.at().type === TokenType.Else) {
      this.eat();
      elseBranch = this.parseStatement();
    }
    return { kind: "IfStatement", condition, thenBranch, elseBranch };
  }

  private parseWhileStatement(): WhileStatement {
    this.eat(); // 'while'
    const condition = this.parseExpression();
    const body = this.parseBlockStatement();
    return { kind: "WhileStatement", condition, body };
  }

  private parseForStatement(): ForStatement {
    this.eat(); // 'for'
    const iterator = this.expect(
      TokenType.Identifier,
      "Expected loop variable"
    ).value;
    this.expect(TokenType.In, "Expected 'in'");
    const range = this.parseExpression();
    const body = this.parseBlockStatement();
    return { kind: "ForStatement", iterator, range, body };
  }

  private parseBlockStatement(): BlockStatement {
    this.expect(TokenType.OpenBrace, "Expected '{'");
    const body: Statement[] = [];
    while (
      this.at().type !== TokenType.CloseBrace &&
      this.at().type !== TokenType.EOF
    ) {
      const stmt = this.parseStatement();
      body.push(stmt);
      if (this.at().type === TokenType.Semicolon) this.eat(); // optional
    }
    this.expect(TokenType.CloseBrace, "Expected '}'");
    return { kind: "Block", body };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expr = this.parseExpression();
    return { kind: "ExpressionStatement", expression: expr };
  }

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    return this.parseEquality();
  }

  private parseEquality(): Expression {
    let left = this.parseComparison();
    return left;
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive();
    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (
      this.at().type === TokenType.BinaryOperator &&
      (this.at().value === "+" || this.at().value === "-")
    ) {
      const operator = this.eat().value;
      const right = this.parseMultiplicative();
      left = { kind: "BinaryExpr", left, right, operator };
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseCallExpr();

    while (
      this.at().type === TokenType.BinaryOperator &&
      (this.at().value === "*" ||
        this.at().value === "/" ||
        this.at().value === "%")
    ) {
      const operator = this.eat().value;
      const right = this.parseCallExpr();
      left = { kind: "BinaryExpr", left, right, operator };
    }

    return left;
  }

  private parseCallExpr(): Expression {
    let primary = this.parsePrimaryExpr();

    while (this.at().type === TokenType.OpenParen) {
      this.eat(); // eat '('
      const args: Expression[] = [];
      while (this.at().type !== TokenType.CloseParen) {
        args.push(this.parseExpression());
        if (this.at().type === TokenType.Comma) this.eat();
      }
      this.expect(TokenType.CloseParen, "Expected ')'");
      primary = {
        kind: "CallExpr",
        caller: primary,
        arguments: args,
      };
    }

    return primary;
  }

  private parsePrimaryExpr(): Expression {
    const token = this.at();

    switch (token.type) {
      case TokenType.Identifier:
        return { kind: "Identifier", symbol: this.eat().value };
      case TokenType.Number:
        return { kind: "NumericLiteral", value: Number(this.eat().value) };
      case TokenType.String:
        return { kind: "StringLiteral", value: this.eat().value };
      case TokenType.Def:
        return this.parseFunctionExpression();
      case TokenType.OpenParen: {
        this.eat();
        const value = this.parseExpression();
        this.expect(TokenType.CloseParen, "Expected ')'");
        return value;
      }
      case TokenType.OpenBracket: {
        this.eat(); // Eat '['
        const elements: Expression[] = [];
        while (this.at().type !== TokenType.CloseBracket) {
          const expr = this.parseExpression();
          elements.push(expr);
          if (this.at().type === TokenType.Comma) {
            this.eat();
          } else if (this.at().type !== TokenType.CloseBracket) {
            throw new Error(
              `Expected ',' or ']' in list, got ${this.at().value}`
            );
          }
        }
        this.expect(
          TokenType.CloseBracket,
          "Expected ']' at end of list literal"
        );
        return { kind: "ListLiteral", elements };
      }
      default:
        throw new Error(
          `Unexpected token in expression: ${token.type} (${token.value})`
        );
    }
  }
}

export function produceAST(sourceCode: string): Program {
  const tokens = tokenize(sourceCode);
  const parser = new Parser(tokens);
  return parser.produceAST();
}
