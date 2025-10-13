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

        // Save to storage
        const storage = getCommandStorage();
        await storage.saveCommands(commandList);

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
 * Utility function to reorder items in an array
 */
export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const result = [...array];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
}