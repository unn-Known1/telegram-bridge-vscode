import * as vscode from 'vscode';

export class StatusBarManager {
  private _statusBarItem: vscode.StatusBarItem;
  private _context: vscode.ExtensionContext;
  private _connected: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    context.subscriptions.push(this._statusBarItem);
  }

  init(): void {
    const config = vscode.workspace.getConfiguration('telegramBridge');
    if (config.get<boolean>('showStatusBar', true)) {
      this._render();
      this._statusBarItem.show();
    }
  }

  setConnected(connected: boolean): void {
    this._connected = connected;
    this._render();
  }

  update(): void {
    const config = vscode.workspace.getConfiguration('telegramBridge');
    if (config.get<boolean>('showStatusBar', true)) {
      this._render();
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
    }
  }

  private _render(): void {
    const config = vscode.workspace.getConfiguration('telegramBridge');
    const notifySuccess = config.get<boolean>('notifyOnBuildSuccess', true);
    const notifyFailure = config.get<boolean>('notifyOnBuildFailure', true);
    const notificationsOn = notifySuccess || notifyFailure;

    if (this._connected) {
      const bell = notificationsOn ? '🔔' : '🔕';
      this._statusBarItem.text = `$(telegram) ${bell} Connected`;
      this._statusBarItem.tooltip = new vscode.MarkdownString(
        `**Telegram Bridge** — Connected\n\nBuild notifications: ${notificationsOn ? 'On' : 'Off'}\n\nClick to configure`
      );
      this._statusBarItem.backgroundColor = undefined;
    } else {
      this._statusBarItem.text = `$(telegram) Not Connected`;
      this._statusBarItem.tooltip = 'Telegram Bridge — Click to configure';
      this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    this._statusBarItem.command = 'telegramBridge.configure';
    this._statusBarItem.show();
  }

  dispose(): void {
    this._statusBarItem.dispose();
  }
}
