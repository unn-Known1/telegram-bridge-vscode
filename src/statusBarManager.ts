import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

export class StatusBarManager {
  private _item: vscode.StatusBarItem;
  private _connected = false;
  private _pollingActive = false;

  constructor(
    private _context: vscode.ExtensionContext,
    private _service: TelegramService
  ) {
    this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this._item.text = '$(telegram)';
    _context.subscriptions.push(this._item);
  }

  init(): void {
    this.update();
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    if (cfg.get<boolean>('showStatusBar', true)) {
      this._item.show();
    }
  }

  setConnected(connected: boolean): void {
    this._connected = connected;
    this.update();
  }

  setPolling(active: boolean): void {
    this._pollingActive = active;
    this.update();
  }

  update(): void {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    if (!cfg.get<boolean>('showStatusBar', true)) {
      this._item.hide();
      return;
    }

    const notifyOn = cfg.get<boolean>('notifyOnBuildSuccess', true) || cfg.get<boolean>('notifyOnBuildFailure', true);
    const polling  = this._pollingActive;
    const botInfo  = this._service.getBotInfo();
    const profile  = cfg.get<string>('activeProfile', 'default');

    if (this._connected) {
      const statusParts: string[] = [];
      if (polling) statusParts.push('📥');
      if (notifyOn) statusParts.push('🔔');
      const statusIcon = statusParts.length > 0 ? ` ${statusParts.join('')}` : '';
      
      this._item.text = `$(telegram)${statusIcon} ${botInfo?.username ?? 'Connected'}`;
      
      const md = new vscode.MarkdownString(
        `**✈️ Telegram Bridge**  \n` +
        `✅ *Connected*\n\n` +
        `--- \n\n` +
        `**Bot:** @${botInfo?.username ?? 'unknown'}  \n` +
        `**Profile:** \`${profile}\`  \n\n` +
        `--- \n\n` +
        `📥 Polling: **${polling ? 'ON' : 'OFF'}**  \n` +
        `🔔 Notifications: **${notifyOn ? 'ON' : 'OFF'}**  \n\n` +
        `--- \n\n` +
        `*Click to open settings*`
      );
      md.isTrusted = true;
      this._item.tooltip = md;
      this._item.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentForegroundBackground');
      this._item.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
    } else {
      this._item.text = '$(telegram) Not Connected';
      this._item.tooltip = '**✈️ Telegram Bridge**\n\n❌ *Not connected*\n\nClick to configure your bot credentials.';
      this._item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this._item.color = undefined;
    }

    this._item.command = 'telegramBridge.configure';
    this._item.show();
  }

  dispose(): void { this._item.dispose(); }
}
