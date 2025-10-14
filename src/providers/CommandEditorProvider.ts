import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { getCommandList, setCommandList } from './CommandRunnerViewProvider';
import { generateCommandEditorHtml } from '../views';

// Store the webview provider instance reference
let commandProvider: any;

export function setCommandProvider(provider: any): void {
    commandProvider = provider;
}

export class CommandEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    public async resolveWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        command: CommandItem
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true
        };

        webviewPanel.webview.html = generateCommandEditorHtml(command);

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'save':
                        try {
                            const updatedCommand = message.command;
                            // Keep the original ID and folderId to maintain folder association
                            updatedCommand.id = command.id;
                            updatedCommand.folderId = command.folderId;
                            // Find and update the command in the list
                            const commandList = getCommandList();
                            const index = commandList.findIndex(cmd => cmd.id === command.id);
                            if (index !== -1) {
                                commandList[index] = updatedCommand;
                                setCommandList(commandList);
                                await commandProvider.updateWebview();
                                webviewPanel.dispose();
                                vscode.window.showInformationMessage('Command updated successfully!');
                            }
                        } catch (error) {
                            vscode.window.showErrorMessage('Failed to update command: ' + (error instanceof Error ? error.message : String(error)));
                        }
                        break;
                    case 'cancel':
                        webviewPanel.dispose();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }
}