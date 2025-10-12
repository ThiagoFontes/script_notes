import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { CommandEditorProvider } from '../providers/CommandEditorProvider';
import { getCommandList, setCommandList } from '../providers/CommandRunnerViewProvider';

export async function addCommand(context: vscode.ExtensionContext, commandProvider: any): Promise<void> {
    // Create a new blank command
    const newCommand: CommandItem = {
        id: Date.now().toString(),
        label: '',
        shell: '',
        flags: [],
        argumentPrompts: [],
        alwaysPrompt: false
    };

    // Create and show a new webview panel
    const panel = vscode.window.createWebviewPanel(
        'commandEditor',
        'Add New Command',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    // Reuse the CommandEditorProvider but with save handling for new command
    const provider = new CommandEditorProvider(context);
    await provider.resolveWebviewPanel(panel, newCommand);

    // Override the message handler for adding new command
    panel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.type) {
                case 'save':
                    try {
                        const command = message.command;
                        // Keep the original ID
                        command.id = newCommand.id;
                        // Add the new command to the list
                        const commandList = getCommandList();
                        commandList.push(command);
                        setCommandList(commandList);
                        await commandProvider.updateWebview();
                        panel.dispose();
                        vscode.window.showInformationMessage('Command added successfully!');
                    } catch (error) {
                        vscode.window.showErrorMessage('Failed to add command: ' + (error instanceof Error ? error.message : String(error)));
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}