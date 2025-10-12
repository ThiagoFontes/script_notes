import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { getCommandList, setCommandList } from './CommandRunnerViewProvider';

// Store the webview provider instance reference
let commandProvider: any;

export function setCommandProvider(provider: any): void {
    commandProvider = provider;
}

export class CommandEditorProvider {
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
		</html>`;

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'save':
                        try {
                            const updatedCommand = message.command;
                            // Keep the original ID
                            updatedCommand.id = command.id;
                            // Find and update the command in the list
                            const commandList = getCommandList();
                            const index = commandList.findIndex(cmd => cmd.id === command.id);
                            if (index !== -1) {
                                commandList[index] = updatedCommand;
                                setCommandList(commandList);
                                await commandProvider.updateWebview();
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
            this.context.subscriptions
        );
    }
}