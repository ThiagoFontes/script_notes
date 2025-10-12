import * as vscode from 'vscode';
import { getCommandStorage } from '../providers/CommandRunnerViewProvider';
import { CommandItem } from '../models/CommandItem';

/**
 * Command to toggle folder expanded/collapsed state
 */
export async function toggleFolderCommand(folderId: string): Promise<void> {
    try {
        const storage = getCommandStorage();
        await storage.toggleFolderExpansion(folderId);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to toggle folder: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Command to rename a folder
 */
export async function renameFolderCommand(folderId: string, newName: string): Promise<void> {
    try {
        const storage = getCommandStorage();
        await storage.renameFolder(folderId, newName);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');

        vscode.window.showInformationMessage(`Folder renamed to "${newName}" successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to rename folder: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Command to delete a folder and move its commands to root
 */
export async function deleteFolderCommand(folderId: string): Promise<void> {
    try {
        const storage = getCommandStorage();
        await storage.deleteFolder(folderId);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');

        vscode.window.showInformationMessage('Folder deleted and commands moved to root level.');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to delete folder: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Command to move a command to a folder
 */
export async function moveCommandToFolderCommand(commandId: string, folderId: string | undefined): Promise<void> {
    try {
        const storage = getCommandStorage();
        await storage.moveCommandToFolder(commandId, folderId);

        // Refresh the view
        vscode.commands.executeCommand('scriptnotes.refresh');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to move command: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Command to run all commands in a folder sequentially
 */
export async function runFolderCommand(folderId: string, commandIds: string[]): Promise<void> {
    try {
        const storage = getCommandStorage();
        const commands = storage.loadCommands();

        // Filter to get only the commands in this folder
        const folderCommands = commands.filter((cmd: CommandItem) => commandIds.includes(cmd.id));

        if (folderCommands.length === 0) {
            vscode.window.showInformationMessage('No commands found in this folder.');
            return;
        }

        vscode.window.showInformationMessage(`Running ${folderCommands.length} commands from folder...`);

        // Run commands sequentially
        for (const command of folderCommands) {
            try {
                // Use the existing runCommand functionality with the full command object
                await vscode.commands.executeCommand('scriptnotes.runCommand', command);
            } catch (error) {
                vscode.window.showWarningMessage(`Failed to run command "${command.label}": ${error instanceof Error ? error.message : String(error)}`);
                // Continue with the next command even if one fails
            }
        }

        vscode.window.showInformationMessage('Finished running all folder commands.');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to run folder commands: ' + (error instanceof Error ? error.message : String(error)));
    }
}