import { CommandItem, Folder } from '../models/CommandItem';

export function generateExportViewHtml(commands: CommandItem[], folders: Folder[]): string {
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
        .export-folder {
            font-weight: 500;
            background-color: var(--vscode-list-inactiveSelectionBackground);
        }
        .export-command {
            margin-left: 1.5em;
        }
        .folder-icon {
            margin-right: 0.25em;
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
            ${folders.map(folder => {
        const folderCommands = commands.filter(cmd => cmd.folderId === folder.id);
        return `
                    <div class="export-item export-folder">
                        <input type="checkbox" class="export-checkbox folder-checkbox" value="${folder.id}" id="folder-${folder.id}" data-type="folder">
                        <label for="folder-${folder.id}">
                            <span class="folder-icon">📁</span>
                            ${folder.name}
                        </label>
                    </div>
                    ${folderCommands.map(cmd => `
                        <div class="export-item export-command">
                            <input type="checkbox" class="export-checkbox command-checkbox" value="${cmd.id}" id="cmd-${cmd.id}" data-type="command" data-folder-id="${folder.id}">
                            <label for="cmd-${cmd.id}">${cmd.label}</label>
                        </div>
                    `).join('')}
                `;
    }).join('')}
            ${commands.filter(cmd => !cmd.folderId).map(cmd => `
                <div class="export-item export-command">
                    <input type="checkbox" class="export-checkbox command-checkbox" value="${cmd.id}" id="cmd-${cmd.id}" data-type="command">
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
        
        // Add event listeners when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Add change listeners to all checkboxes
            document.querySelectorAll('.export-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleCheckboxChange);
            });
        });
        
        function handleCheckboxChange(event) {
            const checkbox = event.target;
            const isFolder = checkbox.dataset.type === 'folder';
            const isCommand = checkbox.dataset.type === 'command';
            
            if (isFolder) {
                // When folder is clicked, select/deselect all commands in that folder
                const folderId = checkbox.value;
                const folderCommands = document.querySelectorAll(\`[data-folder-id="\${folderId}"]\`);
                folderCommands.forEach(cmdCheckbox => {
                    cmdCheckbox.checked = checkbox.checked;
                });
            } else if (isCommand) {
                // When command is clicked, check if all commands in folder are selected
                const folderId = checkbox.dataset.folderId;
                if (folderId) {
                    const folderCheckbox = document.querySelector(\`#folder-\${folderId}\`);
                    const folderCommands = document.querySelectorAll(\`[data-folder-id="\${folderId}"]\`);
                    const checkedCommands = document.querySelectorAll(\`[data-folder-id="\${folderId}"]:checked\`);
                    
                    if (folderCheckbox) {
                        // If all commands are checked, check the folder
                        if (checkedCommands.length === folderCommands.length) {
                            folderCheckbox.checked = true;
                        } else {
                            folderCheckbox.checked = false;
                        }
                    }
                }
            }
        }
        
        function confirmExport() {
            const selectedCommands = Array.from(document.querySelectorAll('.command-checkbox:checked'))
                .map(cb => cb.value);
            const selectedFolders = Array.from(document.querySelectorAll('.folder-checkbox:checked'))
                .map(cb => cb.value);
                
            vscode.postMessage({ 
                command: 'confirmExport',
                commandIds: selectedCommands,
                folderIds: selectedFolders
            });
        }
        
        function cancelExport() {
            vscode.postMessage({ command: 'cancelExport' });
        }
    </script>
</body>
</html>`;
}