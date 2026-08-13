import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { TemplateManager } from './templateManager';

export interface ScheduledMessage {
  id: string;
  text: string;
  sendAt: number; // Unix timestamp ms
  chatId?: string;
  label?: string;
  sent?: boolean;
  recurrence?: 'hourly' | 'daily' | 'weekly';
}

export class SchedulerManager {
  private _timer: NodeJS.Timeout | undefined;

  constructor(
    private _service: TelegramService,
    private _templateMgr: TemplateManager,
    private _context: vscode.ExtensionContext
  ) {}

  start(): void {
    this._timer = setInterval(() => this._tick(), 30_000);
  }

  stop(): void {
    if (this._timer) { clearInterval(this._timer); }
  }

  private async _tick(): Promise<void> {
    if (!this._service.isConnected()) { return; }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const messages = cfg.get<ScheduledMessage[]>('scheduledMessages', []);
    const now = Date.now();
    let changed = false;

    for (const msg of messages) {
      if (msg.sent) { continue; }
      if (msg.sendAt <= now) {
        const text = this._templateMgr.resolveVariables(msg.text);
        await this._service.sendMessage(text, msg.chatId);
        vscode.window.showInformationMessage(`⏰ Scheduled message sent: "${msg.label ?? msg.text.substring(0, 40)}"`);
        if (msg.recurrence) {
          const nextSendAt = this._nextRecurrence(now, msg.recurrence);
          msg.sendAt = nextSendAt;
          console.log(`[TelegramBridge] Recurring "${msg.label ?? msg.id}" rescheduled for ${new Date(nextSendAt).toLocaleString()}`);
        } else {
          msg.sent = true;
        }
        changed = true;
      }
    }

    if (changed) {
      const pruned = messages.filter(m => !m.sent || (m.sendAt > now - 86_400_000));
      await cfg.update('scheduledMessages', pruned, vscode.ConfigurationTarget.Global);
    }
  }

  private _nextRecurrence(fromMs: number, recurrence: 'hourly' | 'daily' | 'weekly'): number {
    switch (recurrence) {
      case 'hourly':   return fromMs + 3_600_000;
      case 'daily':    return fromMs + 86_400_000;
      case 'weekly':   return fromMs + 604_800_000;
      default:         return fromMs + 3_600_000;
    }
  }

  async schedule(text: string, sendAt: Date, label?: string, chatId?: string, recurrence?: 'hourly' | 'daily' | 'weekly'): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const messages = cfg.get<ScheduledMessage[]>('scheduledMessages', []);
    messages.push({
      id: `sched-${Date.now()}`,
      text,
      sendAt: sendAt.getTime(),
      chatId,
      label,
      sent: false,
      recurrence
    });
    await cfg.update('scheduledMessages', messages, vscode.ConfigurationTarget.Global);
  }

  async delete(id: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const messages = cfg.get<ScheduledMessage[]>('scheduledMessages', []).filter(m => m.id !== id);
    await cfg.update('scheduledMessages', messages, vscode.ConfigurationTarget.Global);
  }

  getPending(): ScheduledMessage[] {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    return cfg.get<ScheduledMessage[]>('scheduledMessages', []).filter(m => !m.sent);
  }
}

export class SchedulerProvider implements vscode.TreeDataProvider<ScheduledItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private _manager: SchedulerManager) {}

  refresh() { this._onDidChange.fire(); }

  getTreeItem(el: ScheduledItem) { return el; }

  getChildren(): ScheduledItem[] {
    const pending = this._manager.getPending();
    if (pending.length === 0) {
      const empty = new vscode.TreeItem('No scheduled messages');
      (empty as ScheduledItem).contextValue = 'empty';
      return [empty as ScheduledItem];
    }
    return pending
      .sort((a, b) => a.sendAt - b.sendAt)
      .map(m => new ScheduledItem(m));
  }
}

export class ScheduledItem extends vscode.TreeItem {
  constructor(public readonly scheduled: ScheduledMessage) {
    const sendAt = new Date(scheduled.sendAt);
    const label = scheduled.label ?? scheduled.text.substring(0, 40);
    super(label, vscode.TreeItemCollapsibleState.None);

    const remaining = scheduled.sendAt - Date.now();
    const minutes = Math.round(remaining / 60_000);
    const relativeTime = minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.round(minutes/60)}h` : `${Math.round(minutes/1440)}d`;

    this.description = `${relativeTime} • ${sendAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (scheduled.recurrence) {
      this.description += ` [${scheduled.recurrence}]`;
    }

    this.tooltip = new vscode.MarkdownString(
      `**Scheduled:** ${sendAt.toLocaleString()}\n\n` +
      '---\n\n' +
      `${scheduled.text}\n\n` +
      '---\n\n' +
      `*Will send in ${relativeTime}*` +
      (scheduled.recurrence ? `\n*Recurrence: ${scheduled.recurrence}*` : '')
    );
    this.tooltip.isTrusted = true;

    this.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('symbolIcon.clockForeground'));
    this.contextValue = 'scheduled';
  }
}
