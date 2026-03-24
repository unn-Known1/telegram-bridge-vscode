import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

interface ActionDef {
  label: string;
  icon: string;
  command: string;
  connectedOnly?: boolean;
  description?: string;
}

const ACTIONS: ActionDef[] = [
  { label: 'Configure',            icon: 'settings-gear',     command: 'telegramBridge.configure' },
  { label: 'Test Connection',      icon: 'plug',              command: 'telegramBridge.testConnection',      connectedOnly: true },
  { label: 'Switch Profile',       icon: 'account',           command: 'telegramBridge.switchProfile',       connectedOnly: false },
  { label: '─────────────────',    icon: 'dash',              command: '', },
  { label: 'Send Message',         icon: 'comment',           command: 'telegramBridge.sendMessage',         connectedOnly: true },
  { label: 'Message Composer',     icon: 'edit',              command: 'telegramBridge.openComposer',        connectedOnly: true },
  { label: 'Send from Template',   icon: 'list-selection',    command: 'telegramBridge.sendFromTemplate',    connectedOnly: true },
  { label: 'Broadcast to All',     icon: 'broadcast',         command: 'telegramBridge.broadcastMessage',    connectedOnly: true },
  { label: '─────────────────',    icon: 'dash',              command: '' },
  { label: 'Send Selected Code',   icon: 'code',              command: 'telegramBridge.sendSelection',       connectedOnly: true },
  { label: 'Send Current File',    icon: 'file-code',         command: 'telegramBridge.sendFile',            connectedOnly: true },
  { label: 'Send Workspace Errors',icon: 'error',             command: 'telegramBridge.sendDiagnostics',     connectedOnly: true },
  { label: 'Send Git Status',      icon: 'source-control',    command: 'telegramBridge.sendGitStatus',       connectedOnly: true },
  { label: 'Send System Info',     icon: 'info',              command: 'telegramBridge.sendSystemInfo',      connectedOnly: true },
  { label: '─────────────────',    icon: 'dash',              command: '' },
  { label: 'Schedule Message',     icon: 'clock',             command: 'telegramBridge.scheduleMessage',     connectedOnly: true },
  { label: 'Create Poll',          icon: 'graph',             command: 'telegramBridge.createPoll',          connectedOnly: true },
  { label: 'Toggle Notifications', icon: 'bell',              command: 'telegramBridge.toggleNotifications' },
  { label: 'Toggle Polling',       icon: 'arrow-down',        command: 'telegramBridge.togglePolling' },
  { label: '─────────────────',    icon: 'dash',              command: '' },
  { label: 'Export Logs',          icon: 'export',            command: 'telegramBridge.exportLogs' },
  { label: 'Workspace Config',     icon: 'file-code',         command: 'telegramBridge.workspaceConfig' },
  { label: 'Disconnect',           icon: 'debug-disconnect',  command: 'telegramBridge.disconnect',          connectedOnly: true },
];

export class QuickActionsProvider implements vscode.TreeDataProvider<QuickActionItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private _service: TelegramService) {
    _service.onConnectionChange(() => this._onDidChange.fire());
  }

  getTreeItem(el: QuickActionItem): vscode.TreeItem { return el; }

  getChildren(): QuickActionItem[] {
    const connected = this._service.isConnected();
    return ACTIONS
      .filter(a => !a.connectedOnly || connected)
      .map(a => new QuickActionItem(a));
  }
}

class QuickActionItem extends vscode.TreeItem {
  constructor(def: ActionDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);

    // Separator rows
    if (!def.command) {
      this.iconPath = new vscode.ThemeIcon('dash');
      this.contextValue = 'separator';
      return;
    }

    this.iconPath = new vscode.ThemeIcon(def.icon);
    this.tooltip  = def.description ?? def.label;
    this.command  = { command: def.command, title: def.label };
    this.contextValue = 'quickAction';
  }
}
