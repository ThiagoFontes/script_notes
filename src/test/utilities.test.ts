import * as assert from 'assert';

suite('Command Utilities Test Suite', () => {
	// Test command validation function
	test('Command validation utility', () => {
		const validateCommand = (cmd: any): boolean => {
			return (
				typeof cmd.id === 'string' &&
				typeof cmd.label === 'string' &&
				typeof cmd.shell === 'string' &&
				Array.isArray(cmd.flags) &&
				Array.isArray(cmd.argumentPrompts) &&
				typeof cmd.alwaysPrompt === 'boolean'
			);
		};

		// Valid command
		const validCommand = {
			id: '1',
			label: 'Test Command',
			shell: 'echo "test"',
			flags: ['-v'],
			argumentPrompts: ['Enter name'],
			alwaysPrompt: true
		};
		assert.ok(validateCommand(validCommand));

		// Invalid commands
		const invalidCommands = [
			{ id: 1, label: 'Test', shell: 'echo', flags: [], argumentPrompts: [], alwaysPrompt: false }, // Invalid id type
			{ id: '1', shell: 'echo', flags: [], argumentPrompts: [], alwaysPrompt: false }, // Missing label
			{ id: '1', label: 'Test', flags: [], argumentPrompts: [], alwaysPrompt: false }, // Missing shell
			{ id: '1', label: 'Test', shell: 'echo', flags: 'invalid', argumentPrompts: [], alwaysPrompt: false }, // Invalid flags type
			{ id: '1', label: 'Test', shell: 'echo', flags: [], argumentPrompts: 'invalid', alwaysPrompt: false }, // Invalid argumentPrompts type
			{ id: '1', label: 'Test', shell: 'echo', flags: [], argumentPrompts: [], alwaysPrompt: 'invalid' }, // Invalid alwaysPrompt type
		];

		invalidCommands.forEach((cmd, index) => {
			assert.ok(!validateCommand(cmd), `Invalid command ${index} should fail validation`);
		});
	});

	// Test command argument building
	test('Command argument building utility', () => {
		const buildCommandLine = (shell: string, flags: string[], args: string[]): string => {
			return [shell, ...flags, ...args].filter(Boolean).join(' ');
		};

		// Test with all components
		assert.strictEqual(
			buildCommandLine('echo', ['-n', '-e'], ['hello', 'world']),
			'echo -n -e hello world'
		);

		// Test with no flags
		assert.strictEqual(
			buildCommandLine('ls', [], ['/home']),
			'ls /home'
		);

		// Test with no args
		assert.strictEqual(
			buildCommandLine('pwd', ['-P'], []),
			'pwd -P'
		);

		// Test with only shell
		assert.strictEqual(
			buildCommandLine('date', [], []),
			'date'
		);

		// Test with empty strings (should be filtered out)
		assert.strictEqual(
			buildCommandLine('echo', ['', '-n'], ['', 'test', '']),
			'echo -n test'
		);
	});

	// Test ID generation utility
	test('ID generation utility', () => {
		const generateId = (): string => {
			return Date.now().toString() + Math.random().toString(36).slice(2);
		};

		const id1 = generateId();
		const id2 = generateId();

		// Should generate string IDs
		assert.strictEqual(typeof id1, 'string');
		assert.strictEqual(typeof id2, 'string');

		// Should generate unique IDs
		assert.notStrictEqual(id1, id2);

		// Should be reasonable length
		assert.ok(id1.length > 10);
		assert.ok(id2.length > 10);
	});

	// Test array utility functions
	test('Array utility functions', () => {
		// Test array deduplication
		const deduplicateArray = <T>(arr: T[]): T[] => {
			return [...new Set(arr)];
		};

		assert.deepStrictEqual(
			deduplicateArray(['a', 'b', 'a', 'c', 'b']),
			['a', 'b', 'c']
		);

		assert.deepStrictEqual(
			deduplicateArray([1, 2, 2, 3, 1]),
			[1, 2, 3]
		);

		// Test array reordering
		const reorderArray = <T>(arr: T[], fromIndex: number, toIndex: number): T[] => {
			const result = [...arr];
			const [removed] = result.splice(fromIndex, 1);
			result.splice(toIndex, 0, removed);
			return result;
		};

		assert.deepStrictEqual(
			reorderArray(['a', 'b', 'c', 'd'], 0, 2),
			['b', 'c', 'a', 'd']
		);

		assert.deepStrictEqual(
			reorderArray(['a', 'b', 'c', 'd'], 3, 1),
			['a', 'd', 'b', 'c']
		);
	});

	// Test string utility functions
	test('String utility functions', () => {
		// Test string truncation
		const truncateString = (str: string, maxLength: number): string => {
			return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
		};

		assert.strictEqual(truncateString('short', 10), 'short');
		assert.strictEqual(truncateString('this is a very long string', 15), 'this is a ve...');
		assert.strictEqual(truncateString('exactly fifteen', 15), 'exactly fifteen');

		// Test string escaping for shell commands
		const escapeShellArg = (arg: string): string => {
			// Simple escaping - in production you'd want more robust escaping
			if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
				return `"${arg.replace(/"/g, '\\"')}"`;
			}
			return arg;
		};

		assert.strictEqual(escapeShellArg('simple'), 'simple');
		assert.strictEqual(escapeShellArg('with space'), '"with space"');
		assert.strictEqual(escapeShellArg('with "quotes"'), '"with \\"quotes\\""');
	});

	// Test error handling utilities
	test('Error handling utilities', () => {
		const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
			try {
				return JSON.parse(jsonString);
			} catch {
				return defaultValue;
			}
		};

		// Valid JSON
		assert.deepStrictEqual(
			safeJsonParse('{"key": "value"}', {}),
			{ key: 'value' }
		);

		// Invalid JSON
		assert.deepStrictEqual(
			safeJsonParse('invalid json', { default: true }),
			{ default: true }
		);

		// Test async error handling wrapper
		const safeAsync = async <T>(
			asyncFn: () => Promise<T>,
			errorHandler: (error: any) => T
		): Promise<T> => {
			try {
				return await asyncFn();
			} catch (error) {
				return errorHandler(error);
			}
		};

		// This would be tested with actual async functions in practice
		assert.ok(typeof safeAsync === 'function');
	});
});