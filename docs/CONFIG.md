# Telegram Bridge - Configuration Reference

Complete reference for all configuration options.

---

## Connection Settings

### `telegramBridge.botToken`
- **Type:** `string`
- **Default:** `""`
- **Description:** Your Telegram Bot API token from [@BotFather](https://t.me/BotFather)
- **Example:** `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`

### `telegramBridge.chatId`
- **Type:** `string`
- **Default:** `""`
- **Description:** Primary target chat/group/channel ID
- **Examples:**
  - Personal: `123456789`
  - Group: `-123456789`
  - Channel: `@channelname` or `-1001234567890`

### `telegramBridge.activeProfile`
- **Type:** `string`
- **Default:** `"default"`
- **Description:** Name of the active connection profile

### `telegramBridge.profiles`
- **Type:** `object`
- **Default:** `{}`
- **Description:** Named profiles for multiple bot configurations
- **Example:**
```json
{
  "work": {
    "label": "Work",
    "token": "bot:work-token",
    "chatId": "-123456"
  },
  "personal": {
    "label": "Personal",
    "token": "bot:personal-token",
    "chatId": "999888777"
  }
}
```

### `telegramBridge.additionalChats`
- **Type:** `array` of strings
- **Default:** `[]`
- **Description:** Additional chat IDs for broadcast messages
- **Example:** `["-1001234567890", "@teampchannel"]`

---

## Notification Settings

### `telegramBridge.notifyOnBuildSuccess`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Send notification when a build task completes successfully

### `telegramBridge.notifyOnBuildFailure`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Send notification when a build task fails

### `telegramBridge.notifyOnDebugStart`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send notification when a debug session starts

### `telegramBridge.notifyOnDebugStop`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send notification when a debug session stops

### `telegramBridge.notifyOnFileSave`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send notification when a file is saved

### `telegramBridge.notifyOnFileChange`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send notification when watched files change

### `telegramBridge.fileWatcherPatterns`
- **Type:** `array` of strings
- **Default:** `[]`
- **Description:** Glob patterns for file watching
- **Examples:** `["*.ts", "src/**", "*.json"]`

### `telegramBridge.notifyOnGitCommit`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send notification when a git commit is made

### `telegramBridge.notifyOnDiagnosticError`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send notification when new errors appear in Problems panel

---

## Incoming Messages

### `telegramBridge.enablePolling`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable polling for incoming messages from Telegram

### `telegramBridge.pollingInterval`
- **Type:** `number`
- **Default:** `5`
- **Minimum:** `3`
- **Description:** Polling interval in seconds

### `telegramBridge.enableWebhook`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Use webhook instead of polling (not yet fully implemented)

### `telegramBridge.webhookPort`
- **Type:** `number`
- **Default:** `3456`
- **Range:** `1024` - `65535`
- **Description:** Local port for webhook server

### `telegramBridge.showIncomingInEditor`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Show incoming messages as VS Code notifications

---

## Message Settings

### `telegramBridge.parseMode`
- **Type:** `string`
- **Default:** `"Markdown"`
- **Options:** `"Markdown"`, `"HTML"`, `"MarkdownV2"`
- **Description:** How to parse message formatting

### `telegramBridge.maxCodeLength`
- **Type:** `number`
- **Default:** `3000`
- **Description:** Maximum character length for inline code snippets

### `telegramBridge.messagePrefix`
- **Type:** `string`
- **Default:** `"💻 VS Code"`
- **Description:** Prefix added to outgoing messages

### `telegramBridge.silentNotifications`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Send messages with Telegram's silent mode (no notification sound)

### `telegramBridge.workspaceName`
- **Type:** `string`
- **Default:** `""`
- **Description:** Custom workspace name (auto-detected if empty)

### `telegramBridge.codeSnippetLanguage`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Include language identifier in code blocks

---

## Diagnostics

### `telegramBridge.diagnosticsMinSeverity`
- **Type:** `string`
- **Default:** `"Error"`
- **Options:** `"Error"`, `"Warning"`, `"Information"`, `"Hint"`
- **Description:** Minimum severity level to include in diagnostics reports

### `telegramBridge.autoSendOnError`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Automatically send diagnostic report when new errors appear

---

## UI & Display

### `telegramBridge.showStatusBar`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Show connection status in VS Code status bar

### `telegramBridge.logRetentionDays`
- **Type:** `number`
- **Default:** `7`
- **Description:** Days to retain message logs

---

## Complete Settings Example

```json
{
  "telegramBridge.botToken": "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ",
  "telegramBridge.chatId": "123456789",
  "telegramBridge.activeProfile": "default",
  "telegramBridge.profiles": {},
  "telegramBridge.additionalChats": [],

  "telegramBridge.notifyOnBuildSuccess": true,
  "telegramBridge.notifyOnBuildFailure": true,
  "telegramBridge.notifyOnDebugStart": false,
  "telegramBridge.notifyOnDebugStop": false,
  "telegramBridge.notifyOnFileSave": false,
  "telegramBridge.notifyOnFileChange": false,
  "telegramBridge.fileWatcherPatterns": ["*.ts", "src/**"],
  "telegramBridge.notifyOnGitCommit": false,
  "telegramBridge.notifyOnDiagnosticError": false,

  "telegramBridge.enablePolling": false,
  "telegramBridge.pollingInterval": 5,
  "telegramBridge.enableWebhook": false,
  "telegramBridge.webhookPort": 3456,
  "telegramBridge.showIncomingInEditor": true,

  "telegramBridge.parseMode": "Markdown",
  "telegramBridge.maxCodeLength": 3000,
  "telegramBridge.messagePrefix": "💻 VS Code",
  "telegramBridge.silentNotifications": false,
  "telegramBridge.workspaceName": "",
  "telegramBridge.codeSnippetLanguage": true,

  "telegramBridge.diagnosticsMinSeverity": "Error",
  "telegramBridge.autoSendOnError": false,

  "telegramBridge.showStatusBar": true,
  "telegramBridge.logRetentionDays": 7
}
```

---

## Notification-Only Mode

A secure configuration for CI/CD monitoring without code execution capabilities.

### Use Case

Developers who only want build/test/debug alerts without the ability to execute code from Telegram. This is ideal for:

- CI/CD pipeline monitoring
- Team notification channels
- Read-only status updates
- Security-conscious environments

### Notification-Only Configuration

```json
{
  "telegramBridge.botToken": "your-bot-token",
  "telegramBridge.chatId": "your-chat-id",

  "telegramBridge.activeProfile": "notifications-only",
  "telegramBridge.profiles": {
    "notifications-only": {
      "label": "Notifications Only",
      "token": "your-bot-token",
      "chatId": "your-chat-id"
    }
  },

  "telegramBridge.notifyOnBuildSuccess": true,
  "telegramBridge.notifyOnBuildFailure": true,
  "telegramBridge.notifyOnDebugStart": true,
  "telegramBridge.notifyOnDebugStop": true,
  "telegramBridge.notifyOnGitCommit": true,
  "telegramBridge.notifyOnDiagnosticError": true,

  "telegramBridge.enablePolling": false,
  "telegramBridge.showIncomingInEditor": false,

  "telegramBridge.parseMode": "Markdown",
  "telegramBridge.silentNotifications": false,
  "telegramBridge.messagePrefix": "CI/CD"
}
```

### Key Settings for Notification-Only

| Setting | Value | Purpose |
|---------|-------|---------|
| `enablePolling` | `false` | Disable incoming message polling |
| `showIncomingInEditor` | `false` | Don't show Telegram messages in editor |
| `notifyOnBuildSuccess` | `true` | Send build success notifications |
| `notifyOnBuildFailure` | `true` | Send build failure alerts |
| `notifyOnDebugStart/Stop` | `true` | Debug session notifications |
| `notifyOnGitCommit` | `true` | Git commit notifications |

> **Note:** Currently, "notification-only mode" is achieved by disabling polling (`enablePolling: false`) and enabling only the notification settings you need. Future versions may include a dedicated `notificationOnlyMode` toggle setting.

### Profile Presets

You can create preset profiles for different use cases:

```json
{
  "telegramBridge.profiles": {
    "build-monitor": {
      "label": "Build Monitor",
      "notifyOnBuildSuccess": true,
      "notifyOnBuildFailure": true,
      "notifyOnGitCommit": true,
      "enablePolling": false
    },
    "debug-only": {
      "label": "Debug Only",
      "notifyOnDebugStart": true,
      "notifyOnDebugStop": true,
      "enablePolling": false
    },
    "full-bridge": {
      "label": "Full Bridge",
      "enablePolling": true,
      "showIncomingInEditor": true
    }
  }
}
```

### Minimal Notification Setup

For the simplest notification-only setup:

```json
{
  "telegramBridge.botToken": "YOUR_BOT_TOKEN",
  "telegramBridge.chatId": "YOUR_CHAT_ID",
  "telegramBridge.enablePolling": false,
  "telegramBridge.notifyOnBuildSuccess": true,
  "telegramBridge.notifyOnBuildFailure": true
}
```

---

## Environment Variables

Not currently supported. All configuration is stored in VS Code's settings.

---

## Per-Project Configuration

Create `.telegram-bridge.json` in your project root to override settings per workspace:

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

Settings in `.telegram-bridge.json` take precedence over global VS Code settings.
