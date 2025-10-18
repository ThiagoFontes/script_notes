import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { getCommandList, setCommandList, getCommandStorage } from '../providers/CommandRunnerViewProvider';

// Store reference to the command provider for updating the webview
let commandProvider: any;

export function setCommandProvider(provider: any): void {
    commandProvider = provider;
}

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
            const disposables: vscode.Disposable[] = [];

            // Use button to finalize selection
            quickPick.buttons = [{
                iconPath: new vscode.ThemeIcon('check'),
                tooltip: 'Confirm selection and run command'
            }];

            const cleanup = () => {
                disposables.forEach(d => d.dispose());
                quickPick.dispose();
            };

            disposables.push(quickPick.onDidTriggerButton(() => {
                if (!isFinalized) {
                    isFinalized = true;
                    const selected = quickPick.selectedItems;
                    cleanup();
                    console.log('QuickPick finalized via button, selected items:', selected.length);
                    resolve(selected);
                }
            }));

            // Handle Enter key - add custom argument if typing, otherwise finalize
            disposables.push(quickPick.onDidAccept(() => {
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
                        const selected = quickPick.selectedItems;
                        cleanup();
                        console.log('QuickPick finalized via Enter, selected items:', selected.length);
                        resolve(selected);
                    }
                }
            }));

            disposables.push(quickPick.onDidHide(() => {
                if (!isFinalized) {
                    isFinalized = true;
                    cleanup();
                    console.log('QuickPick cancelled/hidden');
                    resolve(undefined);
                }
            }));
        });

        console.log('QuickPick promise resolved, processing selection...');

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
                console.log('Command before update:', JSON.stringify(item));

                // Create updated command with new arguments
                const updatedCommand: CommandItem = {
                    ...item,
                    argumentPrompts: [...item.argumentPrompts, ...newArguments]
                };

                // Update the command in storage persistently
                const commandStorage = getCommandStorage();
                const commandList = getCommandList();
                console.log('Current command list length:', commandList.length);

                const index = commandList.findIndex((cmd: CommandItem) => cmd.id === item.id);
                console.log('Found command at index:', index);

                if (index !== -1) {
                    // Update the command in the list
                    commandList[index] = updatedCommand;
                    setCommandList(commandList);

                    console.log('Command after update:', JSON.stringify(commandList[index]));

                    // Save to persistent storage
                    await commandStorage.saveCommands(commandList);
                    console.log('Commands saved to persistent storage');

                    // Show user feedback
                    const argText = newArguments.length === 1 ? 'argument' : 'arguments';
                    vscode.window.showInformationMessage(
                        `Added ${newArguments.length} custom ${argText} to "${item.label}": ${newArguments.join(', ')}`
                    );

                    // Update the webview if provider is available
                    if (commandProvider && commandProvider.updateWebview) {
                        await commandProvider.updateWebview();
                        console.log('Webview updated');
                    }

                    console.log('Command updated with new arguments and saved to persistent storage');
                } else {
                    console.error('Could not find command in list to update. Command ID:', item.id);
                    console.error('Available command IDs:', commandList.map(cmd => cmd.id));
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

    // Execute the task and wait for it to complete
    const execution = await vscode.tasks.executeTask(task);

    // Wait for the task to finish
    await new Promise<void>((resolve) => {
        const disposable = vscode.tasks.onDidEndTask((e) => {
            if (e.execution === execution) {
                disposable.dispose();
                console.log('Task completed:', item.label);
                resolve();
            }
        });
    });
}