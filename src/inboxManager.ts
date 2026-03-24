import * as vscode from 'vscode';
import { TelegramService, TelegramMessage } from './telegramService';

export class InboxManager {
  private _messages: TelegramMessage[] = [];

  constructor(
    service: TelegramService,
    private _context: vscode.ExtensionContext
  ) {
    this._loadPersistedMessages();
    service.onIncomingMessage((msg) => {
      this._messages.unshift(msg);
      if (this._messages.length > 100) {
        this._messages = this._messages.slice(0, 100);
      }
      this._persist();

      const cfg = vscode.workspace.getConfiguration('telegramBridge');
      if (cfg.get<boolean>('showIncomingInEditor', true)) {
        const sender = msg.from?.first_name ?? 'Telegram';
        const text = msg.text ?? '[media message]';
        const short = text.length > 80 ? text.substring(0, 80) + '...' : text;

        vscode.window.showInformationMessage(
          `📨 ${sender}: ${short}`,
          'Reply'
        ).then(action => {
          if (action === 'Reply') {
            vscode.commands.executeCommand('telegramBridge.sendMessage');
          }
        });
      }
    });
  }

  private _loadPersistedMessages(): void {
    try {
      const saved = this._context.globalState.get<TelegramMessage[]>('telegramBridge.inbox', []);
      this._messages = saved;
    } catch {
      this._messages = [];
    }
  }

  private _persist(): void {
    const toSave = this._messages.slice(0, 100);
    this._context.globalState.update('telegramBridge.inbox', toSave);
  }

  getMessages(): TelegramMessage[] {
    return this._messages;
  }

  clear(): void {
    this._messages = [];
    this._context.globalState.update('telegramBridge.inbox', []);
  }
}

export class InboxProvider implements vscode.TreeDataProvider<InboxItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(
    private _inbox: InboxManager,
    service: TelegramService
  ) {
    service.onIncomingMessage(() => this._onDidChange.fire());
  }

  refresh() { this._onDidChange.fire(); }

  getTreeItem(el: InboxItem) { return el; }

  getChildren(): InboxItem[] {
    const messages = this._inbox.getMessages();
    if (messages.length === 0) {
      const item = new vscode.TreeItem('No messages yet');
      (item as InboxItem).iconPath = new vscode.ThemeIcon('mail-read');
      return [item as InboxItem];
    }
    return messages.map(m => new InboxItem(m));
  }
}

export class InboxItem extends vscode.TreeItem {
  constructor(public readonly message: TelegramMessage) {
    const sender = message.from?.first_name ?? 'Unknown';
    const text = message.text ?? '[media]';
    const short = text.length > 50 ? text.substring(0, 50) + '…' : text;
    super(`${sender}: ${short}`, vscode.TreeItemCollapsibleState.None);

    const date = new Date(message.date * 1000);
    this.description = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.tooltip = new vscode.MarkdownString(
      `**From:** ${sender} @${message.from?.username ?? 'unknown'}\n` +
      `**Time:** ${date.toLocaleString()}\n\n` +
      `---\n\n` +
      `${text}`
    );
    this.tooltip.isTrusted = true;
    this.iconPath = new vscode.ThemeIcon('comment', new vscode.ThemeColor('charts.blue'));
    this.contextValue = 'inboxItem';
  }
}
