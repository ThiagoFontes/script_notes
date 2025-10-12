import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandItem } from '../extension';

suite('Simple Extension Tests', () => {
    test('CommandItem interface validation works', () => {
        // Test valid command
        const validCommand: CommandItem = {
            id: '1',
            label: 'Test Command',
            shell: 'echo "hello"',
            flags: ['-n'],
            argumentPrompts: ['Enter name'],
            alwaysPrompt: true
        };

        // Verify structure
        assert.strictEqual(typeof validCommand.id, 'string');
        assert.strictEqual(typeof validCommand.label, 'string');
        assert.strictEqual(typeof validCommand.shell, 'string');
        assert.ok(Array.isArray(validCommand.flags));
        assert.ok(Array.isArray(validCommand.argumentPrompts));
        assert.strictEqual(typeof validCommand.alwaysPrompt, 'boolean');
    });

    test('Command line building logic', () => {
        const buildCommand = (shell: string, flags: string[], args: string[]): string => {
            return [shell, ...flags, ...args].join(' ');
        };

        assert.strictEqual(buildCommand('echo', ['-n'], ['hello']), 'echo -n hello');
        assert.strictEqual(buildCommand('ls', [], ['/home']), 'ls /home');
        assert.strictEqual(buildCommand('pwd', ['-P'], []), 'pwd -P');
    });

    test('Command validation logic', () => {
        const isValidCommand = (cmd: any): cmd is CommandItem => {
            return (
                cmd &&
                typeof cmd.id === 'string' &&
                typeof cmd.label === 'string' &&
                typeof cmd.shell === 'string' &&
                Array.isArray(cmd.flags) &&
                Array.isArray(cmd.argumentPrompts) &&
                typeof cmd.alwaysPrompt === 'boolean'
            );
        };

        // Valid command
        const valid: CommandItem = {
            id: '1',
            label: 'Test',
            shell: 'echo',
            flags: [],
            argumentPrompts: [],
            alwaysPrompt: false
        };
        assert.ok(isValidCommand(valid));

        // Invalid commands
        assert.ok(!isValidCommand(null));
        assert.ok(!isValidCommand(undefined));
        assert.ok(!isValidCommand({}));
        assert.ok(!isValidCommand({ id: 1 })); // Wrong type
        assert.ok(!isValidCommand({ id: '1', label: 'test' })); // Missing fields
    });

    test('JSON export/import simulation', () => {
        const commands: CommandItem[] = [
            {
                id: '1',
                label: 'Test Command',
                shell: 'echo "test"',
                flags: ['-v'],
                argumentPrompts: [],
                alwaysPrompt: false
            }
        ];

        // Test export (JSON.stringify)
        const exported = JSON.stringify(commands, null, 2);
        assert.ok(exported.includes('"id": "1"'));
        assert.ok(exported.includes('"label": "Test Command"'));

        // Test import (JSON.parse)
        const imported = JSON.parse(exported);
        assert.deepStrictEqual(imported, commands);
    });

    test('Safe JSON parsing utility', () => {
        const safeJsonParse = <T>(json: string, fallback: T): T => {
            try {
                return JSON.parse(json);
            } catch {
                return fallback;
            }
        };

        // Valid JSON
        assert.deepStrictEqual(
            safeJsonParse('{"test": true}', {}),
            { test: true }
        );

        // Invalid JSON
        assert.deepStrictEqual(
            safeJsonParse('invalid', { fallback: true }),
            { fallback: true }
        );
    });

    test('Array manipulation utilities', () => {
        // Test reordering (drag and drop simulation)
        const reorder = <T>(arr: T[], from: number, to: number): T[] => {
            const result = [...arr];
            const [item] = result.splice(from, 1);
            result.splice(to, 0, item);
            return result;
        };

        assert.deepStrictEqual(
            reorder(['a', 'b', 'c'], 0, 2),
            ['b', 'c', 'a']
        );

        // Test deduplication
        const unique = <T>(arr: T[]): T[] => [...new Set(arr)];
        assert.deepStrictEqual(
            unique(['a', 'b', 'a', 'c']),
            ['a', 'b', 'c']
        );
    });

    test('HTML escaping for security', () => {
        const escapeHtml = (str: string): string => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        };

        assert.strictEqual(
            escapeHtml('<script>alert("xss")</script>'),
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );

        assert.strictEqual(
            escapeHtml('Command & "test"'),
            'Command &amp; &quot;test&quot;'
        );
    });

    test('ID generation utility', () => {
        const generateId = (): string => {
            return Date.now().toString() + Math.random().toString(36).slice(2);
        };

        const id1 = generateId();
        const id2 = generateId();

        assert.ok(typeof id1 === 'string');
        assert.ok(typeof id2 === 'string');
        assert.ok(id1 !== id2);
        assert.ok(id1.length > 10);
    });
});