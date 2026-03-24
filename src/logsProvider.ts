import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  direction: 'inbound' | 'outbound' | 'system';
}

export class LogsProvider implements vscode.TreeDataProvider<LogItem> {
  private _logs: LogEntry[] = [];

  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private _context: vscode.ExtensionContext) {
    this._loadPersistedLogs();
  }

  private _loadPersistedLogs(): void {
    try {
      const saved = this._context.globalState.get<LogEntry[]>('telegramBridge.logs', []);
      const cfg = vscode.workspace.getConfiguration('telegramBridge');
      const retentionDays = cfg.get<number>('logRetentionDays', 7);
      const cutoff = Date.now() - retentionDays * 86_400_000;
      this._logs = saved
        .filter(l => new Date(l.timestamp).getTime() > cutoff)
        .map(l => ({ ...l, timestamp: new Date(l.timestamp) }));
    } catch { this._logs = []; }
  }

  private async _persist(): Promise<void> {
    const toSave = this._logs.slice(0, 500);
    await this._context.globalState.update('telegramBridge.logs', toSave);
  }

  addLog(entry: LogEntry): void {
    this._logs.unshift(entry);
    if (this._logs.length > 500) { this._logs = this._logs.slice(0, 500); }
    this._onDidChangeTreeData.fire();
    // Debounced persist
    setTimeout(() => this._persist(), 2000);
  }

  clear(): void {
    this._logs = [];
    this._context.globalState.update('telegramBridge.logs', []);
    this._onDidChangeTreeData.fire();
  }

  async exportToFile(): Promise<void> {
    if (this._logs.length === 0) {
      vscode.window.showInformationMessage('No logs to export.');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`telegram-bridge-logs-${Date.now()}.json`),
      filters: { 'JSON': ['json'], 'CSV': ['csv'] }
    });

    if (!uri) { return; }

    const ext = path.extname(uri.fsPath).toLowerCase();
    let content: string;

    if (ext === '.csv') {
      const header = 'timestamp,direction,type,message\n';
      const rows = this._logs.map(l =>
        `"${l.timestamp.toISOString()}","${l.direction}","${l.type}","${l.message.replace(/"/g, '""')}"`
      ).join('\n');
      content = header + rows;
    } else {
      content = JSON.stringify(this._logs.map(l => ({
        ...l,
        timestamp: l.timestamp.toISOString()
      })), null, 2);
    }

    fs.writeFileSync(uri.fsPath, content, 'utf8');
    vscode.window.showInformationMessage(`✅ Exported ${this._logs.length} log entries to ${path.basename(uri.fsPath)}`);
  }

  getStats(): { total: number; sent: number; failed: number; received: number } {
    return {
      total: this._logs.length,
      sent: this._logs.filter(l => l.direction === 'outbound' && l.type === 'success').length,
      failed: this._logs.filter(l => l.type === 'error').length,
      received: this._logs.filter(l => l.direction === 'inbound').length
    };
  }

  getTreeItem(el: LogItem) { return el; }

  getChildren(): LogItem[] {
    if (this._logs.length === 0) {
      const item = new LogItem({
        timestamp: new Date(), type: 'info',
        message: 'No messages yet', direction: 'system'
      });
      return [item];
    }
    return this._logs.slice(0, 200).map(l => new LogItem(l));
  }
}

class LogItem extends vscode.TreeItem {
  constructor(entry: LogEntry) {
    const time = entry.timestamp.toLocaleTimeString('en', { hour12: false });
    const dirIcon = entry.direction === 'outbound' ? '↑' : entry.direction === 'inbound' ? '↓' : '•';
    super(`${dirIcon} ${time}  ${entry.message}`, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `[${entry.direction.toUpperCase()}] ${entry.type.toUpperCase()}\n${entry.message}\n${entry.timestamp.toLocaleString()}`;

    const color =
      entry.type === 'success' ? new vscode.ThemeColor('testing.iconPassed') :
      entry.type === 'error'   ? new vscode.ThemeColor('testing.iconFailed') :
      entry.type === 'warning' ? new vscode.ThemeColor('editorWarning.foreground') : undefined;

    const icon =
      entry.type === 'success' ? 'check' :
      entry.type === 'error'   ? 'x' :
      entry.type === 'warning' ? 'warning' :
      entry.direction === 'outbound' ? 'arrow-up' :
      entry.direction === 'inbound'  ? 'arrow-down' : 'info';

    this.iconPath = new vscode.ThemeIcon(icon, color);
    this.contextValue = 'logEntry';
  }
}
