# Agent Guidelines for Telegram Bridge

This is a VS Code extension that integrates Telegram messaging into VS Code. Read this file before making changes.

## Build / Lint / Test Commands

```bash
# Install dependencies
npm install

# Compile TypeScript (required before running)
npm run compile

# Watch mode for development
npm run watch

# Lint code (must pass before committing)
npm run lint

# Package as VSIX for distribution
npm run package

# Publish to VS Code Marketplace
npm run publish
```

**Note:** This project has no test suite. Test manually by pressing F5 in VS Code to launch the Extension Development Host.

## Code Style Guidelines

### General
- TypeScript strict mode is enabled in tsconfig.json
- All new features must have a corresponding command registered in package.json
- Keep `telegramService.ts` dependency-free (Node built-ins only)
- New tree view nodes go in their own provider file
- No `any` type without a comment explaining why

### Formatting
- **Semicolons:** Required (enforced by ESLint rule `semi: ["error", "always"]`)
- **Quotes:** Single quotes preferred (enforced by ESLint rule `quotes: ["warn", "single"]`)
- **Equality:** Use strict equality `===` (enforced by ESLint rule `eqeqeq: "error"`)

### Naming Conventions
- **Classes/Interfaces/Types:** PascalCase (e.g., `TelegramService`, `ProfileManager`)
- **Methods/Variables:** camelCase (e.g., `isConnected()`, `botToken`)
- **Private members:** Prefix with underscore (e.g., `_botToken`, `_connected`)

### Imports
- Group imports by type: VSCode imports first, Node built-ins second, local modules third
- Use explicit relative imports (e.g., `import { TelegramService } from './telegramService'`)

```typescript
import * as vscode from 'vscode';
import * as os from 'os';

import { TelegramService } from './telegramService';
import { StatusBarManager } from './statusBarManager';
```

### Interfaces
Define interfaces for all data structures at the top of the file or in a separate types file:

```typescript
export interface Profile {
  name: string;
  label: string;
  token: string;
  chatId: string;
}
```

### Error Handling
- Use try/catch for async operations that may fail
- Log errors via the logging system: `telegramService.log({...})`
- Show user-friendly error messages via `vscode.window.showErrorMessage()`

### Event Patterns
- Use private event listener arrays with public registration methods
- Emit events via private `_emit<T>()` helper methods

```typescript
private _logListeners: EventListener<LogEntry>[] = [];

onLog(l: EventListener<LogEntry>) { this._logListeners.push(l); }

private _emit<T>(list: EventListener<T>[], v: T) { list.forEach(l => l(v)); }
```

### VS Code Extension Patterns

#### Command Registration
Wrap commands with the helper function in extension.ts:

```typescript
function reg(context: vscode.ExtensionContext, command: string, fn: (...args: any[]) => any): void {
  context.subscriptions.push(vscode.commands.registerCommand(command, fn));
}
```

#### Tree View Providers
Create a provider class implementing `vscode.TreeDataProvider<T>`:

```typescript
export class ProfilesProvider implements vscode.TreeDataProvider<ProfileItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh() { this._onDidChange.fire(); }
  getTreeItem(el: ProfileItem) { return el; }
  getChildren(): ProfileItem[] { /* ... */ }
}
```

#### Configuration
Use VS Code's configuration system:

```typescript
const cfg = vscode.workspace.getConfiguration('telegramBridge');
const token = cfg.get<string>('botToken', '');
await cfg.update('botToken', newToken, vscode.ConfigurationTarget.Global);
```

### Logging
- Use console.log for extension startup/shutdown messages
- Use the TelegramService's logging system for runtime events

## Project Structure

```
src/
├── extension.ts           # Entry point — all command registrations
├── telegramService.ts     # Telegram Bot API client (zero dependencies)
├── configWebview.ts       # 5-tab configuration + composer UI
├── statusBarManager.ts    # Bottom status bar indicator
├── logsProvider.ts        # Sent message log tree view + export
├── profileManager.ts      # Multi-profile support
├── templateManager.ts     # Built-in + custom templates with variables
├── schedulerManager.ts    # Scheduled/deferred messages
├── inboxManager.ts        # Incoming message polling + inbox view
├── notificationManager.ts # Build/debug/save/git event hooks
├── diagnosticsReporter.ts # VS Code Problems panel → Telegram
├── gitIntegration.ts      # Git commit watcher + git status sender
├── quickActionsProvider.ts # Sidebar quick actions panel
├── systemInfo.ts          # OS/hardware info sender
├── workspaceConfig.ts     # Per-project .telegram-bridge.json
└── terminalManager.ts     # Terminal command execution from Telegram
```

## Common Tasks

### Adding a New Command
1. Add command to `package.json` under `contributes.commands`
2. Register in `extension.ts` using the `reg()` helper
3. Implement the command logic (usually calling TelegramService methods)

### Adding a New Tree View
1. Add view ID to `package.json` under `contributes.views`
2. Create provider class implementing `vscode.TreeDataProvider<T>`
3. Register in `extension.ts` with `vscode.window.registerTreeDataProvider()`

### Adding Configuration
Add to `package.json` under `contributes.configuration.properties`:

```json
"telegramBridge.newSetting": {
  "type": "boolean",
  "default": false,
  "description": "Description here"
}
```

## Before Committing

1. Run `npm run lint` — must pass with no errors
2. Run `npm run compile` — must succeed
3. Test the extension by pressing F5 in VS Code
