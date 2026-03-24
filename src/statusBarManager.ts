import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

export class StatusBarManager {
  private _item: vscode.StatusBarItem;
  private _connected = false;
  private _pollingActive = false;

  constructor(
    private _context: vscode.ExtensionContext, // eslint-disable-next-line
    private _service: TelegramService
  ) {
    this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
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
      const icons = ['$(comment-discussion)', polling ? '$(arrow-down)' : '', notifyOn ? '$(bell)' : '$(bell-slash)'].filter(Boolean).join(' ');
      this._item.text = `$(telegram) ${icons}`;
      const md = new vscode.MarkdownString(
        `**Telegram Bridge** ✅ Connected\n\n` +
        `Bot: @${botInfo?.username ?? '?'}\n\n` +
        `Profile: \`${profile}\`\n\n` +
        `Polling: ${polling ? '🟢 on' : '⚫ off'} | Notifications: ${notifyOn ? '🔔 on' : '🔕 off'}\n\n` +
        `*Click to configure*`
      );
      md.isTrusted = true;
      this._item.tooltip = md;
      this._item.backgroundColor = undefined;
    } else {
      this._item.text = `$(telegram) $(warning)`;
      this._item.tooltip = 'Telegram Bridge — Not connected. Click to configure.';
      this._item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    this._item.command = 'telegramBridge.configure';
    this._item.show();
  }

  dispose(): void { this._item.dispose(); }
}
