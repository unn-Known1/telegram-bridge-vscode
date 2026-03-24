import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceConfig {
  botToken?: string;
  chatId?: string;
  workspaceName?: string;
  messagePrefix?: string;
  notifyOnBuildSuccess?: boolean;
  notifyOnBuildFailure?: boolean;
  notifyOnDebugStart?: boolean;
  notifyOnDebugStop?: boolean;
  notifyOnFileSave?: boolean;
  notifyOnFileChange?: boolean;
  notifyOnGitCommit?: boolean;
  notifyOnDiagnosticError?: boolean;
  silentNotifications?: boolean;
  additionalChats?: string[];
  enablePolling?: boolean;
  pollingInterval?: number;
  enableWebhook?: boolean;
  webhookPort?: number;
  parseMode?: string;
  maxCodeLength?: number;
  autoSendOnError?: boolean;
  fileWatcherPatterns?: string[];
}

const CONFIG_FILENAME = '.telegram-bridge.json';

export class WorkspaceConfigManager {
  getConfig(): WorkspaceConfig | null {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) { return null; }
    const cfgPath = path.join(folder, CONFIG_FILENAME);
    if (!fs.existsSync(cfgPath)) { return null; }
    try {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch { return null; }
  }

  async openOrCreate(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) {
      vscode.window.showWarningMessage('No workspace folder open.');
      return;
    }

    const cfgPath = path.join(folder, CONFIG_FILENAME);

    if (!fs.existsSync(cfgPath)) {
      const template: WorkspaceConfig = {
        workspaceName: path.basename(folder),
        messagePrefix: '💻 VS Code',
        notifyOnBuildSuccess: true,
        notifyOnBuildFailure: true,
        notifyOnDebugStart: false,
        notifyOnDebugStop: false,
        notifyOnFileSave: false,
        notifyOnFileChange: false,
        notifyOnGitCommit: false,
        notifyOnDiagnosticError: false,
        silentNotifications: false,
        additionalChats: [],
        enablePolling: false,
        pollingInterval: 5,
        enableWebhook: false,
        webhookPort: 3456,
        parseMode: 'Markdown',
        maxCodeLength: 3000,
        autoSendOnError: false,
        fileWatcherPatterns: []
      };
      fs.writeFileSync(cfgPath, JSON.stringify(template, null, 2), 'utf8');
    }

    const doc = await vscode.workspace.openTextDocument(cfgPath);
    await vscode.window.showTextDocument(doc);
  }

  /**
   * Apply workspace config on top of global VS Code settings.
   * Workspace config wins for overlapping keys.
   */
  applyToVSCode(): void {
    const wsCfg = this.getConfig();
    if (!wsCfg) { return; }

    const cfg = vscode.workspace.getConfiguration('telegramBridge');

    const apply = async (key: string, value: unknown) => {
      if (value !== undefined) {
        await cfg.update(`telegramBridge.${key}`, value, vscode.ConfigurationTarget.Workspace);
      }
    };

    apply('workspaceName', wsCfg.workspaceName);
    apply('messagePrefix', wsCfg.messagePrefix);
    apply('notifyOnBuildSuccess', wsCfg.notifyOnBuildSuccess);
    apply('notifyOnBuildFailure', wsCfg.notifyOnBuildFailure);
    apply('notifyOnDebugStart', wsCfg.notifyOnDebugStart);
    apply('notifyOnDebugStop', wsCfg.notifyOnDebugStop);
    apply('notifyOnFileSave', wsCfg.notifyOnFileSave);
    apply('notifyOnFileChange', wsCfg.notifyOnFileChange);
    apply('notifyOnGitCommit', wsCfg.notifyOnGitCommit);
    apply('notifyOnDiagnosticError', wsCfg.notifyOnDiagnosticError);
    apply('silentNotifications', wsCfg.silentNotifications);
    apply('additionalChats', wsCfg.additionalChats);
    apply('enablePolling', wsCfg.enablePolling);
    apply('pollingInterval', wsCfg.pollingInterval);
    apply('enableWebhook', wsCfg.enableWebhook);
    apply('webhookPort', wsCfg.webhookPort);
    apply('parseMode', wsCfg.parseMode);
    apply('maxCodeLength', wsCfg.maxCodeLength);
    apply('autoSendOnError', wsCfg.autoSendOnError);
    apply('fileWatcherPatterns', wsCfg.fileWatcherPatterns);
  }
}
