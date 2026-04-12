# Telegram Bridge - VS Code Telegram Integration

> **Send messages, code, and commands from VS Code to Telegram. Get instant notifications for builds, debug sessions, file changes, and execute terminal commands directly from Telegram.**

[![Version](https://img.shields.io/badge/version-2.1.0-brightgreen)](https://marketplace.visualstudio.com/items?itemName=telegram-bridge.telegram-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue?logo=visual-studio-code)](https://code.visualstudio.com/)
[![Extension Installs](https://img.shields.io/visual-studio-marketplace/i/telegram-bridge.telegram-bridge?label=installs)](https://marketplace.visualstudio.com/items?itemName=telegram-bridge.telegram-bridge)

---

## Table of Contents

- [Why Telegram Bridge?](#why-telegram-bridge)
- [Quick Start](#-quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Commands & Keybindings](#-commands--keybindings)
- [Telegram Bot Commands](#-telegram-bot-commands)
- [Configuration](#-configuration)
- [Use Cases](#-use-cases)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## Why Telegram Bridge?

**Telegram Bridge** connects your IDE to Telegram for seamless development workflow:

- **Send code & files** directly from VS Code to Telegram chats
- **Receive notifications** for builds, debug sessions, git commits, and errors
- **Execute terminal commands** from Telegram - run builds, tests, deployments remotely
- **Control your workflow** using Telegram commands like `/sh`, `/run`, `/status`
- **Use inline keyboards** to trigger actions with button clicks
- **Schedule messages** for future delivery
- **Manage multiple bot profiles** for different projects or teams

Perfect for remote development, CI/CD monitoring, and staying connected to your projects from anywhere.

---

## ⚡ Quick Start

### 1 — Create a Bot
Open Telegram → search **[@BotFather](https://t.me/BotFather)** → `/newbot` → copy your token.

### 2 — Get Your Chat ID

| Target | How |
|--------|-----|
| Personal chat | Message [@userinfobot](https://t.me/userinfobot) |
| Group | Add bot to group, send msg, check `getUpdates` |
| Channel | `@channelname` (public) or numeric ID (private) |

### 3 — Connect
`Ctrl+Shift+P` → **Telegram Bridge: Configure** → enter token & chat ID → **Save & Connect**.

### 4 — Send Your First Message
Press `Ctrl+Shift+T` or right-click any code and select **Send Selected Code**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Editor                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Editor    │  │  Terminal   │  │   Build/Debug Tasks    │  │
│  │   Context   │  │   Output    │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   Telegram Bridge     │                          │
│              │   Extension Core      │                          │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS / Webhook
                           ▼
              ┌───────────────────────┐
              │    Telegram Bot API    │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    Your Telegram       │
              │    Bot / Chat         │
              └───────────────────────┘
```

---

## Features

### Messaging
| Feature | Description |
|---------|-------------|
| 📨 **Send Messages** | Quick-send any text — `Ctrl+Shift+T` |
| ✏️ **Rich Composer** | Full in-editor compose panel with live Markdown preview |
| 📋 **Templates** | 8 built-in + unlimited custom templates with `{{variables}}` |
| 📁 **Send Files & Code** | Selection, whole files, or terminal output |
| 📡 **Broadcast** | Send to multiple chats/groups/channels at once |
| 📥 **Receive Messages** | Incoming messages as VS Code notifications + sidebar inbox |
| ⏰ **Scheduler** | Queue messages to send at a future time |

### Notifications
| Feature | Description |
|---------|-------------|
| ✅❌ **Build Notifications** | Auto-notify on task success or failure |
| 🐛 **Debug Events** | Ping on debug session start/stop |
| 🔴 **Diagnostics Reporter** | Send all errors/warnings; auto-alert on new problems |
| 🔀 **Git Integration** | Auto-notify on commits; send full git status + log |
| 📁 **File Watcher** | Get notified when specific files change (configurable patterns) |

### Terminal & Remote Control
| Feature | Description |
|---------|-------------|
| ⌨️ **Inline Keyboards** | Send messages with interactive buttons |
| 🖥️ **Terminal Commands** | Execute shell commands from Telegram (/sh, /run, /term) |
| 📴 **Offline Queue** | Messages queue when offline, auto-send on reconnect |

### Management
| Feature | Description |
|---------|-------------|
| 👤 **Multiple Profiles** | Named profiles for work / personal / team bots |
| 📂 **Per-project Config** | `.telegram-bridge.json` for workspace-specific settings |
| 📊 **Stats & Logs** | Persistent log with CSV/JSON export |
| 💻 **System Info** | Send OS/CPU/RAM/Node info to Telegram |
| 🔗 **Webhook Support** | Receive messages instantly via webhook instead of polling |

---

## ⌨️ Commands & Keybindings

| Command | Shortcut | Description |
|---------|----------|-------------|
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

## 🤖 Telegram Bot Commands

Send these commands directly from Telegram to control VS Code:

| Command | Description |
|---------|-------------|
| `/status` | Send current git status |
| `/info` | Send system information |
| `/errors` | Send workspace diagnostics |
| `/sh <command>` | Execute shell command, get output |
| `/run <command>` | Run command in VS Code terminal |
| `/term <name>` | Create/use named terminal |
| `/terminals` | List active terminals |
| `/kill <name>` | Kill a terminal |
| `/help` | Show available commands |

---

## 📋 Template Variables

| Variable | Value |
|----------|-------|
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

## ⚙️ Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `botToken` | string | — | Telegram Bot API token (from @BotFather) |
| `chatId` | string | — | Primary target chat/group/channel ID |
| `activeProfile` | string | `"default"` | Active connection profile name |
| `profiles` | object | `{}` | Named connection profiles |
| `additionalChats` | array | `[]` | Extra chat IDs for broadcast |

### Notification Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `notifyOnBuildSuccess` | boolean | `true` | Notify on build success |
| `notifyOnBuildFailure` | boolean | `true` | Notify on build failure |
| `notifyOnDebugStart` | boolean | `false` | Notify when debug starts |
| `notifyOnDebugStop` | boolean | `false` | Notify when debug stops |
| `notifyOnFileSave` | boolean | `false` | Notify on file save |
| `notifyOnFileChange` | boolean | `false` | Notify on file change |
| `notifyOnGitCommit` | boolean | `false` | Notify on git commits |
| `notifyOnDiagnosticError` | boolean | `false` | Notify on new errors |
| `fileWatcherPatterns` | array | `[]` | File patterns to watch (e.g., `*.ts`) |

### Incoming Messages

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enablePolling` | boolean | `false` | Enable polling for incoming messages |
| `pollingInterval` | number | `5` | Polling interval in seconds (min: 3) |
| `enableWebhook` | boolean | `false` | Use webhook instead of polling |
| `webhookPort` | number | `3456` | Webhook server port (1024-65535) |
| `showIncomingInEditor` | boolean | `true` | Show incoming messages as notifications |

### Message Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parseMode` | string | `"Markdown"` | Parse mode: Markdown, HTML, MarkdownV2 |
| `maxCodeLength` | number | `3000` | Max code snippet length |
| `messagePrefix` | string | `"💻 VS Code"` | Prefix for sent messages |
| `silentNotifications` | boolean | `false` | Send with silent mode |
| `workspaceName` | string | `""` | Custom workspace name |

### Diagnostics

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `diagnosticsMinSeverity` | string | `"Error"` | Min severity: Error, Warning, Info, Hint |
| `autoSendOnError` | boolean | `false` | Auto-send on new error |

### UI

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showStatusBar` | boolean | `true` | Show connection status in status bar |
| `logRetentionDays` | number | `7` | Days to retain message logs |
| `codeSnippetLanguage` | boolean | `true` | Include language in code blocks |

---

## 💡 Use Cases

### Remote Development
Work from any device while your dev environment runs elsewhere. Execute commands, check git status, and monitor builds from your phone.

### CI/CD Monitoring
Get instant notifications when builds fail. Share logs and diagnostics with your team directly from VS Code.

### Team Collaboration
Send code snippets, error reports, and status updates to group chats. Multiple profiles let you separate work and personal projects.

### Offline Queue
Queue messages when offline. They'll send automatically when connectivity is restored.

---

## 🛠️ Development

> **For contributors:** See [AGENTS.md](./AGENTS.md) for coding guidelines, build commands, and project structure.

```bash
git clone https://github.com/unn-Known1/telegram-bridge-vscode
cd telegram-bridge-vscode
npm install
npm run watch       # TypeScript watch mode
npm run lint        # Must pass before committing
npm run compile     # Build TypeScript
# Press F5 in VS Code to launch Extension Development Host
```

```bash
npm run package     # → telegram-bridge-2.0.0.vsix
code --install-extension telegram-bridge-2.0.0.vsix
```

### Requirements
- VS Code 1.85.0 or later
- Node.js 18+ (for development)

---

## 🗺️ Roadmap

Upcoming features:
- [ ] Attach images from clipboard
- [ ] Recurring scheduled messages (cron)
- [ ] GitHub/GitLab CI webhook relay
- [ ] Message search in inbox

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

---

## 🔒 Privacy & Security

- Credentials stored only in VS Code's local `settings.json`
- All API calls go **directly** to `api.telegram.org` over HTTPS
- **Zero telemetry** — never phones home
- **Zero runtime dependencies** — 100% Node.js built-ins

---

## 📜 License

[MIT](./LICENSE) © Telegram Bridge Contributors

---

## ⭐ Support

If you find Telegram Bridge useful, please:
- Star the [GitHub repository](https://github.com/unn-Known1/telegram-bridge-vscode)
- Leave a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=telegram-bridge.telegram-bridge)
- Report issues on [GitHub](https://github.com/unn-Known1/telegram-bridge-vscode/issues)

---

<p align="center"><strong>Built for developers who want to control their workflow from Telegram.</strong></p>
