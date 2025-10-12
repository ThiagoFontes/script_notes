import * as assert from 'assert';
import { CommandItem } from '../extension';

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
});
