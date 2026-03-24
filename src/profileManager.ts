import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

export interface Profile {
  name: string;
  label: string;
  token: string;
  chatId: string;
}

export class ProfileManager {
  constructor(
    private _service: TelegramService,
    private _context: vscode.ExtensionContext
  ) {}

  getProfiles(): Record<string, Profile> {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const saved = cfg.get<Record<string, Profile>>('profiles', {});
    // Always include the default profile from main settings
    const token = cfg.get<string>('botToken', '');
    const chatId = cfg.get<string>('chatId', '');
    if (token && chatId && !saved['default']) {
      saved['default'] = { name: 'default', label: 'Default', token, chatId };
    }
    return saved;
  }

  getActiveProfileName(): string {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    return cfg.get<string>('activeProfile', 'default');
  }

  async addProfile(label: string, token: string, chatId: string): Promise<void> {
    const name = label.toLowerCase().replace(/\s+/g, '-');
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const profiles = this.getProfiles();
    profiles[name] = { name, label, token, chatId };
    await cfg.update('profiles', profiles, vscode.ConfigurationTarget.Global);
  }

  async switchProfile(name: string): Promise<boolean> {
    const profiles = this.getProfiles();
    const profile = profiles[name];
    if (!profile) { return false; }

    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    await cfg.update('activeProfile', name, vscode.ConfigurationTarget.Global);
    await cfg.update('botToken', profile.token, vscode.ConfigurationTarget.Global);
    await cfg.update('chatId', profile.chatId, vscode.ConfigurationTarget.Global);

    return this._service.connect(profile.token, profile.chatId);
  }

  async deleteProfile(name: string): Promise<void> {
    if (name === 'default') {
      vscode.window.showWarningMessage('Cannot delete the default profile.');
      return;
    }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const profiles = this.getProfiles();
    delete profiles[name];
    await cfg.update('profiles', profiles, vscode.ConfigurationTarget.Global);
  }
}

export class ProfilesProvider implements vscode.TreeDataProvider<ProfileItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(
    private _manager: ProfileManager,
    private _service: TelegramService
  ) {
    _service.onConnectionChange(() => this._onDidChange.fire());
  }

  refresh() { this._onDidChange.fire(); }

  getTreeItem(el: ProfileItem) { return el; }

  getChildren(): ProfileItem[] {
    const profiles = this._manager.getProfiles();
    const active = this._manager.getActiveProfileName();
    return Object.values(profiles).map(p => new ProfileItem(p, p.name === active, this._service.isConnected()));
  }
}

export class ProfileItem extends vscode.TreeItem {
  constructor(profile: Profile, isActive: boolean, connected: boolean) {
    super(profile.label, vscode.TreeItemCollapsibleState.None);
    this.description = isActive ? (connected ? '● connected' : '○ active') : '';
    this.tooltip = `Chat ID: ${profile.chatId}\nBot: ${profile.token.substring(0, 10)}...`;
    this.iconPath = new vscode.ThemeIcon(
      isActive && connected ? 'check' : 'account',
      isActive && connected ? new vscode.ThemeColor('testing.iconPassed') : undefined
    );
    this.command = {
      command: 'telegramBridge.switchProfile',
      title: 'Switch to this profile',
      arguments: [profile.name]
    };
    this.contextValue = 'profile';
  }
}
