import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

const SEV_LABELS: Record<number, string> = {
  [vscode.DiagnosticSeverity.Error]:       '🔴 Error',
  [vscode.DiagnosticSeverity.Warning]:     '🟡 Warning',
  [vscode.DiagnosticSeverity.Information]: '🔵 Info',
  [vscode.DiagnosticSeverity.Hint]:        '⚪ Hint'
};

export class DiagnosticsReporter {
  private _lastErrorCount = 0;
  private _watcher: vscode.Disposable | undefined;

  constructor(private _service: TelegramService) {}

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
    const filtered: Array<{ file: string; diag: vscode.Diagnostic }> = [];

    for (const [uri, diags] of allDiags) {
      for (const d of diags) {
        if (d.severity <= minSev) {
          filtered.push({ file: uri.fsPath.split('/').pop() ?? uri.fsPath, diag: d });
        }
      }
    }

    if (filtered.length === 0) {
      await this._service.sendMessage(`✅ *No issues found*\n\n📁 Workspace: \`${workspace}\`\n🕐 ${new Date().toLocaleTimeString()}`);
      return true;
    }

    const errors   = filtered.filter(f => f.diag.severity === vscode.DiagnosticSeverity.Error);
    const warnings = filtered.filter(f => f.diag.severity === vscode.DiagnosticSeverity.Warning);

    let text = `📋 *Workspace Diagnostics*\n\n`;
    text += `📁 \`${workspace}\`\n`;
    text += `🔴 Errors: ${errors.length} | 🟡 Warnings: ${warnings.length}\n\n`;

    const shown = filtered.slice(0, 12);
    for (const { file, diag } of shown) {
      const sev = SEV_LABELS[diag.severity] ?? '⚪';
      const line = diag.range.start.line + 1;
      const msg = diag.message.length > 80 ? diag.message.substring(0, 80) + '…' : diag.message;
      text += `${sev} \`${file}:${line}\` — ${msg}\n`;
    }

    if (filtered.length > 12) {
      text += `\n_...and ${filtered.length - 12} more issues_`;
    }

    text += `\n\n🕐 ${new Date().toLocaleTimeString()}`;
    return this._service.sendMessage(text);
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
        await this._service.sendMessage(
          `⚠️ *New Errors Detected*\n\n📁 \`${ws}\`\n🔴 +${diff} new error${diff > 1 ? 's' : ''} (total: ${errorCount})\n🕐 ${new Date().toLocaleTimeString()}`,
          undefined, true
        );
      }
      this._lastErrorCount = errorCount;
    });
  }

  dispose(): void {
    this._watcher?.dispose();
  }
}
