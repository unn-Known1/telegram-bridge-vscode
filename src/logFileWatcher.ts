import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TelegramService } from './telegramService';
import { BranchRouter } from './branchRouter';

export interface LogPattern {
  pattern: string;
  description?: string;
}

export class LogFileWatcher {
  private _watchers: Map<string, fs.FSWatcher> = new Map();
  private _patternCache = new Map<string, RegExp[]>();

  constructor(
    private _service: TelegramService,
    private _branchRouter: BranchRouter
  ) {}

  start(context: vscode.ExtensionContext): void {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const logFiles = cfg.get<string[]>('logWatchFiles', []) as string[];
    const patterns = cfg.get<LogPattern[]>('logWatchPatterns', [
      { pattern: '(?i)error|fail|exception|crash' },
      { pattern: '(?i)test.*(failed|error|failure)', description: 'Test failures' },
      { pattern: '(?i)warn', description: 'Warnings' }
    ]) as LogPattern[];

    if (logFiles.length === 0) { return; }

    for (const filePath of logFiles) {
      const absPath = this._resolvePath(filePath, context);
      try {
        if (!fs.existsSync(absPath)) { continue; }

        const watcher = fs.watch(absPath, { persistent: true }, () => {
          this._checkLogFile(absPath, patterns);
        });
        this._watchers.set(absPath, watcher);
        context.subscriptions.push({
          dispose: () => {
            watcher.close();
            this._watchers.delete(absPath);
          }
        });

        this._service.sendMessage(
          `📂 Now watching log file: ${path.basename(absPath)}`
        ).catch(() => {});
      } catch {
        // Skip unwatchable files
      }
    }
  }

  private _resolvePath(filePath: string, context: vscode.ExtensionContext): string {
    if (path.isAbsolute(filePath)) { return filePath; }
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (folder) { return path.join(folder, filePath); }
    const globalStorage = context.globalStorageUri.fsPath;
    return path.join(globalStorage, filePath);
  }

  private _getCompiledPatterns(patterns: LogPattern[]): RegExp[] {
    const cacheKey = JSON.stringify(patterns.map(p => p.pattern));
    if (this._patternCache.has(cacheKey)) { return this._patternCache.get(cacheKey)!; }
    const compiled = patterns
      .map(p => {
        try { return new RegExp(p.pattern); } catch { return null; }
      })
      .filter(Boolean) as RegExp[];
    this._patternCache.set(cacheKey, compiled);
    return compiled;
  }

  private async _checkLogFile(filePath: string, patterns: LogPattern[]): Promise<void> {
    if (!this._service.isConnected()) { return; }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    if (!cfg.get<boolean>('notifyOnLogPattern', false)) { return; }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const compiled = this._getCompiledPatterns(patterns);
      if (compiled.length === 0) { return; }

      const matchStart = Math.max(0, lines.length - 50);
      const matches: Array<{ lineNum: number; text: string; desc: string }> = [];

      for (let i = matchStart; i < lines.length; i++) {
        for (const pat of compiled) {
          const m = pat.exec(lines[i]);
          if (m) {
            const desc = patterns.find(p => p.pattern === pat.source)?.description ?? 'Pattern match';
            matches.push({ lineNum: i + 1, text: lines[i].trim().substring(0, 200), desc });
          }
        }
      }

      if (matches.length === 0) { return; }

      const ws = this._service.getWorkspaceName();
      const branch = this._branchRouter.getBranch();
      const fileName = path.basename(filePath);
      let text = `📄 *Log Alert — \`${fileName}\`*\n\n`;
      text += `📁 \`${ws}\` | 🌿 \`${branch}\`\n`;
      text += `Found ${matches.length} match${matches.length > 1 ? 'es' : ''} in last 50 lines:\n\n`;

      for (const m of matches.slice(0, 8)) {
        text += `L${m.lineNum} [${m.desc}]\n  ${m.text}\n\n`;
      }

      if (matches.length > 8) {
        text += `_...and ${matches.length - 8} more matches_`;
      }
      text += `\n🕐 ${new Date().toLocaleTimeString()}`;

      const target = this._branchRouter.resolve(this._service.getChatId());
      await this._service.sendMessage(text, target, true);
    } catch {
      // File may have been deleted or moved
    }
  }

  dispose(): void {
    for (const watcher of this._watchers.values()) {
      watcher.close();
    }
    this._watchers.clear();
  }
}
