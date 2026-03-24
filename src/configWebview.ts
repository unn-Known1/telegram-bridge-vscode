import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { StatusBarManager } from './statusBarManager';
import { TemplateManager } from './templateManager';

export class ConfigWebview {
  static currentPanel: vscode.WebviewPanel | undefined;

  static show(
    context: vscode.ExtensionContext,
    telegramService: TelegramService,
    statusBarManager: StatusBarManager,
    templateManager: TemplateManager,
    initialTab?: string
  ): void {
    if (ConfigWebview.currentPanel) {
      ConfigWebview.currentPanel.reveal();
      if (initialTab) {
        ConfigWebview.currentPanel.webview.postMessage({ command: 'switchTab', tab: initialTab });
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'telegramBridgeConfig',
      '✈️ Telegram Bridge',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    ConfigWebview.currentPanel = panel;

    const buildState = () => {
      const cfg = vscode.workspace.getConfiguration('telegramBridge');
      return {
        botToken: cfg.get<string>('botToken', ''),
        chatId: cfg.get<string>('chatId', ''),
        messagePrefix: cfg.get<string>('messagePrefix', '💻 VS Code'),
        notifyOnBuildSuccess:    cfg.get<boolean>('notifyOnBuildSuccess', true),
        notifyOnBuildFailure:    cfg.get<boolean>('notifyOnBuildFailure', true),
        notifyOnDebugStart:      cfg.get<boolean>('notifyOnDebugStart', false),
        notifyOnDebugStop:      cfg.get<boolean>('notifyOnDebugStop', false),
        notifyOnFileSave:       cfg.get<boolean>('notifyOnFileSave', false),
        notifyOnFileChange:     cfg.get<boolean>('notifyOnFileChange', false),
        fileWatcherPatterns:    cfg.get<string[]>('fileWatcherPatterns', []).join('\n'),
        notifyOnGitCommit:      cfg.get<boolean>('notifyOnGitCommit', false),
        notifyOnDiagnosticError: cfg.get<boolean>('notifyOnDiagnosticError', false),
        enablePolling:          cfg.get<boolean>('enablePolling', false),
        pollingInterval:        cfg.get<number>('pollingInterval', 5),
        enableWebhook:          cfg.get<boolean>('enableWebhook', false),
        webhookPort:            cfg.get<number>('webhookPort', 3456),
        silentNotifications:    cfg.get<boolean>('silentNotifications', false),
        parseMode:              cfg.get<string>('parseMode', 'Markdown'),
        maxCodeLength:          cfg.get<number>('maxCodeLength', 3000),
        additionalChats:        cfg.get<string[]>('additionalChats', []).join('\n'),
        autoSendOnError:        cfg.get<boolean>('autoSendOnError', false),
        connected:              telegramService.isConnected(),
        botInfo:                telegramService.getBotInfo(),
        templates:              templateManager.getAllTemplates(),
        initialTab: initialTab ?? 'config',
        offlineQueueLength:     telegramService.getOfflineQueueLength()
      };
    };

    panel.webview.html = ConfigWebview._getHtml(buildState());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'save': {
          const cfg = vscode.workspace.getConfiguration('telegramBridge');
          await cfg.update('botToken', msg.botToken, vscode.ConfigurationTarget.Global);
          await cfg.update('chatId', msg.chatId, vscode.ConfigurationTarget.Global);
          await cfg.update('messagePrefix', msg.messagePrefix, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnBuildSuccess',    msg.notifyOnBuildSuccess,    vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnBuildFailure',    msg.notifyOnBuildFailure,    vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnDebugStart',      msg.notifyOnDebugStart,      vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnDebugStop',       msg.notifyOnDebugStop,       vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnFileSave',        msg.notifyOnFileSave,        vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnGitCommit',       msg.notifyOnGitCommit,       vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnDiagnosticError', msg.notifyOnDiagnosticError, vscode.ConfigurationTarget.Global);
          await cfg.update('notifyOnFileChange',      msg.notifyOnFileChange,      vscode.ConfigurationTarget.Global);
          await cfg.update('enablePolling',           msg.enablePolling,           vscode.ConfigurationTarget.Global);
          await cfg.update('enableWebhook',            msg.enableWebhook,           vscode.ConfigurationTarget.Global);
          await cfg.update('webhookPort',             msg.webhookPort,             vscode.ConfigurationTarget.Global);
          await cfg.update('pollingInterval',         msg.pollingInterval,         vscode.ConfigurationTarget.Global);
          await cfg.update('silentNotifications',     msg.silentNotifications,     vscode.ConfigurationTarget.Global);
          await cfg.update('parseMode',               msg.parseMode,               vscode.ConfigurationTarget.Global);
          await cfg.update('maxCodeLength',           msg.maxCodeLength,           vscode.ConfigurationTarget.Global);
          await cfg.update('autoSendOnError',         msg.autoSendOnError,         vscode.ConfigurationTarget.Global);

          const extraChats = (msg.additionalChats as string).split('\n').map((s: string) => s.trim()).filter(Boolean);
          await cfg.update('additionalChats', extraChats, vscode.ConfigurationTarget.Global);

          if (msg.botToken && msg.chatId) {
            panel.webview.postMessage({ command: 'connecting' });
            const ok = await telegramService.connect(msg.botToken, msg.chatId);
            panel.webview.postMessage({ command: 'connectionResult', success: ok, botInfo: telegramService.getBotInfo() });
            statusBarManager.update();
          }
          break;
        }
        case 'test':
          panel.webview.postMessage({ command: 'testResult', success: await telegramService.testConnection() });
          break;
        case 'disconnect':
          await telegramService.disconnect();
          statusBarManager.update();
          panel.webview.postMessage({ command: 'disconnected' });
          break;
        case 'sendMessage':
          await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Sending…' }, async () => {
            const ok = await telegramService.sendMessage(msg.text);
            panel.webview.postMessage({ command: 'sendResult', success: ok });
          });
          break;
        case 'broadcast':
          await telegramService.broadcast(msg.text);
          panel.webview.postMessage({ command: 'sendResult', success: true });
          break;
        case 'addTemplate':
          await templateManager.addTemplate({ name: msg.name, text: msg.text, description: msg.description, category: msg.category });
          panel.webview.postMessage({ command: 'templatesUpdated', templates: templateManager.getAllTemplates() });
          break;
        case 'deleteTemplate':
          await templateManager.deleteTemplate(msg.id);
          panel.webview.postMessage({ command: 'templatesUpdated', templates: templateManager.getAllTemplates() });
          break;
        case 'sendTemplate': {
          const template = templateManager.getAllTemplates().find(t => t.id === msg.id);
          if (template) {
            const resolved = templateManager.resolveVariables(template.text);
            await telegramService.sendMessage(resolved);
            panel.webview.postMessage({ command: 'sendResult', success: true });
          }
          break;
        }
        case 'openBotFather':
          vscode.env.openExternal(vscode.Uri.parse('https://t.me/BotFather'));
          break;
        case 'getChatId':
          vscode.env.openExternal(vscode.Uri.parse('https://t.me/userinfobot'));
          break;
      }
    });

    panel.onDidDispose(() => { ConfigWebview.currentPanel = undefined; });
  }

  private static _getHtml(state: Record<string, unknown>): string {
    const s = state;
    const templates = (s.templates as Array<{ id: string; name: string; text: string; description?: string; category?: string }>) ?? [];
    const additionalChats = s.additionalChats as string;

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Telegram Bridge</title>
<style>
:root {
  --bg: var(--vscode-editor-background);
  --fg: var(--vscode-editor-foreground);
  --input-bg: var(--vscode-input-background);
  --input-border: var(--vscode-input-border, rgba(255,255,255,0.12));
  --input-fg: var(--vscode-input-foreground);
  --btn-bg: var(--vscode-button-background);
  --btn-fg: var(--vscode-button-foreground);
  --panel: var(--vscode-editorGroupHeader-tabsBackground);
  --accent: #229ED9;
  --success: #4CAF50;
  --error: #f44336;
  --warn: #FF9800;
  --r: 8px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--fg);background:var(--bg);min-height:100vh}

/* ── Header ── */
.header{background:linear-gradient(135deg,#0d1b2a,#162033 60%,#1a1f35);padding:24px 32px;display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(34,158,217,.2)}
.logo{width:48px;height:48px;background:linear-gradient(135deg,#2AABEE,#229ED9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;box-shadow:0 4px 16px rgba(34,158,217,.35)}
.header h1{font-size:18px;font-weight:700;color:#fff}
.header p{font-size:12px;color:rgba(255,255,255,.5);margin-top:3px}
.badge{margin-left:auto;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:6px;flex-shrink:0}
.badge.on{background:rgba(76,175,80,.15);color:#4CAF50;border:1px solid rgba(76,175,80,.3)}
.badge.off{background:rgba(255,152,0,.15);color:#FF9800;border:1px solid rgba(255,152,0,.3)}
.dot{width:7px;height:7px;border-radius:50%}
.on .dot{background:#4CAF50;animation:pulse 2s infinite}
.off .dot{background:#FF9800}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

/* ── Tabs ── */
.tabs{display:flex;background:var(--panel);border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto}
.tab{padding:10px 18px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,.45);border-bottom:2px solid transparent;transition:.15s;white-space:nowrap}
.tab:hover{color:rgba(255,255,255,.8)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}

/* ── Content ── */
.content{max-width:760px;margin:0 auto;padding:28px 32px}
.tab-pane{display:none}
.tab-pane.active{display:block}

/* ── Sections ── */
.section{background:var(--panel);border:1px solid rgba(255,255,255,.06);border-radius:var(--r);padding:20px;margin-bottom:16px}
.sec-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.field{margin-bottom:14px}
.field:last-child{margin-bottom:0}
label{display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:rgba(255,255,255,.75)}
.hint-label{font-weight:400;color:rgba(255,255,255,.35);font-size:11px;margin-left:5px}

input[type=text],input[type=password],input[type=number],select,textarea{
  width:100%;padding:9px 11px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;
  color:var(--input-fg);font-size:13px;font-family:var(--vscode-font-family);outline:none;transition:border-color .2s;resize:vertical}
input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(34,158,217,.15)}
.row{display:flex;gap:8px;align-items:flex-start}
.row input,.row textarea{flex:1}

/* ── Buttons ── */
.btn{padding:9px 15px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:var(--vscode-font-family);display:inline-flex;align-items:center;gap:6px;transition:.15s;white-space:nowrap}
.btn:disabled{opacity:.45;cursor:not-allowed}
.primary{background:var(--accent);color:#fff}
.primary:hover:not(:disabled){background:#1a8fc7;transform:translateY(-1px)}
.secondary{background:rgba(255,255,255,.07);color:var(--fg);border:1px solid rgba(255,255,255,.1)}
.secondary:hover:not(:disabled){background:rgba(255,255,255,.12)}
.danger{background:rgba(244,67,54,.12);color:#f44336;border:1px solid rgba(244,67,54,.22)}
.danger:hover:not(:disabled){background:rgba(244,67,54,.2)}
.success-btn{background:rgba(76,175,80,.12);color:#4CAF50;border:1px solid rgba(76,175,80,.22)}
.success-btn:hover:not(:disabled){background:rgba(76,175,80,.2)}
.warn-btn{background:rgba(255,152,0,.12);color:#FF9800;border:1px solid rgba(255,152,0,.22)}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}

/* ── Toggles grid ── */
.toggles{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:6px;cursor:pointer;transition:.15s}
.toggle-row:hover{background:rgba(255,255,255,.07)}
.toggle-row span{font-size:12px;color:rgba(255,255,255,.8)}
.switch{position:relative;width:34px;height:18px;flex-shrink:0}
.switch input{display:none}
.track{position:absolute;inset:0;background:rgba(255,255,255,.12);border-radius:9px;cursor:pointer;transition:.2s}
.track::after{content:'';position:absolute;left:2px;top:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:.2s}
input:checked+.track{background:var(--accent)}
input:checked+.track::after{transform:translateX(16px)}

/* ── Alert ── */
.alert{padding:10px 14px;border-radius:6px;font-size:12px;margin-top:12px;display:none;align-items:center;gap:8px}
.alert.show{display:flex}
.a-success{background:rgba(76,175,80,.12);color:#4CAF50;border:1px solid rgba(76,175,80,.25)}
.a-error{background:rgba(244,67,54,.12);color:#f44336;border:1px solid rgba(244,67,54,.25)}
.a-info{background:rgba(34,158,217,.12);color:var(--accent);border:1px solid rgba(34,158,217,.25)}

/* ── Composer ── */
.composer-area{min-height:120px}
.char-count{font-size:11px;color:rgba(255,255,255,.35);text-align:right;margin-top:4px}
.preview-box{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:12px;font-size:12px;min-height:60px;white-space:pre-wrap;color:rgba(255,255,255,.8);margin-top:8px}
.preview-label{font-size:11px;color:rgba(255,255,255,.35);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}

/* ── Templates list ── */
.template-list{display:flex;flex-direction:column;gap:8px}
.template-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:12px;cursor:pointer;transition:.15s;display:flex;align-items:flex-start;gap:12px}
.template-card:hover{background:rgba(255,255,255,.08);border-color:rgba(34,158,217,.3)}
.tc-icon{font-size:18px;flex-shrink:0;margin-top:2px}
.tc-body{flex:1;min-width:0}
.tc-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.9)}
.tc-desc{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px}
.tc-category{font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(34,158,217,.15);color:var(--accent);margin-top:4px;display:inline-block}
.tc-actions{display:flex;gap:6px;flex-shrink:0;margin-top:2px}
.btn-xs{padding:4px 9px;font-size:11px;border-radius:4px}

/* ── Stats ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.stat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:16px;text-align:center}
.stat-val{font-size:28px;font-weight:700;color:var(--accent)}
.stat-lbl{font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}

/* ── Spinner ── */
.spinner{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Link ── */
a.link{color:var(--accent);text-decoration:none;cursor:pointer;font-size:11px}
a.link:hover{text-decoration:underline}

/* ── Separator ── */
.divider{border:none;border-top:1px solid rgba(255,255,255,.06);margin:14px 0}

@media(max-width:540px){
  .content{padding:16px}
  .toggles{grid-template-columns:1fr}
  .stats-grid{grid-template-columns:1fr 1fr}
}
</style>
</head>
<body>

<div class="header">
  <div class="logo">✈️</div>
  <div>
    <h1>Telegram Bridge</h1>
    <p id="headerSub">${s.connected ? `Connected as @${(s.botInfo as {username?:string})?.username ?? '...'}` : 'Not connected — enter credentials below'}</p>
  </div>
  <div class="badge ${s.connected ? 'on' : 'off'}" id="badge">
    <span class="dot"></span>
    <span id="badgeText">${s.connected ? 'Connected' : 'Disconnected'}</span>
  </div>
</div>

<div class="tabs">
  <button class="tab ${(s.initialTab as string) === 'config' || !s.initialTab ? 'active' : ''}"     onclick="switchTab('config')">⚙️ Configuration</button>
  <button class="tab ${(s.initialTab as string) === 'compose' ? 'active' : ''}"    onclick="switchTab('compose')">✏️ Composer</button>
  <button class="tab ${(s.initialTab as string) === 'templates' ? 'active' : ''}"  onclick="switchTab('templates')">📋 Templates</button>
  <button class="tab ${(s.initialTab as string) === 'advanced' ? 'active' : ''}"   onclick="switchTab('advanced')">🔧 Advanced</button>
  <button class="tab ${(s.initialTab as string) === 'stats' ? 'active' : ''}"      onclick="switchTab('stats')">📊 Stats</button>
</div>

<div class="content">

<!-- ════════════════ CONFIG TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'config' || !s.initialTab ? 'active' : ''}" id="tab-config">

  <div class="section">
    <div class="sec-title">🔑 Bot Credentials</div>
    <div class="field">
      <label>Bot Token <span class="hint-label">from @BotFather</span></label>
      <div class="row">
        <input type="password" id="botToken" value="${s.botToken}" placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw" />
        <button class="btn secondary" onclick="toggleVis('botToken',this)">Show</button>
      </div>
      <a class="link" onclick="openBotFather()" style="margin-top:5px;display:inline-block">Create a bot with @BotFather →</a>
    </div>
    <div class="field">
      <label>Chat ID <span class="hint-label">target chat / group / channel</span></label>
      <div class="row">
        <input type="text" id="chatId" value="${s.chatId}" placeholder="-1001234567890 or @channelname" />
        <button class="btn secondary" onclick="getChatId()">Find ID</button>
      </div>
    </div>
    <div id="alert1" class="alert"></div>
    <div class="actions">
      <button class="btn primary" id="saveBtn" onclick="save()">✅ Save & Connect</button>
      <button class="btn success-btn" id="testBtn" onclick="test()" ${!s.connected ? 'disabled' : ''}>🔗 Test</button>
      <button class="btn danger" id="discoBtn" onclick="disconnect()" ${!s.connected ? 'disabled' : ''}>Disconnect</button>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">🔔 Automatic Notifications</div>
    <div class="toggles">
      ${toggle('notifyBuildSuccess', '✅ Build Success',    s.notifyOnBuildSuccess as boolean)}
      ${toggle('notifyBuildFailure', '❌ Build Failure',    s.notifyOnBuildFailure as boolean)}
      ${toggle('notifyDebugStart',   '🐛 Debug Start',     s.notifyOnDebugStart as boolean)}
      ${toggle('notifyDebugStop',    '🏁 Debug Stop',      s.notifyOnDebugStop as boolean)}
      ${toggle('notifyFileSave',     '💾 File Save',       s.notifyOnFileSave as boolean)}
      ${toggle('notifyFileChange',   '📝 File Changed',    s.notifyOnFileChange as boolean)}
      ${toggle('notifyGitCommit',    '🔀 Git Commit',      s.notifyOnGitCommit as boolean)}
      ${toggle('notifyDiagnostic',   '🔴 New Errors',      s.notifyOnDiagnosticError as boolean)}
      ${toggle('silentNotifs',       '🔕 Silent Mode',     s.silentNotifications as boolean)}
    </div>
  </div>

  <div class="section">
    <div class="sec-title">📡 Incoming Messages (Polling)</div>
    <div class="toggles" style="grid-template-columns:1fr">
      ${toggle('enablePolling', '📥 Enable Polling (receive Telegram messages in VS Code)', s.enablePolling as boolean)}
    </div>
    <div class="field" style="margin-top:12px">
      <label>Polling interval (seconds)</label>
      <input type="number" id="pollingInterval" value="${s.pollingInterval}" min="3" max="60" style="width:120px" />
    </div>
  </div>

  <div class="section">
    <div class="sec-title">🔗 Webhook</div>
    <div class="toggles" style="grid-template-columns:1fr">
      ${toggle('enableWebhook', '🔗 Enable Webhook (alternative to polling)', s.enableWebhook as boolean)}
    </div>
    <div class="field" style="margin-top:12px">
      <label>Webhook port</label>
      <input type="number" id="webhookPort" value="${s.webhookPort}" min="1024" max="65535" style="width:120px" />
    </div>
  </div>

</div>

<!-- ════════════════ COMPOSER TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'compose' ? 'active' : ''}" id="tab-compose">
  <div class="section">
    <div class="sec-title">✏️ Message Composer</div>
    <div class="field">
      <label>Message <span class="hint-label">Markdown supported</span></label>
      <textarea class="composer-area" id="composeText" placeholder="Type your message... Markdown works: *bold*, _italic_, \`code\`" oninput="updatePreview()"
      ></textarea>
      <div class="char-count"><span id="charCount">0</span> characters</div>
    </div>
    <div>
      <div class="preview-label">Preview</div>
      <div class="preview-box" id="composePreview">Start typing to preview…</div>
    </div>
    <div class="actions">
      <button class="btn primary" onclick="sendComposed()">📨 Send</button>
      <button class="btn warn-btn" onclick="broadcast()">📡 Broadcast to All Chats</button>
      <button class="btn secondary" onclick="clearCompose()">Clear</button>
    </div>
    <div id="alert2" class="alert"></div>
  </div>

  <div class="section">
    <div class="sec-title">🚀 Quick Send</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <button class="btn secondary" onclick="quickSend('deploy')">🚀 Deploy Started</button>
      <button class="btn secondary" onclick="quickSend('build_ok')">✅ Build OK</button>
      <button class="btn secondary" onclick="quickSend('build_fail')">❌ Build Failed</button>
      <button class="btn secondary" onclick="quickSend('brb')">☕ BRB</button>
      <button class="btn secondary" onclick="quickSend('hotfix')">🔧 Hotfix</button>
      <button class="btn secondary" onclick="quickSend('review')">👀 Review Needed</button>
    </div>
  </div>
</div>

<!-- ════════════════ TEMPLATES TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'templates' ? 'active' : ''}" id="tab-templates">

  <div class="section">
    <div class="sec-title">📋 Message Templates</div>
    <div class="template-list" id="templateList">
      ${templates.map(t => `
        <div class="template-card" id="tpl-${t.id}">
          <div class="tc-icon">${t.name.split(' ')[0]}</div>
          <div class="tc-body">
            <div class="tc-name">${t.name.replace(/^[^\s]+\s/, '')}</div>
            <div class="tc-desc">${t.description ?? ''}</div>
            ${t.category ? `<span class="tc-category">${t.category}</span>` : ''}
          </div>
          <div class="tc-actions">
            <button class="btn primary btn-xs" onclick="sendTemplate('${t.id}')">Send</button>
            ${!t.id.startsWith('builtin-') ? `<button class="btn danger btn-xs" onclick="deleteTemplate('${t.id}')">✕</button>` : ''}
          </div>
        </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="sec-title">➕ Create Template</div>
    <div class="field">
      <label>Template Name</label>
      <input type="text" id="tplName" placeholder="e.g. 🚀 Deploy Alert" />
    </div>
    <div class="field">
      <label>Category</label>
      <input type="text" id="tplCategory" placeholder="CI/CD, Git, Team, Personal…" />
    </div>
    <div class="field">
      <label>Description</label>
      <input type="text" id="tplDesc" placeholder="Short description" />
    </div>
    <div class="field">
      <label>Message Text <span class="hint-label">Use {{workspace}}, {{file}}, {{time}}, {{date}}, {{gitBranch}}, {{selection}}, {{user}}</span></label>
      <textarea id="tplText" style="min-height:90px" placeholder="🚀 *Deploy started*&#10;&#10;📁 \`{{workspace}}\`&#10;🌿 Branch: \`{{gitBranch}}\`&#10;🕐 {{time}}"></textarea>
    </div>
    <div class="actions">
      <button class="btn primary" onclick="createTemplate()">💾 Save Template</button>
    </div>
    <div id="alert3" class="alert"></div>
  </div>
</div>

<!-- ════════════════ ADVANCED TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'advanced' ? 'active' : ''}" id="tab-advanced">
  <div class="section">
    <div class="sec-title">⚙️ Message Settings</div>
    <div class="field">
      <label>Parse Mode</label>
      <select id="parseMode">
        <option value="Markdown" ${s.parseMode === 'Markdown' ? 'selected' : ''}>Markdown</option>
        <option value="HTML"     ${s.parseMode === 'HTML'     ? 'selected' : ''}>HTML</option>
        <option value="MarkdownV2" ${s.parseMode === 'MarkdownV2' ? 'selected' : ''}>MarkdownV2</option>
      </select>
    </div>
    <div class="field">
      <label>Max Code Length <span class="hint-label">chars before sending as file</span></label>
      <input type="number" id="maxCodeLength" value="${s.maxCodeLength}" min="100" max="10000" />
    </div>
    <div class="field">
      <label>Message Prefix</label>
      <input type="text" id="messagePrefix" value="${s.messagePrefix}" placeholder="💻 VS Code" />
    </div>
  </div>

  <div class="section">
    <div class="sec-title">📡 Broadcast — Additional Chats</div>
    <div class="field">
      <label>Extra Chat IDs <span class="hint-label">one per line, for broadcast</span></label>
      <textarea id="additionalChats" style="min-height:80px" placeholder="-1001234567890&#10;@myteamchannel">${additionalChats}</textarea>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">🤖 Auto-Send</div>
    <div class="toggles" style="grid-template-columns:1fr">
      ${toggle('autoSendOnError', '🔴 Auto-send uncaught errors to Telegram', s.autoSendOnError as boolean)}
    </div>
  </div>

  <div class="actions">
    <button class="btn primary" onclick="saveAdvanced()">💾 Save Advanced Settings</button>
  </div>
  <div id="alert4" class="alert"></div>
</div>

<!-- ════════════════ STATS TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'stats' ? 'active' : ''}" id="tab-stats">
  <div class="section">
    <div class="sec-title">📊 Session Statistics</div>
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><div class="stat-val" id="statTotal">—</div><div class="stat-lbl">Total Messages</div></div>
      <div class="stat-card"><div class="stat-val" id="statSent" style="color:#4CAF50">—</div><div class="stat-lbl">Sent OK</div></div>
      <div class="stat-card"><div class="stat-val" id="statFailed" style="color:#f44336">—</div><div class="stat-lbl">Failed</div></div>
      <div class="stat-card"><div class="stat-val" id="statInbox" style="color:#FF9800">—</div><div class="stat-lbl">Received</div></div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">🤖 Bot Info</div>
    <div id="botInfoBox" style="font-size:13px;line-height:1.7;color:rgba(255,255,255,.75)">
      ${s.connected && s.botInfo ? `
        <div>Username: <strong>@${(s.botInfo as {username?:string;first_name?:string}).username ?? '?'}</strong></div>
        <div>Display Name: <strong>${(s.botInfo as {first_name?:string}).first_name ?? '?'}</strong></div>
        <div>Bot ID: <code>${(s.botInfo as {id?:number}).id ?? '?'}</code></div>
      ` : '<div style="color:rgba(255,255,255,.4)">Not connected</div>'}
    </div>
  </div>
</div>

</div><!-- /content -->

<script>
const vscode = acquireVsCodeApi();

function switchTab(id) {
  document.querySelectorAll('.tab,.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((t,i) => {
    const ids = ['config','compose','templates','advanced','stats'];
    if (ids[i] === id) t.classList.add('active');
  });
  document.getElementById('tab-' + id)?.classList.add('active');
}

function now() { return new Date().toLocaleTimeString(); }
function quickSend(key) { const t=QUICK_MSGS[key]||key; document.getElementById('composeText').value=t; updatePreview(); switchTab('compose'); }
function toggleVis(id,btn) {
  const el = document.getElementById(id);
  el.type = el.type==='password'?'text':'password'; btn.textContent = el.type==='password'?'Show':'Hide';
}
function showAlert(id,msg,type) {
  const el=document.getElementById(id); el.className='alert show a-'+type; el.textContent=msg;
  setTimeout(()=>el.className='alert',5000);
}
function updatePreview() {
  const txt = document.getElementById('composeText').value;
  document.getElementById('charCount').textContent = txt.length;
  document.getElementById('composePreview').textContent = txt||'Start typing to preview…';
}
function clearCompose() { document.getElementById('composeText').value=''; updatePreview(); }

const QUICK_MSGS = {
  deploy:     '🚀 Deploy triggered from VS Code\\n📁 workspace\\n🕐 ' + new Date().toLocaleTimeString(),
  build_ok:   '✅ Build passed!\\n📁 workspace\\n🕐 ' + new Date().toLocaleTimeString(),
  build_fail: '❌ Build failed!\\n📁 workspace\\n🕐 ' + new Date().toLocaleTimeString(),
  brb:        '☕ Taking a break, back soon',
  hotfix:     '🔧 Hotfix pushed\\n📁 workspace',
  review:     '👀 Please review when you can\\n📁 workspace'
};

function save() {
  const btn=document.getElementById('saveBtn');
  btn.innerHTML='<span class="spinner"></span> Connecting…'; btn.disabled=true;
  vscode.postMessage({command:'save',
    botToken: document.getElementById('botToken').value.trim(),
    chatId: document.getElementById('chatId').value.trim(),
    messagePrefix: document.getElementById('messagePrefix')?.value||'💻 VS Code',
    notifyOnBuildSuccess:    document.getElementById('notifyBuildSuccess').checked,
    notifyOnBuildFailure:    document.getElementById('notifyBuildFailure').checked,
    notifyOnDebugStart:      document.getElementById('notifyDebugStart').checked,
    notifyOnDebugStop:       document.getElementById('notifyDebugStop').checked,
    notifyOnFileSave:        document.getElementById('notifyFileSave').checked,
    notifyOnGitCommit:       document.getElementById('notifyGitCommit').checked,
    notifyOnDiagnosticError: document.getElementById('notifyDiagnostic').checked,
    enablePolling:           document.getElementById('enablePolling').checked,
    pollingInterval:         parseInt(document.getElementById('pollingInterval').value)||5,
    silentNotifications:     document.getElementById('silentNotifs').checked,
    enableWebhook:            document.getElementById('enableWebhook').checked,
    webhookPort:             parseInt(document.getElementById('webhookPort').value)||3456,
    parseMode: document.getElementById('parseMode')?.value||'Markdown',
    maxCodeLength: parseInt(document.getElementById('maxCodeLength')?.value)||3000,
    additionalChats: document.getElementById('additionalChats')?.value||'',
    autoSendOnError: document.getElementById('autoSendOnError')?.checked||false
  });
}
function saveAdvanced() {
  vscode.postMessage({command:'save',
    botToken: document.getElementById('botToken').value.trim(),
    chatId: document.getElementById('chatId').value.trim(),
    messagePrefix: document.getElementById('messagePrefix').value,
    notifyOnBuildSuccess:    document.getElementById('notifyBuildSuccess').checked,
    notifyOnBuildFailure:    document.getElementById('notifyBuildFailure').checked,
    notifyOnFileChange:      document.getElementById('notifyFileChange').checked,
    notifyOnDebugStart:      document.getElementById('notifyDebugStart').checked,
    notifyOnDebugStop:       document.getElementById('notifyDebugStop').checked,
    notifyOnFileSave:        document.getElementById('notifyFileSave').checked,
    notifyOnGitCommit:       document.getElementById('notifyGitCommit').checked,
    notifyOnDiagnosticError: document.getElementById('notifyDiagnostic').checked,
    enablePolling:           document.getElementById('enablePolling').checked,
    pollingInterval:         parseInt(document.getElementById('pollingInterval').value)||5,
    silentNotifications:     document.getElementById('silentNotifs').checked,
    enableWebhook:           document.getElementById('enableWebhook')?.checked||false,
    webhookPort:             parseInt(document.getElementById('webhookPort')?.value)||3456,
    parseMode:               document.getElementById('parseMode')?.value||'Markdown',
    maxCodeLength:           parseInt(document.getElementById('maxCodeLength')?.value)||3000,
    additionalChats:         document.getElementById('additionalChats')?.value||'',
    autoSendOnError:         document.getElementById('autoSendOnError')?.checked||false
  });
}
function test() { vscode.postMessage({command:'test'}); showAlert('alert1','Sending test message…','info'); }
function disconnect() { vscode.postMessage({command:'disconnect'}); }
function openBotFather() { vscode.postMessage({command:'openBotFather'}); }
function getChatId() { vscode.postMessage({command:'getChatId'}); }

function sendComposed() {
  const text = document.getElementById('composeText').value.trim();
  if (!text) { showAlert('alert2','Nothing to send.','error'); return; }
  vscode.postMessage({command:'sendMessage', text});
}
function broadcast() {
  const text = document.getElementById('composeText').value.trim();
  if (!text) { showAlert('alert2','Nothing to send.','error'); return; }
  vscode.postMessage({command:'broadcast', text});
}

function sendTemplate(id) { vscode.postMessage({command:'sendTemplate', id}); showAlert('alert1','Sending template…','info'); }
function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  document.getElementById('tpl-'+id)?.remove();
  vscode.postMessage({command:'deleteTemplate', id});
}
function createTemplate() {
  const name = document.getElementById('tplName').value.trim();
  const text = document.getElementById('tplText').value.trim();
  if (!name || !text) { showAlert('alert3','Name and text are required.','error'); return; }
  vscode.postMessage({command:'addTemplate',
    name, text,
    description: document.getElementById('tplDesc').value,
    category: document.getElementById('tplCategory').value||'Custom'
  });
  document.getElementById('tplName').value='';
  document.getElementById('tplText').value='';
  document.getElementById('tplDesc').value='';
  document.getElementById('tplCategory').value='';
  showAlert('alert3','Template saved!','success');
}

function setStatus(connected, botInfo) {
  const badge = document.getElementById('badge');
  badge.className='badge '+(connected?'on':'off');
  document.getElementById('badgeText').textContent = connected?'Connected':'Disconnected';
  document.getElementById('headerSub').textContent = connected&&botInfo?'Connected as @'+(botInfo.username||'?'):'Not connected — enter credentials below';
  document.getElementById('testBtn').disabled = !connected;
  document.getElementById('discoBtn').disabled = !connected;
}

window.addEventListener('message', e => {
  const msg = e.data;
  switch(msg.command) {
    case 'switchTab': switchTab(msg.tab); break;
    case 'connectionResult':
      document.getElementById('saveBtn').textContent='✅ Save & Connect';
      document.getElementById('saveBtn').disabled=false;
      setStatus(msg.success, msg.botInfo);
      showAlert('alert1', msg.success?'🎉 Connected! Send your first message.':'❌ Failed — check token and chat ID.', msg.success?'success':'error');
      break;
    case 'testResult':
      showAlert('alert1', msg.success?'✅ Test sent! Check Telegram.':'❌ Test failed.', msg.success?'success':'error');
      break;
    case 'sendResult':
      showAlert('alert2', msg.success?'📨 Sent!':'❌ Failed to send.', msg.success?'success':'error');
      break;
    case 'disconnected':
      setStatus(false, null);
      showAlert('alert1','Disconnected.','info');
      break;
    case 'templatesUpdated':
      // re-render template list
      break;
    case 'stats':
      document.getElementById('statTotal').textContent = msg.total;
      document.getElementById('statSent').textContent  = msg.sent;
      document.getElementById('statFailed').textContent= msg.failed;
      document.getElementById('statInbox').textContent = msg.received;
      break;
  }
});
</script>
</body>
</html>`;
  }
}

function toggle(id: string, label: string, checked: boolean): string {
  return `<label class="toggle-row">
    <span>${label}</span>
    <span class="switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} /><span class="track"></span></span>
  </label>`;
}
