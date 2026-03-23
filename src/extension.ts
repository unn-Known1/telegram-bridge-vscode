import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { StatusBarManager } from './statusBarManager';
import { LogsProvider, LogEntry } from './logsProvider';
import { QuickActionsProvider } from './quickActionsProvider';
import { ConfigWebview } from './configWebview';
import { NotificationManager } from './notificationManager';

let telegramService: TelegramService;
let statusBarManager: StatusBarManager;
let logsProvider: LogsProvider;
let notificationManager: NotificationManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Telegram Bridge is now active!');

  // Initialize services
  telegramService = new TelegramService(context);
  statusBarManager = new StatusBarManager(context);
  logsProvider = new LogsProvider(context);
  notificationManager = new NotificationManager(telegramService, context);

  // Tree view providers
  const quickActionsProvider = new QuickActionsProvider(context, telegramService);
  vscode.window.registerTreeDataProvider('telegramBridge.logsView', logsProvider);
  vscode.window.registerTreeDataProvider('telegramBridge.quickActions', quickActionsProvider);

  // Listen to service events
  telegramService.onLog((entry: LogEntry) => {
    logsProvider.addLog(entry);
  });

  telegramService.onConnectionChange((connected: boolean) => {
    statusBarManager.setConnected(connected);
    vscode.commands.executeCommand('setContext', 'telegramBridge.connected', connected);
  });

  // Auto-connect if credentials exist
  const config = vscode.workspace.getConfiguration('telegramBridge');
  const token = config.get<string>('botToken', '');
  const chatId = config.get<string>('chatId', '');
  if (token && chatId) {
    await telegramService.connect(token, chatId);
  } else {
    // Prompt first-time setup
    const action = await vscode.window.showInformationMessage(
      '🤖 Telegram Bridge is installed! Configure your bot to get started.',
      'Configure Now',
      'Later'
    );
    if (action === 'Configure Now') {
      ConfigWebview.show(context, telegramService, statusBarManager);
    }
  }

  // ─── Commands ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('telegramBridge.configure', () => {
      ConfigWebview.show(context, telegramService, statusBarManager);
    }),

    vscode.commands.registerCommand('telegramBridge.testConnection', async () => {
      if (!telegramService.isConnected()) {
        vscode.window.showWarningMessage('Telegram Bridge is not connected. Please configure your bot first.');
        return;
      }
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Testing Telegram connection...' },
        async () => {
          const ok = await telegramService.testConnection();
          if (ok) {
            vscode.window.showInformationMessage('✅ Telegram connection successful!');
          } else {
            vscode.window.showErrorMessage('❌ Connection failed. Check your bot token and chat ID.');
          }
        }
      );
    }),

    vscode.commands.registerCommand('telegramBridge.sendMessage', async () => {
      if (!telegramService.isConnected()) {
        const action = await vscode.window.showWarningMessage(
          'Telegram Bridge is not connected.',
          'Configure'
        );
        if (action === 'Configure') {
          ConfigWebview.show(context, telegramService, statusBarManager);
        }
        return;
      }

      const message = await vscode.window.showInputBox({
        prompt: 'Message to send via Telegram',
        placeHolder: 'Type your message here...',
        ignoreFocusOut: true
      });

      if (!message) { return; }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Sending message...' },
        async () => {
          const ok = await telegramService.sendMessage(message);
          if (ok) {
            vscode.window.showInformationMessage('📨 Message sent to Telegram!');
          } else {
            vscode.window.showErrorMessage('❌ Failed to send message.');
          }
        }
      );
    }),

    vscode.commands.registerCommand('telegramBridge.sendSelection', async () => {
      if (!telegramService.isConnected()) {
        vscode.window.showWarningMessage('Telegram Bridge is not connected.');
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection.isEmpty ? undefined : selection);

      if (!text || text.trim() === '') {
        vscode.window.showWarningMessage('Nothing to send — selection is empty.');
        return;
      }

      const lang = editor.document.languageId;
      const fileName = editor.document.fileName.split('/').pop() || 'snippet';
      const config = vscode.workspace.getConfiguration('telegramBridge');
      const includeLanguage = config.get<boolean>('codeSnippetLanguage', true);
      const maxLength = config.get<number>('maxCodeLength', 3000);

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Sending code to Telegram...' },
        async () => {
          let ok: boolean;
          if (text.length > maxLength) {
            // Send as document
            ok = await telegramService.sendDocument(
              Buffer.from(text, 'utf8'),
              fileName,
              `📎 Code snippet from \`${fileName}\``
            );
          } else {
            const codeBlock = includeLanguage
              ? `\`\`\`${lang}\n${text}\n\`\`\``
              : `\`\`\`\n${text}\n\`\`\``;
            const header = `📋 *Code from* \`${fileName}\`\n`;
            ok = await telegramService.sendMessage(header + codeBlock);
          }

          if (ok) {
            vscode.window.showInformationMessage('📨 Code sent to Telegram!');
          } else {
            vscode.window.showErrorMessage('❌ Failed to send code.');
          }
        }
      );
    }),

    vscode.commands.registerCommand('telegramBridge.sendFile', async () => {
      if (!telegramService.isConnected()) {
        vscode.window.showWarningMessage('Telegram Bridge is not connected.');
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to send.');
        return;
      }

      const doc = editor.document;
      const content = doc.getText();
      const fileName = doc.fileName.split('/').pop() || 'file';

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Sending ${fileName} to Telegram...` },
        async () => {
          const ok = await telegramService.sendDocument(
            Buffer.from(content, 'utf8'),
            fileName,
            `📁 File: \`${fileName}\`\nLines: ${doc.lineCount} | Lang: ${doc.languageId}`
          );

          if (ok) {
            vscode.window.showInformationMessage(`📨 ${fileName} sent to Telegram!`);
          } else {
            vscode.window.showErrorMessage('❌ Failed to send file.');
          }
        }
      );
    }),

    vscode.commands.registerCommand('telegramBridge.toggleNotifications', async () => {
      const config = vscode.workspace.getConfiguration('telegramBridge');
      const currentSuccess = config.get<boolean>('notifyOnBuildSuccess', true);
      const currentFailure = config.get<boolean>('notifyOnBuildFailure', true);

      const allOn = currentSuccess && currentFailure;
      const newVal = !allOn;

      await config.update('notifyOnBuildSuccess', newVal, vscode.ConfigurationTarget.Global);
      await config.update('notifyOnBuildFailure', newVal, vscode.ConfigurationTarget.Global);

      const state = newVal ? 'enabled' : 'disabled';
      vscode.window.showInformationMessage(`🔔 Build notifications ${state}`);
      statusBarManager.update();
    }),

    vscode.commands.registerCommand('telegramBridge.disconnect', async () => {
      await telegramService.disconnect();
      vscode.window.showInformationMessage('Telegram Bridge disconnected.');
    }),

    vscode.commands.registerCommand('telegramBridge.viewLogs', () => {
      vscode.commands.executeCommand('telegramBridge.logsView.focus');
    })
  );

  // ─── Task & Debug Watchers ──────────────────────────────────
  notificationManager.register(context);

  // ─── Config change watcher ─────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('telegramBridge.botToken') || e.affectsConfiguration('telegramBridge.chatId')) {
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        const t = cfg.get<string>('botToken', '');
        const c = cfg.get<string>('chatId', '');
        if (t && c) {
          await telegramService.connect(t, c);
        }
      }
      if (e.affectsConfiguration('telegramBridge.showStatusBar')) {
        statusBarManager.update();
      }
    })
  );

  // ─── Status bar ─────────────────────────────────────────────
  statusBarManager.init();

  return {
    getTelegramService: () => telegramService
  };
}

export function deactivate() {
  if (telegramService) {
    telegramService.disconnect();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
