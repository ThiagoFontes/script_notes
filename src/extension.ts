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

    // Command Editor WebviewPanel provider
    class CommandEditorProvider {
        constructor(private readonly context: vscode.ExtensionContext) { }

        public async resolveWebviewPanel(
            webviewPanel: vscode.WebviewPanel,
            command: CommandItem
        ): Promise<void> {
            webviewPanel.webview.options = {
                enableScripts: true,
                enableCommandUris: true
            };

            webviewPanel.webview.html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
				<title>Edit Command</title>
				<style>
					body {
						padding: 1em;
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
						color: var(--vscode-foreground);
						max-width: 800px;
						margin: 0 auto;
					}
					.form-group {
						margin-bottom: 1.5em;
					}
					label {
						display: block;
						margin-bottom: 0.5em;
						color: var(--vscode-foreground);
						font-weight: 500;
					}
					input[type="text"], textarea {
						width: 100%;
						padding: 8px;
						border: 1px solid var(--vscode-input-border);
						background: var(--vscode-input-background);
						color: var(--vscode-input-foreground);
						border-radius: 2px;
						font-family: var(--vscode-font-family);
					}
					input[type="text"]:focus, textarea:focus {
						outline: 1px solid var(--vscode-focusBorder);
					}
					.tag-input {
						display: flex;
						flex-wrap: wrap;
						gap: 8px;
						padding: 4px;
						border: 1px solid var(--vscode-input-border);
						background: var(--vscode-input-background);
						min-height: 38px;
						border-radius: 2px;
					}
					.tag {
						display: inline-flex;
						align-items: center;
						background: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
						padding: 2px 8px;
						border-radius: 12px;
						font-size: 0.9em;
					}
					.tag button {
						background: none;
						border: none;
						color: inherit;
						margin-left: 4px;
						cursor: pointer;
						padding: 0 4px;
					}
					.tag button:hover {
						opacity: 0.8;
					}
					.new-tag-input {
						border: none;
						padding: 4px;
						margin: 2px;
						flex: 1;
						min-width: 100px;
						background: transparent;
						color: var(--vscode-input-foreground);
					}
					.new-tag-input:focus {
						outline: none;
					}
					.checkbox-group {
						margin-top: 1em;
					}
					.checkbox-label {
						display: flex;
						align-items: center;
						gap: 8px;
						cursor: pointer;
					}
					.error {
						color: var(--vscode-errorForeground);
						margin-top: 0.5em;
						font-size: 0.9em;
						display: none;
					}
					.actions {
						display: flex;
						justify-content: flex-end;
						gap: 8px;
						margin-top: 2em;
						border-top: 1px solid var(--vscode-input-border);
						padding-top: 1em;
					}
					button {
						padding: 6px 14px;
						border-radius: 2px;
						border: none;
						cursor: pointer;
						font-size: 0.9em;
					}
					.btn-primary {
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
					}
					.btn-secondary {
						background: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
					}
					.btn-add {
						background: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
						padding: 4px 8px;
						font-size: 0.9em;
					}
					.description {
						color: var(--vscode-descriptionForeground);
						font-size: 0.9em;
						margin-top: 0.25em;
					}
				</style>
			</head>
			<body>
				<form id="commandForm" onsubmit="return false;">
					<div class="form-group">
						<label for="label">Command Label</label>
						<input type="text" id="label" value="${command.label}" required>
						<div class="description">A descriptive name for your command</div>
					</div>

					<div class="form-group">
						<label for="shell">Shell Command</label>
						<input type="text" id="shell" value="${command.shell}" required>
						<div class="description">The actual command to execute in the terminal</div>
					</div>

					<div class="form-group">
						<label>Flags</label>
						<div class="tag-input" id="flagsContainer">
							${command.flags.map(flag =>
                `<span class="tag">
									${flag}
									<button type="button" onclick="removeFlag('${flag}')">&times;</button>
								</span>`
            ).join('')}
							<input type="text" class="new-tag-input" id="newFlag" 
								placeholder="Type a flag and press Enter (e.g., -v or --verbose)">
						</div>
						<div class="description">Command line flags and options</div>
					</div>

					<div class="form-group">
						<label>Argument Prompts</label>
						<div class="tag-input" id="promptsContainer">
							${command.argumentPrompts.map(prompt =>
                `<span class="tag">
									${prompt}
									<button type="button" onclick="removePrompt('${prompt}')">&times;</button>
								</span>`
            ).join('')}
							<input type="text" class="new-tag-input" id="newPrompt" 
								placeholder="Type a prompt and press Enter">
						</div>
						<div class="description">Prompts shown when asking for command arguments</div>
					</div>

					<div class="checkbox-group">
						<label class="checkbox-label">
							<input type="checkbox" id="alwaysPrompt" ${command.alwaysPrompt ? 'checked' : ''}>
							Always prompt for arguments
						</label>
						<div class="description">If checked, will always ask for arguments even if no prompts are defined</div>
					</div>

					<div id="error" class="error"></div>

					<div class="actions">
						<button type="button" class="btn-secondary" onclick="cancel()">Cancel</button>
						<button type="button" class="btn-primary" onclick="save()">Save Changes</button>
					</div>
				</form>

				<script>
					const vscode = acquireVsCodeApi();
					let currentFlags = ${JSON.stringify(command.flags)};
					let currentPrompts = ${JSON.stringify(command.argumentPrompts)};

					function removeFlag(flag) {
						currentFlags = currentFlags.filter(f => f !== flag);
						updateFlagsView();
					}

					function removePrompt(prompt) {
						currentPrompts = currentPrompts.filter(p => p !== prompt);
						updatePromptsView();
					}

					function updateFlagsView() {
						const container = document.getElementById('flagsContainer');
						const input = document.getElementById('newFlag');
						container.innerHTML = currentFlags.map(flag => 
							\`<span class="tag">
								\${flag}
								<button type="button" onclick="removeFlag('\${flag}')">&times;</button>
							</span>\`
						).join('');
						container.appendChild(input);
					}

					function updatePromptsView() {
						const container = document.getElementById('promptsContainer');
						const input = document.getElementById('newPrompt');
						container.innerHTML = currentPrompts.map(prompt => 
							\`<span class="tag">
								\${prompt}
								<button type="button" onclick="removePrompt('\${prompt}')">&times;</button>
							</span>\`
						).join('');
						container.appendChild(input);
					}

					document.getElementById('newFlag').addEventListener('keypress', function(e) {
						if (e.key === 'Enter') {
							e.preventDefault();
							const flag = this.value.trim();
							if (flag && !currentFlags.includes(flag)) {
								currentFlags.push(flag);
								this.value = '';
								updateFlagsView();
							}
						}
					});

					document.getElementById('newPrompt').addEventListener('keypress', function(e) {
						if (e.key === 'Enter') {
							e.preventDefault();
							const prompt = this.value.trim();
							if (prompt && !currentPrompts.includes(prompt)) {
								currentPrompts.push(prompt);
								this.value = '';
								updatePromptsView();
							}
						}
					});

					function save() {
						const command = {
							label: document.getElementById('label').value.trim(),
							shell: document.getElementById('shell').value.trim(),
							flags: currentFlags,
							argumentPrompts: currentPrompts,
							alwaysPrompt: document.getElementById('alwaysPrompt').checked
						};

						if (!command.label) {
							showError('Command label is required');
							return;
						}
						if (!command.shell) {
							showError('Shell command is required');
							return;
						}

						vscode.postMessage({ 
							type: 'save',
							command: command
						});
					}

					function showError(message) {
						const errorDiv = document.getElementById('error');
						errorDiv.textContent = message;
						errorDiv.style.display = 'block';
					}

					function cancel() {
						vscode.postMessage({ type: 'cancel' });
					}
				</script>
			</body>
			</html>`;            // Handle messages from the webview
            webviewPanel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.type) {
                        case 'save':
                            try {
                                const updatedCommand = message.command;
                                // Keep the original ID
                                updatedCommand.id = command.id;
                                // Find and update the command in the list
                                const index = commandList.findIndex(cmd => cmd.id === command.id);
                                if (index !== -1) {
                                    commandList[index] = updatedCommand;
                                    commandProvider.updateWebview();
                                    webviewPanel.dispose();
                                    vscode.window.showInformationMessage('Command updated successfully!');
                                }
                            } catch (error) {
                                vscode.window.showErrorMessage('Failed to update command: ' + (error instanceof Error ? error.message : String(error)));
                            }
                            break;
                        case 'cancel':
                            webviewPanel.dispose();
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    }

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