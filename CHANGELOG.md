# Changelog

All notable changes to **Telegram Bridge** are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) | [Semantic Versioning](https://semver.org/)

---

## [2.0.0] — 2025-03-23 — Major Feature Release

### 🎉 New Features

#### Multi-Profile Support
- Add unlimited named bot profiles (work, personal, team, per-project)
- Quick-switch between profiles from the command palette or sidebar
- Each profile has its own token, chat ID, and label

#### Message Composer
- Full in-editor compose panel with live Markdown preview
- Character counter and clear button
- Quick-send buttons: Deploy Started, Build OK/Failed, BRB, Hotfix, Review Needed

#### Template System
- 8 built-in templates: Deploy, PR Review, Daily Standup, Bug Report, Code Review, Task Done, Reminder, Error Alert
- Create unlimited custom templates with `{{variable}}` placeholders
- Variables: `{{workspace}}`, `{{file}}`, `{{gitBranch}}`, `{{time}}`, `{{date}}`, `{{user}}`, `{{selection}}`
- Template categories for organisation
- Templates browsable in the dedicated sidebar panel

#### Incoming Messages (Polling)
- Enable polling to receive Telegram messages inside VS Code
- Incoming messages shown as VS Code notifications with Reply button
- Full inbox sidebar view with message history
- Configurable polling interval (min 3 seconds)

#### Diagnostics Reporter
- Send all workspace errors/warnings to Telegram in one command (`Ctrl+Shift+E`)
- Auto-alert when new errors appear in the Problems panel
- Configurable minimum severity (Error / Warning / Information / Hint)

#### Git Integration
- Auto-notify on git commits (watches `.git/COMMIT_EDITMSG`)
- Send full git status: branch, changed files, recent 5 commits
- Available in Source Control panel right-click menu

#### Scheduler
- Schedule any message to send at a future time
- Options: 5 min, 15 min, 30 min, 1h, 2h, 1 day
- Pending scheduled messages visible in sidebar
- Per-message labels for easy identification

#### Broadcast
- Send to multiple chats/groups/channels simultaneously
- Configure extra chat IDs in settings or per-project config

#### Telegram Polls
- Create native Telegram polls from VS Code
- Custom question and comma-separated options

#### Per-Project Config
- `.telegram-bridge.json` in workspace root overrides global settings
- Supports: workspaceName, messagePrefix, notification toggles, silentNotifications, additionalChats

#### System Info
- Send OS platform, CPU model/cores, RAM usage, system uptime, Node.js version, active extensions count

#### Enhanced Logs
- Persistent log across VS Code restarts (configurable retention: default 7 days)
- Export logs as JSON or CSV via dedicated button
- Stats panel: total sent, succeeded, failed, received

### Sidebar — 6 Panels
1. **Profiles** — manage and switch connection profiles
2. **Inbox** — incoming messages from Telegram
3. **Templates** — browse and send templates by category
4. **Scheduled** — view and delete pending scheduled messages
5. **Sent Log** — real-time log of all sent/received messages
6. **Quick Actions** — all major commands in one click

### Configuration UI — 5 Tabs
1. **Configuration** — credentials, notifications, polling
2. **Composer** — rich message compose with preview
3. **Templates** — browse all templates + create custom ones
4. **Advanced** — parse mode, code length, broadcast chats, auto-send
5. **Stats** — live statistics + bot info

### New Context Menus
- Editor right-click: Send Selection, Send File, Open Composer, Send Errors
- Source Control title: Send Git Status
- Terminal context: Send Terminal Output

### New Keybindings
- `Ctrl+Shift+K` / `Cmd+Shift+K` — Open Message Composer
- `Ctrl+Shift+E` / `Cmd+Shift+E` — Send Workspace Errors

### VS Code Walkthrough
- Interactive "Get Started" guide in VS Code's welcome page

---

## [1.0.0] — 2025-01-01 — Initial Release

### Added
- Bot configuration webview
- Send messages, code snippets, files
- Build success/failure notifications
- Debug session notifications
- File save notifications
- Activity bar with logs + quick actions
- Status bar connection indicator
- Context menu integration
- `Ctrl+Shift+T` / `Ctrl+Shift+S` keybindings
- Test connection command
- Zero runtime dependencies
