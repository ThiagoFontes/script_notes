import * as vscode from 'vscode';
import { getCommandStorage } from '../providers/CommandRunnerViewProvider';

/**
 * Command to create a new folder
 */
export async function addFolderCommand(): Promise<void> {
    try {
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter folder name',
            placeHolder: 'My Scripts',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Folder name cannot be empty';
                }
                return null;
            }
        });

        if (!folderName) {
            return; // User cancelled
        }

        const storage = getCommandStorage();
        await storage.createFolder(folderName.trim());

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');

        vscode.window.showInformationMessage(`Folder "${folderName}" created successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to create folder: ' + (error instanceof Error ? error.message : String(error)));
    }
}