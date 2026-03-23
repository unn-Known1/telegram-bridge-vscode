import * as vscode from 'vscode';

export interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  direction: 'inbound' | 'outbound' | 'system';
}

export class LogsProvider implements vscode.TreeDataProvider<LogItem> {
  private _logs: LogEntry[] = [];
  private _context: vscode.ExtensionContext;

  private _onDidChangeTreeData = new vscode.EventEmitter<LogItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;

    context.subscriptions.push(
      vscode.commands.registerCommand('telegramBridge.clearLogs', () => {
        this._logs = [];
        this._onDidChangeTreeData.fire();
      })
    );
  }

  addLog(entry: LogEntry): void {
    this._logs.unshift(entry); // newest first
    if (this._logs.length > 200) {
      this._logs = this._logs.slice(0, 200);
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: LogItem): vscode.TreeItem {
    return element;
  }

  getChildren(): LogItem[] {
    if (this._logs.length === 0) {
      const empty = new LogItem({
        timestamp: new Date(),
        type: 'info',
        message: 'No messages yet',
        direction: 'system'
      });
      return [empty];
    }
    return this._logs.map(l => new LogItem(l));
  }
}

class LogItem extends vscode.TreeItem {
  constructor(entry: LogEntry) {
    const icons: Record<string, string> = {
      'outbound-success': '$(arrow-up)',
      'outbound-error': '$(error)',
      'inbound-info': '$(arrow-down)',
      'system-info': '$(info)',
      'system-error': '$(error)'
    };

    const iconKey = `${entry.direction}-${entry.type}`;
    const icon = icons[iconKey] || '$(circle-outline)';

    const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
    super(`${icon} ${time} ${entry.message}`, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `[${entry.direction.toUpperCase()}] ${entry.message}\n${entry.timestamp.toLocaleString()}`;

    switch (entry.type) {
      case 'success':
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        break;
      case 'error':
        this.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
        break;
      case 'warning':
        this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
        break;
      default:
        if (entry.direction === 'outbound') {
          this.iconPath = new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.blue'));
        } else if (entry.direction === 'inbound') {
          this.iconPath = new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.green'));
        } else {
          this.iconPath = new vscode.ThemeIcon('info');
        }
    }

    this.contextValue = 'logEntry';
  }
}
