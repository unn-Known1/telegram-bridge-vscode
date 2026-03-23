import * as vscode from 'vscode';
import { TelegramService } from './telegramService';

export class NotificationManager {
  private _service: TelegramService;
  private _context: vscode.ExtensionContext;

  constructor(service: TelegramService, context: vscode.ExtensionContext) {
    this._service = service;
    this._context = context;
  }

  register(context: vscode.ExtensionContext): void {
    // Task events
    context.subscriptions.push(
      vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (!this._service.isConnected()) { return; }

        const config = vscode.workspace.getConfiguration('telegramBridge');
        const workspace = this._service.getWorkspaceName();
        const taskName = e.execution.task.name;

        if (e.exitCode === 0) {
          if (!config.get<boolean>('notifyOnBuildSuccess', true)) { return; }
          await this._service.sendMessage(
            `✅ *Build Succeeded*\n\n📁 Workspace: \`${workspace}\`\n🔧 Task: \`${taskName}\`\n⏱ ${new Date().toLocaleTimeString()}`
          );
        } else {
          if (!config.get<boolean>('notifyOnBuildFailure', true)) { return; }
          await this._service.sendMessage(
            `❌ *Build Failed*\n\n📁 Workspace: \`${workspace}\`\n🔧 Task: \`${taskName}\`\n🔴 Exit code: \`${e.exitCode}\`\n⏱ ${new Date().toLocaleTimeString()}`
          );
        }
      })
    );

    // Debug session events
    context.subscriptions.push(
      vscode.debug.onDidStartDebugSession(async (session) => {
        if (!this._service.isConnected()) { return; }
        const config = vscode.workspace.getConfiguration('telegramBridge');
        if (!config.get<boolean>('notifyOnDebugStart', false)) { return; }

        const workspace = this._service.getWorkspaceName();
        await this._service.sendMessage(
          `🐛 *Debug Started*\n\n📁 Workspace: \`${workspace}\`\n🔍 Session: \`${session.name}\`\n⏱ ${new Date().toLocaleTimeString()}`,
          true // silent
        );
      })
    );

    context.subscriptions.push(
      vscode.debug.onDidTerminateDebugSession(async (session) => {
        if (!this._service.isConnected()) { return; }
        const config = vscode.workspace.getConfiguration('telegramBridge');
        if (!config.get<boolean>('notifyOnDebugStop', false)) { return; }

        const workspace = this._service.getWorkspaceName();
        await this._service.sendMessage(
          `🏁 *Debug Session Ended*\n\n📁 Workspace: \`${workspace}\`\n🔍 Session: \`${session.name}\`\n⏱ ${new Date().toLocaleTimeString()}`,
          true
        );
      })
    );

    // File save event
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (!this._service.isConnected()) { return; }
        const config = vscode.workspace.getConfiguration('telegramBridge');
        if (!config.get<boolean>('notifyOnFileSave', false)) { return; }

        const fileName = doc.fileName.split('/').pop() || doc.fileName;
        const workspace = this._service.getWorkspaceName();
        await this._service.sendMessage(
          `💾 *File Saved*\n\n📁 Workspace: \`${workspace}\`\n📄 File: \`${fileName}\``,
          true
        );
      })
    );
  }
}
