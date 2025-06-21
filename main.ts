// main.ts

import { produceAST } from "./parser.ts";
import { evaluateProgram, evaluate } from "./interpreter.ts";
import { Environment, setEvaluateFn } from "./environment.ts";

setEvaluateFn(evaluate);

async function runMain() {
  try {
    // Optionally take filename from CLI, default to "./test.txt"
    const filename = Deno.args[0] ?? "./test.txt";
    const source = await Deno.readTextFile(filename);

    const ast = produceAST(source);
    const globalEnv = new Environment();

    // Evaluate the program; any print(...) calls inside will output to stdout.
    evaluateProgram(ast, globalEnv);
  } catch (err) {
    // On error, print only the error message
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(String(err));
    }
    // Exit with non-zero code to indicate failure
    Deno.exit(1);
  }
}

runMain();

//deno run --allow-read main.ts
