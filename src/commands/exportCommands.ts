import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';

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
            const data = JSON.stringify(items, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(data));
            vscode.window.showInformationMessage('Commands exported successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to export commands: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}