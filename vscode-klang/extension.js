const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Klang extension activated");

  // Track run-on-save and lint-on-save settings
  let runOnSaveEnabled = getConfig("runOnSave");
  let lintOnSaveEnabled = getConfig("lintOnSave");

  // Command: Run File
  const runDisposable = vscode.commands.registerCommand(
    "klang.runFile",
    async () => {
      await runCurrentFile(context);
    }
  );
  context.subscriptions.push(runDisposable);

  // Command: Toggle Run on Save
  const toggleRunDisposable = vscode.commands.registerCommand(
    "klang.toggleAutoRunOnSave",
    async () => {
      runOnSaveEnabled = !runOnSaveEnabled;
      try {
        await vscode.workspace
          .getConfiguration("klang")
          .update(
            "runOnSave",
            runOnSaveEnabled,
            vscode.ConfigurationTarget.Workspace
          );
        vscode.window.showInformationMessage(
          `Klang run-on-save is now ${
            runOnSaveEnabled ? "enabled" : "disabled"
          }.`
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          "Failed to update runOnSave setting: " + err.message
        );
      }
    }
  );
  context.subscriptions.push(toggleRunDisposable);

  // Diagnostic collection for linting
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("klang");
  context.subscriptions.push(diagnosticCollection);

  // Listen to configuration changes so we update our local flags
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("klang.runOnSave")) {
        runOnSaveEnabled = getConfig("runOnSave");
      }
      if (e.affectsConfiguration("klang.lintOnSave")) {
        lintOnSaveEnabled = getConfig("lintOnSave");
      }
    })
  );

  // Listen to saves of documents for run-on-save or lint-on-save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId !== "klang") {
        return;
      }
      // Lint on save
      if (lintOnSaveEnabled) {
        await lintDocument(document, diagnosticCollection);
      }
      // Run on save
      if (runOnSaveEnabled) {
        await runCurrentFile(context, document);
      }
    })
  );
}

/**
 * Read a setting under the "klang" namespace.
 * For example, getConfig("interpreterPath") reads "klang.interpreterPath".
 * Returns the value or undefined if not set.
 * @param {string} key
 * @returns {*}
 */
function getConfig(key) {
  try {
    const cfg = vscode.workspace.getConfiguration("klang");
    return cfg.get(key);
  } catch (err) {
    console.error("Error reading klang configuration for key", key, err);
    return undefined;
  }
}

/**
 * Run the currently active Klang file (or the provided document).
 * Uses the "klang.interpreterPath" setting, replacing placeholders.
 * @param {vscode.ExtensionContext} context
 * @param {vscode.TextDocument} [documentOverride]
 */
async function runCurrentFile(context, documentOverride) {
  const editor = vscode.window.activeTextEditor;
  let document = documentOverride || (editor && editor.document);
  if (!document) {
    vscode.window.showErrorMessage("No active Klang file to run.");
    return;
  }
  if (document.languageId !== "klang") {
    vscode.window.showErrorMessage("Active file is not a Klang file.");
    return;
  }

  // Save if dirty
  if (document.isDirty) {
    try {
      await document.save();
    } catch (err) {
      vscode.window.showErrorMessage(
        "Failed to save file before running: " + err.message
      );
      return;
    }
  }

  const filePath = document.fileName;

  // Get interpreter command from settings
  let interpreterCmd = getConfig("interpreterPath");
  if (typeof interpreterCmd !== "string" || interpreterCmd.trim() === "") {
    vscode.window.showErrorMessage(
      'Klang interpreter command not set. Please configure "klang.interpreterPath" in settings.'
    );
    return;
  }

  // Replace placeholders
  let finalCmd = interpreterCmd;

  // ${file}
  finalCmd = finalCmd.replace(/\$\{file\}/g, `"${filePath}"`);

  // ${workspaceFolder}
  const workspaceFolder =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "";
  finalCmd = finalCmd.replace(/\$\{workspaceFolder\}/g, `"${workspaceFolder}"`);

  // ${extensionPath}
  finalCmd = finalCmd.replace(
    /\$\{extensionPath\}/g,
    `"${context.extensionPath}"`
  );

  // If no ${file} placeholder in the original setting, append the file path
  if (!interpreterCmd.includes("${file}")) {
    finalCmd = `${interpreterCmd} "${filePath}"`;
  }

  // Create or reuse a terminal
  let term = vscode.window.terminals.find((t) => t.name === "Klang Runner");
  if (!term) {
    term = vscode.window.createTerminal("Klang Runner");
  }
  term.show(true);
  term.sendText(finalCmd);
}

/**
 * Perform a simple lint by attempting to parse the document.
 * If errors occur, show diagnostics. Assumes you have a parser that throws with line/col info.
 * @param {vscode.TextDocument} document
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
async function lintDocument(document, diagnosticCollection) {
  diagnosticCollection.delete(document.uri);
  const text = document.getText();
  try {
    // TODO: Replace with your actual parser call, e.g.:
    // const ast = yourParser.parse(text);
    // For now, assume success if no exception.
  } catch (err) {
    // Attempt to extract line/column from error message if your parser provides it.
    const msg = err.message || String(err);
    // Example regex: "Error at line X column Y"
    const rc = /line\s+(\d+)\s+col(?:umn)?\s+(\d+)/i.exec(msg);
    let diagnostic;
    if (rc) {
      const line = parseInt(rc[1], 10) - 1;
      const col = parseInt(rc[2], 10) - 1;
      const range = new vscode.Range(line, col, line, col + 1);
      diagnostic = new vscode.Diagnostic(
        range,
        msg,
        vscode.DiagnosticSeverity.Error
      );
    } else {
      // If no location info, attach to entire first line
      const range = new vscode.Range(0, 0, 0, 1);
      diagnostic = new vscode.Diagnostic(
        range,
        msg,
        vscode.DiagnosticSeverity.Error
      );
    }
    diagnosticCollection.set(document.uri, [diagnostic]);
  }
}

function deactivate() {
  // Clean up resources if needed (e.g., dispose collections), but VS Code disposes subscriptions automatically.
}

module.exports = {
  activate,
  deactivate,
};
