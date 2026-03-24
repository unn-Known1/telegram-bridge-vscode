import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

interface ActionCategory {
  name: string;
  icon: string;
  actions: ActionDef[];
}

interface ActionDef {
  label: string;
  icon: string;
  command: string;
  connectedOnly?: boolean;
  description?: string;
}

const CATEGORIES: ActionCategory[] = [
  {
    name: 'Connection',
    icon: 'plug',
    actions: [
      { label: '⚙️ Configure', icon: 'settings-gear', command: 'telegramBridge.configure', description: 'Open settings' },
      { label: '🔗 Test Connection', icon: 'plug', command: 'telegramBridge.testConnection', connectedOnly: true, description: 'Test your bot connection' },
      { label: '👤 Switch Profile', icon: 'account', command: 'telegramBridge.switchProfile', description: 'Switch between bot profiles' },
      { label: '➕ Add Profile', icon: 'add', command: 'telegramBridge.addProfile', description: 'Add a new bot profile' },
      { label: '📴 Disconnect', icon: 'debug-disconnect', command: 'telegramBridge.disconnect', connectedOnly: true },
    ]
  },
  {
    name: 'Send Messages',
    icon: 'send',
    actions: [
      { label: '✉️ Send Message', icon: 'comment', command: 'telegramBridge.sendMessage', connectedOnly: true, description: 'Send a quick message' },
      { label: '✏️ Composer', icon: 'edit', command: 'telegramBridge.openComposer', connectedOnly: true, description: 'Open rich message composer' },
      { label: '📋 Templates', icon: 'list-selection', command: 'telegramBridge.sendFromTemplate', connectedOnly: true, description: 'Send from saved templates' },
      { label: '📋 Manage Templates', icon: 'symbol-property', command: 'telegramBridge.manageTemplates', connectedOnly: true, description: 'Create/edit templates' },
      { label: '📡 Broadcast', icon: 'broadcast', command: 'telegramBridge.broadcastMessage', connectedOnly: true, description: 'Send to all configured chats' },
    ]
  },
  {
    name: 'Send Content',
    icon: 'file-code',
    actions: [
      { label: '📄 Selected Code', icon: 'code', command: 'telegramBridge.sendSelection', connectedOnly: true, description: 'Send selected code' },
      { label: '📁 Current File', icon: 'file-code', command: 'telegramBridge.sendFile', connectedOnly: true, description: 'Send entire file' },
      { label: '📝 Markdown', icon: 'markdown', command: 'telegramBridge.sendMarkdown', connectedOnly: true, description: 'Send rendered markdown' },
      { label: '🖥️ Terminal Output', icon: 'terminal', command: 'telegramBridge.sendTerminalOutput', connectedOnly: true, description: 'Send terminal output' },
      { label: '🔴 Errors', icon: 'error', command: 'telegramBridge.sendDiagnostics', connectedOnly: true, description: 'Send workspace errors' },
      { label: '🔀 Git Status', icon: 'source-control', command: 'telegramBridge.sendGitStatus', connectedOnly: true, description: 'Send git status' },
      { label: '💻 System Info', icon: 'info', command: 'telegramBridge.sendSystemInfo', connectedOnly: true, description: 'Send system information' },
    ]
  },
  {
    name: 'Tools',
    icon: 'tools',
    actions: [
      { label: '⏰ Schedule', icon: 'clock', command: 'telegramBridge.scheduleMessage', connectedOnly: true, description: 'Schedule a message' },
      { label: '📊 Create Poll', icon: 'graph', command: 'telegramBridge.createPoll', connectedOnly: true, description: 'Create a Telegram poll' },
      { label: '📨 Open Inbox', icon: 'mail', command: 'telegramBridge.openInbox', description: 'Open inbox view' },
      { label: '🔗 Webhook', icon: 'globe', command: 'telegramBridge.toggleWebhook', description: 'Toggle webhook on/off' },
      { label: '⌨️ Send with Keyboard', icon: 'keyboard', command: 'telegramBridge.sendWithKeyboard', connectedOnly: true, description: 'Send with inline keyboard' },
      { label: '🖥️ Open Terminal', icon: 'terminal', command: 'telegramBridge.openTerminal', connectedOnly: true, description: 'Create new terminal' },
      { label: '📋 List Terminals', icon: 'list-flat', command: 'telegramBridge.listTerminals', description: 'List all terminals' },
    ]
  },
  {
    name: 'Settings',
    icon: 'gear',
    actions: [
      { label: '🔔 Notifications', icon: 'bell', command: 'telegramBridge.toggleNotifications', description: 'Toggle build notifications' },
      { label: '📥 Polling', icon: 'arrow-down', command: 'telegramBridge.togglePolling', description: 'Toggle message polling' },
    ]
  },
  {
    name: 'Utility',
    icon: 'wrench',
    actions: [
      { label: '📤 Export Logs', icon: 'export', command: 'telegramBridge.exportLogs', description: 'Export message logs' },
      { label: '🗑️ Clear Logs', icon: 'trash', command: 'telegramBridge.clearLogs', description: 'Clear all logs' },
      { label: '📂 Workspace Config', icon: 'file-code', command: 'telegramBridge.workspaceConfig', description: 'Edit workspace config' },
    ]
  }
];

export class QuickActionsProvider implements vscode.TreeDataProvider<QuickActionItem | QuickActionCategory> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private _service: TelegramService) {
    _service.onConnectionChange(() => this._onDidChange.fire());
  }

  getTreeItem(el: QuickActionItem | QuickActionCategory): vscode.TreeItem { return el; }

  getChildren(): (QuickActionItem | QuickActionCategory)[] {
    const connected = this._service.isConnected();
    const result: (QuickActionItem | QuickActionCategory)[] = [];
    
    for (const cat of CATEGORIES) {
      const validActions = cat.actions.filter(a => !a.connectedOnly || connected);
      if (validActions.length > 0) {
        result.push(new QuickActionCategory(cat.name, cat.icon, validActions.length));
        for (const action of validActions) {
          result.push(new QuickActionItem(action));
        }
      }
    }
    
    return result;
  }
}

class QuickActionCategory extends vscode.TreeItem {
  constructor(name: string, icon: string, count: number) {
    super(`${name}  (${count})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(icon, new vscode.ThemeColor('testing.iconPassed'));
    this.contextValue = 'category';
  }
}

class QuickActionItem extends vscode.TreeItem {
  constructor(def: ActionDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(def.icon);
    this.tooltip = def.description ?? def.label;
    this.command = { command: def.command, title: def.label };
    this.contextValue = 'quickAction';
  }
}
