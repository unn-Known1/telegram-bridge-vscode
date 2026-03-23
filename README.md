# ✈️ Telegram Bridge for VS Code

> **Connect your VS Code (or any IDE) to Telegram in seconds — just a bot token and a chat ID.**

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)](https://github.com/telegram-bridge/telegram-bridge-vscode/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📨 **Send Messages** | Type and send any text message to your Telegram chat |
| 📋 **Send Code Snippets** | Send selected code with syntax highlighting (`\`\`\`lang`) |
| 📁 **Send Files** | Send the entire current file as a Telegram document |
| ✅❌ **Build Notifications** | Auto-notify you when tasks succeed or fail |
| 🐛 **Debug Notifications** | Get pinged when debug sessions start/stop |
| 💾 **Save Notifications** | Track file saves (optional) |
| 🎨 **Config UI** | Beautiful in-editor configuration panel |
| 📊 **Activity Bar** | Dedicated sidebar with logs and quick actions |
| 🔔 **Status Bar** | One-click connection indicator |
| ⌨️ **Keybindings** | `Ctrl+Shift+T` to send, `Ctrl+Shift+S` for selection |

---

## 🚀 Quick Start

### Step 1 — Create a Telegram Bot

1. Open Telegram and search for **[@BotFather](https://t.me/BotFather)**
2. Send `/newbot` and follow the prompts
3. Copy your **API token** (looks like `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)

### Step 2 — Get Your Chat ID

| Target | How to get the ID |
|---|---|
| Personal chat | Message [@userinfobot](https://t.me/userinfobot) — it replies with your numeric ID |
| Group | Add your bot to the group, send a message, then use `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| Channel | Use `@channelname` (public) or the numeric ID (private) |

### Step 3 — Configure the Extension

Open the Command Palette (`Ctrl+Shift+P`) and run:
```
Telegram Bridge: Configure Bot
```

Enter your **Bot Token** and **Chat ID**, then click **Save & Connect**. That's it!

---

## 📸 Screenshots

### Configuration Panel
The in-editor configuration panel provides a clean UI with connection status, notification toggles, and advanced settings — all without leaving VS Code.

### Activity Bar
The dedicated sidebar shows real-time message logs (sent/received/system) and a quick actions panel for the most common operations.

### Status Bar
The bottom status bar shows your connection state at a glance. Click it anytime to open configuration.

---

## ⌨️ Commands

| Command | Keybinding | Description |
|---|---|---|
| `Telegram Bridge: Configure Bot` | — | Open the configuration panel |
| `Telegram Bridge: Send Message` | `Ctrl+Shift+T` | Send a custom message |
| `Telegram Bridge: Send Selected Code` | `Ctrl+Shift+S` | Send your current selection as code |
| `Telegram Bridge: Send Current File` | — | Send the active file as a document |
| `Telegram Bridge: Test Connection` | — | Send a test ping to your Telegram |
| `Telegram Bridge: Toggle Build Notifications` | — | Enable/disable build alerts |
| `Telegram Bridge: Disconnect` | — | Disconnect from Telegram |
| `Telegram Bridge: View Message Logs` | — | Focus the message logs view |

---

## ⚙️ Configuration

All settings are available via VS Code's Settings UI (`Ctrl+,`) under **Telegram Bridge**, or the in-editor config panel.

```jsonc
{
  // Required
  "telegramBridge.botToken": "your-bot-token",
  "telegramBridge.chatId": "your-chat-id",

  // Notifications
  "telegramBridge.notifyOnBuildSuccess": true,
  "telegramBridge.notifyOnBuildFailure": true,
  "telegramBridge.notifyOnDebugStart": false,
  "telegramBridge.notifyOnDebugStop": false,
  "telegramBridge.notifyOnFileSave": false,

  // Advanced
  "telegramBridge.parseMode": "Markdown",       // Markdown | HTML | MarkdownV2
  "telegramBridge.maxCodeLength": 3000,          // chars before switching to file upload
  "telegramBridge.messagePrefix": "💻 VS Code",
  "telegramBridge.showStatusBar": true,
  "telegramBridge.workspaceName": ""             // override auto-detected folder name
}
```

---

## 🔒 Security

- Your **Bot Token** and **Chat ID** are stored only in VS Code's global settings (your local machine's `settings.json`). They are **never** transmitted to any server other than `api.telegram.org`.
- All requests are made over **HTTPS** directly to Telegram's official API.
- No telemetry, no analytics, no third-party services.

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/telegram-bridge/telegram-bridge-vscode
cd telegram-bridge-vscode

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Open in VS Code and press F5 to launch Extension Development Host
code .
```

### Building a `.vsix` Package

```bash
npm run package
```

This generates `telegram-bridge-1.0.0.vsix` which can be installed locally with:
```bash
code --install-extension telegram-bridge-1.0.0.vsix
```

---

## 🗺️ Roadmap

- [ ] **Incoming messages** — receive Telegram messages directly in VS Code (polling/webhook)
- [ ] **Multiple bots** — configure multiple bot/chat pairs for different projects
- [ ] **Workspace-level config** — per-project bot settings (`.vscode/telegram-bridge.json`)
- [ ] **Rich previews** — Markdown preview of messages before sending
- [ ] **Scheduled messages** — set reminders within VS Code
- [ ] **GitHub Actions integration** — auto-notify on CI/CD results

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the repository
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please read our [Contributing Guidelines](./docs/CONTRIBUTING.md) before submitting.

---

## 📄 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full history of changes.

---

## 📜 License

[MIT](./LICENSE) © Telegram Bridge Contributors

---

<p align="center">Made with ❤️ for developers who live in their editor</p>
