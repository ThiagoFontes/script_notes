import * as vscode from 'vscode';
import { addCommand } from './addCommand.js';
import { editCommand } from './editCommand.js';
import { deleteCommand } from './deleteCommand.js';
import { runCommand } from './runCommand.js';
import { exportCommands } from './exportCommands.js';
import { importCommands } from './importCommands.js';
import { addFolderCommand } from './addFolder.js';
import { toggleFolderCommand, renameFolderCommand, deleteFolderCommand, moveCommandToFolderCommand, runFolderCommand } from './folderCommands.js';
import { reorderCommandsCommand, reorderFoldersCommand } from './reorderCommands.js';

export function registerCommands(context: vscode.ExtensionContext, commandProvider: any): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('scriptnotes.addCommand', () => addCommand(context, commandProvider)),
        vscode.commands.registerCommand('scriptnotes.editCommand', (item) => editCommand(item, context)),
        vscode.commands.registerCommand('scriptnotes.deleteCommand', (item) => deleteCommand(item, commandProvider)),
        vscode.commands.registerCommand('scriptnotes.runCommand', runCommand),
        vscode.commands.registerCommand('scriptnotes.exportCommands', exportCommands),
        vscode.commands.registerCommand('scriptnotes.importCommands', () => importCommands(commandProvider)),
        vscode.commands.registerCommand('scriptnotes.addFolder', addFolderCommand),
        vscode.commands.registerCommand('scriptnotes.toggleFolder', toggleFolderCommand),
        vscode.commands.registerCommand('scriptnotes.renameFolder', renameFolderCommand),
        vscode.commands.registerCommand('scriptnotes.deleteFolder', deleteFolderCommand),
        vscode.commands.registerCommand('scriptnotes.runFolder', runFolderCommand),
        vscode.commands.registerCommand('scriptnotes.moveCommandToFolder', moveCommandToFolderCommand),
        vscode.commands.registerCommand('scriptnotes.reorderCommands', reorderCommandsCommand),
        vscode.commands.registerCommand('scriptnotes.reorderFolders', reorderFoldersCommand),
        vscode.commands.registerCommand('scriptnotes.refresh', () => commandProvider.refresh())
    );
}