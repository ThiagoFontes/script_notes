import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';

export async function runCommand(item: CommandItem): Promise<void> {
    console.log('Running command:', item);
    let args: string[] = [];

    // Show what we're working with
    console.log('Has argument prompts:', item.argumentPrompts.length > 0);
    console.log('Always prompt setting:', item.alwaysPrompt);

    // If we have prompts defined or alwaysPrompt is true, show input boxes
    if (item.argumentPrompts.length > 0 || item.alwaysPrompt) {
        // If no prompts are defined but alwaysPrompt is true, create a default prompt
        const promptsToShow = item.argumentPrompts.length > 0 ?
            item.argumentPrompts :
            ['Enter argument'];

        for (const prompt of promptsToShow) {
            console.log('Showing input box for prompt:', prompt);
            const value = await vscode.window.showInputBox({
                prompt,
                ignoreFocusOut: true,
                title: `${item.label} - Argument Input`,
                placeHolder: 'Enter value'
            });

            // If user cancels, abort the command
            if (value === undefined) {
                console.log('User cancelled input');
                return;
            }

            console.log('Got argument value:', value);
            args.push(value);
        }
    }

    console.log('Final arguments:', args);
    const fullCommand = [item.shell, ...item.flags, ...args].join(' ');
    console.log('Running full command:', fullCommand);
    const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        item.label,
        'scriptnotes',
        new vscode.ShellExecution(fullCommand)
    );
    vscode.tasks.executeTask(task);
}