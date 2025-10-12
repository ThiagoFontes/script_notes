import * as vscode from 'vscode';

// Data model for a command item
export interface CommandItem {
	id: string;
	label: string;
	shell: string;
	flags: string[];
	argumentPrompts: string[];
}

// In-memory store for commands (replace with persistent storage later)
let commandList: CommandItem[] = [];

// Create the main webview provider class
class CommandRunnerViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
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

		webviewView.title = "Command Runner";
		webviewView.description = "Manage and run shell commands";

		webviewView.webview.html = this._getHtmlForWebview();
		this._setWebviewMessageListener(webviewView.webview);
		this.updateWebview();
	}

	public updateWebview(): void {
		if (this._view) {
			this._view.webview.postMessage({ command: 'update', commandList });
		}
	}

	private _setWebviewMessageListener(webview: vscode.Webview): void {
		webview.onDidReceiveMessage(async (message: { command: string; id?: string }) => {
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
						const cmd = commandList.find(c => c.id === message.id);
						if (cmd) {
							vscode.commands.executeCommand('scriptnotes.runCommand', cmd);
						}
					}
					break;
			}
		});
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
                    body { font-family: var(--vscode-font-family); margin: 0; padding: 1em; }
                    .command-list { margin-top: 1em; }
                    .command-item { 
                        display: flex; 
                        align-items: center; 
                        margin-bottom: 0.5em; 
                        padding: 0.5em; 
                        border-radius: 4px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                    }
                    .command-item:hover { 
                        background-color: var(--vscode-list-hoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    .command-label { 
                        flex: 1;
                        color: var(--vscode-foreground);
                    }
                    .icon-btn { 
                        background: none; 
                        border: none; 
                        cursor: pointer; 
                        margin-left: 0.5em; 
                        font-size: 1.2em; 
                        opacity: 0.8;
                        color: var(--vscode-button-foreground);
                        padding: 4px;
                    }
                    .icon-btn:hover { 
                        opacity: 1;
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .icon-btn.add { color: var(--vscode-charts-green); }
                    .icon-btn.edit { color: var(--vscode-charts-blue); }
                    .icon-btn.delete { color: var(--vscode-charts-red); }
                    .icon-btn.run { color: var(--vscode-terminal-ansiGreen); }
                    .empty-message {
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        margin: 1em 0;
                    }
                </style>
            </head>
            <body>
                <button class="icon-btn add" title="Add Command" onclick="addCommand()">➕ Add Command</button>
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
                                    <button class="icon-btn edit" title="Edit" onclick="editCommand('\${cmd.id}')">✏️</button>
                                    <button class="icon-btn delete" title="Delete" onclick="deleteCommand('\${cmd.id}')">🗑️</button>
                                    <button class="icon-btn run" title="Run" onclick="runCommand('\${cmd.id}')">▶️</button>
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
	commandProvider = new CommandRunnerViewProvider(context.extensionUri);
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

			const id = Date.now().toString();
			commandList.push({ id, label, shell, flags, argumentPrompts });
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

			const cmd = commandList.find(c => c.id === item.id);
			if (cmd) {
				cmd.label = label;
				cmd.shell = shell;
				cmd.flags = flags;
				cmd.argumentPrompts = argumentPrompts;
				commandProvider.updateWebview();
			}
		}),
		vscode.commands.registerCommand('scriptnotes.deleteCommand', async (item: CommandItem) => {
			commandList = commandList.filter(cmd => cmd.id !== item.id);
			commandProvider.updateWebview();
		}),
		vscode.commands.registerCommand('scriptnotes.runCommand', async (item: CommandItem) => {
			let args: string[] = [];
			for (const prompt of item.argumentPrompts) {
				const value = await vscode.window.showInputBox({ prompt });
				if (value === undefined) { return; }
				args.push(value);
			}
			const fullCommand = [item.shell, ...item.flags, ...args].join(' ');
			const task = new vscode.Task(
				{ type: 'shell' },
				vscode.TaskScope.Workspace,
				item.label,
				'scriptnotes',
				new vscode.ShellExecution(fullCommand)
			);
			vscode.tasks.executeTask(task);
		})
	);

	console.log('Congratulations, your extension "scriptnotes" is now active!');
}

// Extension deactivation
export function deactivate(): void { }