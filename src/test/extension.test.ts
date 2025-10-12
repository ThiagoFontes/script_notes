import * as assert from 'assert';
import { CommandItem, Folder } from '../models/CommandItem';

suite('Extension Test Suite', () => {
	test('CommandItem interface has correct structure', () => {
		const command: CommandItem = {
			id: '1',
			label: 'Test Command',
			shell: 'echo "hello"',
			flags: ['-v'],
			argumentPrompts: ['Enter name'],
			alwaysPrompt: true
		};

		// Verify all required properties exist
		assert.strictEqual(typeof command.id, 'string');
		assert.strictEqual(typeof command.label, 'string');
		assert.strictEqual(typeof command.shell, 'string');
		assert.ok(Array.isArray(command.flags));
		assert.ok(Array.isArray(command.argumentPrompts));
		assert.strictEqual(typeof command.alwaysPrompt, 'boolean');
	});

	test('CommandItem can have empty arrays and false boolean', () => {
		const command: CommandItem = {
			id: '2',
			label: 'Simple Command',
			shell: 'ls',
			flags: [],
			argumentPrompts: [],
			alwaysPrompt: false
		};

		assert.deepStrictEqual(command.flags, []);
		assert.deepStrictEqual(command.argumentPrompts, []);
		assert.strictEqual(command.alwaysPrompt, false);
	});

	test('CommandItem can have optional folderId', () => {
		const commandWithFolder: CommandItem = {
			id: '3',
			label: 'Folder Command',
			shell: 'npm run build',
			flags: [],
			argumentPrompts: [],
			alwaysPrompt: false,
			folderId: 'folder-1'
		};

		assert.strictEqual(commandWithFolder.folderId, 'folder-1');

		const commandWithoutFolder: CommandItem = {
			id: '4',
			label: 'Root Command',
			shell: 'npm test',
			flags: [],
			argumentPrompts: [],
			alwaysPrompt: false
		};

		assert.strictEqual(commandWithoutFolder.folderId, undefined);
	});

	test('Folder interface has correct structure', () => {
		const folder: Folder = {
			id: 'folder-1',
			name: 'Build Scripts',
			expanded: true,
			order: 0
		};

		assert.strictEqual(typeof folder.id, 'string');
		assert.strictEqual(typeof folder.name, 'string');
		assert.strictEqual(typeof folder.expanded, 'boolean');
		assert.strictEqual(typeof folder.order, 'number');
	});

	test('Folder can be collapsed', () => {
		const folder: Folder = {
			id: 'folder-2',
			name: 'Test Scripts',
			expanded: false,
			order: 1
		};

		assert.strictEqual(folder.expanded, false);
		assert.strictEqual(folder.order, 1);
	});
});
