import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { GitIntegration } from './gitIntegration';
import { DiagnosticsReporter } from './diagnosticsReporter';

export class NotificationManager {
  private _gitIntegration: GitIntegration;
  private _diagnostics: DiagnosticsReporter;

  constructor(
    private _service: TelegramService,
    private _context: vscode.ExtensionContext
  ) {
    this._gitIntegration = new GitIntegration(_service);
    this._diagnostics = new DiagnosticsReporter(_service);
  }

  register(): void {
    const ctx = this._context;

    // ── Task events ──────────────────────────────────────────
    ctx.subscriptions.push(
      vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (!this._service.isConnected()) { return; }
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        const ws  = this._service.getWorkspaceName();
        const task = e.execution.task.name;

        if (e.exitCode === 0) {
          if (!cfg.get<boolean>('notifyOnBuildSuccess', true)) { return; }
          await this._service.sendMessage(
            `✅ *Build Succeeded*\n\n📁 \`${ws}\`\n🔧 Task: \`${task}\`\n🕐 ${new Date().toLocaleTimeString()}`
          );
        } else {
          if (!cfg.get<boolean>('notifyOnBuildFailure', true)) { return; }
          await this._service.sendMessage(
            `❌ *Build Failed*\n\n📁 \`${ws}\`\n🔧 Task: \`${task}\`\n🔴 Exit code: \`${e.exitCode ?? 'unknown'}\`\n🕐 ${new Date().toLocaleTimeString()}`
          );
        }
      })
    );

    // ── Debug events ─────────────────────────────────────────
    ctx.subscriptions.push(
      vscode.debug.onDidStartDebugSession(async (session) => {
        if (!this._service.isConnected()) { return; }
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        if (!cfg.get<boolean>('notifyOnDebugStart', false)) { return; }
        const ws = this._service.getWorkspaceName();
        await this._service.sendMessage(
          `🐛 *Debug Started*\n\n📁 \`${ws}\`\n🔍 \`${session.name}\`\n🕐 ${new Date().toLocaleTimeString()}`,
          undefined, true
        );
      }),
      vscode.debug.onDidTerminateDebugSession(async (session) => {
        if (!this._service.isConnected()) { return; }
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        if (!cfg.get<boolean>('notifyOnDebugStop', false)) { return; }
        const ws = this._service.getWorkspaceName();
        await this._service.sendMessage(
          `🏁 *Debug Ended*\n\n📁 \`${ws}\`\n🔍 \`${session.name}\`\n🕐 ${new Date().toLocaleTimeString()}`,
          undefined, true
        );
      })
    );

    // ── File save ────────────────────────────────────────────
    ctx.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (!this._service.isConnected()) { return; }
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        if (!cfg.get<boolean>('notifyOnFileSave', false)) { return; }
        const file = doc.fileName.split('/').pop() ?? doc.fileName;
        const ws   = this._service.getWorkspaceName();
        await this._service.sendMessage(
          `💾 *File Saved*\n\n📁 \`${ws}\`\n📄 \`${file}\``,
          undefined, true
        );
      })
    );

    // ── Git integration ──────────────────────────────────────
    this._gitIntegration.register(ctx);

    // ── Diagnostics watcher ──────────────────────────────────
    this._diagnostics.watchErrors();

    // ── Config changes ───────────────────────────────────────
    ctx.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration('telegramBridge')) { return; }
        if (e.affectsConfiguration('telegramBridge.enablePolling')) {
          const cfg = vscode.workspace.getConfiguration('telegramBridge');
          const enabled = cfg.get<boolean>('enablePolling', false);
          if (enabled && this._service.isConnected()) {
            this._service.startPolling();
          } else {
            this._service.stopPolling();
          }
        }
      })
    );
  }

  getGitIntegration(): GitIntegration { return this._gitIntegration; }
  getDiagnostics(): DiagnosticsReporter { return this._diagnostics; }
}
