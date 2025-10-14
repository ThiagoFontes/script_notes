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
        <button class="icon-btn import-btn" title="Import Commands" onclick="importCommands()">
            <span>↓</span>
            <span>Import</span>
        </button>
        <button class="icon-btn export-btn" title="Export Commands" onclick="exportCommands()">
            <span>↑</span>
            <span>Export</span>
        </button>
    </div>
    <div class="command-list" id="commandList"></div>
    <script>
        const vscode = acquireVsCodeApi();
        let state = { commandList: [], folderList: [] };
        let isProcessingDrop = false;

        function resetDropFlag() {
            setTimeout(() => {
                isProcessingDrop = false;
            }, 10);
        }

        function addCommand() {
            vscode.postMessage({ command: 'addCommand' });
        }
        function editCommand(id) {
            vscode.postMessage({ command: 'editCommand', id });
        }
        function deleteCommand(id) {
            console.log('[DELETE] deleteCommand called with id:', id);
            
            const commandElement = document.querySelector('[data-id="' + id + '"]');
            if (!commandElement) {
                console.log('[DELETE] Command element not found for id:', id);
                return;
            }
            console.log('[DELETE] Found command element:', commandElement);
            
            const deleteButton = commandElement.querySelector('button.delete');
            if (!deleteButton) {
                console.log('[DELETE] Delete button not found in command element');
                return;
            }
            console.log('[DELETE] Found delete button:', deleteButton);
            
            // Check if already in confirmation state
            if (deleteButton.classList.contains('confirming')) {
                console.log('[DELETE] Second click - confirming command deletion');
                
                // Change to green for visual feedback
                deleteButton.style.color = 'var(--vscode-gitDecoration-addedResourceForeground)';
                deleteButton.innerHTML = '✓';
                deleteButton.title = 'Excluindo...';
                
                vscode.postMessage({ command: 'deleteCommand', id });
                
                // Reset button after a brief moment
                setTimeout(() => {
                    deleteButton.innerHTML = deleteButton.dataset.originalText || '✖';
                    deleteButton.title = deleteButton.dataset.originalTitle || 'Excluir comando';
                    deleteButton.style.color = '';
                    deleteButton.classList.remove('confirming');
                    deleteButton.classList.remove('confirming-first-click');
                }, 500);
                
                // Clear any existing timeout
                if (deleteButton.dataset.resetTimeout) {
                    clearTimeout(parseInt(deleteButton.dataset.resetTimeout));
                    delete deleteButton.dataset.resetTimeout;
                }
                return;
            }
            
            console.log('[DELETE] First click - showing confirmation state');
            
            // Store original values
            const originalText = deleteButton.innerHTML;
            const originalTitle = deleteButton.title;
            deleteButton.dataset.originalText = originalText;
            deleteButton.dataset.originalTitle = originalTitle;
            
            // Change button to show confirmation
            deleteButton.innerHTML = '✓';
            deleteButton.title = 'Clique novamente para confirmar exclusão';
            deleteButton.style.color = 'var(--vscode-errorForeground)';
            deleteButton.classList.add('confirming');
            deleteButton.classList.add('confirming-first-click');
            
            // Reset button after 3 seconds if not clicked again
            const resetTimeout = setTimeout(() => {
                console.log('[DELETE] Timeout reached - resetting command button');
                deleteButton.innerHTML = originalText;
                deleteButton.title = originalTitle;
                deleteButton.style.color = '';
                deleteButton.classList.remove('confirming');
                deleteButton.classList.remove('confirming-first-click');
                delete deleteButton.dataset.resetTimeout;
            }, 3000);
            
            // Store timeout ID
            deleteButton.dataset.resetTimeout = resetTimeout.toString();
            
            console.log('[DELETE] Command confirmation state set, waiting for second click');
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
            if (!folderElement) {
                return;
            }
            const currentName = folderElement.textContent;
            
            // Create inline input for renaming
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'folder-rename-input';
            input.style.cssText = \`
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                padding: 2px 4px;
                font-size: inherit;
                font-family: inherit;
                width: 150px;
            \`;
            
            // Replace folder name with input
            folderElement.style.display = 'none';
            folderElement.parentNode.insertBefore(input, folderElement.nextSibling);
            input.focus();
            input.select();
            
            // Handle input completion
            function completeRename() {
                const newName = input.value.trim();
                input.remove();
                folderElement.style.display = '';
                
                if (newName && newName !== currentName) {
                    vscode.postMessage({ command: 'renameFolder', folderId, newName });
                }
            }
            
            // Handle input cancellation
            function cancelRename() {
                input.remove();
                folderElement.style.display = '';
            }
            
            input.addEventListener('blur', completeRename);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    completeRename();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                }
            });
        }
        function deleteFolder(folderId) {
            console.log('[DELETE] deleteFolder called with folderId:', folderId);
            
            const folderElement = document.querySelector('[data-folder-id="' + folderId + '"]');
            if (!folderElement) {
                console.log('[DELETE] Folder element not found for folderId:', folderId);
                return;
            }
            console.log('[DELETE] Found folder element:', folderElement);
            
            const deleteButton = folderElement.querySelector('button.delete');
            if (!deleteButton) {
                console.log('[DELETE] Delete button not found in folder element');
                return;
            }
            console.log('[DELETE] Found delete button:', deleteButton);
            
            // Check if already in confirmation state
            if (deleteButton.classList.contains('confirming')) {
                console.log('[DELETE] Second click - confirming deletion');
                vscode.postMessage({ command: 'deleteFolder', folderId });
                
                // Reset button
                deleteButton.innerHTML = deleteButton.dataset.originalText || '✖';
                deleteButton.title = deleteButton.dataset.originalTitle || 'Excluir pasta';
                deleteButton.style.color = '';
                deleteButton.classList.remove('confirming');
                
                // Clear any existing timeout
                if (deleteButton.dataset.resetTimeout) {
                    clearTimeout(parseInt(deleteButton.dataset.resetTimeout));
                    delete deleteButton.dataset.resetTimeout;
                }
                return;
            }
            
            console.log('[DELETE] First click - showing confirmation state');
            
            // Store original values
            const originalText = deleteButton.innerHTML;
            const originalTitle = deleteButton.title;
            deleteButton.dataset.originalText = originalText;
            deleteButton.dataset.originalTitle = originalTitle;
            
            // Change button to show confirmation
            deleteButton.innerHTML = '✓';
            deleteButton.title = 'Clique novamente para confirmar exclusão';
            deleteButton.style.color = 'var(--vscode-errorForeground)';
            deleteButton.classList.add('confirming');
            deleteButton.classList.add('confirming-first-click');
            
            // Reset button after 3 seconds if not clicked again
            const resetTimeout = setTimeout(() => {
                console.log('[DELETE] Timeout reached - resetting button');
                deleteButton.innerHTML = originalText;
                deleteButton.title = originalTitle;
                deleteButton.style.color = '';
                deleteButton.classList.remove('confirming');
                deleteButton.classList.remove('confirming-first-click');
                delete deleteButton.dataset.resetTimeout;
            }, 3000);
            
            // Store timeout ID
            deleteButton.dataset.resetTimeout = resetTimeout.toString();
            
            console.log('[DELETE] Confirmation state set, waiting for second click');
        }

        function runFolder(folderId) {
            // Get all commands in this folder
            const folderCommands = state.commandList.filter(cmd => cmd.folderId === folderId);
            
            if (folderCommands.length === 0) {
                return;
            }

            // Sort commands by their order in the folder (if they have an order property)
            folderCommands.sort((a, b) => (a.order || 0) - (b.order || 0));

            // Run commands sequentially
            vscode.postMessage({ 
                command: 'runFolder', 
                folderId: folderId,
                commandIds: folderCommands.map(cmd => cmd.id)
            });
        }

        // Drag and drop handlers
        let draggedItem = null;
        let dropIndicator = null;

        // Create drop indicator element
        function createDropIndicator() {
            if (!dropIndicator) {
                dropIndicator = document.createElement('div');
                dropIndicator.className = 'drop-indicator';
            }
            return dropIndicator;
        }

        // Show drop indicator at specific position
        function showDropIndicator(targetElement, position) {
            const indicator = createDropIndicator();
            indicator.classList.add('active');
            
            if (position === 'before') {
                targetElement.parentNode.insertBefore(indicator, targetElement);
            } else if (position === 'after') {
                if (targetElement.nextSibling) {
                    targetElement.parentNode.insertBefore(indicator, targetElement.nextSibling);
                } else {
                    targetElement.parentNode.appendChild(indicator);
                }
            } else if (position === 'first') {
                const container = document.getElementById('commandList');
                container.insertBefore(indicator, container.firstChild);
            } else if (position === 'last') {
                const container = document.getElementById('commandList');
                container.appendChild(indicator);
            }
        }

        // Hide drop indicator
        function hideDropIndicator() {
            if (dropIndicator && dropIndicator.parentNode) {
                dropIndicator.classList.remove('active');
                dropIndicator.parentNode.removeChild(dropIndicator);
            }
        }

        function handleFolderDragStart(e) {
            draggedItem = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'folder:' + e.target.getAttribute('data-folder-id'));
        }

        function handleDragStart(e) {
            draggedItem = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            hideDropIndicator(); // Clear previous indicator
            
            // Check if dragging a folder (draggedItem is now the folder header)
            const draggedFolderId = draggedItem?.getAttribute('data-folder-id');
            if (draggedFolderId && draggedItem.classList.contains('folder-header')) {
                const folderTarget = e.target.closest('.folder-item');
                const containerTarget = e.target.closest('#commandList');
                
                if (folderTarget && folderTarget.getAttribute('data-folder-id') !== draggedFolderId) {
                    // Determine position based on mouse location
                    const rect = folderTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                        showDropIndicator(folderTarget, 'before');
                    } else {
                        showDropIndicator(folderTarget, 'after');
                    }
                } else if (containerTarget) {
                    // Check if dropping outside folders
                    const allFolders = containerTarget.querySelectorAll('.folder-item');
                    let topFolder = null;
                    let bottomFolder = null;
                    
                    allFolders.forEach(folder => {
                        if (folder.getAttribute('data-folder-id') !== draggedFolderId) {
                            if (!topFolder || folder.getBoundingClientRect().top < topFolder.getBoundingClientRect().top) {
                                topFolder = folder;
                            }
                            if (!bottomFolder || folder.getBoundingClientRect().bottom > bottomFolder.getBoundingClientRect().bottom) {
                                bottomFolder = folder;
                            }
                        }
                    });
                    
                    if (topFolder && bottomFolder) {
                        const topRect = topFolder.getBoundingClientRect();
                        const bottomRect = bottomFolder.getBoundingClientRect();
                        
                        if (e.clientY < topRect.top) {
                            showDropIndicator(null, 'first');
                        } else if (e.clientY > bottomRect.bottom) {
                            showDropIndicator(null, 'last');
                        }
                    }
                }
            }
            // Check if dragging a command
            else if (draggedItem && draggedItem.classList.contains('command-item')) {
                const draggedCommandId = draggedItem.getAttribute('data-id');
                const commandTarget = e.target.closest('.command-item');
                
                if (commandTarget && commandTarget.getAttribute('data-id') !== draggedCommandId) {
                    // Check if both commands are in the same parent (same folder or both in root)
                    const draggedCommand = state.commandList.find(cmd => cmd.id === draggedCommandId);
                    const targetCommandId = commandTarget.getAttribute('data-id');
                    const targetCommand = state.commandList.find(cmd => cmd.id === targetCommandId);
                    
                    if (draggedCommand && targetCommand && draggedCommand.folderId === targetCommand.folderId) {
                        // Determine position based on mouse location
                        const rect = commandTarget.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        
                        if (e.clientY < midY) {
                            showDropIndicator(commandTarget, 'before');
                        } else {
                            showDropIndicator(commandTarget, 'after');
                        }
                    }
                }
            }
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
                hideDropIndicator(); // Hide drop indicator when leaving container
            }
        }

        function handleDrop(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling to avoid duplicate handling
            
            // Prevent rapid successive drops
            if (isProcessingDrop) {
                console.log('Drop already being processed, ignoring');
                return;
            }
            isProcessingDrop = true;
            
            hideDropIndicator(); // Hide indicator when drop occurs
            const draggedData = e.dataTransfer.getData('text/plain');
            
            console.log('Drop event:', {
                target: e.target,
                draggedData: draggedData,
                targetClasses: e.target.className,
                targetId: e.target.id
            });

            // Check if we're dragging a folder
            const isDraggingFolder = draggedData.startsWith('folder:');
            const draggedId = isDraggingFolder ? draggedData.replace('folder:', '') : draggedData;
            
            // Handle folder reordering
            if (isDraggingFolder) {
                const dropTarget = e.target.closest('.folder-item');
                const containerTarget = e.target.closest('#commandList');
                
                if (dropTarget && dropTarget.getAttribute('data-folder-id') !== draggedId) {
                    console.log('Reordering folders');
                    const dropFolderId = dropTarget.getAttribute('data-folder-id');
                    
                    // Find folder indices
                    const draggedIndex = state.folderList.findIndex(folder => folder.id === draggedId);
                    const dropIndex = state.folderList.findIndex(folder => folder.id === dropFolderId);
                    
                    if (draggedIndex !== -1 && dropIndex !== -1) {
                        // Determine if we should insert before or after the drop target
                        const rect = dropTarget.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        const shouldInsertAfter = e.clientY > midY;
                        
                        // Calculate target insert position BEFORE any array modifications
                        let targetInsertIndex;
                        if (shouldInsertAfter) {
                            targetInsertIndex = dropIndex + 1;
                        } else {
                            targetInsertIndex = dropIndex;
                        }
                        
                        // Adjust for the removal of the dragged item
                        if (draggedIndex < targetInsertIndex) {
                            targetInsertIndex -= 1;
                        }
                        
                        console.log('Folder reorder calculation:', {
                            draggedIndex,
                            dropIndex,
                            shouldInsertAfter,
                            targetInsertIndex: targetInsertIndex,
                            draggedFolder: state.folderList[draggedIndex]?.name,
                            targetFolder: state.folderList[dropIndex]?.name
                        });
                        
                        // Remove the dragged folder
                        const [removed] = state.folderList.splice(draggedIndex, 1);
                        
                        // Insert at the calculated position
                        state.folderList.splice(targetInsertIndex, 0, removed);
                        
                        // Send message to update folder order
                        vscode.postMessage({ 
                            command: 'reorderFolders', 
                            folderList: state.folderList 
                        });
                        
                        // Re-render
                        renderCommandsAndFolders();
                        resetDropFlag();
                        return;
                    }
                } else if (containerTarget) {
                    // Dropping outside folders but within container - determine top or bottom
                    console.log('Dropping folder outside folders');
                    const draggedIndex = state.folderList.findIndex(folder => folder.id === draggedId);
                    
                    if (draggedIndex !== -1) {
                        const containerRect = containerTarget.getBoundingClientRect();
                        const allFolders = containerTarget.querySelectorAll('.folder-item');
                        
                        // Remove the dragged folder from calculations
                        const [removed] = state.folderList.splice(draggedIndex, 1);
                        
                        if (allFolders.length > 1) {
                            // Find the topmost and bottommost folders (excluding the dragged one)
                            let topFolder = null;
                            let bottomFolder = null;
                            
                            allFolders.forEach(folder => {
                                if (folder.getAttribute('data-folder-id') !== draggedId) {
                                    if (!topFolder || folder.getBoundingClientRect().top < topFolder.getBoundingClientRect().top) {
                                        topFolder = folder;
                                    }
                                    if (!bottomFolder || folder.getBoundingClientRect().bottom > bottomFolder.getBoundingClientRect().bottom) {
                                        bottomFolder = folder;
                                    }
                                }
                            });
                            
                            if (topFolder && bottomFolder) {
                                const topFolderRect = topFolder.getBoundingClientRect();
                                const bottomFolderRect = bottomFolder.getBoundingClientRect();
                                
                                if (e.clientY < topFolderRect.top) {
                                    // Dropped above all folders - insert at beginning
                                    console.log('Inserting at beginning');
                                    state.folderList.unshift(removed);
                                } else if (e.clientY > bottomFolderRect.bottom) {
                                    // Dropped below all folders - insert at end
                                    console.log('Inserting at end');
                                    state.folderList.push(removed);
                                } else {
                                    // Dropped somewhere in between - add to end as fallback
                                    state.folderList.push(removed);
                                }
                            } else {
                                // Fallback - add to end
                                state.folderList.push(removed);
                            }
                        } else {
                            // Only one folder (the dragged one) - just put it back
                            state.folderList.push(removed);
                        }
                        
                        // Send message to update folder order
                        vscode.postMessage({ 
                            command: 'reorderFolders', 
                            folderList: state.folderList 
                        });
                        
                        // Re-render
                        renderCommandsAndFolders();
                        resetDropFlag();
                        return;
                    }
                }
                resetDropFlag();
                return; // Don't continue with command logic if dragging folder
            }
            
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
                    // Determine if we should insert before or after the drop target
                    const rect = dropTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const shouldInsertAfter = e.clientY > midY;
                    
                    // Calculate target insert position BEFORE any array modifications
                    let targetInsertIndex;
                    if (shouldInsertAfter) {
                        targetInsertIndex = dropIndex + 1;
                    } else {
                        targetInsertIndex = dropIndex;
                    }
                    
                    // Adjust for the removal of the dragged item
                    if (draggedIndex < targetInsertIndex) {
                        targetInsertIndex -= 1;
                    }
                    
                    console.log('Command reorder calculation:', {
                        draggedIndex,
                        dropIndex,
                        shouldInsertAfter,
                        targetInsertIndex: targetInsertIndex,
                        draggedCommand: draggedCmd.label,
                        targetCommand: dropCmd.label
                    });
                    
                    // Reorder array
                    const [removed] = state.commandList.splice(draggedIndex, 1);
                    state.commandList.splice(targetInsertIndex, 0, removed);

                    // Update the view and notify extension
                    vscode.postMessage({ 
                        command: 'reorderCommands',
                        commandList: state.commandList
                    });
                    resetDropFlag();
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
                resetDropFlag();
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
                    resetDropFlag();
                    return;
                }
            }
            
            console.log('No drop action taken');
            resetDropFlag();
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
            hideDropIndicator(); // Hide drop indicator when drag ends
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
            
            const folders = (state.folderList || []).sort((a, b) => (a.order || 0) - (b.order || 0));
            const commands = state.commandList || [];
            
            // Render folders first
            folders.forEach(folder => {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'folder-item';
                folderDiv.setAttribute('data-folder-id', folder.id);
                folderDiv.draggable = true;
                
                const folderCommands = commands.filter(cmd => cmd.folderId === folder.id);
                const isExpanded = folder.expanded;
                
                // Create folder header
                const folderHeader = document.createElement('div');
                folderHeader.className = 'folder-header';
                folderHeader.draggable = true;
                folderHeader.setAttribute('data-folder-id', folder.id);
                folderHeader.onclick = function(event) { handleFolderClick(event, folder.id); };
                
                // Create folder icon
                const folderIcon = document.createElement('span');
                folderIcon.className = 'folder-icon';
                folderIcon.textContent = isExpanded ? '📂' : '📁';
                
                // Create folder name
                const folderName = document.createElement('span');
                folderName.className = 'folder-name';
                folderName.textContent = folder.name;
                
                // Create folder actions
                const folderActions = document.createElement('div');
                folderActions.className = 'folder-actions';
                folderActions.onclick = function(e) { e.stopPropagation(); };
                
                // Create action buttons
                const runBtn = document.createElement('button');
                runBtn.className = 'icon-btn run';
                runBtn.title = 'Run all commands in folder';
                runBtn.textContent = '▶︎';
                runBtn.onclick = function(e) { e.stopPropagation(); runFolder(folder.id); };
                
                const editBtn = document.createElement('button');
                editBtn.className = 'icon-btn edit';
                editBtn.title = 'Rename';
                editBtn.textContent = '✎';
                editBtn.onclick = function(e) { e.stopPropagation(); renameFolder(folder.id); };
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.title = 'Delete';
                deleteBtn.textContent = '✖';
                deleteBtn.onclick = function(e) { e.stopPropagation(); deleteFolder(folder.id); };
                
                // Assemble actions
                folderActions.appendChild(runBtn);
                folderActions.appendChild(editBtn);
                folderActions.appendChild(deleteBtn);
                
                // Assemble header
                folderHeader.appendChild(folderIcon);
                folderHeader.appendChild(folderName);
                folderHeader.appendChild(folderActions);
                
                // Create folder content
                const folderContentDiv = document.createElement('div');
                folderContentDiv.className = 'folder-content ' + (isExpanded ? '' : 'collapsed');
                folderContentDiv.id = 'folder-' + folder.id;
                
                if (folderCommands.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'folder-empty';
                    emptyDiv.textContent = 'Drop commands here to organize them';
                    folderContentDiv.appendChild(emptyDiv);
                }
                
                // Assemble folder
                folderDiv.appendChild(folderHeader);
                folderDiv.appendChild(folderContentDiv);
                
                // Add drag and drop listeners to folder
                folderHeader.addEventListener('dragstart', handleFolderDragStart);
                folderDiv.addEventListener('dragover', handleDragOver);
                folderDiv.addEventListener('dragenter', handleDragEnter);
                folderDiv.addEventListener('dragleave', handleDragLeave);
                folderDiv.addEventListener('drop', handleDrop);
                
                container.appendChild(folderDiv);
                
                // Add commands to this folder
                if (folderCommands.length > 0) {
                    folderCommands.forEach(cmd => {
                        const cmdElement = createCommandElement(cmd);
                        folderContentDiv.appendChild(cmdElement);
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
            
            // Create command content container
            const content = document.createElement('div');
            content.className = 'command-content';
            
            // Create drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.title = 'Drag to reorder';
            dragHandle.textContent = '⋮⋮';
            
            // Create command label
            const label = document.createElement('span');
            label.className = 'command-label';
            label.textContent = cmd.label;
            
            // Create actions container
            const actions = document.createElement('div');
            actions.className = 'actions';
            
            // Create action buttons
            const editBtn = document.createElement('button');
            editBtn.className = 'icon-btn edit';
            editBtn.title = 'Edit command';
            editBtn.textContent = '✎';
            editBtn.onclick = function() { editCommand(cmd.id); };
            
            const runBtn = document.createElement('button');
            runBtn.className = 'icon-btn run';
            runBtn.title = 'Run command';
            runBtn.textContent = '▶︎';
            runBtn.onclick = function() { runCommand(cmd.id); };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn delete';
            deleteBtn.title = 'Delete command';
            deleteBtn.textContent = '✖';
            deleteBtn.addEventListener('click', function() { 
                console.log('[DELETE] Command button clicked, calling deleteCommand with id:', cmd.id);
                deleteCommand(cmd.id); 
            });
            
            // Assemble actions
            actions.appendChild(runBtn);
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            
            // Assemble content
            content.appendChild(dragHandle);
            content.appendChild(label);
            content.appendChild(actions);
            
            // Assemble div
            div.appendChild(content);

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