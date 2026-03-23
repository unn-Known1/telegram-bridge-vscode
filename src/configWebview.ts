import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { StatusBarManager } from './statusBarManager';

export class ConfigWebview {
  static currentPanel: vscode.WebviewPanel | undefined;

  static show(
    context: vscode.ExtensionContext,
    telegramService: TelegramService,
    statusBarManager: StatusBarManager
  ): void {
    if (ConfigWebview.currentPanel) {
      ConfigWebview.currentPanel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'telegramBridgeConfig',
      'Telegram Bridge — Configuration',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    ConfigWebview.currentPanel = panel;

    const config = vscode.workspace.getConfiguration('telegramBridge');

    panel.webview.html = ConfigWebview._getHtml({
      botToken: config.get<string>('botToken', ''),
      chatId: config.get<string>('chatId', ''),
      messagePrefix: config.get<string>('messagePrefix', '💻 VS Code'),
      notifyOnBuildSuccess: config.get<boolean>('notifyOnBuildSuccess', true),
      notifyOnBuildFailure: config.get<boolean>('notifyOnBuildFailure', true),
      notifyOnDebugStart: config.get<boolean>('notifyOnDebugStart', false),
      notifyOnDebugStop: config.get<boolean>('notifyOnDebugStop', false),
      notifyOnFileSave: config.get<boolean>('notifyOnFileSave', false),
      parseMode: config.get<string>('parseMode', 'Markdown'),
      maxCodeLength: config.get<number>('maxCodeLength', 3000),
      connected: telegramService.isConnected()
    });

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'save': {
          const cfg = vscode.workspace.getConfiguration('telegramBridge');
          await cfg.update('botToken', message.botToken, vscode.ConfigurationTarget.Global);
          await cfg.update('chatId', message.chatId, vscode.ConfigurationTarget.Global);
          await cfg.update('messagePrefix', message.messagePrefix, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnBuildSuccess', message.notifyOnBuildSuccess, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnBuildFailure', message.notifyOnBuildFailure, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnDebugStart', message.notifyOnDebugStart, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnDebugStop', message.notifyOnDebugStop, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnFileSave', message.notifyOnFileSave, vscode.ConfigurationTarget.Global);
          await cfg.update('parseMode', message.parseMode, vscode.ConfigurationTarget.Global);
          await cfg.update('maxCodeLength', message.maxCodeLength, vscode.ConfigurationTarget.Global);

          // Connect
          if (message.botToken && message.chatId) {
            panel.webview.postMessage({ command: 'connecting' });
            const ok = await telegramService.connect(message.botToken, message.chatId);
            panel.webview.postMessage({ command: 'connectionResult', success: ok });
            statusBarManager.update();
            if (ok) {
              vscode.window.showInformationMessage('✅ Telegram Bridge connected successfully!');
            } else {
              vscode.window.showErrorMessage('❌ Connection failed. Check your Bot Token and Chat ID.');
            }
          }
          break;
        }

        case 'test': {
          if (!telegramService.isConnected()) {
            panel.webview.postMessage({ command: 'testResult', success: false, error: 'Not connected' });
            return;
          }
          const ok = await telegramService.testConnection();
          panel.webview.postMessage({ command: 'testResult', success: ok });
          break;
        }

        case 'disconnect': {
          await telegramService.disconnect();
          statusBarManager.update();
          panel.webview.postMessage({ command: 'disconnected' });
          break;
        }

        case 'openBotFather': {
          vscode.env.openExternal(vscode.Uri.parse('https://t.me/BotFather'));
          break;
        }

        case 'getChatId': {
          vscode.env.openExternal(vscode.Uri.parse('https://t.me/userinfobot'));
          break;
        }
      }
    });

    panel.onDidDispose(() => {
      ConfigWebview.currentPanel = undefined;
    });
  }

  private static _getHtml(state: {
    botToken: string;
    chatId: string;
    messagePrefix: string;
    notifyOnBuildSuccess: boolean;
    notifyOnBuildFailure: boolean;
    notifyOnDebugStart: boolean;
    notifyOnDebugStop: boolean;
    notifyOnFileSave: boolean;
    parseMode: string;
    maxCodeLength: number;
    connected: boolean;
  }): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Telegram Bridge Configuration</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --input-bg: var(--vscode-input-background);
    --input-border: var(--vscode-input-border);
    --input-fg: var(--vscode-input-foreground);
    --button-bg: var(--vscode-button-background);
    --button-fg: var(--vscode-button-foreground);
    --button-hover: var(--vscode-button-hoverBackground);
    --panel-bg: var(--vscode-editorGroupHeader-tabsBackground);
    --accent: #229ED9;
    --success: #4CAF50;
    --error: #f44336;
    --warning: #FF9800;
    --radius: 8px;
    --shadow: 0 2px 12px rgba(0,0,0,0.25);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--fg);
    background: var(--bg);
    padding: 0;
    min-height: 100vh;
  }

  .header {
    background: linear-gradient(135deg, #1a1f35 0%, #162033 50%, #0d1b2a 100%);
    padding: 32px 40px;
    display: flex;
    align-items: center;
    gap: 20px;
    border-bottom: 1px solid rgba(34,158,217,0.2);
    position: relative;
    overflow: hidden;
  }

  .header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(34,158,217,0.12) 0%, transparent 70%);
    border-radius: 50%;
  }

  .telegram-logo {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #2AABEE, #229ED9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
    box-shadow: 0 4px 20px rgba(34,158,217,0.4);
  }

  .header-text h1 {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.3px;
  }

  .header-text p {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    margin-top: 4px;
  }

  .status-badge {
    margin-left: auto;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-badge.connected { background: rgba(76,175,80,0.15); color: #4CAF50; border: 1px solid rgba(76,175,80,0.3); }
  .status-badge.disconnected { background: rgba(255,152,0,0.15); color: #FF9800; border: 1px solid rgba(255,152,0,0.3); }

  .status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  .connected .status-dot { background: #4CAF50; }
  .disconnected .status-dot { background: #FF9800; animation: none; }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }

  .content {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 40px;
  }

  .section {
    background: var(--panel-bg);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field { margin-bottom: 16px; }
  .field:last-child { margin-bottom: 0; }

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
    color: rgba(255,255,255,0.75);
    letter-spacing: 0.2px;
  }

  .label-hint {
    font-weight: 400;
    color: rgba(255,255,255,0.35);
    font-size: 11px;
    margin-left: 6px;
  }

  input[type="text"], input[type="password"], input[type="number"], select {
    width: 100%;
    padding: 10px 12px;
    background: var(--input-bg);
    border: 1px solid var(--input-border, rgba(255,255,255,0.1));
    border-radius: 6px;
    color: var(--input-fg);
    font-size: 13px;
    font-family: var(--vscode-font-family);
    outline: none;
    transition: border-color 0.2s;
  }

  input[type="text"]:focus, input[type="password"]:focus, input[type="number"]:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(34,158,217,0.15);
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .input-row input { flex: 1; }

  .btn {
    padding: 10px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-primary {
    background: var(--accent);
    color: #fff;
  }
  .btn-primary:hover { background: #1a8fc7; transform: translateY(-1px); }

  .btn-secondary {
    background: rgba(255,255,255,0.07);
    color: var(--fg);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.12); }

  .btn-danger {
    background: rgba(244,67,54,0.15);
    color: #f44336;
    border: 1px solid rgba(244,67,54,0.25);
  }
  .btn-danger:hover { background: rgba(244,67,54,0.25); }

  .btn-success {
    background: rgba(76,175,80,0.15);
    color: #4CAF50;
    border: 1px solid rgba(76,175,80,0.25);
  }
  .btn-success:hover { background: rgba(76,175,80,0.25); }

  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .toggles-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .toggle-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .toggle-item:hover { background: rgba(255,255,255,0.07); }

  .toggle-label { font-size: 12px; color: rgba(255,255,255,0.8); }

  .toggle-switch {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }
  .toggle-switch input { display: none; }
  .toggle-track {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    transition: background 0.2s;
    cursor: pointer;
  }
  .toggle-track::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 2px;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  input:checked + .toggle-track { background: var(--accent); }
  input:checked + .toggle-track::after { transform: translateX(16px); }

  .actions-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
  }

  .alert {
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 13px;
    margin-top: 16px;
    display: none;
    align-items: center;
    gap: 10px;
  }
  .alert.show { display: flex; }
  .alert-success { background: rgba(76,175,80,0.12); color: #4CAF50; border: 1px solid rgba(76,175,80,0.25); }
  .alert-error { background: rgba(244,67,54,0.12); color: #f44336; border: 1px solid rgba(244,67,54,0.25); }
  .alert-info { background: rgba(34,158,217,0.12); color: var(--accent); border: 1px solid rgba(34,158,217,0.25); }

  .hint {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    margin-top: 5px;
    line-height: 1.4;
  }

  .hint a {
    color: var(--accent);
    text-decoration: none;
    cursor: pointer;
  }
  .hint a:hover { text-decoration: underline; }

  .loading-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 560px) {
    .content { padding: 20px; }
    .header { padding: 20px; }
    .toggles-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="telegram-logo">✈️</div>
  <div class="header-text">
    <h1>Telegram Bridge</h1>
    <p>Connect your IDE to any Telegram bot</p>
  </div>
  <div class="status-badge ${state.connected ? 'connected' : 'disconnected'}" id="statusBadge">
    <span class="status-dot"></span>
    <span id="statusText">${state.connected ? 'Connected' : 'Not Connected'}</span>
  </div>
</div>

<div class="content">

  <!-- Credentials -->
  <div class="section">
    <div class="section-title">🔑 Bot Credentials</div>

    <div class="field">
      <label>Bot Token <span class="label-hint">from @BotFather</span></label>
      <div class="input-row">
        <input type="password" id="botToken" placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
          value="${state.botToken}" />
        <button class="btn btn-secondary" onclick="toggleVisibility('botToken', this)">Show</button>
      </div>
      <p class="hint">
        Don't have a bot yet? <a onclick="openBotFather()">Create one with @BotFather on Telegram →</a>
      </p>
    </div>

    <div class="field">
      <label>Chat ID <span class="label-hint">target chat, group or channel</span></label>
      <div class="input-row">
        <input type="text" id="chatId" placeholder="-1001234567890 or @channelname"
          value="${state.chatId}" />
        <button class="btn btn-secondary" onclick="getChatId()">Find ID</button>
      </div>
      <p class="hint">
        Not sure of your Chat ID? <a onclick="getChatId()">Use @userinfobot to find it →</a>
      </p>
    </div>

    <div id="alertBox" class="alert"></div>

    <div class="actions-row">
      <button class="btn btn-primary" id="saveBtn" onclick="save()">
        ✅ Save & Connect
      </button>
      <button class="btn btn-success" id="testBtn" onclick="testConnection()" ${!state.connected ? 'disabled' : ''}>
        🔗 Test Connection
      </button>
      <button class="btn btn-danger" id="disconnectBtn" onclick="disconnect()" ${!state.connected ? 'disabled' : ''}>
        Disconnect
      </button>
    </div>
  </div>

  <!-- Notifications -->
  <div class="section">
    <div class="section-title">🔔 Automatic Notifications</div>
    <div class="toggles-grid">
      <label class="toggle-item" onclick="">
        <span class="toggle-label">✅ Build Success</span>
        <span class="toggle-switch">
          <input type="checkbox" id="notifyBuildSuccess" ${state.notifyOnBuildSuccess ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </span>
      </label>
      <label class="toggle-item">
        <span class="toggle-label">❌ Build Failure</span>
        <span class="toggle-switch">
          <input type="checkbox" id="notifyBuildFailure" ${state.notifyOnBuildFailure ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </span>
      </label>
      <label class="toggle-item">
        <span class="toggle-label">🐛 Debug Start</span>
        <span class="toggle-switch">
          <input type="checkbox" id="notifyDebugStart" ${state.notifyOnDebugStart ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </span>
      </label>
      <label class="toggle-item">
        <span class="toggle-label">🏁 Debug Stop</span>
        <span class="toggle-switch">
          <input type="checkbox" id="notifyDebugStop" ${state.notifyOnDebugStop ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </span>
      </label>
      <label class="toggle-item">
        <span class="toggle-label">💾 File Save</span>
        <span class="toggle-switch">
          <input type="checkbox" id="notifyFileSave" ${state.notifyOnFileSave ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </span>
      </label>
    </div>
  </div>

  <!-- Advanced -->
  <div class="section">
    <div class="section-title">⚙️ Advanced Settings</div>

    <div class="field">
      <label>Message Parse Mode</label>
      <select id="parseMode">
        <option value="Markdown" ${state.parseMode === 'Markdown' ? 'selected' : ''}>Markdown</option>
        <option value="HTML" ${state.parseMode === 'HTML' ? 'selected' : ''}>HTML</option>
        <option value="MarkdownV2" ${state.parseMode === 'MarkdownV2' ? 'selected' : ''}>MarkdownV2</option>
      </select>
    </div>

    <div class="field">
      <label>Max Code Length <span class="label-hint">chars before sending as file</span></label>
      <input type="number" id="maxCodeLength" value="${state.maxCodeLength}" min="100" max="10000" />
    </div>

    <div class="field">
      <label>Message Prefix</label>
      <input type="text" id="messagePrefix" value="${state.messagePrefix}" placeholder="💻 VS Code" />
    </div>
  </div>

</div>

<script>
  const vscode = acquireVsCodeApi();

  function toggleVisibility(id, btn) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Hide';
    } else {
      input.type = 'password';
      btn.textContent = 'Show';
    }
  }

  function showAlert(msg, type) {
    const box = document.getElementById('alertBox');
    box.className = 'alert show alert-' + type;
    box.textContent = msg;
    setTimeout(() => { box.className = 'alert'; }, 5000);
  }

  function setStatus(connected) {
    const badge = document.getElementById('statusBadge');
    const text = document.getElementById('statusText');
    badge.className = 'status-badge ' + (connected ? 'connected' : 'disconnected');
    text.textContent = connected ? 'Connected' : 'Not Connected';
    document.getElementById('testBtn').disabled = !connected;
    document.getElementById('disconnectBtn').disabled = !connected;
  }

  function save() {
    const btn = document.getElementById('saveBtn');
    btn.innerHTML = '<span class="loading-spinner"></span> Connecting...';
    btn.disabled = true;

    vscode.postMessage({
      command: 'save',
      botToken: document.getElementById('botToken').value.trim(),
      chatId: document.getElementById('chatId').value.trim(),
      messagePrefix: document.getElementById('messagePrefix').value,
      notifyOnBuildSuccess: document.getElementById('notifyBuildSuccess').checked,
      notifyOnBuildFailure: document.getElementById('notifyBuildFailure').checked,
      notifyOnDebugStart: document.getElementById('notifyDebugStart').checked,
      notifyOnDebugStop: document.getElementById('notifyDebugStop').checked,
      notifyOnFileSave: document.getElementById('notifyFileSave').checked,
      parseMode: document.getElementById('parseMode').value,
      maxCodeLength: parseInt(document.getElementById('maxCodeLength').value) || 3000
    });
  }

  function testConnection() {
    vscode.postMessage({ command: 'test' });
    showAlert('Sending test message to Telegram...', 'info');
  }

  function disconnect() {
    vscode.postMessage({ command: 'disconnect' });
  }

  function openBotFather() {
    vscode.postMessage({ command: 'openBotFather' });
  }

  function getChatId() {
    vscode.postMessage({ command: 'getChatId' });
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    const saveBtn = document.getElementById('saveBtn');

    switch (msg.command) {
      case 'connecting':
        break;

      case 'connectionResult':
        saveBtn.textContent = '✅ Save & Connect';
        saveBtn.disabled = false;
        if (msg.success) {
          showAlert('🎉 Connected successfully! You can now send messages to Telegram.', 'success');
          setStatus(true);
        } else {
          showAlert('❌ Connection failed. Please verify your Bot Token and Chat ID.', 'error');
          setStatus(false);
        }
        break;

      case 'testResult':
        if (msg.success) {
          showAlert('✅ Test message sent! Check your Telegram.', 'success');
        } else {
          showAlert('❌ Test failed: ' + (msg.error || 'Unknown error'), 'error');
        }
        break;

      case 'disconnected':
        setStatus(false);
        showAlert('Disconnected from Telegram.', 'info');
        break;
    }
  });
</script>
</body>
</html>`;
  }
}
