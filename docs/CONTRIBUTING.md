# Contributing to Telegram Bridge

Thank you for your interest in contributing! This guide will help you get started.

## 🎯 Ways to Contribute

- **Bug Reports** - Help us identify and fix issues
- **Feature Requests** - Suggest new functionality
- **Documentation** - Improve guides, README, or inline comments
- **Code Contributions** - Implement features or fix bugs
- **Issue Triage** - Help organize and label issues

---

## 🚀 Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (for building)
- [VS Code](https://code.visualstudio.com/) 1.85+ (for testing)
- A Telegram bot token (get from [@BotFather](https://t.me/BotFather))

### Setup Steps

```bash
# Clone the repository
git clone https://github.com/unn-Known1/telegram-bridge-vscode
cd telegram-bridge-vscode

# Install dependencies
npm install

# Start TypeScript watch mode
npm run watch
```

### Running the Extension

1. Open the project in VS Code
2. Press **F5** to launch the Extension Development Host
3. The extension will load in a new VS Code window

### Build Commands

```bash
npm run compile    # Compile TypeScript to JavaScript
npm run lint       # Run ESLint (must pass before committing)
npm run watch      # Watch mode for development
npm run package    # Create .vsix package for distribution
```

---

## 📁 Project Structure

```
telegram-bridge-vscode/
├── src/
│   ├── extension.ts           # Entry point - command registrations
│   ├── telegramService.ts      # Telegram Bot API client (zero deps)
│   ├── configWebview.ts       # Configuration UI webview
│   ├── statusBarManager.ts    # Status bar indicator
│   ├── logsProvider.ts        # Sent message log tree view
│   ├── profileManager.ts      # Multi-profile support
│   ├── templateManager.ts     # Message templates with variables
│   ├── schedulerManager.ts    # Scheduled messages
│   ├── inboxManager.ts        # Incoming message polling
│   ├── notificationManager.ts # Build/debug/save/git notifications
│   ├── diagnosticsReporter.ts # Problems panel → Telegram
│   ├── gitIntegration.ts      # Git commit watcher
│   ├── quickActionsProvider.ts # Sidebar quick actions
│   ├── systemInfo.ts          # OS/hardware info
│   ├── workspaceConfig.ts     # Per-project .telegram-bridge.json
│   └── terminalManager.ts     # Terminal commands from Telegram
├── docs/
│   ├── SETUP.md               # Setup guide
│   ├── CONFIG.md              # Configuration reference
│   └── CONTRIBUTING.md        # This file
├── media/                     # Icons and images
└── package.json              # Extension manifest
```

---

## 📝 Coding Standards

### TypeScript Guidelines

- **Strict mode** is enabled - no implicit any
- **No `any` type** without a comment explaining why
- Use **explicit return types** on public methods
- **Group imports** by type:
  1. VS Code imports (`vscode`)
  2. Node.js built-ins (`os`, `fs`, etc.)
  3. Local modules

```typescript
import * as vscode from 'vscode';
import * as os from 'os';

import { TelegramService } from './telegramService';
import { StatusBarManager } from './statusBarManager';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes/Interfaces/Types | PascalCase | `TelegramService`, `ProfileConfig` |
| Methods/Variables | camelCase | `isConnected()`, `botToken` |
| Private members | `_prefix` | `_botToken`, `_connected` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |

### Formatting Rules

- **Semicolons** required
- **Single quotes** preferred
- **Strict equality** (`===` / `!==`) always
- **No unused variables**

---

## 🔧 Adding a New Feature

### 1. Add the Command

In `package.json`, add under `contributes.commands`:

```json
{
  "command": "telegramBridge.myNewFeature",
  "title": "Telegram Bridge: My New Feature",
  "icon": "$(symbol-keyword)"
}
```

### 2. Register the Command

In `src/extension.ts`:

```typescript
reg('telegramBridge.myNewFeature', async () => {
  // Your implementation
});
```

### 3. Implement

Create a new file or add to existing module:

```typescript
export async function myNewFeature(): Promise<void> {
  // Implementation
}
```

---

## 🔍 Testing

This extension uses manual testing (no automated test suite).

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Bot connects successfully
- [ ] Messages send correctly
- [ ] Notifications appear
- [ ] Commands from Telegram work
- [ ] No console errors

### Debugging Tips

1. Check **Output → Telegram Bridge** for extension logs
2. Open **Help → Toggle Developer Tools** for console errors
3. Use `console.log` during development (removed before PR)

---

## 📤 Submitting Changes

### Pull Request Process

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** with clear, descriptive commits
4. **Run checks**:
   ```bash
   npm run lint    # Must pass
   npm run compile # Must succeed
   ```
5. **Update CHANGELOG.md** under `[Unreleased]`
6. **Submit PR** with:
   - Clear description of changes
   - Link to related issue
   - Screenshots for UI changes

### Commit Message Format

```
type(scope): description

Types: feat, fix, docs, refactor, test, chore
```

Examples:
- `feat(messaging): add template variable support`
- `fix(notifications): correct build success detection`
- `docs(readme): add architecture diagram`

---

## 🐛 Reporting Bugs

Before creating an issue:

1. **Search existing issues** - someone may have reported it
2. **Test with latest version** - update if behind
3. **Reproduce consistently** - document the exact steps

When reporting, include:
- VS Code version
- Extension version
- OS and Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Console output (from Developer Tools)

---

## �good-first-issue Ideas

Looking for a place to start? Look for issues labeled [good first issue](https://github.com/unn-Known1/telegram-bridge-vscode/labels/good%20first%20issue).

Some ideas:
- Add new template variables
- Improve error messages
- Add keyboard shortcuts
- Enhance documentation
- Write example configurations

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 💬 Getting Help

- **Questions?** Open a discussion
- **Unclear issue?** Ask before filing
- **Need guidance?** We're happy to help

Thank you for making Telegram Bridge better! 🙏
