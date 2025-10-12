import * as vscode from 'vscode';

// Data model for a command item
export interface CommandItem {
	id: string;
	label: string;
	shell: string;
	flags: string[];
	argumentPrompts: string[];
	alwaysPrompt: boolean;
}

// Storage key for commands
const COMMANDS_STORAGE_KEY = 'scriptnotes.commands';

// Persistent store for commands
let commandList: CommandItem[] = [];

// Create the main webview provider class
class CommandRunnerViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _isExportView: boolean = false;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _extensionContext: vscode.ExtensionContext
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): void {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			enableCommandUris: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.title = "Script Notes";
		webviewView.description = "Manage and run shell commands";

		// Add visibility change listener
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this.loadCommands();
				this.updateWebview();
			}
		});

		webviewView.webview.html = this._getHtmlForWebview();
		this._setWebviewMessageListener(webviewView.webview);
		this.loadCommands(); // Load saved commands first
		this.updateWebview();
	}

	private saveCommands(): void {
		this._extensionContext.globalState.update(COMMANDS_STORAGE_KEY, commandList);
	}

	private loadCommands(): void {
		const savedCommands = this._extensionContext.globalState.get<CommandItem[]>(COMMANDS_STORAGE_KEY);
		if (savedCommands) {
			commandList = savedCommands;
			this.updateWebview();
		}
	}

	public updateWebview(): void {
		if (this._view) {
			this._isExportView = false;
			this._view.webview.html = this._getHtmlForWebview();
			this._view.webview.postMessage({ command: 'update', commandList });
		}
		this.saveCommands();
	}

	public showExportView(): void {
		if (this._view) {
			this._isExportView = true;
			this._view.webview.html = this._getExportHtmlForWebview(commandList);
		}
	}

	private _setWebviewMessageListener(webview: vscode.Webview): void {
		webview.onDidReceiveMessage(async (message: { command: string; id?: string; commandIds?: string[] }) => {
			switch (message.command) {
				case 'addCommand':
					vscode.commands.executeCommand('scriptnotes.addCommand');
					break;
				case 'editCommand':
					if (message.id) {
						const cmd = commandList.find(c => c.id === message.id);
						if (cmd) {
							vscode.commands.executeCommand('scriptnotes.editCommand', cmd);
						}
					}
					break;
				case 'deleteCommand':
					if (message.id) {
						const cmd = commandList.find(c => c.id === message.id);
						if (cmd) {
							vscode.commands.executeCommand('scriptnotes.deleteCommand', cmd);
						}
					}
					break;
				case 'runCommand':
					if (message.id) {
						console.log('Running command with id:', message.id);
						console.log('Current command list:', commandList);
						const cmd = commandList.find(c => c.id === message.id);
						console.log('Found command:', cmd);
						if (cmd) {
							vscode.commands.executeCommand('scriptnotes.runCommand', cmd);
						}
					}
					break;
				case 'exportCommands':
					this.showExportView();
					break;
				case 'confirmExport':
					if (message.commandIds && message.commandIds.length > 0) {
						const selectedCommands = commandList.filter(cmd => message.commandIds?.includes(cmd.id));
						vscode.commands.executeCommand('scriptnotes.exportCommands', selectedCommands);
					}
					this.updateWebview(); // Return to normal view
					break;
				case 'cancelExport':
					this.updateWebview(); // Return to normal view
					break;
				case 'importCommands':
					vscode.commands.executeCommand('scriptnotes.importCommands');
					break;
			}
		});
	}

	private _getExportHtmlForWebview(commands: CommandItem[]): string {
		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
                <title>Export Commands</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family);
                        margin: 0;
                        padding: 0.5em;
                        color: var(--vscode-foreground);
                    }
                    .export-view {
                        padding: 1em;
                    }
                    .export-header {
                        margin-bottom: 1em;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .export-title {
                        font-size: 1.2em;
                        font-weight: 500;
                    }
                    .export-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5em;
                        margin: 1em 0;
                    }
                    .export-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5em;
                        padding: 0.5em;
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 3px;
                    }
                    .export-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .export-checkbox {
                        margin: 0;
                    }
                    .export-actions {
                        margin-top: 1em;
                        display: flex;
                        justify-content: flex-end;
                        gap: 0.5em;
                    }
                    .btn {
                        padding: 4px 12px;
                        border-radius: 3px;
                        border: none;
                        cursor: pointer;
                    }
                    .btn-primary {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .btn-secondary {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                </style>
            </head>
            <body>
                <div class="export-view">
                    <div class="export-header">
                        <div class="export-title">Select Commands to Export</div>
                    </div>
                    <div class="export-list">
                        ${commands.map(cmd => `
                            <div class="export-item">
                                <input type="checkbox" class="export-checkbox" value="${cmd.id}" id="cmd-${cmd.id}">
                                <label for="cmd-${cmd.id}">${cmd.label}</label>
                            </div>
                        `).join('')}
                    </div>
                    <div class="export-actions">
                        <button class="btn btn-secondary" onclick="cancelExport()">Cancel</button>
                        <button class="btn btn-primary" onclick="confirmExport()">Export Selected</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function confirmExport() {
                        const selectedIds = Array.from(document.querySelectorAll('.export-checkbox:checked'))
                            .map(cb => cb.value);
                        vscode.postMessage({ 
                            command: 'confirmExport',
                            commandIds: selectedIds
                        });
                    }
                    
                    function cancelExport() {
                        vscode.postMessage({ command: 'cancelExport' });
                    }
                </script>
            </body>
            </html>`;
	}

	private _getHtmlForWebview(): string {
		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
                <title>Command Runner</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family);
                        margin: 0;
                        padding: 0.5em;
                        color: var(--vscode-foreground);
                    }
                    .header {
                        display: flex;
                        justify-content: stretch;
                        margin-bottom: 0.5em;
                    }
                    .header .icon-btn {
                        flex: 1;
                    }
                    .actions-bar {
                        display: flex;
                        gap: 4px;
                        margin-bottom: 0.5em;
                        padding: 0.25em 0;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    .export-view {
                        padding: 1em;
                    }
                    .export-header {
                        margin-bottom: 1em;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .export-title {
                        font-size: 1.2em;
                        font-weight: 500;
                    }
                    .export-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5em;
                    }
                    .export-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5em;
                        padding: 0.5em;
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 3px;
                    }
                    .export-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .export-checkbox {
                        margin: 0;
                    }
                    .export-actions {
                        margin-top: 1em;
                        display: flex;
                        justify-content: flex-end;
                        gap: 0.5em;
                    }
                    .command-list { margin-top: 0.5em; }
                    .command-item { 
                        display: flex; 
                        flex-direction: column;
                        padding: 0.5em;
                        border-radius: 3px;
                        transition: all 0.1s ease;
                        margin: 4px 0;
                        border: 1px solid var(--vscode-widget-border);
                        background-color: var(--vscode-editor-background);
                    }
                    .command-item:hover { 
                        background-color: var(--vscode-list-hoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    .command-label { 
                        font-weight: 500;
                        padding-bottom: 0.3em;
                        color: var(--vscode-editor-foreground);
                    }
                    .actions {
                        display: flex;
                        gap: 4px;
                        border-top: 1px solid var(--vscode-widget-border);
                        margin-top: 0.3em;
                        padding-top: 0.3em;
                    }
                    .icon-btn { 
                        background: none; 
                        border: none; 
                        cursor: pointer;
                        padding: 4px 8px;
                        border-radius: 3px;
                        font-size: 0.9em;
                        color: var(--vscode-editor-foreground);
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        flex: 1;
                        justify-content: center;
                        min-width: 0;
                    }
                    .icon-btn:hover { 
                        background-color: var(--vscode-button-secondaryHoverBackground);
                        color: var(--vscode-button-foreground);
                    }
                    .icon-btn.add { 
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        padding: 6px 12px;
                    }
                    .icon-btn.add:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .icon-btn.edit { background-color: var(--vscode-button-secondaryBackground); }
                    .icon-btn.run { background-color: var(--vscode-button-secondaryBackground); }
                    .icon-btn.delete { background-color: var(--vscode-button-secondaryBackground); }
                    .icon-btn.edit:hover { 
                        background-color: var(--vscode-symbolIcon-functionForeground);
                        color: var(--vscode-button-foreground);
                    }
                    .icon-btn.run:hover { 
                        background-color: var(--vscode-testing-iconPassed); 
                        color: var(--vscode-button-foreground);
                    }
                    .icon-btn.delete:hover { 
                        background-color: var(--vscode-errorForeground); 
                        color: var(--vscode-button-foreground);
                    }
                    .empty-message {
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        padding: 0.5em;
                        margin: 1em 0;
                        text-align: center;
                        border: 1px dashed var(--vscode-widget-border);
                        border-radius: 3px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <button class="icon-btn add" title="Add Command" onclick="addCommand()">
                        <span>+</span>
                        <span>New Command</span>
                    </button>
                </div>
                <div class="actions-bar">
                    <button class="icon-btn" title="Import Commands" onclick="importCommands()">
                        <span>↓</span>
                        <span>Import</span>
                    </button>
                    <button class="icon-btn" title="Export Commands" onclick="exportCommands()">
                        <span>↑</span>
                        <span>Export</span>
                    </button>
                </div>
                <div class="command-list" id="commandList"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    let state = { commandList: [] };

                    function addCommand() {
                        vscode.postMessage({ command: 'addCommand' });
                    }
                    function editCommand(id) {
                        vscode.postMessage({ command: 'editCommand', id });
                    }
                    function deleteCommand(id) {
                        vscode.postMessage({ command: 'deleteCommand', id });
                    }
                    function runCommand(id) {
                        vscode.postMessage({ command: 'runCommand', id });
                    }
                    function importCommands() {
                        vscode.postMessage({ command: 'importCommands' });
                    }
                    function exportCommands() {
                        vscode.postMessage({ command: 'exportCommands' });
                    }
                    function confirmExport() {
                        const selectedIds = Array.from(document.querySelectorAll('.export-checkbox:checked'))
                            .map(cb => cb.value);
                        vscode.postMessage({ 
                            command: 'confirmExport',
                            commandIds: selectedIds
                        });
                    }
                    function cancelExport() {
                        vscode.postMessage({ command: 'cancelExport' });
                    }

                    // Listen for messages from the extension
                    window.addEventListener('message', event => {
                        const { command, commandList } = event.data;
                        if (command === 'update') {
                            // Update state
                            state = { ...state, commandList };
                            vscode.setState(state);

                            // Update UI
                            const container = document.getElementById('commandList');
                            container.innerHTML = '';
                            if (!commandList.length) {
                                container.innerHTML = '<div class="empty-message">No commands registered. Click "Add Command" to get started.</div>';
                                return;
                            }
                            for (const cmd of commandList) {
                                const div = document.createElement('div');
                                div.className = 'command-item';
                                div.innerHTML = \`
                                    <span class="command-label">\${cmd.label}</span>
                                    <div class="actions">
                                        <button class="icon-btn edit" title="Edit command" onclick="editCommand('\${cmd.id}')">⚙ Edit</button>
                                        <button class="icon-btn run" title="Run command" onclick="runCommand('\${cmd.id}')">▶ Run</button>
                                        <button class="icon-btn delete" title="Delete command" onclick="deleteCommand('\${cmd.id}')">× Delete</button>
                                    </div>
                                \`;
                                container.appendChild(div);
                            }
                        }
                    });

                    // Restore previous state
                    const previousState = vscode.getState();
                    if (previousState) {
                        state = previousState;
                        vscode.postMessage({ command: 'update', commandList: state.commandList });
                    }
                </script>
            </body>
            </html>`;
	}
}

// Store the webview provider instance
let commandProvider: CommandRunnerViewProvider;

// Extension activation
export function activate(context: vscode.ExtensionContext): void {
	// Create and register the webview provider first so it's available for commands
	commandProvider = new CommandRunnerViewProvider(context.extensionUri, context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('commandRunnerWebview', commandProvider)
	);

	// Register command handlers
	context.subscriptions.push(
		vscode.commands.registerCommand('scriptnotes.addCommand', async () => {
			const label = await vscode.window.showInputBox({
				prompt: 'Command label',
				placeHolder: 'Enter a name for your command'
			});
			if (!label) { return; }

			const shell = await vscode.window.showInputBox({
				prompt: 'Shell command',
				placeHolder: 'Enter the shell command to run'
			});
			if (!shell) { return; }

			const flagsRaw = await vscode.window.showInputBox({
				prompt: 'Flags (comma separated)',
				placeHolder: 'Example: -v, --force'
			});
			const flags = flagsRaw ? flagsRaw.split(',').map(f => f.trim()).filter(f => f) : [];

			const argsRaw = await vscode.window.showInputBox({
				prompt: 'Argument prompts (comma separated)',
				placeHolder: 'Example: File path, Branch name'
			});
			const argumentPrompts = argsRaw ? argsRaw.split(',').map(a => a.trim()).filter(a => a) : [];

			const alwaysPromptResult = await vscode.window.showQuickPick(
				[{ label: 'Yes' }, { label: 'No' }],
				{
					placeHolder: 'Always prompt for arguments when running this command?'
				}
			);

			// Log the result to help debug
			console.log('QuickPick result:', alwaysPromptResult);
			const alwaysPrompt = alwaysPromptResult?.label === 'Yes';
			console.log('alwaysPrompt value:', alwaysPrompt);

			const id = Date.now().toString();
			const newCommand = { id, label, shell, flags, argumentPrompts, alwaysPrompt };
			console.log('New command:', newCommand);
			commandList.push(newCommand);
			commandProvider.updateWebview();
		}),
		vscode.commands.registerCommand('scriptnotes.editCommand', async (item: CommandItem) => {
			const label = await vscode.window.showInputBox({
				prompt: 'Edit label',
				value: item.label
			});
			if (!label) { return; }

			const shell = await vscode.window.showInputBox({
				prompt: 'Edit shell command',
				value: item.shell
			});
			if (!shell) { return; }

			const flagsRaw = await vscode.window.showInputBox({
				prompt: 'Edit flags (comma separated)',
				value: item.flags.join(',')
			});
			const flags = flagsRaw ? flagsRaw.split(',').map(f => f.trim()).filter(f => f) : [];

			const argsRaw = await vscode.window.showInputBox({
				prompt: 'Edit argument prompts (comma separated)',
				value: item.argumentPrompts.join(',')
			});
			const argumentPrompts = argsRaw ? argsRaw.split(',').map(a => a.trim()).filter(a => a) : [];

			const alwaysPromptResult = await vscode.window.showQuickPick(
				[{ label: 'Yes' }, { label: 'No' }],
				{
					placeHolder: 'Always prompt for arguments when running this command?'
				}
			);
			const alwaysPrompt = alwaysPromptResult?.label === 'Yes';

			const cmd = commandList.find(c => c.id === item.id);
			if (cmd) {
				cmd.label = label;
				cmd.shell = shell;
				cmd.flags = flags;
				cmd.argumentPrompts = argumentPrompts;
				cmd.alwaysPrompt = alwaysPrompt;
				commandProvider.updateWebview();
			}
		}),
		vscode.commands.registerCommand('scriptnotes.deleteCommand', async (item: CommandItem) => {
			commandList = commandList.filter(cmd => cmd.id !== item.id);
			commandProvider.updateWebview();
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
							commandList = [...importedCommands];
						} else {
							// For merge, we'll generate new IDs to avoid conflicts
							const newCommands = importedCommands.map(cmd => ({
								...cmd,
								id: Date.now().toString() + Math.random().toString(36).slice(2)
							}));
							commandList = [...commandList, ...newCommands];
						}
						commandProvider.updateWebview();
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