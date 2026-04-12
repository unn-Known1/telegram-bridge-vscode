# Telegram Bridge - Setup Guide

A step-by-step guide to getting started with Telegram Bridge.

## Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.85.0 or later
- A Telegram account
- A Telegram bot (created via @BotFather)

---

## Step 1: Install the Extension

### From VS Code Marketplace
1. Open VS Code
2. Go to **Extensions** (`Ctrl+Shift+X`)
3. Search for "Telegram Bridge"
4. Click **Install**

### From VSIX (Development Version)
```bash
# Download the latest .vsix from releases
code --install-extension telegram-bridge-2.1.0.vsix
```

---

## Step 2: Create a Telegram Bot

1. Open Telegram and search for **[@BotFather](https://t.me/BotFather)**
2. Send `/newbot`
3. Follow the prompts:
   - Choose a name (e.g., "My Dev Bot")
   - Choose a username (must end in `bot`, e.g., `mydevbot`)
4. BotFather will give you a token like: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`

**Keep this token safe!** It allows access to your bot.

---

## Step 3: Get Your Chat ID

The chat ID identifies where messages will be sent.

### Option A: Personal Chat (Easiest)

1. Search for **[@userinfobot](https://t.me/userinfobot)** in Telegram
2. Send any message
3. The bot will reply with your user ID (e.g., `123456789`)

### Option B: Group Chat

1. Add your bot to the group:
   - Go to your group → Add members → Search for your bot's username
2. Send a message in the group (anything)
3. Get the group ID using one of these methods:

**Using @userinfobot:**
1. Add **[@userinfobot](https://t.me/userinfobot)** to the group
2. It will reply with the group ID (e.g., `-123456789`)

**Using BotFather:**
1. Forward any message from the group to **[@BotFather](https://t.me/BotFather)**
2. It will show you the chat ID

### Option C: Channel

**Public channel:** Use the channel username (e.g., `@mychannel`)

**Private channel:** You need the numeric channel ID. Forward a message from the channel to **[@userinfobot](https://t.me/userinfobot)** (must be an admin).

---

## Step 4: Configure the Extension

### Using Command Palette

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Telegram Bridge: Configure"
3. Select the command
4. Enter your Bot Token
5. Enter your Chat ID
6. Click **Save & Connect**

### Using Settings UI

1. Go to **File → Preferences → Settings** (`Ctrl+,`)
2. Search for "telegram"
3. Fill in:
   - `Telegram Bridge: Bot Token`
   - `Telegram Bridge: Chat Id`

---

## Step 5: Test Your Connection

1. Press `Ctrl+Shift+T` (or use **Command Palette → Telegram Bridge: Send Message**)
2. Type "Hello from Telegram Bridge!"
3. Send it
4. You should see the message appear in your Telegram chat

**Troubleshooting:**
- If the message doesn't appear, check the status bar at the bottom of VS Code
- A red ❌ means disconnected
- A green ✓ means connected
- Hover over the status item for connection details

---

## Step 6: Configure Notifications (Optional)

By default, only build success/failure notifications are enabled.

### Enable Notifications

| Notification | How to Enable |
|--------------|---------------|
| Debug start/stop | Settings → `notifyOnDebugStart` / `notifyOnDebugStop` |
| Git commits | Settings → `notifyOnGitCommit` |
| File changes | Settings → `notifyOnFileChange` + `fileWatcherPatterns` |
| Diagnostics | Settings → `notifyOnDiagnosticError` |

### Configure in Settings JSON

```json
{
  "telegramBridge.notifyOnBuildSuccess": true,
  "telegramBridge.notifyOnBuildFailure": true,
  "telegramBridge.notifyOnDebugStart": true,
  "telegramBridge.notifyOnGitCommit": true,
  "telegramBridge.fileWatcherPatterns": ["*.ts", "src/**"]
}
```

---

## Step 7: Set Up Multiple Profiles (Optional)

Create separate profiles for different projects or bots:

1. Press `Ctrl+Shift+P` → **Telegram Bridge: Add Profile**
2. Name your profile (e.g., "work", "personal", "team")
3. Enter the bot token and chat ID for this profile
4. To switch profiles: **Telegram Bridge: Switch Profile**

---

## Step 8: Set Up Per-Project Config (Optional)

For workspace-specific settings, create a `.telegram-bridge.json` file in your project root:

```json
{
  "workspaceName": "My Awesome Project",
  "messagePrefix": "🚀 MyApp",
  "notifyOnBuildSuccess": true,
  "notifyOnBuildFailure": true,
  "additionalChats": ["@teamchannel", "-1001234567890"]
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Send message |
| `Ctrl+Shift+K` | Open composer |
| `Ctrl+Shift+S` | Send selected code |
| `Ctrl+Shift+E` | Send workspace errors |

---

## Troubleshooting

### "Connection Failed" Error

1. Verify your bot token is correct
2. Verify your chat ID is correct
3. Make sure you've started a conversation with your bot in Telegram
4. Check the status bar for connection status

### Bot Not Responding to Commands

1. Make sure the bot was added to the chat/group/channel
2. For groups, you may need to enable "Allow Groups" in BotFather settings
3. Check that polling is enabled: **Telegram Bridge: Toggle Incoming Messages**

### Messages Not Being Received

1. Ensure `enablePolling` is set to `true` in settings
2. Check the Inbox view in the Telegram Bridge sidebar
3. Verify your webhook isn't conflicting (if enabled)

### Extension Not Activating

1. Check VS Code version (requires 1.85.0+)
2. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
3. Check the Extension Host console: `Help → Toggle Developer Tools`

---

## Getting Help

- [Report a bug](https://github.com/unn-Known1/telegram-bridge-vscode/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/unn-Known1/telegram-bridge-vscode/issues/new?template=feature_request.md)
- [View documentation](https://github.com/unn-Known1/telegram-bridge-vscode#readme)
