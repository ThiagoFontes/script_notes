import * as vscode from 'vscode';
import { CommandItem, Folder } from '../models/CommandItem';
import { CommandStorage } from '../utils/CommandStorage';
import { generateCommandRunnerHtml, generateExportViewHtml } from '../views';

// This needs to be shared between the provider and extension
// We'll export a function to access it
let commandList: CommandItem[] = [];
let folderList: Folder[] = [];
let commandStorage: CommandStorage;

export function getCommandList(): CommandItem[] {
    return commandList;
}

export function setCommandList(newCommandList: CommandItem[]): void {
    commandList = newCommandList;
}

export function getFolderList(): Folder[] {
    return folderList;
}

export function setFolderList(newFolderList: Folder[]): void {
    folderList = newFolderList;
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
        const savedFolders = await commandStorage.loadFolders();

        if (savedCommands) {
            commandList = savedCommands;
        }
        if (savedFolders) {
            folderList = savedFolders;
        }

        await this.updateWebview();
    }

    public async updateWebview(): Promise<void> {
        if (this._view) {
            this._isExportView = false;
            this._view.webview.html = this._getHtmlForWebview();
            this._view.webview.postMessage({ command: 'update', commandList, folderList });
        }
        await this.saveCommands();
        await this.saveFolders();
    }

    public async refresh(): Promise<void> {
        await this.loadCommands();
    }

    private async saveFolders(): Promise<void> {
        await commandStorage.saveFolders(folderList);
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
            folderId?: string;
            commandId?: string;
            newName?: string;
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
                case 'addFolder':
                    vscode.commands.executeCommand('scriptnotes.addFolder');
                    break;
                case 'toggleFolder':
                    if (message.folderId) {
                        vscode.commands.executeCommand('scriptnotes.toggleFolder', message.folderId);
                    }
                    break;
                case 'renameFolder':
                    if (message.folderId && message.newName) {
                        vscode.commands.executeCommand('scriptnotes.renameFolder', message.folderId, message.newName);
                    }
                    break;
                case 'deleteFolder':
                    if (message.folderId) {
                        vscode.commands.executeCommand('scriptnotes.deleteFolder', message.folderId);
                    }
                    break;
                case 'moveCommandToFolder':
                    if (message.commandId) {
                        vscode.commands.executeCommand('scriptnotes.moveCommandToFolder', message.commandId, message.folderId);
                    }
                    break;
            }
        });
    }

    private _getExportHtmlForWebview(commands: CommandItem[]): string {
        return generateExportViewHtml(commands);
    }

    private _getHtmlForWebview(): string {
        return generateCommandRunnerHtml();
    }
}