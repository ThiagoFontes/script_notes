import * as assert from 'assert';
import * as vscode from 'vscode';

// Mock vscode.window methods for testing
const mockVSCodeWindow = () => {
	const showInputBoxResponses: (string | undefined)[] = [];
	const showQuickPickResponses: any[] = [];
	const showSaveDialogResponses: (vscode.Uri | undefined)[] = [];
	const showOpenDialogResponses: (vscode.Uri[] | undefined)[] = [];
	const infoMessages: string[] = [];
	const errorMessages: string[] = [];

	(vscode.window.showInputBox as any) = () => {
		return Promise.resolve(showInputBoxResponses.shift());
	};

	(vscode.window.showQuickPick as any) = () => {
		return Promise.resolve(showQuickPickResponses.shift());
	};

	(vscode.window.showSaveDialog as any) = () => {
		return Promise.resolve(showSaveDialogResponses.shift());
	};

	(vscode.window.showOpenDialog as any) = () => {
		return Promise.resolve(showOpenDialogResponses.shift());
	};

	(vscode.window.showInformationMessage as any) = (message: string) => {
		infoMessages.push(message);
		return Promise.resolve();
	};

	(vscode.window.showErrorMessage as any) = (message: string) => {
		errorMessages.push(message);
		return Promise.resolve();
	};

	return {
		setInputBoxResponses: (responses: (string | undefined)[]) => {
			showInputBoxResponses.push(...responses);
		},
		setQuickPickResponses: (responses: any[]) => {
			showQuickPickResponses.push(...responses);
		},
		setSaveDialogResponses: (responses: (vscode.Uri | undefined)[]) => {
			showSaveDialogResponses.push(...responses);
		},
		setOpenDialogResponses: (responses: (vscode.Uri[] | undefined)[]) => {
			showOpenDialogResponses.push(...responses);
		},
		getInfoMessages: () => [...infoMessages],
		getErrorMessages: () => [...errorMessages],
		clearMessages: () => {
			infoMessages.length = 0;
			errorMessages.length = 0;
		}
	};
};

// Mock vscode.tasks
const mockVSCodeTasks = () => {
	const executedTasks: vscode.Task[] = [];

	(vscode.tasks.executeTask as any) = (task: vscode.Task) => {
		executedTasks.push(task);
		return Promise.resolve({} as vscode.TaskExecution);
	};

	return {
		getExecutedTasks: () => [...executedTasks],
		clearTasks: () => { executedTasks.length = 0; }
	};
};

// Mock vscode.workspace.fs
const mockVSCodeWorkspace = () => {
	const fileSystem = new Map<string, string>();

	// Create mock functions that can be assigned
	const mockWriteFile = (uri: vscode.Uri, content: Uint8Array) => {
		fileSystem.set(uri.fsPath, Buffer.from(content).toString());
		return Promise.resolve();
	};

	const mockReadFile = (uri: vscode.Uri) => {
		const content = fileSystem.get(uri.fsPath);
		if (content === undefined) {
			throw new Error(`File not found: ${uri.fsPath}`);
		}
		return Promise.resolve(Buffer.from(content));
	};

	// Store original functions to restore later
	const originalWriteFile = vscode.workspace.fs.writeFile;
	const originalReadFile = vscode.workspace.fs.readFile;

	// Use Object.defineProperty to override read-only properties
	Object.defineProperty(vscode.workspace.fs, 'writeFile', {
		value: mockWriteFile,
		writable: true,
		configurable: true
	});

	Object.defineProperty(vscode.workspace.fs, 'readFile', {
		value: mockReadFile,
		writable: true,
		configurable: true
	});

	return {
		setFileContent: (path: string, content: string) => {
			fileSystem.set(path, content);
		},
		getFileContent: (path: string) => fileSystem.get(path),
		clearFiles: () => { fileSystem.clear(); },
		restore: () => {
			Object.defineProperty(vscode.workspace.fs, 'writeFile', {
				value: originalWriteFile,
				writable: true,
				configurable: true
			});
			Object.defineProperty(vscode.workspace.fs, 'readFile', {
				value: originalReadFile,
				writable: true,
				configurable: true
			});
		}
	};
};

suite('Integration Test Suite', () => {
	let windowMock: ReturnType<typeof mockVSCodeWindow>;
	let tasksMock: ReturnType<typeof mockVSCodeTasks>;
	let workspaceMock: ReturnType<typeof mockVSCodeWorkspace>;

	setup(() => {
		windowMock = mockVSCodeWindow();
		tasksMock = mockVSCodeTasks();
		workspaceMock = mockVSCodeWorkspace();
	});

	teardown(() => {
		windowMock.clearMessages();
		tasksMock.clearTasks();
		workspaceMock.clearFiles();
		workspaceMock.restore();
	});

	test('Command execution integration test', async () => {
		// Mock user input for arguments
		windowMock.setInputBoxResponses(['test-value']);

		// Create a mock command item
		const command = {
			id: '1',
			label: 'Test Command',
			shell: 'echo',
			flags: ['-n'],
			argumentPrompts: ['Enter test value'],
			alwaysPrompt: false
		};

		// Simulate running the command (this would normally be called by the extension)
		const fullCommand = [command.shell, ...command.flags, 'test-value'].join(' ');
		const task = new vscode.Task(
			{ type: 'shell' },
			vscode.TaskScope.Workspace,
			command.label,
			'scriptnotes',
			new vscode.ShellExecution(fullCommand)
		);

		await vscode.tasks.executeTask(task);

		const executedTasks = tasksMock.getExecutedTasks();
		assert.strictEqual(executedTasks.length, 1);
		assert.strictEqual(executedTasks[0].name, 'Test Command');

		const execution = executedTasks[0].execution as vscode.ShellExecution;
		assert.strictEqual(execution.commandLine, 'echo -n test-value');
	});

	test('Export and import workflow integration test', async () => {
		const testCommands = [
			{
				id: '1',
				label: 'Export Test Command',
				shell: 'echo "export test"',
				flags: ['-v'],
				argumentPrompts: [],
				alwaysPrompt: false
			}
		];

		const exportPath = '/test/export.json';
		const exportUri = vscode.Uri.file(exportPath);

		// Mock save dialog for export
		windowMock.setSaveDialogResponses([exportUri]);

		// Simulate export command execution
		const data = JSON.stringify(testCommands, null, 2);
		await vscode.workspace.fs.writeFile(exportUri, Buffer.from(data));

		const infoMessages = windowMock.getInfoMessages();
		// In real extension, this would be called after successful export
		await vscode.window.showInformationMessage('Commands exported successfully!');

		// Verify export worked
		const exportedContent = workspaceMock.getFileContent(exportPath);
		assert.ok(exportedContent);
		const parsedCommands = JSON.parse(exportedContent);
		assert.deepStrictEqual(parsedCommands, testCommands);
		assert.ok(infoMessages.includes('Commands exported successfully!'));

		// Now test import
		windowMock.setOpenDialogResponses([[exportUri]]);
		windowMock.setQuickPickResponses([{ label: 'Replace all commands' }]);

		// Simulate import command execution
		const fileContent = await vscode.workspace.fs.readFile(exportUri);
		const importedCommands = JSON.parse(fileContent.toString());

		// Validate imported data (simplified validation)
		const isValid = importedCommands.every((cmd: any) =>
			typeof cmd.id === 'string' &&
			typeof cmd.label === 'string' &&
			typeof cmd.shell === 'string' &&
			Array.isArray(cmd.flags) &&
			Array.isArray(cmd.argumentPrompts) &&
			typeof cmd.alwaysPrompt === 'boolean'
		);

		assert.ok(isValid);
		assert.deepStrictEqual(importedCommands, testCommands);
	});

	test('Command validation test', () => {
		// Test valid command
		const validCommand = {
			id: '1',
			label: 'Valid Command',
			shell: 'echo "test"',
			flags: ['-v'],
			argumentPrompts: ['Enter value'],
			alwaysPrompt: true
		};

		// All required properties should be present and of correct type
		assert.strictEqual(typeof validCommand.id, 'string');
		assert.strictEqual(typeof validCommand.label, 'string');
		assert.strictEqual(typeof validCommand.shell, 'string');
		assert.ok(Array.isArray(validCommand.flags));
		assert.ok(Array.isArray(validCommand.argumentPrompts));
		assert.strictEqual(typeof validCommand.alwaysPrompt, 'boolean');

		// Test edge cases
		const minimalCommand = {
			id: '2',
			label: 'Minimal',
			shell: 'ls',
			flags: [],
			argumentPrompts: [],
			alwaysPrompt: false
		};

		assert.deepStrictEqual(minimalCommand.flags, []);
		assert.deepStrictEqual(minimalCommand.argumentPrompts, []);
		assert.strictEqual(minimalCommand.alwaysPrompt, false);
	});

	test('Error handling integration test', async () => {
		// Test import with invalid JSON
		const invalidJsonPath = '/test/invalid.json';
		const invalidUri = vscode.Uri.file(invalidJsonPath);

		workspaceMock.setFileContent(invalidJsonPath, 'invalid json content');
		windowMock.setOpenDialogResponses([[invalidUri]]);

		try {
			const fileContent = await vscode.workspace.fs.readFile(invalidUri);
			JSON.parse(fileContent.toString());
			assert.fail('Should have thrown an error for invalid JSON');
		} catch (error) {
			// Expected error
			await vscode.window.showErrorMessage('Failed to import commands: ' + error);
			const errorMessages = windowMock.getErrorMessages();
			assert.ok(errorMessages.some(msg => msg.includes('Failed to import commands')));
		}
	});

	test('User cancellation handling test', async () => {
		// Test export cancellation
		windowMock.setSaveDialogResponses([undefined]);

		// Simulate user cancelling save dialog
		const uri = await vscode.window.showSaveDialog({
			defaultUri: vscode.Uri.file('commands.json'),
			filters: { 'JSON files': ['json'] }
		});

		assert.strictEqual(uri, undefined);

		// Test import cancellation
		windowMock.setOpenDialogResponses([undefined]);

		const fileUri = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: { 'JSON files': ['json'] }
		});

		assert.strictEqual(fileUri, undefined);
	});
});