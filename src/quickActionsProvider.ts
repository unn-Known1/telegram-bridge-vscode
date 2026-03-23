import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

type QuickActionId =
  | 'configure'
  | 'send-message'
  | 'send-selection'
  | 'send-file'
  | 'test-connection'
  | 'toggle-notifications'
  | 'disconnect';

interface QuickActionDef {
  id: QuickActionId;
  label: string;
  icon: string;
  command: string;
  connectedOnly?: boolean;
}

const ACTIONS: QuickActionDef[] = [
  { id: 'configure',            label: 'Configure Bot',         icon: 'settings-gear',    command: 'telegramBridge.configure' },
  { id: 'test-connection',      label: 'Test Connection',       icon: 'plug',             command: 'telegramBridge.testConnection',  connectedOnly: true },
  { id: 'send-message',         label: 'Send Message',          icon: 'comment',          command: 'telegramBridge.sendMessage',      connectedOnly: true },
  { id: 'send-selection',       label: 'Send Selected Code',    icon: 'code',             command: 'telegramBridge.sendSelection',    connectedOnly: true },
  { id: 'send-file',            label: 'Send Current File',     icon: 'file-code',        command: 'telegramBridge.sendFile',         connectedOnly: true },
  { id: 'toggle-notifications', label: 'Toggle Notifications',  icon: 'bell',             command: 'telegramBridge.toggleNotifications' },
  { id: 'disconnect',           label: 'Disconnect',            icon: 'debug-disconnect', command: 'telegramBridge.disconnect',       connectedOnly: true },
];

export class QuickActionsProvider implements vscode.TreeDataProvider<QuickActionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<QuickActionItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private _context: vscode.ExtensionContext,
    private _service: TelegramService
  ) {
    _service.onConnectionChange(() => this._onDidChangeTreeData.fire());
  }

  getTreeItem(element: QuickActionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): QuickActionItem[] {
    const connected = this._service.isConnected();
    return ACTIONS
      .filter(a => !a.connectedOnly || connected)
      .map(a => new QuickActionItem(a));
  }
}

class QuickActionItem extends vscode.TreeItem {
  constructor(def: QuickActionDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(def.icon);
    this.command = { command: def.command, title: def.label };
    this.contextValue = 'quickAction';
  }
}
