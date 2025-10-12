import { commandRunnerCSS } from './cssLoader';

export function generateCommandRunnerHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Command Runner</title>
    <style>${commandRunnerCSS}</style>
</head>
<body>
    <div class="header">
        <button class="icon-btn add" title="Add Command" onclick="addCommand()">
            <span>+</span>
            <span>New Command</span>
        </button>
        <button class="icon-btn add-folder" title="Add Folder" onclick="addFolder()">
            <span>📁</span>
            <span>New Folder</span>
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
        let state = { commandList: [], folderList: [] };

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

        // Folder functions
        function addFolder() {
            vscode.postMessage({ command: 'addFolder' });
        }
        function toggleFolder(folderId) {
            vscode.postMessage({ command: 'toggleFolder', folderId });
        }
        function handleFolderClick(event, folderId) {
            // Don't toggle folder if we're in a drag operation
            if (event.target.closest('.folder-item').classList.contains('folder-drop-zone')) {
                return;
            }
            toggleFolder(folderId);
        }
        function renameFolder(folderId) {
            const folderElement = document.querySelector('[data-folder-id="' + folderId + '"] .folder-name');
            const currentName = folderElement.textContent;
            const newName = prompt('Enter new folder name:', currentName);
            if (newName && newName.trim() !== '' && newName !== currentName) {
                vscode.postMessage({ command: 'renameFolder', folderId, newName: newName.trim() });
            }
        }
        function deleteFolder(folderId) {
            if (confirm('Delete this folder? All commands in it will be moved to the root level.')) {
                vscode.postMessage({ command: 'deleteFolder', folderId });
            }
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
            e.preventDefault();
            const folderTarget = e.target.closest('.folder-item');
            const commandTarget = e.target.closest('.command-item');
            const containerTarget = e.target.closest('#commandList');
            
            if (folderTarget) {
                folderTarget.classList.add('folder-drop-zone');
            } else if (commandTarget) {
                commandTarget.classList.add('drag-over');
            } else if (containerTarget && !folderTarget && !commandTarget) {
                // Dragging over empty space in the container
                containerTarget.classList.add('root-drop-zone');
            }
        }

        function handleDragLeave(e) {
            const folderTarget = e.target.closest('.folder-item');
            const commandTarget = e.target.closest('.command-item');
            const containerTarget = e.target.closest('#commandList');
            
            // Only remove the drop zone if we're actually leaving the target
            if (folderTarget && !folderTarget.contains(e.relatedTarget)) {
                folderTarget.classList.remove('folder-drop-zone');
            }
            if (commandTarget && !commandTarget.contains(e.relatedTarget)) {
                commandTarget.classList.remove('drag-over');
            }
            if (containerTarget && !containerTarget.contains(e.relatedTarget)) {
                containerTarget.classList.remove('root-drop-zone');
            }
        }

        function handleDrop(e) {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            
            console.log('Drop event:', {
                target: e.target,
                draggedId: draggedId,
                targetClasses: e.target.className,
                targetId: e.target.id
            });
            
            // Priority 1: Check if dropping on a command for reordering (and not the dragged command itself)
            const dropTarget = e.target.closest('.command-item');
            if (dropTarget && dropTarget.getAttribute('data-id') !== draggedId) {
                console.log('Dropping on command for reordering');
                dropTarget.classList.remove('drag-over');
                const dropId = dropTarget.getAttribute('data-id');

                // Find indices
                const draggedIndex = state.commandList.findIndex(cmd => cmd.id === draggedId);
                const dropIndex = state.commandList.findIndex(cmd => cmd.id === dropId);

                // Only reorder if both are in the same parent (both in root or both in same folder)
                const draggedCmd = state.commandList[draggedIndex];
                const dropCmd = state.commandList[dropIndex];
                
                if (draggedCmd.folderId === dropCmd.folderId) {
                    // Reorder array
                    const [removed] = state.commandList.splice(draggedIndex, 1);
                    state.commandList.splice(dropIndex, 0, removed);

                    // Update the view and notify extension
                    vscode.postMessage({ 
                        command: 'reorderCommands',
                        commandList: state.commandList
                    });
                    return;
                }
            }

            // Priority 2: Check if dropping on a folder (anywhere within the folder)
            const folderTarget = e.target.closest('.folder-item');            
            if (folderTarget) {
                console.log('Dropping on folder:', folderTarget.getAttribute('data-folder-id'));
                folderTarget.classList.remove('folder-drop-zone');
                const folderId = folderTarget.getAttribute('data-folder-id');
                vscode.postMessage({ 
                    command: 'moveCommandToFolder',
                    commandId: draggedId,
                    folderId: folderId
                });
                return;
            }

            // Check if dropping in the main command list area (move to root)
            const commandListContainer = document.getElementById('commandList');
            if (commandListContainer && (e.target === commandListContainer || commandListContainer.contains(e.target))) {
                console.log('Dropping in command list area, folderTarget:', !!folderTarget);
                // Don't move if we're already dropping on a folder or inside folder content
                if (!folderTarget) {
                    console.log('Moving to root level');
                    // Move command to root level (remove from folder)
                    vscode.postMessage({ 
                        command: 'moveCommandToFolder',
                        commandId: draggedId,
                        folderId: undefined // undefined means root level
                    });
                    return;
                }
            }
            
            console.log('No drop action taken');
        }

        function handleDragEnd(e) {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.command-item').forEach(item => {
                item.classList.remove('drag-over');
            });
            document.querySelectorAll('.folder-item').forEach(item => {
                item.classList.remove('folder-drop-zone');
            });
            document.getElementById('commandList')?.classList.remove('root-drop-zone');
        }

        // Set up drag and drop for the main container (to handle dropping outside folders)
        const commandListContainer = document.getElementById('commandList');
        if (commandListContainer) {
            commandListContainer.addEventListener('dragover', handleDragOver);
            commandListContainer.addEventListener('dragenter', handleDragEnter);
            commandListContainer.addEventListener('dragleave', handleDragLeave);
            commandListContainer.addEventListener('drop', handleDrop);
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const { command, commandList, folderList } = event.data;
            if (command === 'update') {
                // Update state
                state = { ...state, commandList, folderList: folderList || [] };
                vscode.setState(state);

                // Update UI
                renderCommandsAndFolders();
            }
        });

        function renderCommandsAndFolders() {
            const container = document.getElementById('commandList');
            container.innerHTML = '';
            
            const folders = state.folderList || [];
            const commands = state.commandList || [];
            
            // Render folders first
            folders.forEach(folder => {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'folder-item';
                folderDiv.setAttribute('data-folder-id', folder.id);
                folderDiv.draggable = false;
                
                const folderCommands = commands.filter(cmd => cmd.folderId === folder.id);
                const isExpanded = folder.expanded;
                
                folderDiv.innerHTML = \`
                    <div class="folder-header" onclick="handleFolderClick(event, '\${folder.id}')">
                        <span class="folder-icon">\${isExpanded ? '📂' : '📁'}</span>
                        <span class="folder-name">\${folder.name}</span>
                        <div class="folder-actions" onclick="event.stopPropagation()">
                            <button onclick="renameFolder('\${folder.id}')" title="Rename">✏️</button>
                            <button onclick="deleteFolder('\${folder.id}')" title="Delete">×</button>
                        </div>
                    </div>
                    <div class="folder-content \${isExpanded ? '' : 'collapsed'}" id="folder-\${folder.id}">
                        \${folderCommands.length === 0 ? 
                            '<div class="folder-empty">Drop commands here to organize them</div>' : 
                            ''}
                    </div>
                \`;
                
                // Add drag and drop listeners to folder
                folderDiv.addEventListener('dragover', handleDragOver);
                folderDiv.addEventListener('dragenter', handleDragEnter);
                folderDiv.addEventListener('dragleave', handleDragLeave);
                folderDiv.addEventListener('drop', handleDrop);
                
                container.appendChild(folderDiv);
                
                // Add commands to this folder
                const folderContent = folderDiv.querySelector('.folder-content');
                if (folderCommands.length > 0) {
                    folderCommands.forEach(cmd => {
                        const cmdElement = createCommandElement(cmd);
                        folderContent.appendChild(cmdElement);
                    });
                }
            });
            
            // Render unorganized commands (not in any folder)
            const unorganizedCommands = commands.filter(cmd => !cmd.folderId);
            if (unorganizedCommands.length > 0) {
                unorganizedCommands.forEach(cmd => {
                    const div = createCommandElement(cmd);
                    container.appendChild(div);
                });
            }
            
            // Show empty message if no content
            if (folders.length === 0 && unorganizedCommands.length === 0) {
                container.innerHTML = '<div class="empty-message">No commands registered. Click "Add Command" to get started.</div>';
                return;
            }
        }
        
        function createCommandElement(cmd) {
            const div = document.createElement('div');
            div.className = 'command-item';
            div.draggable = true;
            div.setAttribute('data-id', cmd.id);
            div.innerHTML = \`
                <div class="command-content">
                    <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                    <span class="command-label">\${cmd.label}</span>
                    <div class="actions">
                        <button class="icon-btn edit" title="Edit command" onclick="editCommand('\${cmd.id}')">⚙</button>
                        <button class="icon-btn run" title="Run command" onclick="runCommand('\${cmd.id}')">▶</button>
                        <button class="icon-btn delete" title="Delete command" onclick="deleteCommand('\${cmd.id}')">×</button>
                    </div>
                </div>
            \`;

            // Add drag and drop event listeners
            div.addEventListener('dragstart', handleDragStart);
            div.addEventListener('dragover', handleDragOver);
            div.addEventListener('dragenter', handleDragEnter);
            div.addEventListener('dragleave', handleDragLeave);
            div.addEventListener('drop', handleDrop);
            div.addEventListener('dragend', handleDragEnd);
            
            return div;
        }

        // Initial render attempt
        if (!state.commandList.length && !state.folderList.length) {
            const container = document.getElementById('commandList');
            container.innerHTML = '';
            if (!state.commandList.length) {
                container.innerHTML = '<div class="empty-message">No commands registered. Click "Add Command" to get started.</div>';
            }
        }

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