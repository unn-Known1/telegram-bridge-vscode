import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { TelegramService } from './telegramService';

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  description?: string;
  category?: string;
}

const BUILTIN_TEMPLATES: MessageTemplate[] = [
  {
    id: 'builtin-deploy',
    name: '🚀 Deploy Complete',
    category: 'CI/CD',
    description: 'Notify team of successful deployment',
    text: '🚀 *Deploy Complete*\n\n📁 Project: `{{workspace}}`\n🌿 Branch: `{{gitBranch}}`\n🕐 Time: {{time}}\n✅ Status: Success'
  },
  {
    id: 'builtin-pr',
    name: '🔀 PR Ready for Review',
    category: 'Git',
    description: 'Notify team a PR is ready',
    text: '🔀 *Pull Request Ready*\n\n📁 `{{workspace}}`\n👤 Author: {{user}}\n📋 Branch: `{{gitBranch}}`\n🕐 {{time}}'
  },
  {
    id: 'builtin-standup',
    name: '☀️ Daily Standup',
    category: 'Team',
    description: 'Daily update template',
    text: '☀️ *Daily Standup — {{date}}*\n\n✅ Yesterday: \n🎯 Today: \n🚧 Blockers: \n\n📁 Working on: `{{workspace}}`'
  },
  {
    id: 'builtin-bug',
    name: '🐛 Bug Found',
    category: 'Debug',
    description: 'Report a bug',
    text: '🐛 *Bug Report*\n\n📁 Project: `{{workspace}}`\n📄 File: `{{file}}`\n🔍 Description: \n🔴 Severity: '
  },
  {
    id: 'builtin-review',
    name: '👁️ Code Review Request',
    category: 'Git',
    description: 'Request code review',
    text: '👁️ *Code Review Needed*\n\n📁 `{{workspace}}`\n📄 File: `{{file}}`\n🕐 {{time}}\n\nPlease review when you get a chance!'
  },
  {
    id: 'builtin-done',
    name: '✅ Task Complete',
    category: 'Team',
    description: 'Mark a task as done',
    text: '✅ *Task Complete*\n\n📁 `{{workspace}}`\n📋 Task: \n⏱ Completed at: {{time}}'
  },
  {
    id: 'builtin-reminder',
    name: '⏰ Reminder',
    category: 'Personal',
    description: 'General reminder',
    text: '⏰ *Reminder*\n\n{{message}}\n\n🕐 Sent from VS Code at {{time}}'
  },
  {
    id: 'builtin-error',
    name: '🔴 Error Alert',
    category: 'Debug',
    description: 'Critical error notification',
    text: '🔴 *Error Alert*\n\n📁 `{{workspace}}`\n📄 File: `{{file}}`\n🕐 {{time}}\n\n```\n{{selection}}\n```'
  }
];

export class TemplateManager {
  constructor(private _service: TelegramService) {}

  getAllTemplates(): MessageTemplate[] {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const custom = cfg.get<MessageTemplate[]>('templates', []);
    return [...BUILTIN_TEMPLATES, ...custom];
  }

  getCustomTemplates(): MessageTemplate[] {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    return cfg.get<MessageTemplate[]>('templates', []);
  }

  async addTemplate(template: Omit<MessageTemplate, 'id'>): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const templates = this.getCustomTemplates();
    const id = `custom-${Date.now()}`;
    templates.push({ ...template, id });
    await cfg.update('templates', templates, vscode.ConfigurationTarget.Global);
  }

  async deleteTemplate(id: string): Promise<void> {
    if (id.startsWith('builtin-')) {
      vscode.window.showWarningMessage('Built-in templates cannot be deleted.');
      return;
    }
    const cfg = vscode.workspace.getConfiguration('telegramBridge');
    const templates = this.getCustomTemplates().filter(t => t.id !== id);
    await cfg.update('templates', templates, vscode.ConfigurationTarget.Global);
  }

  resolveVariables(text: string): string {
    const editor = vscode.window.activeTextEditor;
    const now = new Date();
    const selection = editor?.document.getText(editor.selection) ?? '';
    const file = editor?.document.fileName.split('/').pop() ?? '';
    const ws = this._service.getWorkspaceName();

    return text
      .replace(/{{workspace}}/g, ws)
      .replace(/{{file}}/g, file)
      .replace(/{{time}}/g, now.toLocaleTimeString())
      .replace(/{{date}}/g, now.toLocaleDateString())
      .replace(/{{datetime}}/g, now.toLocaleString())
      .replace(/{{selection}}/g, selection)
      .replace(/{{user}}/g, process.env.USER ?? process.env.USERNAME ?? 'developer')
      .replace(/{{gitBranch}}/g, this._getGitBranch())
      .replace(/{{message}}/g, '(your message)');
  }

  private _getGitBranch(): string {
    try {
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      return execSync('git rev-parse --abbrev-ref HEAD', { cwd: folder, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim();
    } catch { return 'unknown'; }
  }
}

export class TemplatesProvider implements vscode.TreeDataProvider<TemplateItem | CategoryItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private _manager: TemplateManager) {}

  refresh() { this._onDidChange.fire(); }

  getTreeItem(el: TemplateItem | CategoryItem) { return el; }

  getChildren(parent?: CategoryItem): (TemplateItem | CategoryItem)[] {
    const templates = this._manager.getAllTemplates();

    if (!parent) {
      // Return categories
      const cats = [...new Set(templates.map(t => t.category ?? 'General'))];
      return cats.map(c => new CategoryItem(c, templates.filter(t => (t.category ?? 'General') === c).length));
    }

    return templates
      .filter(t => (t.category ?? 'General') === parent.category)
      .map(t => new TemplateItem(t));
  }
}

export class CategoryItem extends vscode.TreeItem {
  constructor(public readonly category: string, count: number) {
    super(`${category}  (${count})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor('testing.iconPassed'));
    this.contextValue = 'category';
  }
}

export class TemplateItem extends vscode.TreeItem {
  constructor(public readonly template: MessageTemplate) {
    super(template.name, vscode.TreeItemCollapsibleState.None);
    this.description = template.description ?? '';
    
    this.tooltip = new vscode.MarkdownString(
      `**${template.name}**\n\n` +
      `${template.text.substring(0, 150)}${template.text.length > 150 ? '...' : ''}\n\n` +
      `---\n\n` +
      `*Category: ${template.category ?? 'General'}*`
    );
    this.tooltip.isTrusted = true;
    
    const isBuiltin = template.id.startsWith('builtin-');
    this.iconPath = new vscode.ThemeIcon(
      isBuiltin ? 'symbol-snippet' : 'file-text',
      isBuiltin ? new vscode.ThemeColor('testing.iconPassed') : new vscode.ThemeColor('charts.blue')
    );
    this.command = { command: 'telegramBridge.useTemplate', title: 'Send', arguments: [template.id] };
    this.contextValue = 'template';
  }
}
