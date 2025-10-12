import * as vscode from 'vscode';
import { CommandItem } from './models/CommandItem';
import { CommandRunnerViewProvider } from './providers/CommandRunnerViewProvider';
import { setCommandProvider } from './providers/CommandEditorProvider';
import { registerCommands } from './commands';

// Re-export for backward compatibility
export { CommandItem };



// Store the webview provider instance
let commandProvider: CommandRunnerViewProvider;

// Extension activation
export function activate(context: vscode.ExtensionContext): void {
    // Create and register the webview provider first so it's available for commands
    commandProvider = new CommandRunnerViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('commandRunnerWebview', commandProvider)
    );

    // Set up the command editor provider reference
    setCommandProvider(commandProvider);

    // Register all command handlers
    registerCommands(context, commandProvider);

    console.log('Congratulations, your extension "scriptnotes" is now active!');
}

// Extension deactivation
export function deactivate(): void { }