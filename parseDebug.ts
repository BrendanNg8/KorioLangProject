// parseDebug.ts
import { tokenize, TokenType } from "./ast.ts";
import { produceAST } from "./parser.ts";

function tryParse(src: string) {
  console.log("Source:", JSON.stringify(src));
  console.log(
    "Tokens:",
    tokenize(src)
      .map((t) => `${TokenType[t.type]}('${t.value}')`)
      .join(", ")
  );
  try {
    const ast = produceAST(src);
    console.log("AST:", JSON.stringify(ast, null, 2));
  } catch (e) {
    console.error("Parse error:", e);
  }
  console.log("----------");
}

tryParse("def foo(x) { return x + 1; }");
tryParse("def(x) { return x * 2; }");
tryParse("print(def(x) { return x; });");
