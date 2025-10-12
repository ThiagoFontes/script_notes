import * as vscode from 'vscode';
import { CommandItem, COMMANDS_STORAGE_KEY } from '../models/CommandItem';

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
}