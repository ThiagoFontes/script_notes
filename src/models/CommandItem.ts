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
    folderId?: string; // Optional folder assignment
}

/**
 * Data model for a folder that can contain commands
 */
export interface Folder {
    id: string;
    name: string;
    expanded: boolean; // UI state for expand/collapse
    order: number; // For custom ordering
}

/**
 * Storage keys for VS Code global state
 */
export const COMMANDS_STORAGE_KEY = 'scriptnotes.commands';
export const FOLDERS_STORAGE_KEY = 'scriptnotes.folders';