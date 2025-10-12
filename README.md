# Script Notes

A VS Code extension for managing and running frequently used shell commands with customizable arguments and flags.

## Features

- 📝 Save and organize shell commands with custom labels
- 🔄 Run commands directly from VS Code with a single click
- 🎯 Add custom flags and arguments to your commands
- ⚡ Interactive prompt system for command arguments
- 🎨 Clean, minimal interface integrated into VS Code

## Usage

1. Open the Script Notes view in the Activity Bar
2. Click "+ New Command" to add a command
3. Fill in the required information:
   - Label: A friendly name for your command
   - Shell Command: The actual command to run
   - Flags: Optional command-line flags (comma-separated)
   - Argument Prompts: Define prompts for arguments (comma-separated)
   - Always Prompt: Choose whether to always ask for arguments

### Example Commands

```
# Git commit with message prompt
Label: Git Commit
Command: git commit -m
Argument Prompts: Commit message
Always Prompt: Yes

# Run tests in specific directory
Label: Run Tests
Command: npm test
Flags: --watch, --verbose
Argument Prompts: Test directory
Always Prompt: No
```

## Managing Commands

- **Add Command**: Click the "+ New Command" button
- **Edit Command**: Click the ⚙ icon on any command
- **Run Command**: Click the ▶ icon to execute
- **Delete Command**: Click the × icon to remove

## Arguments and Flags

- **Flags**: Static arguments that are always included (e.g., `-v`, `--force`)
- **Arguments**: Dynamic values prompted before running the command
- **Always Prompt**: When enabled, always asks for arguments before running

## Tips

- Use descriptive labels for easy command identification
- Group related flags with commas: `-v, --force, --no-cache`
- Create argument prompts with clear descriptions
- Use the 'Always Prompt' option for commands that need different arguments each time

## Requirements

- Visual Studio Code version 1.76.0 or higher

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Script Notes"
4. Click Install

## Extension Settings

This extension doesn't require any additional settings. All commands are stored per workspace.

## Known Issues

Please report any issues on the GitHub repository.

## Release Notes

### 1.0.0

Initial release of Script Notes:
- Basic command management
- Argument prompting system
- Minimalist UI
- Workspace storage

## Contributing

Found a bug or have a feature request? Open an issue or submit a pull request on our GitHub repository.

## License

MIT - See LICENSE file for details.
