import * as vscode from 'vscode';
import { CommandItem } from '../models/CommandItem';
import { CommandStorage } from '../utils/CommandStorage';

// This needs to be shared between the provider and extension
// We'll export a function to access it
let commandList: CommandItem[] = [];
let commandStorage: CommandStorage;

export function getCommandList(): CommandItem[] {
    return commandList;
}

export function setCommandList(newCommandList: CommandItem[]): void {
    commandList = newCommandList;
}

export function getCommandStorage(): CommandStorage {
    return commandStorage;
}

export class CommandRunnerViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _isExportView: boolean = false;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _extensionContext: vscode.ExtensionContext
    ) {
        commandStorage = new CommandStorage(_extensionContext);
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.title = "Script Notes";
        webviewView.description = "Manage and run shell commands";

        // Add visibility change listener
        webviewView.onDidChangeVisibility(async () => {
            if (webviewView.visible) {
                await this.loadCommands();
                await this.updateWebview();
            }
        });

        webviewView.webview.html = this._getHtmlForWebview();
        this._setWebviewMessageListener(webviewView.webview);
        await this.loadCommands(); // Load saved commands first
        await this.updateWebview();
    }

    private async saveCommands(): Promise<void> {
        await commandStorage.saveCommands(commandList);
    }

    private async loadCommands(): Promise<void> {
        const savedCommands = await commandStorage.loadCommands();
        if (savedCommands) {
            commandList = savedCommands;
            await this.updateWebview();
        }
    }

    public async updateWebview(): Promise<void> {
        if (this._view) {
            this._isExportView = false;
            this._view.webview.html = this._getHtmlForWebview();
            this._view.webview.postMessage({ command: 'update', commandList });
        }
        await this.saveCommands();
    }

    public showExportView(): void {
        if (this._view) {
            this._isExportView = true;
            this._view.webview.html = this._getExportHtmlForWebview(commandList);
        }
    }

    private _setWebviewMessageListener(webview: vscode.Webview): void {
        webview.onDidReceiveMessage(async (message: {
            command: string;
            id?: string;
            commandIds?: string[];
            commandList?: CommandItem[];
        }) => {
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
                    await this.updateWebview(); // Return to normal view
                    break;
                case 'cancelExport':
                    await this.updateWebview(); // Return to normal view
                    break;
                case 'importCommands':
                    vscode.commands.executeCommand('scriptnotes.importCommands');
                    break;
                case 'reorderCommands':
                    if (message.commandList) {
                        commandList = message.commandList;
                        await this.updateWebview();
                    }
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
                        align-items: center;
                        gap: 8px;
                        padding: 0.5em;
                        border-radius: 3px;
                        transition: all 0.1s ease;
                        margin: 4px 0;
                        border: 1px solid var(--vscode-widget-border);
                        background-color: var(--vscode-editor-background);
                        cursor: grab;
                    }
                    .command-item:hover { 
                        background-color: var(--vscode-list-hoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    .command-item.dragging {
                        opacity: 0.5;
                        border: 1px dashed var(--vscode-focusBorder);
                    }
                    .command-item.drag-over {
                        border: 1px dashed var(--vscode-focusBorder);
                        background-color: var(--vscode-list-dropBackground);
                    }
                    .drag-handle {
                        color: var(--vscode-disabledForeground);
                        cursor: grab;
                        user-select: none;
                        padding: 0 8px;
                        display: flex;
                        align-items: center;
                        border-left: 1px solid var(--vscode-widget-border);
                        margin-left: 4px;
                        opacity: 0.6;
                    }
                    .command-item:hover .drag-handle {
                        opacity: 1;
                    }
                    .command-content {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
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

                    // Drag and drop handlers
                    let draggedItem = null;

                    function handleDragStart(e) {
                        draggedItem = e.target;
                        e.target.classList.add('dragging');
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
                    }

                    function handleDragOver(e) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }

                    function handleDragEnter(e) {
                        e.target.closest('.command-item')?.classList.add('drag-over');
                    }

                    function handleDragLeave(e) {
                        e.target.closest('.command-item')?.classList.remove('drag-over');
                    }

                    function handleDrop(e) {
                        e.preventDefault();
                        const dropTarget = e.target.closest('.command-item');
                        if (!dropTarget) return;
                        
                        dropTarget.classList.remove('drag-over');
                        const draggedId = e.dataTransfer.getData('text/plain');
                        const dropId = dropTarget.getAttribute('data-id');
                        
                        if (draggedId === dropId) return;

                        // Find indices
                        const draggedIndex = state.commandList.findIndex(cmd => cmd.id === draggedId);
                        const dropIndex = state.commandList.findIndex(cmd => cmd.id === dropId);

                        // Reorder array
                        const [removed] = state.commandList.splice(draggedIndex, 1);
                        state.commandList.splice(dropIndex, 0, removed);

                        // Update the view and notify extension
                        vscode.postMessage({ 
                            command: 'reorderCommands',
                            commandList: state.commandList
                        });
                    }

                    function handleDragEnd(e) {
                        e.target.classList.remove('dragging');
                        document.querySelectorAll('.command-item').forEach(item => {
                            item.classList.remove('drag-over');
                        });
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
                                div.draggable = true;
                                div.setAttribute('data-id', cmd.id);
                                div.innerHTML = \`
                                    <div class="command-content">
                                        <span class="command-label">\${cmd.label}</span>
                                        <div class="actions">
                                            <button class="icon-btn edit" title="Edit command" onclick="editCommand('\${cmd.id}')">⚙ Edit</button>
                                            <button class="icon-btn run" title="Run command" onclick="runCommand('\${cmd.id}')">▶ Run</button>
                                            <button class="icon-btn delete" title="Delete command" onclick="deleteCommand('\${cmd.id}')">× Delete</button>
                                        </div>
                                    </div>
                                    <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                                \`;

                                // Add drag and drop event listeners
                                div.addEventListener('dragstart', handleDragStart);
                                div.addEventListener('dragover', handleDragOver);
                                div.addEventListener('dragenter', handleDragEnter);
                                div.addEventListener('dragleave', handleDragLeave);
                                div.addEventListener('drop', handleDrop);
                                div.addEventListener('dragend', handleDragEnd);
                                
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