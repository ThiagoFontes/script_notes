import * as vscode from 'vscode';
import { CommandItem, Folder } from '../models/CommandItem';
import { getCommandList, setCommandList, getCommandStorage, setFolderList, getFolderList } from '../providers/CommandRunnerViewProvider';

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
                    setFolderList([...importedFolders]); // Update in-memory folder list
                    await storage.saveFolders(importedFolders);

                    // Debug logging
                    console.log('Replaced with folders:', importedFolders.length);
                    console.log('Folders:', importedFolders.map(f => ({ id: f.id, name: f.name })));
                } else {
                    // Merge - generate new IDs to avoid conflicts
                    // First create a mapping of old folder IDs to new folder IDs
                    const folderIdMap = new Map();
                    const newFolders = importedFolders.map(folder => {
                        const newId = Date.now().toString() + Math.random().toString(36).slice(2);
                        folderIdMap.set(folder.id, newId);
                        return {
                            ...folder,
                            id: newId
                        };
                    });

                    // Create new commands with updated folder references
                    const newCommands = importedCommands.map(cmd => ({
                        ...cmd,
                        id: Date.now().toString() + Math.random().toString(36).slice(2),
                        // Update folderId to match new folder ID if command was in a folder
                        folderId: cmd.folderId && folderIdMap.has(cmd.folderId) ? folderIdMap.get(cmd.folderId) : cmd.folderId
                    }));

                    // Add to existing data
                    setCommandList([...getCommandList(), ...newCommands]);
                    const existingFolders = getFolderList(); // Use in-memory list instead of loading from storage
                    const allFolders = [...existingFolders, ...newFolders];
                    setFolderList(allFolders); // Update in-memory folder list
                    await storage.saveFolders(allFolders);

                    // Debug logging
                    console.log('Imported folders:', newFolders.length);
                    console.log('Existing folders:', existingFolders.length);
                    console.log('Total folders after import:', allFolders.length);
                    console.log('All folders:', allFolders.map(f => ({ id: f.id, name: f.name })));
                }

                // Refresh the webview to show the imported data
                await commandProvider.updateWebview();
                await commandProvider.refresh();

                vscode.window.showInformationMessage(`Successfully imported ${importedCommands.length} commands and ${importedFolders.length} folders!`);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to import commands: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}