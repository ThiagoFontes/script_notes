import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';

export async function runCommand(item: CommandItem): Promise<void> {
    console.log('Running command:', item);
    let args: string[] = [];

    // Show what we're working with
    console.log('Has argument prompts:', item.argumentPrompts.length > 0);
    console.log('Always prompt setting:', item.alwaysPrompt);

    // If we have prompts defined or alwaysPrompt is true, show argument selection
    if (item.argumentPrompts.length > 0 || item.alwaysPrompt) {
        // Use existing prompts or empty array if none defined
        const promptsToShow = item.argumentPrompts.length > 0 ?
            item.argumentPrompts :
            [];

        // Create QuickPick for argument selection
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = `${item.label} - Select Arguments`;
        quickPick.placeholder = 'Select arguments or type custom ones (press Enter to add)';
        quickPick.canSelectMany = true;
        quickPick.ignoreFocusOut = true;

        // Allow custom input by enabling matchOnDescription and handling onDidChangeValue
        quickPick.matchOnDescription = false;
        quickPick.matchOnDetail = false;

        // Create items from argument prompts
        let availableItems = promptsToShow.map(prompt => ({
            label: prompt,
            description: 'Predefined argument'
        }));

        quickPick.items = availableItems;
        let customArgs: string[] = [];

        // Handle custom input
        quickPick.onDidChangeValue((value) => {
            if (value && !availableItems.some(item => item.label === value) && !customArgs.includes(value)) {
                // Show the current input as a potential new item
                quickPick.items = [
                    ...availableItems,
                    ...customArgs.map(arg => ({ label: arg, description: 'Custom argument' })),
                    { label: value, description: 'Press Enter to add this custom argument', alwaysShow: true }
                ];
            } else {
                // Show existing items
                quickPick.items = [
                    ...availableItems,
                    ...customArgs.map(arg => ({ label: arg, description: 'Custom argument' }))
                ];
            }
        });

        // Show the QuickPick
        quickPick.show();

        const selectedItems = await new Promise<readonly vscode.QuickPickItem[] | undefined>((resolve) => {
            let isFinalized = false;

            // Use button to finalize selection
            quickPick.buttons = [{
                iconPath: new vscode.ThemeIcon('check'),
                tooltip: 'Confirm selection and run command'
            }];

            quickPick.onDidTriggerButton(() => {
                if (!isFinalized) {
                    isFinalized = true;
                    resolve(quickPick.selectedItems);
                    quickPick.dispose();
                }
            });

            // Handle Enter key - add custom argument if typing, otherwise finalize
            quickPick.onDidAccept(() => {
                const value = quickPick.value.trim();
                if (value && !availableItems.some(item => item.label === value) && !customArgs.includes(value)) {
                    // Add custom argument
                    console.log('Adding custom argument:', value);
                    customArgs.push(value);
                    quickPick.value = ''; // Clear input
                    quickPick.items = [
                        ...availableItems,
                        ...customArgs.map(arg => ({ label: arg, description: 'Custom argument' }))
                    ];
                } else if (!value) {
                    // No text in input, finalize selection
                    if (!isFinalized) {
                        isFinalized = true;
                        resolve(quickPick.selectedItems);
                        quickPick.dispose();
                    }
                }
            });

            quickPick.onDidHide(() => {
                if (!isFinalized) {
                    resolve(undefined);
                    quickPick.dispose();
                }
            });
        });

        // If user cancels, abort the command
        if (!selectedItems) {
            console.log('User cancelled argument selection');
            return;
        }

        // Add selected arguments directly to the command
        for (const selectedItem of selectedItems) {
            console.log('Adding selected argument:', selectedItem.label);
            args.push(selectedItem.label);
        }

        // Save any new custom arguments to the command for persistence
        if (customArgs.length > 0) {
            const newArguments = customArgs.filter(arg => !item.argumentPrompts.includes(arg));
            if (newArguments.length > 0) {
                console.log('Saving new arguments to command:', newArguments);
                item.argumentPrompts.push(...newArguments);

                // Update the command in storage
                const { getCommandList, setCommandList } = require('../providers/CommandRunnerViewProvider');
                const commandList = getCommandList();
                const index = commandList.findIndex((cmd: CommandItem) => cmd.id === item.id);
                if (index !== -1) {
                    commandList[index] = item;
                    setCommandList(commandList);
                    console.log('Command updated with new arguments');
                }
            }
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