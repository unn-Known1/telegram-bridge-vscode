import * as vscode from 'vscode';
import * as os from 'os';

import { TelegramService } from './telegramService';
import { StatusBarManager } from './statusBarManager';
import { LogsProvider, LogEntry } from './logsProvider';
import { QuickActionsProvider } from './quickActionsProvider';
import { ConfigWebview } from './configWebview';
import { NotificationManager } from './notificationManager';
import { ProfileManager, ProfilesProvider } from './profileManager';
import { TemplateManager, TemplatesProvider } from './templateManager';
import { SchedulerManager, SchedulerProvider } from './schedulerManager';
import { InboxManager, InboxProvider } from './inboxManager';
import { WorkspaceConfigManager } from './workspaceConfig';
import { sendSystemInfo } from './systemInfo';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[TelegramBridge] Activating v2.0.0');

  // ─── Services ───────────────────────────────────────────────
  const telegramService    = new TelegramService(context);
  const statusBarManager   = new StatusBarManager(context, telegramService);
  const logsProvider       = new LogsProvider(context);
  const profileManager     = new ProfileManager(telegramService, context);
  const templateManager    = new TemplateManager(telegramService);
  const schedulerManager   = new SchedulerManager(telegramService, templateManager, context);
  const inboxManager       = new InboxManager(telegramService);
  const notificationMgr    = new NotificationManager(telegramService, context);
  const wsCfgManager       = new WorkspaceConfigManager();

  // ─── Tree view providers ────────────────────────────────────
  const profilesProvider   = new ProfilesProvider(profileManager, telegramService, context);
  const templatesProvider  = new TemplatesProvider(templateManager);
  const schedulerProvider  = new SchedulerProvider(schedulerManager);
  const inboxProvider      = new InboxProvider(inboxManager, telegramService);
  const quickActionsProvider = new QuickActionsProvider(telegramService);

  vscode.window.registerTreeDataProvider('telegramBridge.profilesView',  profilesProvider);
  vscode.window.registerTreeDataProvider('telegramBridge.inboxView',     inboxProvider);
  vscode.window.registerTreeDataProvider('telegramBridge.templatesView', templatesProvider);
  vscode.window.registerTreeDataProvider('telegramBridge.schedulerView', schedulerProvider);
  vscode.window.registerTreeDataProvider('telegramBridge.logsView',      logsProvider);
  vscode.window.registerTreeDataProvider('telegramBridge.quickActions',  quickActionsProvider);

  // ─── Wire events ────────────────────────────────────────────
  telegramService.onLog((entry: LogEntry) => logsProvider.addLog(entry));

  telegramService.onConnectionChange((connected: boolean) => {
    statusBarManager.setConnected(connected);
    vscode.commands.executeCommand('setContext', 'telegramBridge.connected', connected);
    profilesProvider.refresh();
  });

  // ─── Auto-connect ────────────────────────────────────────────
  const cfg   = vscode.workspace.getConfiguration('telegramBridge');
  const token = cfg.get<string>('botToken', '');
  const chatId = cfg.get<string>('chatId', '');

  if (token && chatId) {
    await telegramService.connect(token, chatId);
  } else {
    const action = await vscode.window.showInformationMessage(
      '✈️ Telegram Bridge installed! Connect your bot to get started.',
      'Configure Now',
      'See Walkthrough'
    );
    if (action === 'Configure Now') {
      ConfigWebview.show(context, telegramService, statusBarManager, templateManager);
    } else if (action === 'See Walkthrough') {
      vscode.commands.executeCommand('workbench.action.openWalkthrough', 'telegram-bridge.telegramBridge.getStarted');
    }
  }

  // Apply per-workspace config if present
  wsCfgManager.applyToVSCode();

  // Start scheduler, notifications, git watcher
  schedulerManager.start();
  notificationMgr.register();

  // ─── COMMAND REGISTRATIONS ──────────────────────────────────

  // Configure
  reg(context, 'telegramBridge.configure', () => {
    ConfigWebview.show(context, telegramService, statusBarManager, templateManager);
  });

  // Test connection
  reg(context, 'telegramBridge.testConnection', async () => {
    if (!telegramService.isConnected()) {
      promptConnect(); return;
    }
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: '🔗 Testing connection…' },
      async () => {
        const ok = await telegramService.testConnection();
        vscode.window.showInformationMessage(ok ? '✅ Connection successful! Check Telegram.' : '❌ Test failed — check your credentials.');
      }
    );
  });

  // Send message (quick input box)
  reg(context, 'telegramBridge.sendMessage', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const text = await vscode.window.showInputBox({
      prompt: 'Send a message via Telegram',
      placeHolder: 'Type your message…',
      ignoreFocusOut: true
    });
    if (!text) { return; }
    const ok = await telegramService.sendMessage(text);
    if (ok) { vscode.window.showInformationMessage('📨 Message sent!'); }
    else    { vscode.window.showErrorMessage('❌ Failed to send message.'); }
  });

  // Open composer (full webview, compose tab)
  reg(context, 'telegramBridge.openComposer', () => {
    ConfigWebview.show(context, telegramService, statusBarManager, templateManager, 'compose');
  });

  // Send selected code
  reg(context, 'telegramBridge.sendSelection', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showWarningMessage('No active editor.'); return; }

    const text = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);
    if (!text?.trim()) { vscode.window.showWarningMessage('Nothing selected.'); return; }

    const lang    = editor.document.languageId;
    const file    = editor.document.fileName.split('/').pop() ?? 'snippet';
    const cfgMax  = vscode.workspace.getConfiguration('telegramBridge').get<number>('maxCodeLength', 3000);

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Sending code…' }, async () => {
      let ok: boolean;
      if (text.length > cfgMax) {
        ok = await telegramService.sendDocument(Buffer.from(text, 'utf8'), file, `📎 \`${file}\``);
      } else {
        ok = await telegramService.sendMessage(`📋 *Code from* \`${file}\`\n\`\`\`${lang}\n${text}\n\`\`\``);
      }
      if (ok) { vscode.window.showInformationMessage('📨 Code sent!'); }
      else    { vscode.window.showErrorMessage('❌ Failed to send code.'); }
    });
  });

  // Send current file
  reg(context, 'telegramBridge.sendFile', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showWarningMessage('No active file.'); return; }

    const doc  = editor.document;
    const file = doc.fileName.split('/').pop() ?? 'file';
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Sending ${file}…` }, async () => {
      const ok = await telegramService.sendDocument(
        Buffer.from(doc.getText(), 'utf8'),
        file,
        `📁 \`${file}\`  •  ${doc.lineCount} lines  •  ${doc.languageId}`
      );
      if (ok) { vscode.window.showInformationMessage(`📨 ${file} sent!`); }
      else    { vscode.window.showErrorMessage('❌ Failed to send file.'); }
    });
  });

  // Send markdown (rendered)
  reg(context, 'telegramBridge.sendMarkdown', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showWarningMessage('No active file.'); return; }
    const text = editor.document.getText();
    const ok   = await telegramService.sendMessage(text);
    if (ok) { vscode.window.showInformationMessage('📨 Markdown sent!'); }
  });

  // Send diagnostics
  reg(context, 'telegramBridge.sendDiagnostics', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Collecting diagnostics…' }, async () => {
      await notificationMgr.getDiagnostics().sendReport();
    });
  });

  // Send terminal output
  reg(context, 'telegramBridge.sendTerminalOutput', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const text = await vscode.window.showInputBox({
      prompt: 'Paste terminal output to send',
      placeHolder: 'Paste output here…',
      ignoreFocusOut: true
    });
    if (!text) { return; }
    const ws = telegramService.getWorkspaceName();
    const ok = await telegramService.sendMessage(
      `💻 *Terminal Output*\n\n📁 \`${ws}\`\n\`\`\`\n${text.substring(0, 3500)}\n\`\`\``
    );
    if (ok) { vscode.window.showInformationMessage('📨 Terminal output sent!'); }
  });

  // Schedule message
  reg(context, 'telegramBridge.scheduleMessage', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }

    const text = await vscode.window.showInputBox({ prompt: 'Message to schedule', placeHolder: 'Your message…', ignoreFocusOut: true });
    if (!text) { return; }

    const label = await vscode.window.showInputBox({ prompt: 'Label for this scheduled message (optional)', ignoreFocusOut: true });

    const options = [
      { label: '⏱ In 5 minutes',  minutes: 5 },
      { label: '⏱ In 15 minutes', minutes: 15 },
      { label: '⏱ In 30 minutes', minutes: 30 },
      { label: '⏱ In 1 hour',     minutes: 60 },
      { label: '⏱ In 2 hours',    minutes: 120 },
      { label: '⏱ In 1 day',      minutes: 1440 },
    ];

    const pick = await vscode.window.showQuickPick(options.map(o => o.label), { placeHolder: 'Send when?' });
    if (!pick) { return; }

    const minutes = options.find(o => o.label === pick)?.minutes ?? 5;
    const sendAt  = new Date(Date.now() + minutes * 60_000);

    await schedulerManager.schedule(text, sendAt, label ?? text.substring(0, 40));
    schedulerProvider.refresh();
    vscode.window.showInformationMessage(`⏰ Message scheduled for ${sendAt.toLocaleTimeString()}`);
  });

  // Manage templates → open webview on templates tab
  reg(context, 'telegramBridge.manageTemplates', () => {
    ConfigWebview.show(context, telegramService, statusBarManager, templateManager, 'templates');
  });

  // Send from template (quick pick)
  reg(context, 'telegramBridge.sendFromTemplate', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const templates = templateManager.getAllTemplates();
    const pick = await vscode.window.showQuickPick(
      templates.map(t => ({ label: t.name, description: t.category ?? '', detail: t.text.substring(0, 80), id: t.id })),
      { placeHolder: 'Choose a template to send…', matchOnDescription: true }
    );
    if (!pick) { return; }
    const template = templates.find(t => t.id === pick.id);
    if (!template) { return; }
    const resolved = templateManager.resolveVariables(template.text);
    const ok = await telegramService.sendMessage(resolved);
    if (ok) { vscode.window.showInformationMessage(`📨 Template "${template.name}" sent!`); }
  });

  // Use template from tree view
  reg(context, 'telegramBridge.useTemplate', async (templateId?: unknown) => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    if (!templateId || typeof templateId !== 'string') {
      vscode.commands.executeCommand('telegramBridge.sendFromTemplate');
      return;
    }
    const template = templateManager.getAllTemplates().find(t => t.id === (templateId as string));
    if (!template) { return; }
    const resolved = templateManager.resolveVariables(template.text);
    const ok = await telegramService.sendMessage(resolved);
    if (ok) { vscode.window.showInformationMessage(`📨 "${template.name}" sent!`); }
  });

  // Broadcast message
  reg(context, 'telegramBridge.broadcastMessage', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    const text = await vscode.window.showInputBox({ prompt: 'Broadcast to ALL configured chats', placeHolder: 'Message…', ignoreFocusOut: true });
    if (!text) { return; }

    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const extras = cfg.get<string[]>('additionalChats', []);
    const total = 1 + extras.length;
    const confirmed = await vscode.window.showWarningMessage(
      `Broadcast to ${total} chat(s)?`, { modal: true }, 'Send'
    );
    if (confirmed !== 'Send') { return; }

    const result = await telegramService.broadcast(text);
    vscode.window.showInformationMessage(`📡 Broadcast: ${result.success} sent, ${result.fail} failed.`);
  });

  // Switch profile (quick pick)
  reg(context, 'telegramBridge.switchProfile', async (profileName?: unknown) => {
    if (profileName && typeof profileName === 'string') {
      const ok = await profileManager.switchProfile(profileName as string);
      if (ok) { vscode.window.showInformationMessage(`✅ Switched to profile "${profileName as string}"`); }
      else    { vscode.window.showErrorMessage(`❌ Failed to connect with profile "${profileName as string}"`); }
      profilesProvider.refresh();
      return;
    }

    const profiles = profileManager.getProfiles();
    const active   = profileManager.getActiveProfileName();
    const items = Object.values(profiles).map(p => ({
      label: p.label,
      description: p.name === active ? '● active' : '',
      detail: `Chat: ${p.chatId}`,
      name: p.name
    }));

    const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Switch to profile…' });
    if (!pick) { return; }

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Connecting to "${pick.label}"…` }, async () => {
      const ok = await profileManager.switchProfile(pick.name);
      if (ok) { vscode.window.showInformationMessage(`✅ Switched to "${pick.label}"`); }
      else    { vscode.window.showErrorMessage(`❌ Could not connect to "${pick.label}"`); }
    });
    profilesProvider.refresh();
  });

  // Add profile
  reg(context, 'telegramBridge.addProfile', async () => {
    const label  = await vscode.window.showInputBox({ prompt: 'Profile name (e.g. Work Team)', ignoreFocusOut: true });
    if (!label) { return; }
    const token  = await vscode.window.showInputBox({ prompt: 'Bot Token for this profile', password: true, ignoreFocusOut: true });
    if (!token) { return; }
    const chatId = await vscode.window.showInputBox({ prompt: 'Chat ID for this profile', ignoreFocusOut: true });
    if (!chatId) { return; }

    await profileManager.addProfile(label, token, chatId);
    profilesProvider.refresh();
    vscode.window.showInformationMessage(`✅ Profile "${label}" added.`);
  });

  // Toggle build notifications
  reg(context, 'telegramBridge.toggleNotifications', async () => {
    const cfg   = vscode.workspace.getConfiguration('telegramBridge');
    const allOn = cfg.get<boolean>('notifyOnBuildSuccess', true) && cfg.get<boolean>('notifyOnBuildFailure', true);
    const newVal = !allOn;
    await cfg.update('notifyOnBuildSuccess', newVal, vscode.ConfigurationTarget.Global);
    await cfg.update('notifyOnBuildFailure', newVal, vscode.ConfigurationTarget.Global);
    statusBarManager.update();
    vscode.window.showInformationMessage(`🔔 Build notifications ${newVal ? 'enabled' : 'disabled'}`);
  });

  // Toggle polling
  reg(context, 'telegramBridge.togglePolling', async () => {
    const cfg     = vscode.workspace.getConfiguration('telegramBridge');
    const enabled = cfg.get<boolean>('enablePolling', false);
    await cfg.update('enablePolling', !enabled, vscode.ConfigurationTarget.Global);
    if (!enabled && telegramService.isConnected()) {
      telegramService.startPolling();
      statusBarManager.setPolling(true);
      vscode.window.showInformationMessage('📥 Incoming message polling enabled.');
    } else {
      telegramService.stopPolling();
      statusBarManager.setPolling(false);
      vscode.window.showInformationMessage('📴 Incoming message polling disabled.');
    }
  });

  // Send git status
  reg(context, 'telegramBridge.sendGitStatus', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Fetching git status…' }, async () => {
      await notificationMgr.getGitIntegration().sendGitStatus();
    });
  });

  // Send system info
  reg(context, 'telegramBridge.sendSystemInfo', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    await sendSystemInfo(telegramService);
    vscode.window.showInformationMessage('📨 System info sent!');
  });

  // Create poll
  reg(context, 'telegramBridge.createPoll', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }

    const question = await vscode.window.showInputBox({ prompt: 'Poll question', ignoreFocusOut: true });
    if (!question) { return; }

    const optionsRaw = await vscode.window.showInputBox({
      prompt: 'Poll options (comma-separated)',
      placeHolder: 'Yes, No, Maybe',
      ignoreFocusOut: true
    });
    if (!optionsRaw) { return; }

    const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (options.length < 2) { vscode.window.showErrorMessage('Need at least 2 options.'); return; }

    const ok = await telegramService.sendPoll(question, options);
    if (ok) { vscode.window.showInformationMessage('📊 Poll created on Telegram!'); }
  });

  // Open inbox
  reg(context, 'telegramBridge.openInbox', async () => {
    if (!telegramService.isConnected()) { promptConnect(); return; }
    await telegramService.getRecentMessages(20);
    inboxProvider.refresh();
    vscode.commands.executeCommand('telegramBridge.inboxView.focus');
  });

  // Refresh inbox
  reg(context, 'telegramBridge.refreshInbox', async () => {
    if (!telegramService.isConnected()) { return; }
    await telegramService.getRecentMessages(20);
    inboxProvider.refresh();
  });

  // Export logs
  reg(context, 'telegramBridge.exportLogs', () => logsProvider.exportToFile());

  // Clear logs
  reg(context, 'telegramBridge.clearLogs', () => logsProvider.clear());

  // Delete scheduled message
  reg(context, 'telegramBridge.deleteScheduled', async (item: unknown) => {
    const id = (item as any)?.scheduled?.id as string | undefined;
    if (!id) { return; }
    await schedulerManager.delete(id);
    schedulerProvider.refresh();
  });

  // Delete template
  reg(context, 'telegramBridge.deleteTemplate', async (item: unknown) => {
    const id = (item as any)?.template?.id as string | undefined;
    if (!id) { return; }
    await templateManager.deleteTemplate(id);
    templatesProvider.refresh();
  });

  // Workspace config
  reg(context, 'telegramBridge.workspaceConfig', () => wsCfgManager.openOrCreate());

  // Disconnect
  reg(context, 'telegramBridge.disconnect', async () => {
    await telegramService.disconnect();
    vscode.window.showInformationMessage('Telegram Bridge disconnected.');
  });

  // ─── Status bar ──────────────────────────────────────────────
  statusBarManager.init();

  // ─── Periodic stats push to webview ─────────────────────────
  const statsInterval = setInterval(() => {
    if (ConfigWebview.currentPanel) {
      const stats = logsProvider.getStats();
      ConfigWebview.currentPanel.webview.postMessage({ command: 'stats', ...stats });
    }
  }, 3000);
  context.subscriptions.push({ dispose: () => clearInterval(statsInterval) });

  console.log('[TelegramBridge] Activated ✅');
}

export function deactivate(): void {
  console.log('[TelegramBridge] Deactivating');
}

// ─── Helpers ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reg(context: vscode.ExtensionContext, command: string, fn: (...args: any[]) => any): void {
  context.subscriptions.push(vscode.commands.registerCommand(command, fn));
}

async function promptConnect(): Promise<void> {
  const action = await vscode.window.showWarningMessage(
    'Telegram Bridge is not connected.',
    'Configure'
  );
  if (action === 'Configure') {
    vscode.commands.executeCommand('telegramBridge.configure');
  }
}
