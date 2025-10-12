import * as vscode from 'vscode';
import { CommandItem, Folder } from '../models/CommandItem';
import { getCommandStorage } from '../providers/CommandRunnerViewProvider';

export async function exportCommands(items: CommandItem[]): Promise<void> {
    const options: vscode.SaveDialogOptions = {
        defaultUri: vscode.Uri.file('commands.json'),
        filters: {
            'JSON files': ['json']
        }
    };

    const uri = await vscode.window.showSaveDialog(options);
    if (uri) {
        try {
            // Get both commands and folders for export
            const storage = getCommandStorage();
            const folders = storage.loadFolders();

            // Create export data with version for backwards compatibility
            const exportData = {
                version: '2.0',
                commands: items,
                folders: folders
            };

            const data = JSON.stringify(exportData, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(data));
            vscode.window.showInformationMessage('Commands and folders exported successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to export commands: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}