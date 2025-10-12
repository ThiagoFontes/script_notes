import * as vscode from 'vscode';
import { CommandItem, Folder } from '../models/CommandItem';
import { getCommandList, setCommandList, getCommandStorage } from '../providers/CommandRunnerViewProvider';

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
            const importedData = JSON.parse(fileContent.toString());

            let importedCommands: CommandItem[] = [];
            let importedFolders: Folder[] = [];

            // Check if this is the new format (v2.0) or old format (backwards compatibility)
            if (importedData.version === '2.0' && importedData.commands && importedData.folders) {
                // New format with folders
                importedCommands = importedData.commands;
                importedFolders = importedData.folders;
            } else if (Array.isArray(importedData)) {
                // Old format - just commands array
                importedCommands = importedData;
                importedFolders = [];
            } else {
                throw new Error('Unknown import file format');
            }

            // Validate imported commands
            const isValidCommands = importedCommands.every(cmd =>
                typeof cmd.id === 'string' &&
                typeof cmd.label === 'string' &&
                typeof cmd.shell === 'string' &&
                Array.isArray(cmd.flags) &&
                Array.isArray(cmd.argumentPrompts) &&
                typeof cmd.alwaysPrompt === 'boolean'
            );

            // Validate imported folders if any
            const isValidFolders = importedFolders.every(folder =>
                typeof folder.id === 'string' &&
                typeof folder.name === 'string' &&
                typeof folder.expanded === 'boolean'
            );

            if (!isValidCommands || !isValidFolders) {
                throw new Error('Invalid format in import file');
            }

            // Ask if user wants to replace or merge
            const choice = await vscode.window.showQuickPick(
                [
                    { label: 'Replace all', description: 'Remove existing commands and folders, add imported ones' },
                    { label: 'Merge with existing', description: 'Add imported commands and folders to existing list' }
                ],
                {
                    placeHolder: 'How would you like to import the data?'
                }
            );

            if (choice) {
                const storage = getCommandStorage();

                if (choice.label === 'Replace all') {
                    // Replace everything
                    setCommandList([...importedCommands]);
                    await storage.saveFolders(importedFolders);
                } else {
                    // Merge - generate new IDs to avoid conflicts
                    const newCommands = importedCommands.map(cmd => ({
                        ...cmd,
                        id: Date.now().toString() + Math.random().toString(36).slice(2),
                        // If command was in a folder, we need to update the folderId reference
                        folderId: cmd.folderId ? (Date.now().toString() + Math.random().toString(36).slice(2) + '_folder') : undefined
                    }));

                    const newFolders = importedFolders.map(folder => ({
                        ...folder,
                        id: Date.now().toString() + Math.random().toString(36).slice(2) + '_folder'
                    }));

                    // Update command folderIds to match new folder IDs
                    const folderIdMap = new Map();
                    importedFolders.forEach((oldFolder, index) => {
                        folderIdMap.set(oldFolder.id, newFolders[index].id);
                    });

                    newCommands.forEach(cmd => {
                        if (cmd.folderId && folderIdMap.has(cmd.folderId)) {
                            cmd.folderId = folderIdMap.get(cmd.folderId);
                        }
                    });

                    setCommandList([...getCommandList(), ...newCommands]);
                    const existingFolders = storage.loadFolders();
                    await storage.saveFolders([...existingFolders, ...newFolders]);
                }

                await commandProvider.updateWebview();
                const itemsCount = importedCommands.length + importedFolders.length;
                vscode.window.showInformationMessage(`Successfully imported ${importedCommands.length} commands and ${importedFolders.length} folders!`);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to import commands: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}