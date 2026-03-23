import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { LogEntry } from './logsProvider';

type EventListener<T> = (value: T) => void;

interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: unknown;
}

export class TelegramService {
  private _botToken: string = '';
  private _chatId: string = '';
  private _connected: boolean = false;
  private _context: vscode.ExtensionContext;

  private _logListeners: EventListener<LogEntry>[] = [];
  private _connectionListeners: EventListener<boolean>[] = [];

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    // Restore credentials from secrets
    this._loadCredentials();
  }

  private async _loadCredentials(): Promise<void> {
    const config = vscode.workspace.getConfiguration('telegramBridge');
    this._botToken = config.get<string>('botToken', '');
    this._chatId = config.get<string>('chatId', '');
  }

  onLog(listener: EventListener<LogEntry>): void {
    this._logListeners.push(listener);
  }

  onConnectionChange(listener: EventListener<boolean>): void {
    this._connectionListeners.push(listener);
  }

  private _emitLog(entry: LogEntry): void {
    this._logListeners.forEach(l => l(entry));
  }

  private _emitConnectionChange(connected: boolean): void {
    this._connectionListeners.forEach(l => l(connected));
  }

  isConnected(): boolean {
    return this._connected;
  }

  getBotToken(): string {
    return this._botToken;
  }

  getChatId(): string {
    return this._chatId;
  }

  async connect(botToken: string, chatId: string): Promise<boolean> {
    this._botToken = botToken;
    this._chatId = chatId;

    // Validate credentials
    const info = await this._getBotInfo();
    if (info) {
      this._connected = true;
      this._emitConnectionChange(true);
      this._emitLog({
        timestamp: new Date(),
        type: 'info',
        message: `Connected as @${info.username}`,
        direction: 'system'
      });
      return true;
    } else {
      this._connected = false;
      this._emitConnectionChange(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this._botToken = '';
    this._chatId = '';
    this._emitConnectionChange(false);
    this._emitLog({
      timestamp: new Date(),
      type: 'info',
      message: 'Disconnected',
      direction: 'system'
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this._botToken || !this._chatId) { return false; }
    const workspaceName = this._getWorkspaceName();
    const ok = await this.sendMessage(
      `🔗 *Telegram Bridge* — Connection test successful!\n\n📁 Workspace: \`${workspaceName}\`\n🕐 Time: ${new Date().toLocaleTimeString()}`
    );
    return ok;
  }

  async sendMessage(text: string, silent: boolean = false): Promise<boolean> {
    if (!this._botToken || !this._chatId) { return false; }

    const config = vscode.workspace.getConfiguration('telegramBridge');
    const parseMode = config.get<string>('parseMode', 'Markdown');

    const payload = {
      chat_id: this._chatId,
      text,
      parse_mode: parseMode,
      disable_notification: silent
    };

    const result = await this._apiRequest('sendMessage', payload);
    if (result) {
      this._emitLog({
        timestamp: new Date(),
        type: 'success',
        message: text.length > 80 ? text.substring(0, 80) + '…' : text,
        direction: 'outbound'
      });
    } else {
      this._emitLog({
        timestamp: new Date(),
        type: 'error',
        message: `Failed to send: ${text.substring(0, 60)}`,
        direction: 'outbound'
      });
    }
    return result !== null;
  }

  async sendDocument(data: Buffer, filename: string, caption?: string): Promise<boolean> {
    if (!this._botToken || !this._chatId) { return false; }

    const boundary = `----FormBoundary${Date.now()}`;
    const config = vscode.workspace.getConfiguration('telegramBridge');
    const parseMode = config.get<string>('parseMode', 'Markdown');

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
    body += `${this._chatId}\r\n`;

    if (caption) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="caption"\r\n\r\n`;
      body += `${caption}\r\n`;
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="parse_mode"\r\n\r\n`;
      body += `${parseMode}\r\n`;
    }

    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;

    const bodyStart = Buffer.from(body, 'utf8');
    const fileHeaderBuf = Buffer.from(fileHeader, 'utf8');
    const fileFooterBuf = Buffer.from(fileFooter, 'utf8');
    const fullBody = Buffer.concat([bodyStart, fileHeaderBuf, data, fileFooterBuf]);

    const result = await this._apiRequestRaw('sendDocument', fullBody, boundary);
    if (result) {
      this._emitLog({
        timestamp: new Date(),
        type: 'success',
        message: `Sent document: ${filename}`,
        direction: 'outbound'
      });
    } else {
      this._emitLog({
        timestamp: new Date(),
        type: 'error',
        message: `Failed to send document: ${filename}`,
        direction: 'outbound'
      });
    }
    return result !== null;
  }

  private async _getBotInfo(): Promise<{ username: string } | null> {
    const result = await this._apiRequest('getMe', {}) as { username: string } | null;
    return result;
  }

  private _apiRequest(method: string, payload: Record<string, unknown>): Promise<unknown | null> {
    return new Promise((resolve) => {
      const data = JSON.stringify(payload);
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this._botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const json: TelegramResponse = JSON.parse(body);
            if (json.ok) {
              resolve(json.result || true);
            } else {
              console.error(`[TelegramBridge] API error (${method}):`, json.description);
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[TelegramBridge] Request error:`, err.message);
        resolve(null);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });

      req.write(data);
      req.end();
    });
  }

  private _apiRequestRaw(method: string, body: Buffer, boundary: string): Promise<unknown | null> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this._botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => (responseBody += chunk));
        res.on('end', () => {
          try {
            const json: TelegramResponse = JSON.parse(responseBody);
            resolve(json.ok ? json.result : null);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[TelegramBridge] Multipart error:`, err.message);
        resolve(null);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        resolve(null);
      });

      req.write(body);
      req.end();
    });
  }

  private _getWorkspaceName(): string {
    const config = vscode.workspace.getConfiguration('telegramBridge');
    const override = config.get<string>('workspaceName', '');
    if (override) { return override; }

    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].name;
    }
    return 'VS Code';
  }

  getWorkspaceName(): string {
    return this._getWorkspaceName();
  }
}
