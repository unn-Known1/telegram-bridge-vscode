# ✈️ Telegram Bridge for VS Code

> **The developer's Telegram superpower — inside your IDE.**
> Send code, receive messages, track builds, report errors, schedule reminders — without leaving VS Code.

[![Version](https://img.shields.io/badge/version-2.0.0-brightgreen)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)

---

## 🚀 Feature Overview

| Feature | Description |
|---|---|
| 📨 **Send Messages** | Quick-send any text — `Ctrl+Shift+T` |
| ✏️ **Rich Composer** | Full in-editor compose panel with live Markdown preview |
| 📋 **Templates** | 8 built-in + unlimited custom templates with `{{variables}}` |
| 📁 **Send Files & Code** | Selection, whole files, or terminal output |
| 📡 **Broadcast** | Send to multiple chats/groups/channels at once |
| 📥 **Receive Messages** | Incoming messages as VS Code notifications + sidebar inbox |
| ✅❌ **Build Notifications** | Auto-notify on task success or failure |
| 🐛 **Debug Events** | Ping on debug session start/stop |
| 🔴 **Diagnostics Reporter** | Send all errors/warnings; auto-alert on new problems |
| 🔀 **Git Integration** | Auto-notify on commits; send full git status + log |
| ⏰ **Scheduler** | Queue messages to send at a future time |
| 📊 **Create Polls** | Native Telegram polls from VS Code |
| 👤 **Multiple Profiles** | Named profiles for work / personal / team bots |
| 📂 **Per-project Config** | `.telegram-bridge.json` for workspace-specific settings |
| 📊 **Stats & Logs** | Persistent log with CSV/JSON export |
| 💻 **System Info** | Send OS/CPU/RAM/Node info to Telegram |

---

## ⚡ Quick Start

### 1 — Create a Bot
Open Telegram → search **[@BotFather](https://t.me/BotFather)** → `/newbot` → copy your token.

### 2 — Get Your Chat ID

| Target | How |
|---|---|
| Personal chat | Message [@userinfobot](https://t.me/userinfobot) |
| Group | Add bot to group, send msg, check `getUpdates` |
| Channel | `@channelname` (public) or numeric ID (private) |

### 3 — Connect
`Ctrl+Shift+P` → **Telegram Bridge: Configure** → enter token & chat ID → **Save & Connect**. Done! ✈️

---

## ⌨️ Commands & Keybindings

| Command | Shortcut | Description |
|---|---|---|
| Configure | — | Open the full configuration panel |
| Send Message | `Ctrl+Shift+T` | Quick-send a typed message |
| Open Composer | `Ctrl+Shift+K` | Rich compose panel with preview |
| Send Selected Code | `Ctrl+Shift+S` | Send selection with syntax highlighting |
| Send Workspace Errors | `Ctrl+Shift+E` | Report all diagnostics |
| Send Current File | — | Send active file as document |
| Send from Template | — | Pick and send a message template |
| Broadcast to All Chats | — | Send to all configured chats at once |
| Send Git Status | — | Branch, changes, recent commits |
| Send System Info | — | OS / CPU / RAM / Node details |
| Schedule a Message | — | Queue a message for a future time |
| Create Telegram Poll | — | Create a poll from inside VS Code |
| Switch Profile | — | Switch between named bot profiles |
| Add Profile | — | Add a new named bot/chat profile |
| Toggle Notifications | — | Enable / disable build alerts |
| Toggle Incoming Messages | — | Start / stop polling for messages |
| Export Message Logs | — | Download logs as JSON or CSV |
| Open Workspace Config | — | Edit `.telegram-bridge.json` |

> **Right-click** in the editor → Send Selection / Send File / Send Errors  
> **Right-click** in Source Control panel → Send Git Status

---

## 📋 Template Variables

| Variable | Value |
|---|---|
| `{{workspace}}` | Current workspace folder name |
| `{{file}}` | Active file name |
| `{{time}}` | Current time |
| `{{date}}` | Current date |
| `{{datetime}}` | Full date + time |
| `{{selection}}` | Currently selected editor text |
| `{{user}}` | OS username |
| `{{gitBranch}}` | Current git branch |

**Example:**
```
🚀 *Deploy triggered*
📁 `{{workspace}}`
🌿 Branch: `{{gitBranch}}`
👤 {{user}} — {{time}}
```

---

## 📂 Per-Project Config (`.telegram-bridge.json`)

Place in your workspace root for project-specific overrides:

```json
{
  "workspaceName": "MyApp",
  "messagePrefix": "🏗️ MyApp",
  "notifyOnBuildSuccess": true,
  "notifyOnBuildFailure": true,
  "notifyOnGitCommit": true,
  "silentNotifications": false,
  "additionalChats": ["-1001234567890", "@myteamchannel"]
}
```

---

## ⚙️ Configuration Reference

```jsonc
{
  "telegramBridge.botToken": "",           // Bot API token
  "telegramBridge.chatId": "",             // Primary chat ID
  "telegramBridge.activeProfile": "default",
  "telegramBridge.profiles": {},           // Named profiles
  "telegramBridge.additionalChats": [],    // Extra chats for broadcast

  // Notifications
  "telegramBridge.notifyOnBuildSuccess":    true,
  "telegramBridge.notifyOnBuildFailure":    true,
  "telegramBridge.notifyOnDebugStart":      false,
  "telegramBridge.notifyOnDebugStop":       false,
  "telegramBridge.notifyOnFileSave":        false,
  "telegramBridge.notifyOnGitCommit":       false,
  "telegramBridge.notifyOnDiagnosticError": false,

  // Incoming messages
  "telegramBridge.enablePolling":         false,
  "telegramBridge.pollingInterval":       5,
  "telegramBridge.showIncomingInEditor":  true,

  // Message settings
  "telegramBridge.parseMode":             "Markdown",
  "telegramBridge.maxCodeLength":         3000,
  "telegramBridge.messagePrefix":         "💻 VS Code",
  "telegramBridge.silentNotifications":   false,
  "telegramBridge.workspaceName":         "",

  // Diagnostics
  "telegramBridge.diagnosticsMinSeverity": "Error",
  "telegramBridge.autoSendOnError":        false,

  // UI
  "telegramBridge.showStatusBar":         true,
  "telegramBridge.logRetentionDays":      7
}
```

---

## 🔒 Privacy & Security

- Credentials stored only in VS Code's local `settings.json`
- All API calls go **directly** to `api.telegram.org` over HTTPS
- **Zero telemetry** — never phones home
- **Zero runtime dependencies** — 100% Node.js built-ins

---

## 🛠️ Development

```bash
git clone https://github.com/your-username/telegram-bridge-vscode
cd telegram-bridge-vscode
npm install
npm run watch       # TypeScript watch mode
# Press F5 in VS Code to launch Extension Development Host
```

```bash
npm run package     # → telegram-bridge-2.0.0.vsix
code --install-extension telegram-bridge-2.0.0.vsix
```

---

## 🗺️ Roadmap

- [ ] Webhook support (receive without polling)
- [ ] Attach images from clipboard
- [ ] Recurring scheduled messages (cron)
- [ ] GitHub/GitLab CI webhook relay
- [ ] Message search in inbox

---

## 📜 License

[MIT](./LICENSE) © Telegram Bridge Contributors

---

<p align="center"><strong>Built for developers who live in their editor.</strong></p>
