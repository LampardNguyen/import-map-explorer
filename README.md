# Import Map Explorer

A VSCode extension to visualize import/require relationships between files in your project as an interactive map.

## Demo

![Import Map Explorer Demo](https://github.com/LampardNguyen/import-map-explorer/blob/main/images/import-export.gif?raw=true)

## Features

* 🗺️ **Interactive Map**: Displays import/require relationships as a graph using canvas
* 🔍 **Smart Analysis**: Supports both `import` and `require` statements
* 📦 **Node Modules**: Shows dependencies from node\_modules
* 🎯 **Focus on Current File**: View relationships of the currently open file
* 🖱️ **Direct Interaction**: Double-click to open file, hover to view info
* 📁 **Multi-format Support**: Supports .ts, .js, .tsx, .jsx, .vue, .svelte
* 🚫 **Auto-Ignore .gitignore**: Ignores files/folders listed in .gitignore

## How to Use

### 1. Show map for current file

* Open any file in the editor
* Use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
* Search for "Show Current File Import Map"
* Or use shortcut: `Ctrl+Shift+M` (Windows/Linux) / `Cmd+Shift+M` (Mac)
* Or right-click in the editor → "Show Current File Import Map"

### 2. Show map for entire project

* Right-click a file in the Explorer → "Show Import Map"
* Or use Command Palette → "Show Import Map"

### 3. Interact with the map

* **Zoom**: Use scroll wheel
* **Pan**: Drag to move view
* **Click**: Select node to view details
* **Double-click**: Open corresponding file
* **Reset View**: Reset button to return to default position
* **Center on Current**: Focus on current file
* **Toggle Labels**: Show/hide file names

## How It Works

The extension will:

1. **Read .gitignore**: Automatically reads .gitignore to skip unnecessary files/folders
2. **Syntax Analysis**: Parses JavaScript/TypeScript file syntax
3. **Extract Imports**: Extracts all import/require statements
4. **Build Graph**: Constructs dependency graph from parsed data
5. **Render Canvas**: Displays using canvas with automatic layout
6. **Real-time Interaction**: Allows direct interaction with the map

## .gitignore Support

The extension automatically reads and respects the `.gitignore` file in your project root:

### Supported Patterns

* ✅ **Wildcard patterns**: `*.js`, `*.log`, `temp*`
* ✅ **Directory patterns**: `node_modules/`, `dist/`, `build/`
* ✅ **Absolute patterns**: `/config.local.js`
* ✅ **Negation patterns**: `!important.js` (file is allowed even if matched by another pattern)

### Example .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/
*.min.js

# Log files
*.log
logs/

# Local config files
.env.local
/config.local.js

# Temporary files
temp/
*.tmp

# Exception - important file not ignored
!important.config.js
```

### Behavior

* 🚫 **Ignored Files**: Not analyzed or displayed on map
* 📁 **Ignored Folders**: Entire folder content skipped
* 🔗 **Ignored Imports**: Imports to ignored files are skipped
* 📝 **Console Log**: Skipped files/folders shown in Developer Console

## Node Types

* 🔵 **Regular File**: Files in your project
* 🔷 **Current File**: The file currently focused (bold blue)
* 🟠 **Node Module**: Dependencies from node\_modules

## Requirements

* Visual Studio Code 1.74.0 or higher
* Project with JavaScript/TypeScript files
* .gitignore file (optional) – used if available

## Extension Settings

Currently, the extension has no specific settings. All configurations are auto-detected.

## Development

```bash
# Clone repository
git clone [your-repo-url]
cd import-map-explorer

# Install dependencies  
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Debug extension
Press F5 in VSCode to open Extension Development Host
```

## Change Log

See Change Log [here](CHANGELOG.md)

## Contribution

Contributions are welcome! Please create an issue or pull request on the [repo](https://github.com/LampardNguyen/import-map-explorer).

## Issues

Submit [issues](https://github.com/LampardNguyen/import-map-explorer/issues) if you find any bugs or have suggestions.

## License

MIT License

## Author

Developed by LampardNguyen

