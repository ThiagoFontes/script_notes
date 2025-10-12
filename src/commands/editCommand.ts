import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { CommandEditorProvider } from '../providers/CommandEditorProvider';

export async function editCommand(item: CommandItem, context: vscode.ExtensionContext): Promise<void> {
    // Create and show a new webview panel
    const panel = vscode.window.createWebviewPanel(
        'commandEditor', // Identifies the type of the webview
        `Edit Command: ${item.label}`, // Title display in the tab
        vscode.ViewColumn.One, // Editor column to show the webview in
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    await new CommandEditorProvider(context).resolveWebviewPanel(panel, item);
}