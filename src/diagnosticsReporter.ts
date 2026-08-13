import * as vscode from 'vscode';
import * as fs from 'fs';
import { TelegramService } from './telegramService';
import { BranchRouter } from './branchRouter';

const SEV_LABELS: Record<number, string> = {
  [vscode.DiagnosticSeverity.Error]:       '🔴 Error',
  [vscode.DiagnosticSeverity.Warning]:     '🟡 Warning',
  [vscode.DiagnosticSeverity.Information]: '🔵 Info',
  [vscode.DiagnosticSeverity.Hint]:        '⚪ Hint'
};

export class DiagnosticsReporter {
  private _lastErrorCount = 0;
  private _watcher: vscode.Disposable | undefined;
  private _branchRouter: BranchRouter;

  constructor(private _service: TelegramService, branchRouter: BranchRouter) {
    this._branchRouter = branchRouter;
  }

  async sendReport(minSeverity?: vscode.DiagnosticSeverity): Promise<boolean> {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const sevMap: Record<string, vscode.DiagnosticSeverity> = {
      'Error':       vscode.DiagnosticSeverity.Error,
      'Warning':     vscode.DiagnosticSeverity.Warning,
      'Information': vscode.DiagnosticSeverity.Information,
      'Hint':        vscode.DiagnosticSeverity.Hint
    };
    const minSev = minSeverity ?? sevMap[cfg.get<string>('diagnosticsMinSeverity', 'Error')];
    const workspace = this._service.getWorkspaceName();

    const allDiags = vscode.languages.getDiagnostics();
    const filtered: Array<{ file: string; uri: vscode.Uri; diag: vscode.Diagnostic }> = [];

    for (const [uri, diags] of allDiags) {
      for (const d of diags) {
        if (d.severity <= minSev) {
          filtered.push({ file: uri.fsPath.split('/').pop() ?? uri.fsPath, uri, diag: d });
        }
      }
    }

    if (filtered.length === 0) {
      const target = this._branchRouter.resolve(this._service.getChatId());
      return this._service.sendMessage(
        `✅ *No issues found*\n\n📁 \`${workspace}\`\n🌿 Branch: \`${this._branchRouter.getBranch()}\`\n🕐 ${new Date().toLocaleTimeString()}`,
        target
      );
    }

    const errors   = filtered.filter(f => f.diag.severity === vscode.DiagnosticSeverity.Error);
    const warnings = filtered.filter(f => f.diag.severity === vscode.DiagnosticSeverity.Warning);

    let text = '📋 *Workspace Diagnostics*\n\n';
    text += `📁 \`${workspace}\`\n`;
    text += `🌿 Branch: \`${this._branchRouter.getBranch()}\`\n`;
    text += `🔴 Errors: ${errors.length} | 🟡 Warnings: ${warnings.length}\n\n`;

    const shown = filtered.slice(0, 12);
    for (const { file, uri, diag } of shown) {
      const sev = SEV_LABELS[diag.severity] ?? '⚪';
      const lineNum = diag.range.start.line + 1;
      const msg = diag.message.length > 80 ? diag.message.substring(0, 80) + '...' : diag.message;
      text += `${sev} \`${file}:${lineNum}\` — ${msg}\n`;

      const codeContext = this._getCodeContext(uri, diag.range.start.line, 3);
      if (codeContext) {
        text += `\`\`\`\n${codeContext}\n\`\`\`\n\n`;
      }
    }

    if (filtered.length > 12) {
      text += `\n_...and ${filtered.length - 12} more issues_`;
    }

    text += `\n🕐 ${new Date().toLocaleTimeString()}`;
    const target = this._branchRouter.resolve(this._service.getChatId());
    return this._service.sendMessage(text, target);
  }

  private _getCodeContext(uri: vscode.Uri, errorLine: number, padding: number): string {
    try {
      const content = fs.readFileSync(uri.fsPath, 'utf8');
      const lines = content.split('\n');
      const start = Math.max(0, errorLine - padding);
      const end = Math.min(lines.length, errorLine + padding + 1);
      const contextLines: string[] = [];
      for (let i = start; i < end; i++) {
        const marker = i === errorLine ? '→' : ' ';
        contextLines.push(`${marker} ${String(i + 1).padStart(4)}  ${lines[i] ?? ''}`);
      }
      return contextLines.join('\n');
    } catch { return ''; }
  }

  watchErrors(): void {
    this._watcher = vscode.languages.onDidChangeDiagnostics(async () => {
      const cfg = vscode.workspace.getConfiguration('telegramBridge');
      if (!cfg.get<boolean>('notifyOnDiagnosticError', false)) { return; }
      if (!this._service.isConnected()) { return; }

      const allDiags = vscode.languages.getDiagnostics();
      let errorCount = 0;
      for (const [, diags] of allDiags) {
        errorCount += diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
      }

      // Only alert if error count increased
      if (errorCount > this._lastErrorCount) {
        const diff = errorCount - this._lastErrorCount;
        const ws = this._service.getWorkspaceName();
        const target = this._branchRouter.resolve(this._service.getChatId());
        await this._service.sendMessage(
          `⚠️ *New Errors Detected*\n\n📁 \`${ws}\`\n🌿 Branch: \`${this._branchRouter.getBranch()}\`\n🔴 +${diff} new error${diff > 1 ? 's' : ''} (total: ${errorCount})\n🕐 ${new Date().toLocaleTimeString()}`,
          target, true
        );
      }
      this._lastErrorCount = errorCount;
    });
  }

  dispose(): void {
    this._watcher?.dispose();
  }
}
