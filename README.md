# Script Notes

A powerful VS Code extension for managing and running shell commands with an intuitive tree-view UI. Organize commands in folders, customize arguments, and streamline your workflow.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### Core Functionality
- 📝 **Save and manage shell commands** with custom labels and descriptions
- 🔄 **Run commands directly** from VS Code with a single click
- 📁 **Organize in folders** - group related commands together
- 🎯 **Custom flags and arguments** - add static flags and dynamic argument prompts
- ⚡ **Interactive argument selection** - choose from saved arguments or add custom ones
- 💾 **Persistent argument history** - custom arguments are automatically saved
- 🎨 **Clean, integrated UI** - seamlessly integrated into VS Code's activity bar

### Advanced Features
- 🔀 **Drag and drop** - reorder commands and folders easily
- 🗂️ **Folder management** - create, rename, delete, and expand/collapse folders
- ▶️ **Run entire folders** - execute all commands in a folder sequentially
- 📤 **Import/Export** - share command configurations across workspaces
- ✅ **Delete confirmation** - double-click to confirm deletions (prevents accidents)
- 🎨 **Visual feedback** - button spacing, hover states, and intuitive icons

## 📥 Installation

### From GitHub Releases
1. Go to the [Releases page](https://github.com/ThiagoFontes/script_notes/releases)
2. Download the latest `.vsix` file
3. Open VS Code
4. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
5. Click the `...` menu → "Install from VSIX..."
6. Select the downloaded file

### From Command Line
```bash
code --install-extension scriptnotes-1.1.0.vsix
```

## 🚀 Getting Started

### Creating Your First Command

1. **Open Script Notes** - Click the Script Notes icon in the Activity Bar
2. **Add a command** - Click "+ New Command"
3. **Configure the command**:
   - **Label**: Friendly name (e.g., "Git Status")
   - **Shell Command**: The command to run (e.g., "git status")
   - **Flags**: Static arguments (e.g., "-v", "--short")
   - **Argument Prompts**: Names for dynamic arguments
   - **Always Prompt**: Enable to always ask for arguments

### Creating Folders

1. Click "+ New Folder"
2. Enter a folder name
3. Drag commands into the folder
4. Click the folder name to expand/collapse
5. Click ▶️ on a folder to run all commands inside

## 📖 Usage Examples

### Example 1: Git Commit with Message
```
Label: Git Commit
Command: git commit -m
Flags: (none)
Argument Prompts: Commit message
Always Prompt: Yes
```

### Example 2: Docker Container Management
```
Label: Docker Run Container
Command: docker run
Flags: -d, -p
Argument Prompts: Port mapping, Image name
Always Prompt: Yes
```

### Example 3: NPM Script Runner
```
Label: Run Tests
Command: npm test
Flags: --verbose
Argument Prompts: Test file pattern
Always Prompt: No
```

## 🎯 Key Features Explained

### Argument Prompts
- Define placeholders for dynamic values
- QuickPick interface for selecting from history
- Add custom arguments on-the-fly (they're saved automatically!)
- Arguments persist across window reloads

### Folder Operations
- **Create**: Organize commands by project, type, or workflow
- **Rename**: Update folder names anytime
- **Delete**: Remove folders (commands move to root level)
- **Run All**: Execute all commands in sequence with proper waiting

### Import/Export
- **Export**: Save selected commands/folders to JSON
- **Import**: Load configurations from JSON files
- **Share**: Distribute command sets across teams

### Drag and Drop
- Reorder commands within folders
- Reorder folders in the list
- Move commands between folders
- Visual drop indicators show where items will land

## ⚙️ Configuration

No additional settings required! All commands and folders are automatically saved to VS Code's workspace storage and persist across sessions.

## 🔧 Requirements

- Visual Studio Code version 1.74.0 or higher
- Works with VS Code, VSCodium, and Cursor

## 📝 Managing Commands

| Action | How To |
|--------|--------|
| **Add Command** | Click "+ New Command" button |
| **Edit Command** | Click the ⚙️ icon on any command |
| **Run Command** | Click the ▶️ icon to execute |
| **Delete Command** | Click × icon twice (confirmation) |
| **Add to Folder** | Drag command onto folder |
| **Reorder** | Drag and drop to new position |

## 📂 Managing Folders

| Action | How To |
|--------|--------|
| **Create Folder** | Click "+ New Folder" button |
| **Rename Folder** | Click folder name, enter new name |
| **Delete Folder** | Click × icon twice (confirmation) |
| **Expand/Collapse** | Click folder name |
| **Run All Commands** | Click ▶️ icon on folder |

## 🎨 UI Features

- **Import/Export buttons**: Full-width buttons with spacing
- **Hover effects**: Visual feedback on all interactive elements
- **Delete confirmation**: Blue hover state on first click, red on confirmation
- **Persistent selections**: Arguments are remembered and reusable

## 🐛 Known Issues

- Long-running commands may not show real-time output
- Windows path handling may require escaped backslashes

Please report issues on the [GitHub repository](https://github.com/ThiagoFontes/script_notes/issues).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/ThiagoFontes/script_notes)
- [Issue Tracker](https://github.com/ThiagoFontes/script_notes/issues)
- [Releases](https://github.com/ThiagoFontes/script_notes/releases)

---

**Made with ❤️ by [ThiagoFontes](https://github.com/ThiagoFontes)**
