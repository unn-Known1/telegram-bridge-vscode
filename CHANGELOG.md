# Changelog

All notable changes to **Telegram Bridge** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2025-01-01

### 🎉 Initial Release

#### Added
- **Bot Configuration** — Beautiful in-editor webview panel to configure your Telegram bot token and chat ID
- **Send Message** — Send any text message to Telegram from the command palette (`Ctrl+Shift+T`)
- **Send Selected Code** — Send selected code as a formatted code block with language tag (`Ctrl+Shift+S`)
- **Send Current File** — Send the entire active file as a Telegram document
- **Build Notifications** — Automatic alerts when VS Code tasks succeed or fail
- **Debug Notifications** — Optional alerts when debug sessions start/stop
- **File Save Notifications** — Optional alerts on file save
- **Activity Bar** — Dedicated sidebar with message logs view and quick actions panel
- **Status Bar** — One-click connection status indicator in the bottom bar
- **Context Menu** — Right-click integration in the editor for send operations
- **Automatic Reconnect** — Reconnects on settings change without restarting
- **Message Logs** — Real-time log of all sent messages with status indicators
- **Test Connection** — Send a test ping to verify your setup
- **Parse Mode** — Choose between Markdown, HTML, and MarkdownV2
- **Max Code Length** — Configurable threshold for switching to file upload
- **Workspace Name** — Auto-detects workspace folder name in notifications

---

## [Unreleased]

### Planned
- Incoming message polling from Telegram
- Multiple bot/chat configurations
- Per-workspace configuration file (`.vscode/telegram-bridge.json`)
- Rich message preview before sending
- Scheduled messages / reminders
- GitHub Actions notification integration
