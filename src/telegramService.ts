import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
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
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name: string };
    message?: { message_id: number; chat: { id: number } };
    data: string;
  };
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface OfflineMessage {
  text: string;
  chatId?: string;
  silent: boolean;
  timestamp: number;
}

interface TelegramCommand {
  name: string;
  description: string;
  callback: (args?: string) => Promise<void>;
}

export class TelegramService {
  private _botToken = '';
  private _chatId = '';
  private _connected = false;
  private _botInfo: TelegramBotInfo | null = null;
  private _lastUpdateId = 0;
  private _pollingTimer: NodeJS.Timeout | undefined;
  private _webhookServer: http.Server | undefined;
  private _webhookSecret = '';
  private _offlineQueue: OfflineMessage[] = [];
  private _commands: TelegramCommand[] = [];
  private _logListeners: EventListener<LogEntry>[] = [];
  private _connectionListeners: EventListener<boolean>[] = [];
  private _incomingListeners: EventListener<TelegramMessage>[] = [];
  private _callbackListeners: EventListener<{ data: string; messageId: number; chatId: number }>[] = [];

  constructor(private _context: vscode.ExtensionContext) {}

  // ─── Event emitters ───────────────────────────────────────
  onLog(l: EventListener<LogEntry>)               { this._logListeners.push(l); }
  onConnectionChange(l: EventListener<boolean>)    { this._connectionListeners.push(l); }
  onIncomingMessage(l: EventListener<TelegramMessage>) { this._incomingListeners.push(l); }
  onCallbackQuery(l: EventListener<{ data: string; messageId: number; chatId: number }>) { this._callbackListeners.push(l); }

  private _emit<T>(list: EventListener<T>[], v: T) { list.forEach(l => l(v)); }

  private _log(entry: LogEntry)         { this._emit(this._logListeners, entry); }
  private _connChange(c: boolean)       { this._emit(this._connectionListeners, c); }
  private _incoming(m: TelegramMessage) { this._emit(this._incomingListeners, m); }
  private _callback(data: { data: string; messageId: number; chatId: number }) { this._emit(this._callbackListeners, data); }

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
      
      await this._flushOfflineQueue();
      
      const cfg = vscode.workspace.getConfiguration('telegramBridge');
      if (cfg.get<boolean>('enablePolling', false)) { this.startPolling(); }
      if (cfg.get<boolean>('enableWebhook', false)) { this.startWebhook(); }
      return true;
    }
    this._connected = false;
    this._connChange(false);
    return false;
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.stopWebhook();
    this._connected = false;
    this._botToken = '';
    this._chatId = '';
    this._botInfo = null;
    this._connChange(false);
    this._log({ timestamp: new Date(), type: 'info', message: 'Disconnected', direction: 'system' });
  }

  // ─── Webhook ───────────────────────────────────────────────
  async startWebhook(): Promise<void> {
    this.stopWebhook();
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const port = cfg.get<number>('webhookPort', 3456);
    this._webhookSecret = Math.random().toString(36).substring(2, 15);

    this._webhookServer = http.createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === `/${this._webhookSecret}`) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const update = JSON.parse(body);
            if (update.message) {
              this._handleIncomingMessage(update.message);
            }
            if (update.callback_query) {
              const cb = update.callback_query;
              this._callback({
                data: cb.data,
                messageId: cb.message?.message_id ?? 0,
                chatId: cb.message?.chat.id ?? cb.from.id
              });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{}');
          } catch {
            res.writeHead(400);
            res.end();
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    return new Promise((resolve) => {
      this._webhookServer?.listen(port, async () => {
        await this._apiCall('setWebhook', {
          url: `http://localhost:${port}/${this._webhookSecret}`
        });
        this._log({ timestamp: new Date(), type: 'info', message: `Webhook enabled on port ${port}`, direction: 'system' });
        resolve();
      });
    });
  }

  stopWebhook(): void {
    if (this._webhookServer) {
      this._webhookServer.close();
      this._webhookServer = undefined;
      this._apiCall('deleteWebhook', {});
      this._log({ timestamp: new Date(), type: 'info', message: 'Webhook disabled', direction: 'system' });
    }
  }

  // ─── Offline Queue ─────────────────────────────────────────
  private _queueOffline(text: string, chatId?: string, silent = false): void {
    this._offlineQueue.push({ text, chatId, silent, timestamp: Date.now() });
    this._log({ timestamp: new Date(), type: 'info', message: `Queued offline (${this._offlineQueue.length} pending)`, direction: 'system' });
  }

  private async _flushOfflineQueue(): Promise<void> {
    const queue = [...this._offlineQueue];
    this._offlineQueue = [];
    for (const msg of queue) {
      await this.sendMessage(msg.text, msg.chatId, msg.silent);
    }
    if (queue.length > 0) {
      this._log({ timestamp: new Date(), type: 'info', message: `Flushed ${queue.length} offline messages`, direction: 'system' });
    }
  }

  getOfflineQueueLength(): number {
    return this._offlineQueue.length;
  }

  // ─── Inline Keyboard ────────────────────────────────────────
  async sendMessageWithKeyboard(text: string, keyboard: InlineKeyboardMarkup, chatId?: string): Promise<boolean> {
    if (!this._botToken) { return false; }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const target = chatId ?? this._chatId;
    if (!target) { return false; }

    const ok = await this._apiCall('sendMessage', {
      chat_id: target,
      text,
      parse_mode: cfg.get<string>('parseMode', 'Markdown'),
      reply_markup: keyboard,
      disable_notification: cfg.get<boolean>('silentNotifications', false)
    });

    this._log({ timestamp: new Date(), type: ok ? 'success' : 'error', message: text.substring(0, 80), direction: 'outbound' });
    return !!ok;
  }

  async answerCallback(callbackId: string, text?: string, showAlert = false): Promise<boolean> {
    if (!this._botToken) { return false; }
    return !!(await this._apiCall('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: text ?? '',
      show_alert: showAlert
    }));
  }

  // ─── Telegram Commands ──────────────────────────────────────
  registerCommand(name: string, description: string, callback: (args?: string) => Promise<void>): void {
    this._commands.push({ name, description, callback });
  }

  private _handleIncomingMessage(message: TelegramMessage): void {
    this._incoming(message);
    this._log({
      timestamp: new Date(),
      type: 'info',
      message: `📨 ${message.from?.first_name ?? 'Unknown'}: ${message.text?.substring(0, 60) ?? '[media]'}`,
      direction: 'inbound'
    });

    if (message.text?.startsWith('/')) {
      const parts = message.text.slice(1).split(' ');
      const cmdName = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      const cmd = this._commands.find(c => c.name.toLowerCase() === cmdName);
      if (cmd) {
        cmd.callback(args).then(() => {
          this._apiCall('sendMessage', {
            chat_id: message.chat.id,
            text: `✅ Command /${cmdName} executed`,
            parse_mode: 'Markdown'
          });
        }).catch(err => {
          this._apiCall('sendMessage', {
            chat_id: message.chat.id,
            text: `❌ Error: ${err.message}`,
            parse_mode: 'Markdown'
          });
        });
      } else if (cmdName === 'help') {
        const helpText = this._commands.map(c => `/${c.name} - ${c.description}`).join('\n');
        this._apiCall('sendMessage', {
          chat_id: message.chat.id,
          text: `*Available Commands:*\n\n${helpText}`,
          parse_mode: 'Markdown'
        });
      }
    }
  }

  getCommands(): TelegramCommand[] {
    return [...this._commands];
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
    const result = await this._apiCall<unknown[]>('getUpdates', {
      offset: this._lastUpdateId + 1,
      timeout: 0,
      limit: 10
    });
    if (!result) { return; }
    const updates = result as Array<{ update_id: number; message?: TelegramMessage }>;
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
    if (!this._botToken || !this._connected) {
      this._queueOffline(text, chatId, silent);
      return false;
    }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const target = chatId ?? this._chatId;
    if (!target) {
      this._queueOffline(text, chatId, silent);
      return false;
    }

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
