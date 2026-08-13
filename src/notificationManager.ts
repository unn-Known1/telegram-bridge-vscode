import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { GitIntegration } from './gitIntegration';
import { DiagnosticsReporter } from './diagnosticsReporter';
import { BranchRouter } from './branchRouter';
import { LogFileWatcher } from './logFileWatcher';

export class NotificationManager {
  private _gitIntegration: GitIntegration;
  private _diagnostics: DiagnosticsReporter;
  private _fileWatcher: vscode.FileSystemWatcher | undefined;
  private _branchRouter: BranchRouter;
  private _logWatcher: LogFileWatcher;

  constructor(
    private _service: TelegramService,
    private _context: vscode.ExtensionContext
  ) {
    this._branchRouter = new BranchRouter(_service.getChatId());
    this._gitIntegration = new GitIntegration(_service);
    this._diagnostics = new DiagnosticsReporter(_service, this._branchRouter);
    this._logWatcher = new LogFileWatcher(_service, this._branchRouter);
  }

  getBranchRouter(): BranchRouter { return this._branchRouter; }
  getLogFileWatcher(): LogFileWatcher { return this._logWatcher; }

  private async _send(text: string, chatIdOverride?: string, silent = false): Promise<boolean> {
    const target = chatIdOverride ?? this._branchRouter.resolve(this._service.getChatId());
    return this._service.sendMessage(text, target, silent);
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
          await this._send(
            `✅ *Build Succeeded*\n\n📁 \`${ws}\`\n🔧 Task: \`${task}\`\n🕐 ${new Date().toLocaleTimeString()}`
          );
        } else {
          if (!cfg.get<boolean>('notifyOnBuildFailure', true)) { return; }
          await this._send(
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
        await this._send(
          `🐛 *Debug Started*\n\n📁 \`${ws}\`\n🔍 \`${session.name}\`\n🕐 ${new Date().toLocaleTimeString()}`,
          undefined, true
        );
      }),
      vscode.debug.onDidTerminateDebugSession(async (session) => {
        if (!this._service.isConnected()) { return; }
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        if (!cfg.get<boolean>('notifyOnDebugStop', false)) { return; }
        const ws = this._service.getWorkspaceName();
        await this._send(
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
        await this._send(
          `💾 *File Saved*\n\n📁 \`${ws}\`\n📄 \`${file}\``,
          undefined, true
        );
      })
    );

    // ── File change watcher ──────────────────────────────────
    this._setupFileWatcher(ctx);

    // ── Git integration ──────────────────────────────────────
    this._gitIntegration.register(ctx);

    // ── Diagnostics watcher ──────────────────────────────────
    this._diagnostics.watchErrors();

    // ── Log file watcher ─────────────────────────────────────
    this._logWatcher.start(ctx);

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
        if (e.affectsConfiguration('telegramBridge.fileWatcherPatterns')) {
          this._disposeFileWatcher();
          this._setupFileWatcher(ctx);
        }
      })
    );
  }

  getGitIntegration(): GitIntegration { return this._gitIntegration; }
  getDiagnostics(): DiagnosticsReporter { return this._diagnostics; }

  dispose(): void {
    this._disposeFileWatcher();
    this._gitIntegration.dispose();
    this._diagnostics.dispose();
    this._logWatcher.dispose();
  }

  private _disposeFileWatcher(): void {
    if (this._fileWatcher) {
      this._fileWatcher.dispose();
      this._fileWatcher = undefined;
    }
  }

  private _setupFileWatcher(ctx: vscode.ExtensionContext): void {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const patterns = cfg.get<string[]>('fileWatcherPatterns', []);
    
    if (patterns.length === 0) { return; }

    try {
      this._fileWatcher = vscode.workspace.createFileSystemWatcher(`**/{${patterns.join(',')}}`);
      
      ctx.subscriptions.push(this._fileWatcher);
      
      const notifyOnChange = async (uri: vscode.Uri) => {
        if (!this._service.isConnected()) { return; }
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        if (!cfg.get<boolean>('notifyOnFileChange', false)) { return; }
        
        const file = uri.fsPath.split('/').pop() ?? uri.fsPath;
        const ws = this._service.getWorkspaceName();
        await this._send(
          `📝 *File Changed*\n\n📁 \`${ws}\`\n📄 \`${file}\`\n🕐 ${new Date().toLocaleTimeString()}`,
          undefined, true
        );
      };

      this._fileWatcher.onDidChange(notifyOnChange);
      this._fileWatcher.onDidCreate(notifyOnChange);
      this._fileWatcher.onDidDelete(notifyOnChange);
    } catch {
      // File watcher setup failed - patterns may be invalid
    }
  }
}
