import * as vscode from 'vscode';
import { addCommand } from './addCommand.js';
import { editCommand } from './editCommand.js';
import { deleteCommand } from './deleteCommand.js';
import { runCommand } from './runCommand.js';
import { exportCommands } from './exportCommands.js';
import { importCommands } from './importCommands.js';

export function registerCommands(context: vscode.ExtensionContext, commandProvider: any): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('scriptnotes.addCommand', () => addCommand(context, commandProvider)),
        vscode.commands.registerCommand('scriptnotes.editCommand', (item) => editCommand(item, context)),
        vscode.commands.registerCommand('scriptnotes.deleteCommand', (item) => deleteCommand(item, commandProvider)),
        vscode.commands.registerCommand('scriptnotes.runCommand', runCommand),
        vscode.commands.registerCommand('scriptnotes.exportCommands', exportCommands),
        vscode.commands.registerCommand('scriptnotes.importCommands', () => importCommands(commandProvider))
    );
}