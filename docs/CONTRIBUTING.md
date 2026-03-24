# Contributing to Telegram Bridge

Thank you for your interest in contributing! Here's everything you need to get started.

## Development Setup

```bash
git clone https://github.com/your-username/telegram-bridge-vscode
cd telegram-bridge-vscode
npm install
npm run watch
```

Open the project in VS Code and press **F5** to launch the Extension Development Host.

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
└── workspaceConfig.ts     # Per-project .telegram-bridge.json
```

## Coding Standards

- TypeScript strict mode — no `any` without a comment explaining why
- All new features must have a corresponding command in `package.json`
- Keep `telegramService.ts` dependency-free (Node built-ins only)
- New tree view nodes go in their own provider file

## Pull Request Process

1. Fork the repo and create a feature branch: `git checkout -b feature/my-feature`
2. Write clean, commented code
3. `npm run lint` must pass with no errors
4. `npm run compile` must succeed
5. Update `CHANGELOG.md` under `[Unreleased]`
6. Submit a PR with a clear description of what and why

## Reporting Bugs

Open an issue with:
- VS Code version
- Extension version
- Steps to reproduce
- Expected vs actual behaviour
- Console output (`Help > Toggle Developer Tools`)

## Feature Requests

Open an issue tagged `enhancement`. Please describe the use case, not just the feature.
