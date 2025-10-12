/**
 * Data model for a command item
 */
export interface CommandItem {
    id: string;
    label: string;
    shell: string;
    flags: string[];
    argumentPrompts: string[];
    alwaysPrompt: boolean;
}

/**
 * Storage key for commands in VS Code global state
 */
export const COMMANDS_STORAGE_KEY = 'scriptnotes.commands';