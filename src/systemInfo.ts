import * as vscode from 'vscode';
import * as os from 'os';
import { TelegramService } from './telegramService';

export async function sendSystemInfo(service: TelegramService): Promise<boolean> {
  const ws = service.getWorkspaceName();
  const cpus = os.cpus();
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMem  = (os.freemem()  / 1024 / 1024 / 1024).toFixed(1);
  const uptime   = Math.floor(os.uptime() / 3600);
  const platform = `${os.platform()} ${os.arch()}`;
  const nodeVer  = process.version;
  const ext      = vscode.extensions.all.filter(e => e.isActive).length;
  const folders  = vscode.workspace.workspaceFolders?.length ?? 0;

  let text = `💻 *System Info*\n\n`;
  text += `📁 Workspace: \`${ws}\`\n`;
  text += `🖥️ OS: \`${platform}\`\n`;
  text += `⚙️ CPU: \`${cpus[0]?.model ?? 'Unknown'} (${cpus.length} cores)\`\n`;
  text += `💾 RAM: \`${freeMem}GB free / ${totalMem}GB total\`\n`;
  text += `⏱ Uptime: \`${uptime}h\`\n`;
  text += `🟢 Node: \`${nodeVer}\`\n`;
  text += `🔌 Active extensions: \`${ext}\`\n`;
  text += `📂 Workspace folders: \`${folders}\`\n`;
  text += `🕐 ${new Date().toLocaleString()}`;

  return service.sendMessage(text);
}
