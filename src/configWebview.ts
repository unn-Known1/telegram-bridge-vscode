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
  --accent: #2AABEE;
  --accent-hover: #229ED9;
  --accent-glow: rgba(42, 171, 238, 0.3);
  --success: #34D399;
  --success-bg: rgba(52, 211, 153, 0.15);
  --error: #F87171;
  --error-bg: rgba(248, 113, 113, 0.15);
  --warn: #FBBF24;
  --warn-bg: rgba(251, 191, 36, 0.15);
  --info: #60A5FA;
  --info-bg: rgba(96, 165, 250, 0.15);
  --r: 12px;
  --r-sm: 6px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--fg);background:var(--bg);min-height:100vh;line-height:1.5}

/* ── Header ── */
.header{background:linear-gradient(135deg,rgba(20,30,48,0.95),rgba(36,59,85,0.9));padding:20px 28px;display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(42,171,238,0.15);position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(42,171,238,0.5),transparent)}
.logo{width:52px;height:52px;background:linear-gradient(135deg,#2AABEE,#1D9BD1);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;box-shadow:0 4px 20px rgba(42,171,238,0.4),inset 0 1px 0 rgba(255,255,255,0.2);transition:transform .2s}
.logo:hover{transform:scale(1.05)}
.header-content{flex:1}
.header h1{font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;margin-bottom:2px}
.header p{font-size:13px;color:rgba(255,255,255,0.5);font-weight:400}
.badge{margin-left:auto;padding:6px 14px;border-radius:24px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;flex-shrink:0;transition:all .2s}
.badge.on{background:linear-gradient(135deg,rgba(52,211,153,0.2),rgba(52,211,153,0.1));color:#34D399;border:1px solid rgba(52,211,153,0.3)}
.badge.off{background:linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.1));color:#FBBF24;border:1px solid rgba(251,191,36,0.3)}
.dot{width:8px;height:8px;border-radius:50%;transition:all .2s}
.badge.on .dot{background:#34D399;box-shadow:0 0 8px #34D399;animation:pulse 2s infinite}
.badge.off .dot{background:#FBBF24}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.1)}}

/* ── Tabs ── */
.tabs{display:flex;background:var(--panel);border-bottom:1px solid rgba(255,255,255,0.04);padding:0 20px;gap:4px}
.tab{padding:14px 20px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,0.4);border-bottom:2px solid transparent;transition:all .2s;position:relative}
.tab::before{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--accent);transform:scaleX(0);transition:transform .2s}
.tab:hover{color:rgba(255,255,255,0.7)}
.tab.active{color:var(--accent)}
.tab.active::before{transform:scaleX(1)}
.tab-icon{margin-right:6px;opacity:0.7}

/* ── Content ── */
.content{max-width:800px;margin:0 auto;padding:24px 28px}
.tab-pane{display:none;animation:fadeIn .25s ease}
.tab-pane.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ── Sections ── */
.section{background:linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.06);border-radius:var(--r);padding:22px;margin-bottom:18px;transition:border-color .2s}
.section:hover{border-color:rgba(255,255,255,0.1)}
.sec-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--accent);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.sec-title::before{content:'';width:3px;height:14px;background:var(--accent);border-radius:2px}

/* ── Form Elements ── */
.field{margin-bottom:16px}
.field:last-child{margin-bottom:0}
label{display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:rgba(255,255,255,0.8)}
.hint-label{font-weight:400;color:rgba(255,255,255,0.35);font-size:11px;margin-left:6px}

input[type=text],input[type=password],input[type=number],select,textarea{
  width:100%;padding:10px 14px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.08);border-radius:var(--r-sm);
  color:var(--input-fg);font-size:13px;font-family:var(--vscode-font-family);outline:none;transition:all .2s;resize:vertical}
input::placeholder{color:rgba(255,255,255,0.2)}
input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow);background:rgba(0,0,0,0.3)}
.row{display:flex;gap:10px;align-items:flex-start}
.row input,.row textarea{flex:1}

/* ── Buttons ── */
.btn{padding:10px 18px;border-radius:var(--r-sm);border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:var(--vscode-font-family);display:inline-flex;align-items:center;gap:8px;transition:all .2s;white-space:nowrap;position:relative;overflow:hidden}
.btn::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.1),transparent);opacity:0;transition:opacity .2s}
.btn:hover::before{opacity:1}
.btn:disabled{opacity:0.4;cursor:not-allowed}
.primary{background:linear-gradient(135deg,#2AABEE,#1D9BD1);color:#fff;box-shadow:0 2px 12px rgba(42,171,238,0.3)}
.primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 4px 20px rgba(42,171,238,0.4)}
.secondary{background:rgba(255,255,255,0.06);color:var(--fg);border:1px solid rgba(255,255,255,0.1)}
.secondary:hover:not(:disabled){background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.15)}
.danger{background:rgba(248,113,113,0.15);color:#F87171;border:1px solid rgba(248,113,113,0.25)}
.danger:hover:not(:disabled){background:rgba(248,113,113,0.2)}
.success-btn{background:rgba(52,211,153,0.15);color:#34D399;border:1px solid rgba(52,211,153,0.25)}
.success-btn:hover:not(:disabled){background:rgba(52,211,153,0.2)}
.warn-btn{background:rgba(251,191,36,0.15);color:#FBBF24;border:1px solid rgba(251,191,36,0.25)}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}

/* ── Toggles ── */
.toggles{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:var(--r-sm);cursor:pointer;transition:all .2s}
.toggle-row:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.08)}
.toggle-row.active{border-color:var(--accent);background:linear-gradient(135deg,rgba(42,171,238,0.08),rgba(42,171,238,0.02))}
.toggle-label{display:flex;align-items:center;gap:10px}
.toggle-icon{width:32px;height:32px;background:rgba(255,255,255,0.04);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:16px}
.toggle-text{font-size:13px;color:rgba(255,255,255,0.85)}
.toggle-desc{font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px}
.switch{position:relative;width:44px;height:24px;flex-shrink:0}
.switch input{display:none}
.track{position:absolute;inset:0;background:rgba(255,255,255,0.1);border-radius:12px;cursor:pointer;transition:.25s}
.track::after{content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 2px 4px rgba(0,0,0,0.2)}
input:checked+.track{background:linear-gradient(135deg,#2AABEE,#1D9BD1)}
input:checked+.track::after{transform:translateX(20px)}

/* ── Alerts ── */
.alert{padding:12px 16px;border-radius:var(--r-sm);font-size:13px;margin-top:14px;display:none;align-items:center;gap:10px;animation:slideIn .2s ease}
.alert.show{display:flex}
@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.a-success{background:linear-gradient(135deg,rgba(52,211,153,0.15),rgba(52,211,153,0.05));color:#34D399;border:1px solid rgba(52,211,153,0.2)}
.a-error{background:linear-gradient(135deg,rgba(248,113,113,0.15),rgba(248,113,113,0.05));color:#F87171;border:1px solid rgba(248,113,113,0.2)}
.a-info{background:linear-gradient(135deg,rgba(96,165,250,0.15),rgba(96,165,250,0.05));color:#60A5FA;border:1px solid rgba(96,165,250,0.2)}

/* ── Composer ── */
.composer-area{min-height:140px;line-height:1.6}
.char-count{font-size:11px;color:rgba(255,255,255,0.3);text-align:right;margin-top:6px}
.preview-box{background:linear-gradient(135deg,rgba(0,0,0,0.2),rgba(0,0,0,0.1));border:1px solid rgba(255,255,255,0.05);border-radius:var(--r-sm);padding:14px;font-size:13px;min-height:70px;white-space:pre-wrap;color:rgba(255,255,255,0.8);margin-top:10px;line-height:1.6}
.preview-label{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px;font-weight:600}

/* ── Templates ── */
.template-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.template-card{background:linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.05);border-radius:var(--r);padding:16px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:10px}
.template-card:hover{background:linear-gradient(135deg,rgba(42,171,238,0.08),rgba(42,171,238,0.02));border-color:rgba(42,171,238,0.3);transform:translateY(-2px)}
.tc-header{display:flex;align-items:flex-start;gap:12px}
.tc-icon{font-size:22px;flex-shrink:0}
.tc-body{flex:1;min-width:0}
.tc-name{font-size:14px;font-weight:600;color:rgba(255,255,255,0.9)}
.tc-desc{font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px;line-height:1.4}
.tc-category{font-size:10px;padding:4px 10px;border-radius:12px;background:linear-gradient(135deg,rgba(42,171,238,0.15),rgba(42,171,238,0.05));color:#2AABEE;font-weight:600;display:inline-block;margin-top:8px}
.tc-actions{display:flex;gap:6px;margin-top:4px}
.btn-xs{padding:6px 12px;font-size:11px;border-radius:6px}

/* ── Stats ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.stat-card{background:linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.06);border-radius:var(--r);padding:20px;text-align:center;transition:all .2s}
.stat-card:hover{border-color:rgba(42,171,238,0.3);transform:translateY(-2px)}
.stat-icon{font-size:24px;margin-bottom:8px}
.stat-val{font-size:32px;font-weight:700;background:linear-gradient(135deg,#2AABEE,#60A5FA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.stat-lbl{font-size:11px;color:rgba(255,255,255,0.4);margin-top:6px;text-transform:uppercase;letter-spacing:.8px;font-weight:600}

/* ── Spinner ── */
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;margin-right:4px}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Links ── */
a.link{color:var(--accent);text-decoration:none;cursor:pointer;font-size:12px;font-weight:500;transition:color .2s}
a.link:hover{color:#60A5FA;text-decoration:underline}

/* ── Quick Send Buttons ── */
.quick-grid{display:flex;flex-wrap:wrap;gap:8px}
.quick-btn{padding:8px 14px;border-radius:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.quick-btn:hover{background:rgba(42,171,238,0.1);border-color:rgba(42,171,238,0.3);color:#fff;transform:translateY(-1px)}

/* ── Bot Info ── */
.bot-info{display:flex;align-items:center;gap:16px;padding:16px;background:linear-gradient(135deg,rgba(42,171,238,0.08),rgba(42,171,238,0.02));border:1px solid rgba(42,171,238,0.15);border-radius:var(--r)}
.bot-avatar{width:48px;height:48px;background:linear-gradient(135deg,#2AABEE,#1D9BD1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px}
.bot-details{flex:1}
.bot-name{font-size:15px;font-weight:600;color:#fff}
.bot-username{font-size:13px;color:rgba(255,255,255,0.5);margin-top:2px}
.bot-id{font-size:11px;color:rgba(255,255,255,0.3);font-family:monospace;margin-top:4px}

/* ── Responsive ── */
@media(max-width:600px){
  .content{padding:16px}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .toggles{grid-template-columns:1fr}
  .template-list{grid-template-columns:1fr}
}

/* ── Link ── */
a.link{color:var(--accent);text-decoration:none;cursor:pointer;font-size:12px;font-weight:500}
a.link:hover{color:#60A5FA}

/* ── Section icons in titles ── */
.sec-icon{font-size:14px;margin-right:4px}

/* ── Empty state ── */
.empty-state{text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3)}
.empty-icon{font-size:48px;margin-bottom:16px;opacity:0.5}
.empty-text{font-size:14px}

@media(max-width:600px){
  .content{padding:16px}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .toggles{grid-template-columns:1fr}
  .template-list{grid-template-columns:1fr}
}
</style>
</head>
<body>

<div class="header">
  <div class="logo">✈️</div>
  <div class="header-content">
    <h1>Telegram Bridge</h1>
    <p id="headerSub">${s.connected ? `Connected as @${(s.botInfo as {username?:string})?.username ?? '...'}` : 'Not connected — enter credentials below'}</p>
  </div>
  <div class="badge ${s.connected ? 'on' : 'off'}" id="badge">
    <span class="dot"></span>
    <span id="badgeText">${s.connected ? 'Connected' : 'Disconnected'}</span>
  </div>
</div>

<div class="tabs">
  <button class="tab ${(s.initialTab as string) === 'config' || !s.initialTab ? 'active' : ''}"     onclick="switchTab('config')"><span class="tab-icon">⚙️</span>Configuration</button>
  <button class="tab ${(s.initialTab as string) === 'compose' ? 'active' : ''}"    onclick="switchTab('compose')"><span class="tab-icon">✏️</span>Composer</button>
  <button class="tab ${(s.initialTab as string) === 'templates' ? 'active' : ''}"  onclick="switchTab('templates')"><span class="tab-icon">📋</span>Templates</button>
  <button class="tab ${(s.initialTab as string) === 'advanced' ? 'active' : ''}"   onclick="switchTab('advanced')"><span class="tab-icon">🔧</span>Advanced</button>
  <button class="tab ${(s.initialTab as string) === 'stats' ? 'active' : ''}"      onclick="switchTab('stats')"><span class="tab-icon">📊</span>Stats</button>
</div>

<div class="content">

<!-- ════════════════ CONFIG TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'config' || !s.initialTab ? 'active' : ''}" id="tab-config">

  <div class="section">
    <div class="sec-title"><span class="sec-icon">🔑</span>Bot Credentials</div>
    <div class="field">
      <label>Bot Token <span class="hint-label">from @BotFather</span></label>
      <div class="row">
        <input type="password" id="botToken" value="${s.botToken}" placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw" />
        <button class="btn secondary" onclick="toggleVis('botToken',this)">Show</button>
      </div>
      <a class="link" onclick="openBotFather()" style="margin-top:8px;display:inline-block">Create a bot with @BotFather →</a>
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
      <button class="btn primary" id="saveBtn" onclick="save()"><span class="btn-icon">💾</span>Save & Connect</button>
      <button class="btn success-btn" id="testBtn" onclick="test()" ${!s.connected ? 'disabled' : ''}>🔗 Test</button>
      <button class="btn danger" id="discoBtn" onclick="disconnect()" ${!s.connected ? 'disabled' : ''}>Disconnect</button>
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">🔔</span>Automatic Notifications</div>
    <div class="toggles">
      ${toggle('notifyBuildSuccess', '✅ Build Success',    s.notifyOnBuildSuccess as boolean)}
      ${toggle('notifyBuildFailure', '❌ Build Failure',    s.notifyOnBuildFailure as boolean)}
      ${toggle('notifyDebugStart',   '🐛 Debug Start',     s.notifyOnDebugStart as boolean)}
      ${toggle('notifyDebugStop',    '🏁 Debug Stop',      s.notifyOnDebugStop as boolean)}
      ${toggle('notifyFileSave',     '💾 File Save',       s.notifyOnFileSave as boolean)}
      ${toggle('notifyFileChange',   '📝 File Changed',    s.notifyOnFileChange as boolean)}
      ${toggle('notifyGitCommit',    '🔀 Git Commit',      s.notifyOnGitCommit as boolean)}
      ${toggle('silentNotifs',       '🔕 Silent Mode',     s.silentNotifications as boolean)}
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">📡</span>Incoming Messages (Polling)</div>
    <div class="toggles" style="grid-template-columns:1fr">
      ${toggle('enablePolling', '📥 Enable Polling (receive Telegram messages in VS Code)', s.enablePolling as boolean)}
    </div>
    <div class="field" style="margin-top:14px">
      <label>Polling interval (seconds)</label>
      <input type="number" id="pollingInterval" value="${s.pollingInterval}" min="3" max="60" style="width:140px" />
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">🔗</span>Webhook</div>
    <div class="toggles" style="grid-template-columns:1fr">
      ${toggle('enableWebhook', '🔗 Enable Webhook (alternative to polling)', s.enableWebhook as boolean)}
    </div>
    <div class="field" style="margin-top:14px">
      <label>Webhook port</label>
      <input type="number" id="webhookPort" value="${s.webhookPort}" min="1024" max="65535" style="width:140px" />
    </div>
  </div>

</div>
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
    <div class="sec-title"><span class="sec-icon">🚀</span>Quick Send</div>
    <div class="quick-grid">
      <button class="quick-btn" onclick="quickSend('deploy')">🚀 Deploy</button>
      <button class="quick-btn" onclick="quickSend('build_ok')">✅ Build OK</button>
      <button class="quick-btn" onclick="quickSend('build_fail')">❌ Failed</button>
      <button class="quick-btn" onclick="quickSend('brb')">☕ BRB</button>
      <button class="quick-btn" onclick="quickSend('hotfix')">🔧 Hotfix</button>
      <button class="quick-btn" onclick="quickSend('review')">👀 Review</button>
    </div>
  </div>
</div>

<!-- ════════════════ TEMPLATES TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'templates' ? 'active' : ''}" id="tab-templates">

  <div class="section">
    <div class="sec-title"><span class="sec-icon">📋</span>Message Templates</div>
    <div class="template-list" id="templateList">
      ${templates.map(t => `
        <div class="template-card" id="tpl-${t.id}">
          <div class="tc-header">
            <span class="tc-icon">${t.name.split(' ')[0]}</span>
            <div class="tc-body">
              <div class="tc-name">${t.name.replace(/^[^\s]+\s/, '')}</div>
              <div class="tc-desc">${t.description ?? ''}</div>
            </div>
          </div>
          ${t.category ? `<span class="tc-category">${t.category}</span>` : ''}
          <div class="tc-actions">
            <button class="btn primary btn-xs" onclick="sendTemplate('${t.id}')">Send</button>
            ${!t.id.startsWith('builtin-') ? `<button class="btn danger btn-xs" onclick="deleteTemplate('${t.id}')">Delete</button>` : ''}
          </div>
        </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">➕</span>Create Template</div>
    <div class="field">
      <label>Template Name</label>
      <input type="text" id="tplName" placeholder="e.g. 🚀 Deploy Alert" />
    </div>
    <div class="row">
      <div class="field">
        <label>Category</label>
        <input type="text" id="tplCategory" placeholder="CI/CD, Git, Team…" />
      </div>
      <div class="field">
        <label>Description</label>
        <input type="text" id="tplDesc" placeholder="Short description" />
      </div>
    </div>
    <div class="field">
      <label>Message Text <span class="hint-label">Use {{workspace}}, {{file}}, {{time}}, {{date}}, {{gitBranch}}, {{selection}}, {{user}}</span></label>
      <textarea id="tplText" style="min-height:100px" placeholder="🚀 *Deploy started*&#10;&#10;📁 \`{{workspace}}\`&#10;🌿 Branch: \`{{gitBranch}}\`&#10;🕐 {{time}}"></textarea>
    </div>
    <div class="actions">
      <button class="btn primary" onclick="createTemplate()"><span class="btn-icon">💾</span>Save Template</button>
    </div>
    <div id="alert3" class="alert"></div>
  </div>
</div>

<!-- ════════════════ ADVANCED TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'advanced' ? 'active' : ''}" id="tab-advanced">
  <div class="section">
    <div class="sec-title"><span class="sec-icon">⚙️</span>Message Settings</div>
    <div class="row">
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
    </div>
    <div class="field">
      <label>Message Prefix</label>
      <input type="text" id="messagePrefix" value="${s.messagePrefix}" placeholder="💻 VS Code" />
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">📡</span>Broadcast — Additional Chats</div>
    <div class="field">
      <label>Extra Chat IDs <span class="hint-label">one per line, for broadcast</span></label>
      <textarea id="additionalChats" style="min-height:90px" placeholder="-1001234567890&#10;@myteamchannel">${additionalChats}</textarea>
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">🤖</span>Auto-Send</div>
    <div class="toggles" style="grid-template-columns:1fr">
      ${toggle('autoSendOnError', '🔴 Auto-send uncaught errors to Telegram', s.autoSendOnError as boolean)}
    </div>
  </div>

  <div class="actions">
    <button class="btn primary" onclick="saveAdvanced()"><span class="btn-icon">💾</span>Save Advanced Settings</button>
  </div>
  <div id="alert4" class="alert"></div>
</div>

<!-- ════════════════ STATS TAB ════════════════ -->
<div class="tab-pane ${(s.initialTab as string) === 'stats' ? 'active' : ''}" id="tab-stats">
  <div class="section">
    <div class="sec-title"><span class="sec-icon">📊</span>Session Statistics</div>
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card">
        <div class="stat-icon">📨</div>
        <div class="stat-val" id="statTotal">—</div>
        <div class="stat-lbl">Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-val" id="statSent">—</div>
        <div class="stat-lbl">Sent</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-val" id="statFailed">—</div>
        <div class="stat-lbl">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📥</div>
        <div class="stat-val" id="statInbox">—</div>
        <div class="stat-lbl">Received</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title"><span class="sec-icon">🤖</span>Bot Info</div>
    ${s.connected && s.botInfo ? `
      <div class="bot-info">
        <div class="bot-avatar">🤖</div>
        <div class="bot-details">
          <div class="bot-name">${(s.botInfo as {first_name?:string}).first_name ?? 'Telegram Bot'}</div>
          <div class="bot-username">@${(s.botInfo as {username?:string}).username ?? '?'}</div>
          <div class="bot-id">ID: ${(s.botInfo as {id?:number}).id ?? '?'}</div>
        </div>
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Not connected — configure your bot to see info</div>
      </div>
    `}
  </div>
  
  <div class="section">
    <div class="sec-title"><span class="sec-icon">📋</span>Connection Status</div>
    <div class="toggles" style="grid-template-columns:1fr">
      <div class="toggle-row ${s.connected ? 'active' : ''}">
        <div class="toggle-label">
          <div class="toggle-icon">${s.connected ? '✅' : '⭕'}</div>
          <div>
            <div class="toggle-text">${s.connected ? 'Connected' : 'Disconnected'}</div>
            <div class="toggle-desc">${s.connected ? 'Ready to send messages' : 'Configure bot to connect'}</div>
          </div>
        </div>
      </div>
      <div class="toggle-row ${s.enablePolling ? 'active' : ''}">
        <div class="toggle-label">
          <div class="toggle-icon">📥</div>
          <div>
            <div class="toggle-text">Polling</div>
            <div class="toggle-desc">${s.enablePolling ? 'Receiving messages' : 'Disabled'}</div>
          </div>
        </div>
      </div>
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
