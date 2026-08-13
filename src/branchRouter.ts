import * as vscode from 'vscode';
import { execSync } from 'child_process';

export interface BranchRoute {
  branch: string;
  chatId: string;
}

export class BranchRouter {
  private _lastBranch = '';

  constructor(private _defaultChatId: string) {}

  resolve(chatIdOverride?: string): string {
    const branch = this._getGitBranch();
    if (branch === 'ERROR' || branch === 'unknown') {
      return chatIdOverride ?? this._defaultChatId;
    }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const routing = cfg.get<Record<string, string>>('branchRouting', {}) ?? {};
    const exactMatch = routing[branch];
    if (exactMatch) { return exactMatch; }
    const wildcard = routing['*'];
    if (wildcard) { return wildcard; }
    return chatIdOverride ?? this._defaultChatId;
  }

  getBranch(): string {
    try {
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      return execSync('git rev-parse --abbrev-ref HEAD', { cwd: folder, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { return 'unknown'; }
  }

  getActiveRoute(): { branch: string; chatId: string } | null {
    const branch = this._getGitBranch();
    if (branch === 'ERROR' || branch === 'unknown') { return null; }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const routing = cfg.get<Record<string, string>>('branchRouting', {}) ?? {};
    const exactMatch = routing[branch];
    if (exactMatch) { return { branch, chatId: exactMatch }; }
    const wildcard = routing['*'];
    if (wildcard) { return { branch, chatId: wildcard }; }
    return null;
  }

  private _getGitBranch(): string {
    try {
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      return execSync('git rev-parse --abbrev-ref HEAD', { cwd: folder, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { return 'ERROR'; }
  }
}
