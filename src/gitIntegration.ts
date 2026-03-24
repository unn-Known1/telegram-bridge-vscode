import * as vscode from 'vscode';
import { TelegramService } from './telegramService';
import { execSync } from 'child_process';

export class GitIntegration {
  private _fileWatcher: vscode.FileSystemWatcher | undefined;
  private _lastCommitHash = '';

  constructor(private _service: TelegramService) {}

  register(context: vscode.ExtensionContext): void {
    // Watch .git/COMMIT_EDITMSG to detect new commits
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!ws) { return; }

    try {
      this._fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.Uri.file(`${ws}/.git`), 'COMMIT_EDITMSG')
      );

      this._fileWatcher.onDidChange(async () => {
        const cfg = vscode.workspace.getConfiguration('telegramBridge');
        if (!cfg.get<boolean>('notifyOnGitCommit', false)) { return; }
        if (!this._service.isConnected()) { return; }

        await new Promise(r => setTimeout(r, 500)); // small delay so git finishes
        const hash = this._run('git rev-parse --short HEAD', ws);
        if (hash === this._lastCommitHash) { return; }
        this._lastCommitHash = hash;

        const branch  = this._run('git rev-parse --abbrev-ref HEAD', ws);
        const message = this._run('git log -1 --pretty=%s', ws);
        const author  = this._run('git log -1 --pretty=%an', ws);
        const wsName  = this._service.getWorkspaceName();

        await this._service.sendMessage(
          `🔀 *Git Commit*\n\n📁 \`${wsName}\`\n🌿 Branch: \`${branch}\`\n👤 ${author}\n📝 ${message}\n🔑 \`${hash}\`\n🕐 ${new Date().toLocaleTimeString()}`
        );
      });

      context.subscriptions.push(this._fileWatcher);
    } catch {
      // Not a git repo — silently skip
    }
  }

  async sendGitStatus(): Promise<boolean> {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!ws) { return false; }

    const branch  = this._run('git rev-parse --abbrev-ref HEAD', ws);
    const status  = this._run('git status --short', ws);
    const log     = this._run('git log --oneline -5', ws);
    const wsName  = this._service.getWorkspaceName();

    if (branch === 'ERROR') {
      vscode.window.showErrorMessage('Not a git repository or git not available.');
      return false;
    }

    let text = `📊 *Git Status*\n\n📁 \`${wsName}\`\n🌿 Branch: \`${branch}\`\n\n`;

    if (status) {
      text += `*Changed files:*\n\`\`\`\n${status.substring(0, 400)}\n\`\`\`\n\n`;
    } else {
      text += `*Working tree: clean* ✅\n\n`;
    }

    if (log) {
      text += `*Recent commits:*\n\`\`\`\n${log}\n\`\`\`\n`;
    }

    text += `\n🕐 ${new Date().toLocaleTimeString()}`;
    return this._service.sendMessage(text);
  }

  private _run(cmd: string, cwd: string): string {
    try {
      return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
    } catch { return 'ERROR'; }
  }
}
