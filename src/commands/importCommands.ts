import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { getCommandList, setCommandList } from '../providers/CommandRunnerViewProvider';

export async function importCommands(commandProvider: any): Promise<void> {
    const options: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'JSON files': ['json']
        },
        title: 'Import Commands'
    };

    const fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri[0]) {
        try {
            const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
            const importedCommands = JSON.parse(fileContent.toString()) as CommandItem[];

            // Validate imported data
            const isValid = importedCommands.every(cmd =>
                typeof cmd.id === 'string' &&
                typeof cmd.label === 'string' &&
                typeof cmd.shell === 'string' &&
                Array.isArray(cmd.flags) &&
                Array.isArray(cmd.argumentPrompts) &&
                typeof cmd.alwaysPrompt === 'boolean'
            );

            if (!isValid) {
                throw new Error('Invalid command format in import file');
            }

            // Ask if user wants to replace or merge
            const choice = await vscode.window.showQuickPick(
                [
                    { label: 'Replace all commands', description: 'Remove existing commands and add imported ones' },
                    { label: 'Merge with existing', description: 'Add imported commands to the existing list' }
                ],
                {
                    placeHolder: 'How would you like to import the commands?'
                }
            );

            if (choice) {
                if (choice.label === 'Replace all commands') {
                    setCommandList([...importedCommands]);
                } else {
                    // For merge, we'll generate new IDs to avoid conflicts
                    const newCommands = importedCommands.map(cmd => ({
                        ...cmd,
                        id: Date.now().toString() + Math.random().toString(36).slice(2)
                    }));
                    setCommandList([...getCommandList(), ...newCommands]);
                }
                await commandProvider.updateWebview();
                vscode.window.showInformationMessage('Commands imported successfully!');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to import commands: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}