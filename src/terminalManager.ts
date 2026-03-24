import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { TelegramService } from './telegramService';

export class TerminalManager {
  private _terminals: Map<string, vscode.Terminal> = new Map();
  private _commandHistory: Map<number, string[]> = new Map();

  constructor(
    private _telegram: TelegramService,
    private _context: vscode.ExtensionContext
  ) {}

  registerCommands(): void {
    this._telegram.registerCommand('sh', 'Execute shell command', async (args) => {
      if (!args) {
        await this._telegram.sendMessage('Usage: /sh <command>\nExample: /sh ls -la');
        return;
      }
      await this._executeCommand(args, undefined);
    });

    this._telegram.registerCommand('run', 'Run in VS Code terminal', async (args) => {
      if (!args) {
        await this._telegram.sendMessage('Usage: /run <command>\nExample: /run npm install');
        return;
      }
      const termName = `telegram-${Date.now()}`;
      await this._runInTerminal(args, termName);
    });

    this._telegram.registerCommand('terminals', 'List active terminals', async () => {
      const terms = this._getTerminalList();
      if (terms.length === 0) {
        await this._telegram.sendMessage('No active terminals');
      } else {
        await this._telegram.sendMessage(`*Active Terminals:*\n${terms.join('\n')}`);
      }
    });

    this._telegram.registerCommand('kill', 'Kill a terminal', async (args) => {
      if (!args) {
        await this._telegram.sendMessage('Usage: /kill <terminal-name>');
        return;
      }
      const killed = this._killTerminal(args);
      await this._telegram.sendMessage(killed ? `✅ Terminal "${args}" killed` : `❌ Terminal "${args}" not found`);
    });

    this._telegram.registerCommand('term', 'Create/use named terminal', async (args) => {
      if (!args) {
        await this._telegram.sendMessage('Usage: /term <name> [command]\nExamples:\n/term myserver\n/term myserver npm start');
        return;
      }
      const parts = args.split(' ');
      const termName = parts[0];
      const command = parts.slice(1).join(' ');
      
      if (command) {
        await this._runInTerminal(command, termName);
      } else {
        await this._runInTerminal('', termName);
        await this._telegram.sendMessage(`✅ Terminal "${termName}" opened. Send commands with /sh <cmd>`);
      }
    });

    vscode.window.onDidCloseTerminal((term) => {
      this._terminals.delete(term.name);
    });
  }

  private async _executeCommand(command: string, cwd?: string): Promise<void> {
    const ws = this._telegram.getWorkspaceName();
    const maxOutput = 3500;

    await this._telegram.sendMessage(`🔄 *Executing:* \`${command}\`\n\n\`\`\`\n$ ${command}\n\`\`\``);

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const cwdPath = cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    const child = spawn(shell, shellArgs, {
      cwd: cwdPath,
      env: { ...process.env },
      shell: false
    });

    let stdout = '';
    let stderr = '';
    let output = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      output += text;
      if (output.length > maxOutput) {
        output = output.slice(-maxOutput);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      output += text;
      if (output.length > maxOutput) {
        output = output.slice(-maxOutput);
      }
    });

    const timeout = setTimeout(() => {
      child.kill();
    }, 120000);

    child.on('close', async (code) => {
      clearTimeout(timeout);
      
      let result = '';
      if (output) {
        result = `\`\`\`\n${output}\n\`\`\``;
      }
      
      if (code === 0) {
        await this._telegram.sendMessage(
          `✅ *Command completed*\n\n📁 \`${ws}\`\n$ ${command}\n\n${result}`
        );
      } else {
        await this._telegram.sendMessage(
          `❌ *Command failed* (exit code: ${code})\n\n📁 \`${ws}\`\n$ ${command}\n\n${result}`
        );
      }
    });

    child.on('error', async (err) => {
      clearTimeout(timeout);
      await this._telegram.sendMessage(
        `❌ *Error:* ${err.message}`
      );
    });
  }

  private async _runInTerminal(command: string, termName: string): Promise<void> {
    let terminal = vscode.window.terminals.find(t => t.name === termName);
    
    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: termName,
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || undefined
      });
      this._terminals.set(termName, terminal);
    }

    terminal.show();
    terminal.sendText(command);

    await this._telegram.sendMessage(
      `✅ *Command sent to terminal* \`${termName}\`\n\n\`${command}\``
    );
  }

  private _getTerminalList(): string[] {
    const terms = vscode.window.terminals;
    if (terms.length === 0) return [];
    
    return terms.map(t => {
      const isActive = t === vscode.window.activeTerminal ? ' (active)' : '';
      return `• \`${t.name}\`${isActive}`;
    });
  }

  private _killTerminal(name: string): boolean {
    const terminal = vscode.window.terminals.find(t => t.name === name);
    if (terminal) {
      terminal.dispose();
      this._terminals.delete(name);
      return true;
    }
    return false;
  }

  sendToTerminal(termName: string, command: string): void {
    const terminal = vscode.window.terminals.find(t => t.name === termName);
    if (terminal) {
      terminal.show();
      terminal.sendText(command);
    }
  }
}
