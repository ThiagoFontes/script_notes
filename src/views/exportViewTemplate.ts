import { CommandItem } from '../models/CommandItem';

export function generateExportViewHtml(commands: CommandItem[]): string {
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