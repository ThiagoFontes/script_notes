import * as vscode from 'vscode';
import { CommandItem, Folder, COMMANDS_STORAGE_KEY, FOLDERS_STORAGE_KEY } from '../models/CommandItem';

/**
 * Handles persistent storage of commands using VS Code's global state
 */
export class CommandStorage {
    constructor(private context: vscode.ExtensionContext) { }

    /**
     * Save commands to VS Code global state
     */
    async saveCommands(commands: CommandItem[]): Promise<void> {
        await this.context.globalState.update(COMMANDS_STORAGE_KEY, commands);
    }

    /**
     * Load commands from VS Code global state
     */
    loadCommands(): CommandItem[] {
        const savedCommands = this.context.globalState.get<CommandItem[]>(COMMANDS_STORAGE_KEY);
        return savedCommands || [];
    }

    /**
     * Clear all saved commands
     */
    async clearCommands(): Promise<void> {
        await this.context.globalState.update(COMMANDS_STORAGE_KEY, undefined);
    }

    /**
     * Save folders to VS Code global state
     */
    async saveFolders(folders: Folder[]): Promise<void> {
        await this.context.globalState.update(FOLDERS_STORAGE_KEY, folders);
    }

    /**
     * Load folders from VS Code global state
     */
    loadFolders(): Folder[] {
        const savedFolders = this.context.globalState.get<Folder[]>(FOLDERS_STORAGE_KEY);
        return savedFolders || [];
    }

    /**
     * Clear all saved folders
     */
    async clearFolders(): Promise<void> {
        await this.context.globalState.update(FOLDERS_STORAGE_KEY, undefined);
    }

    /**
     * Create a new folder with default settings
     */
    async createFolder(name: string): Promise<Folder> {
        const existingFolders = this.loadFolders();
        const newFolder: Folder = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name,
            expanded: true,
            order: existingFolders.length,
            commandIds: [] // Initialize empty command IDs array
        };

        const updatedFolders = [...existingFolders, newFolder];
        await this.saveFolders(updatedFolders);
        return newFolder;
    }

    /**
     * Delete a folder and move all its commands to root
     */
    async deleteFolder(folderId: string): Promise<void> {
        const folders = this.loadFolders().filter(f => f.id !== folderId);
        const commands = this.loadCommands().map(cmd =>
            cmd.folderId === folderId ? { ...cmd, folderId: undefined } : cmd
        );

        await this.saveFolders(folders);
        await this.saveCommands(commands);
    }

    /**
     * Rename a folder
     */
    async renameFolder(folderId: string, newName: string): Promise<void> {
        const folders = this.loadFolders();
        const folderIndex = folders.findIndex(f => f.id === folderId);
        if (folderIndex !== -1) {
            folders[folderIndex].name = newName;
            await this.saveFolders(folders);
        }
    }

    /**
     * Toggle folder expanded state
     */
    async toggleFolderExpansion(folderId: string): Promise<void> {
        const folders = this.loadFolders();
        const folderIndex = folders.findIndex(f => f.id === folderId);
        if (folderIndex !== -1) {
            folders[folderIndex].expanded = !folders[folderIndex].expanded;
            await this.saveFolders(folders);
        }
    }

    /**
     * Move a command to a folder (or to root if folderId is null)
     */
    async moveCommandToFolder(commandId: string, folderId: string | undefined): Promise<void> {
        const commands = this.loadCommands();
        const folders = this.loadFolders();
        const commandIndex = commands.findIndex(cmd => cmd.id === commandId);

        if (commandIndex !== -1) {
            const command = commands[commandIndex];
            const oldFolderId = command.folderId;

            // Remove from old folder's commandIds array
            if (oldFolderId) {
                const oldFolder = folders.find(f => f.id === oldFolderId);
                if (oldFolder && oldFolder.commandIds) {
                    oldFolder.commandIds = oldFolder.commandIds.filter(id => id !== commandId);
                }
            }

            // Update command's folderId
            command.folderId = folderId;

            // Add to new folder's commandIds array
            if (folderId) {
                const newFolder = folders.find(f => f.id === folderId);
                if (newFolder) {
                    // Initialize commandIds array if it doesn't exist (backwards compatibility)
                    if (!newFolder.commandIds) {
                        newFolder.commandIds = [];
                    }
                    // Add to the end of the array
                    if (!newFolder.commandIds.includes(commandId)) {
                        newFolder.commandIds.push(commandId);
                    }
                }
            }

            await this.saveCommands(commands);
            await this.saveFolders(folders);
        }
    }

    /**
     * Update the command order within a folder
     */
    async updateFolderCommandOrder(folderId: string, commandIds: string[]): Promise<void> {
        const folders = this.loadFolders();
        const folder = folders.find(f => f.id === folderId);

        if (folder) {
            folder.commandIds = commandIds;
            await this.saveFolders(folders);
        }
    }

    /**
     * Ensure backwards compatibility by initializing commandIds arrays for existing folders
     */
    ensureFolderCommandIds(): void {
        const folders = this.loadFolders();
        const commands = this.loadCommands();
        let hasChanges = false;

        folders.forEach(folder => {
            if (!folder.commandIds) {
                // Initialize with commands currently in this folder
                folder.commandIds = commands
                    .filter(cmd => cmd.folderId === folder.id)
                    .map(cmd => cmd.id);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveFolders(folders); // Note: using sync save for initialization
        }
    }
}