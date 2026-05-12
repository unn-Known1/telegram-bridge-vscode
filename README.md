# ✈️ Telegram-Bridge-VSCode

Connect VS Code to any Telegram bot — get real-time build updates, error alerts, and code notifications directly in your Telegram chat.

![VSCode](https://img.shields.io/badge/VS%20Code-Extension-blueviolet?style=for-the-badge)
![Telegram](https://img.shields.io/badge/Telegram-Bot-API-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge)

## ✨ Features

- **📨 Telegram notifications** — build success, failures, test results right in your chat
- **⚡ Zero config** — just add your Bot Token and User ID, you're done
- **🎯 Live output streaming** — see compile logs, test runs, and error traces in real time
- **🔔 Custom triggers** — define what events send you a message (pass, fail, specific log patterns)
- **🧩 Language server agnostic** — works with any language in VS Code (Python, Rust, Go, etc.)

## 🚀 Quick Start

```bash
git clone https://github.com/unn-known1/telegram-bridge-vscode.git
cd telegram-bridge-vscode
npm install
code .
```

Then in VS Code:
1. Open Command Palette → `Telegram: Configure`
2. Paste your **Bot Token** (from [@BotFather](https://t.me/BotFather))
3. Paste your **Chat ID** (from [@userinfobot](https://t.me/userinfobot))
4. Done — your first notification will arrive on next build

## ⚙️ Configuration

```json
{
  "telegramBridge.botToken": "YOUR_BOT_TOKEN",
  "telegramBridge.userId": "YOUR_CHAT_ID",
  "telegramBridge.onFail": true,
  "telegramBridge.onSuccess": true,
  "telegramBridge.filter": "error|Error|ERROR"
}
```

## 🏗️ Stack

- **Runtime:** VS Code Extension API
- **Language:** TypeScript
- **HTTP:** Telegram Bot API via fetch

## 💡 Why?

- Don't want to tab away from your editor to check CI/CD
- Get alerted immediately when a long-running build fails
- Share build status with your team via a group chat

## ⭐ If this helped you, star the repo!

MIT License — built with 💻 by [Gaurang Patel](https://github.com/unn-known1)