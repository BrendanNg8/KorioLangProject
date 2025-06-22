const vscode = require("vscode");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Klang extension activated");

  let runDisposable = vscode.commands.registerCommand(
    "klang.runFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor to run.");
        return;
      }
      const doc = editor.document;
      if (doc.languageId !== "klang") {
        vscode.window.showErrorMessage("Active file is not a Klang file.");
        return;
      }

      try {
        await doc.save();
      } catch (err) {
        vscode.window.showErrorMessage("Failed to save file: " + err.message);
        return;
      }

      const filePath = doc.fileName;

      const config = vscode.workspace.getConfiguration("klang");
      let interpreterCmd = config.get("interpreterPath");
      if (typeof interpreterCmd !== "string" || interpreterCmd.trim() === "") {
        vscode.window.showErrorMessage(
          'Klang interpreter command not set. Please configure "klang.interpreterPath" in settings.'
        );
        return;
      }

      let finalCmd = interpreterCmd;
      // Replace ${file}
      finalCmd = finalCmd.replace(/\$\{file\}/g, `"${filePath}"`);
      // Replace ${workspaceFolder}
      const workspaceFolder =
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders[0]
          ? vscode.workspace.workspaceFolders[0].uri.fsPath
          : "";
      finalCmd = finalCmd.replace(
        /\$\{workspaceFolder\}/g,
        `"${workspaceFolder}"`
      );
      // Replace ${extensionPath}
      finalCmd = finalCmd.replace(
        /\$\{extensionPath\}/g,
        `"${context.extensionPath}"`
      );

      // If no ${file} placeholder was in the setting, append the file path
      if (!interpreterCmd.includes("${file}")) {
        finalCmd = `${interpreterCmd} "${filePath}"`;
      }

      let term = vscode.window.terminals.find((t) => t.name === "Klang Runner");
      if (!term) {
        term = vscode.window.createTerminal("Klang Runner");
      }
      term.show(true);
      term.sendText(finalCmd);
    }
  );

  context.subscriptions.push(runDisposable);
}

function deactivate() {
  // cleanup if needed
}

module.exports = {
  activate,
  deactivate,
};
