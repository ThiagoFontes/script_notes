import * as vscode from 'vscode';
import { CommandItem } from './models/CommandItem';
import { CommandRunnerViewProvider, getCommandList, setCommandList } from './providers/CommandRunnerViewProvider';
import { CommandEditorProvider, setCommandProvider } from './providers/CommandEditorProvider';

// Re-export for backward compatibility
export { CommandItem };



// Store the webview provider instance
let commandProvider: CommandRunnerViewProvider;

// Extension activation
export function activate(context: vscode.ExtensionContext): void {
    // Create and register the webview provider first so it's available for commands
    commandProvider = new CommandRunnerViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('commandRunnerWebview', commandProvider)
    );

    // Set up the command editor provider reference
    setCommandProvider(commandProvider);



    // Register command handlers
    context.subscriptions.push(
        vscode.commands.registerCommand('scriptnotes.addCommand', async () => {
            // Create a new blank command
            const newCommand: CommandItem = {
                id: Date.now().toString(),
                label: '',
                shell: '',
                flags: [],
                argumentPrompts: [],
                alwaysPrompt: false
            };

            // Create and show a new webview panel
            const panel = vscode.window.createWebviewPanel(
                'commandEditor',
                'Add New Command',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            // Reuse the CommandEditorProvider but with save handling for new command
            const provider = new CommandEditorProvider(context);
            await provider.resolveWebviewPanel(panel, newCommand);

            // Override the message handler for adding new command
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.type) {
                        case 'save':
                            try {
                                const command = message.command;
                                // Keep the original ID
                                command.id = newCommand.id;
                                // Add the new command to the list
                                const commandList = getCommandList();
                                commandList.push(command);
                                setCommandList(commandList);
                                await commandProvider.updateWebview();
                                panel.dispose();
                                vscode.window.showInformationMessage('Command added successfully!');
                            } catch (error) {
                                vscode.window.showErrorMessage('Failed to add command: ' + (error instanceof Error ? error.message : String(error)));
                            }
                            break;
                        case 'cancel':
                            panel.dispose();
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        }),
        vscode.commands.registerCommand('scriptnotes.editCommand', async (item: CommandItem) => {
            // Create and show a new webview panel
            const panel = vscode.window.createWebviewPanel(
                'commandEditor', // Identifies the type of the webview
                `Edit Command: ${item.label}`, // Title display in the tab
                vscode.ViewColumn.One, // Editor column to show the webview in
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            await new CommandEditorProvider(context).resolveWebviewPanel(panel, item);
        }),
        vscode.commands.registerCommand('scriptnotes.deleteCommand', async (item: CommandItem) => {
            const filteredList = getCommandList().filter(cmd => cmd.id !== item.id);
            setCommandList(filteredList);
            await commandProvider.updateWebview();
        }),
        vscode.commands.registerCommand('scriptnotes.runCommand', async (item: CommandItem) => {
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
        }),
        vscode.commands.registerCommand('scriptnotes.exportCommands', async (items: CommandItem[]) => {
            const options: vscode.SaveDialogOptions = {
                defaultUri: vscode.Uri.file('commands.json'),
                filters: {
                    'JSON files': ['json']
                }
            };

            const uri = await vscode.window.showSaveDialog(options);
            if (uri) {
                try {
                    const data = JSON.stringify(items, null, 2);
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(data));
                    vscode.window.showInformationMessage('Commands exported successfully!');
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to export commands: ' + (error instanceof Error ? error.message : String(error)));
                }
            }
        }),
        vscode.commands.registerCommand('scriptnotes.importCommands', async () => {
            const options: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON files': ['json']
                },
                title: 'Import Commands'
            };

            const fileUri = await vscode.window.showOpenDialog(options);
            if (fileUri && fileUri[0]) {
                try {
                    const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
                    const importedCommands = JSON.parse(fileContent.toString()) as CommandItem[];

                    // Validate imported data
                    const isValid = importedCommands.every(cmd =>
                        typeof cmd.id === 'string' &&
                        typeof cmd.label === 'string' &&
                        typeof cmd.shell === 'string' &&
                        Array.isArray(cmd.flags) &&
                        Array.isArray(cmd.argumentPrompts) &&
                        typeof cmd.alwaysPrompt === 'boolean'
                    );

                    if (!isValid) {
                        throw new Error('Invalid command format in import file');
                    }

                    // Ask if user wants to replace or merge
                    const choice = await vscode.window.showQuickPick(
                        [
                            { label: 'Replace all commands', description: 'Remove existing commands and add imported ones' },
                            { label: 'Merge with existing', description: 'Add imported commands to the existing list' }
                        ],
                        {
                            placeHolder: 'How would you like to import the commands?'
                        }
                    );

                    if (choice) {
                        if (choice.label === 'Replace all commands') {
                            setCommandList([...importedCommands]);
                        } else {
                            // For merge, we'll generate new IDs to avoid conflicts
                            const newCommands = importedCommands.map(cmd => ({
                                ...cmd,
                                id: Date.now().toString() + Math.random().toString(36).slice(2)
                            }));
                            setCommandList([...getCommandList(), ...newCommands]);
                        }
                        await commandProvider.updateWebview();
                        vscode.window.showInformationMessage('Commands imported successfully!');
                    }
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to import commands: ' + (error instanceof Error ? error.message : String(error)));
                }
            }
        })
    );

    console.log('Congratulations, your extension "scriptnotes" is now active!');
}

// Extension deactivation
export function deactivate(): void { }