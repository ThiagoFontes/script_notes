import * as vscode from 'vscode';
import { getCommandStorage, setCommandList, setFolderList } from '../providers/CommandRunnerViewProvider';
import { CommandItem, Folder } from '../models/CommandItem';

/**
 * Command to reorder commands in the list
 */
export async function reorderCommandsCommand(commandList: CommandItem[]): Promise<void> {
    try {
        // Update the in-memory command list
        setCommandList(commandList);

        // Update folder commandIds arrays based on the new order
        const storage = getCommandStorage();
        const folders = storage.loadFolders();

        // Group commands by folder and update the commandIds arrays
        const folderCommandMap = new Map<string, string[]>();

        commandList.forEach(command => {
            if (command.folderId) {
                if (!folderCommandMap.has(command.folderId)) {
                    folderCommandMap.set(command.folderId, []);
                }
                folderCommandMap.get(command.folderId)!.push(command.id);
            }
        });

        // Update each folder's commandIds array
        folders.forEach(folder => {
            if (folderCommandMap.has(folder.id)) {
                folder.commandIds = folderCommandMap.get(folder.id)!;
            } else {
                // Initialize empty array if no commands in folder
                if (!folder.commandIds) {
                    folder.commandIds = [];
                }
            }
        });

        // Save to storage
        await storage.saveCommands(commandList);
        await storage.saveFolders(folders);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to reorder commands: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Command to reorder folders in the list
 */
export async function reorderFoldersCommand(folderList: Folder[]): Promise<void> {
    try {
        // Update the order property for each folder based on their new position
        const reorderedFolderList = folderList.map((folder, index) => ({
            ...folder,
            order: index
        }));

        // Update the in-memory folder list
        setFolderList(reorderedFolderList);

        // Save to storage
        const storage = getCommandStorage();
        await storage.saveFolders(reorderedFolderList);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to reorder folders: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Command to reorder commands within a specific folder
 */
export async function reorderFolderCommandsCommand(folderId: string, commandIds: string[]): Promise<void> {
    try {
        const storage = getCommandStorage();
        await storage.updateFolderCommandOrder(folderId, commandIds);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to reorder folder commands: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Utility function to reorder items in an array
 */
export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const result = [...array];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
}