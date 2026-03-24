import * as vscode from 'vscode';
import * as https from 'https';
import { LogEntry } from './logsProvider';

export type EventListener<T> = (value: T) => void;

export interface TelegramBotInfo {
  id: number;
  username: string;
  first_name: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: { id: number; username?: string; first_name: string };
  chat: { id: number; title?: string; type: string };
  date: number;
  text?: string;
  document?: { file_name?: string; file_id: string };
  photo?: unknown[];
}

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export class TelegramService {
  private _botToken = '';
  private _chatId = '';
  private _connected = false;
  private _botInfo: TelegramBotInfo | null = null;
  private _lastUpdateId = 0;
  private _pollingTimer: NodeJS.Timeout | undefined;
  private _logListeners: EventListener<LogEntry>[] = [];
  private _connectionListeners: EventListener<boolean>[] = [];
  private _incomingListeners: EventListener<TelegramMessage>[] = [];

  constructor(private _context: vscode.ExtensionContext) {}

  // ─── Event emitters ───────────────────────────────────────
  onLog(l: EventListener<LogEntry>)               { this._logListeners.push(l); }
  onConnectionChange(l: EventListener<boolean>)    { this._connectionListeners.push(l); }
  onIncomingMessage(l: EventListener<TelegramMessage>) { this._incomingListeners.push(l); }

  private _emit<T>(list: EventListener<T>[], v: T) { list.forEach(l => l(v)); }

  private _log(entry: LogEntry)         { this._emit(this._logListeners, entry); }
  private _connChange(c: boolean)       { this._emit(this._connectionListeners, c); }
  private _incoming(m: TelegramMessage) { this._emit(this._incomingListeners, m); }

  // ─── Getters ──────────────────────────────────────────────
  isConnected()    { return this._connected; }
  getBotInfo()     { return this._botInfo; }
  getBotToken()    { return this._botToken; }
  getChatId()      { return this._chatId; }

  getWorkspaceName(): string {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const override = cfg.get<string>('workspaceName', '');
    if (override) { return override; }
    const folders = vscode.workspace.workspaceFolders;
    return folders?.[0]?.name ?? 'VS Code';
  }

  // ─── Connection ───────────────────────────────────────────
  async connect(token: string, chatId: string): Promise<boolean> {
    this._botToken = token.trim();
    this._chatId = chatId.trim();
    const info = await this._getMe();
    if (info) {
      this._connected = true;
      this._botInfo = info;
      this._connChange(true);
      this._log({ timestamp: new Date(), type: 'info', message: `Connected as @${info.username}`, direction: 'system' });
      const cfg = vscode.workspace.getConfiguration('telegramBridge');
      if (cfg.get<boolean>('enablePolling', false)) { this.startPolling(); }
      return true;
    }
    this._connected = false;
    this._connChange(false);
    return false;
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this._connected = false;
    this._botToken = '';
    this._chatId = '';
    this._botInfo = null;
    this._connChange(false);
    this._log({ timestamp: new Date(), type: 'info', message: 'Disconnected', direction: 'system' });
  }

  // ─── Polling ──────────────────────────────────────────────
  startPolling(): void {
    this.stopPolling();
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const interval = Math.max(3, cfg.get<number>('pollingInterval', 5)) * 1000;
    this._pollingTimer = setInterval(() => this._poll(), interval);
    this._log({ timestamp: new Date(), type: 'info', message: `Polling started (every ${interval/1000}s)`, direction: 'system' });
  }

  stopPolling(): void {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = undefined;
    }
  }

  private async _poll(): Promise<void> {
    if (!this._connected) { return; }
    const result = await this._apiCall<TelegramMessage[]>('getUpdates', {
      offset: this._lastUpdateId + 1,
      timeout: 0,
      limit: 10
    });
    if (!result) { return; }
    const updates = (result as unknown) as Array<{ update_id: number; message?: TelegramMessage }>;
    for (const upd of updates) {
      this._lastUpdateId = upd.update_id;
      if (upd.message) {
        this._incoming(upd.message);
        this._log({
          timestamp: new Date(),
          type: 'info',
          message: `📨 ${upd.message.from?.first_name ?? 'Unknown'}: ${upd.message.text?.substring(0, 60) ?? '[media]'}`,
          direction: 'inbound'
        });
      }
    }
  }

  // ─── Core API ─────────────────────────────────────────────
  async testConnection(): Promise<boolean> {
    const ws = this.getWorkspaceName();
    return this.sendMessage(`🔗 *Telegram Bridge* — Connection test OK!\n\n📁 Workspace: \`${ws}\`\n🕐 ${new Date().toLocaleTimeString()}`);
  }

  async sendMessage(text: string, chatId?: string, silent = false): Promise<boolean> {
    if (!this._botToken) { return false; }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const target = chatId ?? this._chatId;
    if (!target) { return false; }

    const ok = await this._apiCall('sendMessage', {
      chat_id: target,
      text,
      parse_mode: cfg.get<string>('parseMode', 'Markdown'),
      disable_notification: silent || cfg.get<boolean>('silentNotifications', false)
    });

    const short = text.length > 80 ? text.substring(0, 80) + '…' : text;
    this._log({ timestamp: new Date(), type: ok ? 'success' : 'error', message: short, direction: 'outbound' });
    return !!ok;
  }

  async sendDocument(data: Buffer, filename: string, caption?: string, chatId?: string): Promise<boolean> {
    if (!this._botToken) { return false; }
    const target = chatId ?? this._chatId;
    if (!target) { return false; }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const parseMode = cfg.get<string>('parseMode', 'Markdown');

    const boundary = `----TBBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    const addField = (name: string, value: string) => {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
    };

    addField('chat_id', target);
    if (caption) { addField('caption', caption); addField('parse_mode', parseMode); }

    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    parts.push(data);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(parts);
    const ok = await this._apiCallRaw('sendDocument', body, boundary);

    this._log({ timestamp: new Date(), type: ok ? 'success' : 'error', message: `Document: ${filename}`, direction: 'outbound' });
    return !!ok;
  }

  async sendPoll(question: string, options: string[], chatId?: string): Promise<boolean> {
    const target = chatId ?? this._chatId;
    if (!target || !this._botToken) { return false; }
    const ok = await this._apiCall('sendPoll', { chat_id: target, question, options, is_anonymous: false });
    this._log({ timestamp: new Date(), type: ok ? 'success' : 'error', message: `Poll: ${question}`, direction: 'outbound' });
    return !!ok;
  }

  async sendPhoto(imageData: Buffer, filename: string, caption?: string, chatId?: string): Promise<boolean> {
    const target = chatId ?? this._chatId;
    if (!target || !this._botToken) { return false; }
    const boundary = `----TBPhoto${Date.now()}`;
    const parts: Buffer[] = [];
    const addField = (name: string, value: string) => {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
    };
    addField('chat_id', target);
    if (caption) { addField('caption', caption); }
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`));
    parts.push(imageData);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    return !!(await this._apiCallRaw('sendPhoto', Buffer.concat(parts), boundary));
  }

  async broadcast(text: string): Promise<{ success: number; fail: number }> {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const extra: string[] = cfg.get<string[]>('additionalChats', []);
    const chats = [this._chatId, ...extra].filter(Boolean);
    let success = 0, fail = 0;
    for (const chat of chats) {
      const ok = await this.sendMessage(text, chat);
      ok ? success++ : fail++;
    }
    return { success, fail };
  }

  async getRecentMessages(limit = 20): Promise<TelegramMessage[]> {
    const result = await this._apiCall<unknown[]>('getUpdates', { limit, timeout: 0 });
    if (!result) { return []; }
    const updates = (result as unknown) as Array<{ update_id: number; message?: TelegramMessage }>;
    if (updates.length > 0) {
      this._lastUpdateId = updates[updates.length - 1].update_id;
    }
    return updates.filter(u => u.message).map(u => u.message as TelegramMessage);
  }

  // ─── HTTP helpers ─────────────────────────────────────────
  private async _getMe(): Promise<TelegramBotInfo | null> {
    return this._apiCall<TelegramBotInfo>('getMe', {});
  }

  private _apiCall<T>(method: string, payload: Record<string, unknown>): Promise<T | null> {
    return new Promise((resolve) => {
      const data = JSON.stringify(payload);
      const opts = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this._botToken}/${method}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      };
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', c => (body += c));
        res.on('end', () => {
          try {
            const json: TelegramResponse<T> = JSON.parse(body);
            if (json.ok) { resolve(json.result ?? (true as unknown as T)); }
            else {
              this._log({ timestamp: new Date(), type: 'error', message: `API ${method}: ${json.description}`, direction: 'system' });
              resolve(null);
            }
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(15000, () => { req.destroy(); resolve(null); });
      req.write(data);
      req.end();
    });
  }

  private _apiCallRaw(method: string, body: Buffer, boundary: string): Promise<unknown | null> {
    return new Promise((resolve) => {
      const opts = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this._botToken}/${method}`,
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }
      };
      const req = https.request(opts, (res) => {
        let rb = '';
        res.on('data', c => (rb += c));
        res.on('end', () => {
          try {
            const json: TelegramResponse = JSON.parse(rb);
            resolve(json.ok ? json.result : null);
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(30000, () => { req.destroy(); resolve(null); });
      req.write(body);
      req.end();
    });
  }
}
