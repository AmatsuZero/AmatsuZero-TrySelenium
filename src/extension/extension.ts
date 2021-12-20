import path from 'path';
import * as vscode from 'vscode';
import { createLogger, Logger } from '../util';
import { Commands, parseNewList } from './route';

const getLoggerPath = async (ctx: vscode.ExtensionContext) => {
	let loggerPath = vscode.workspace.getConfiguration("sis001-downloader").get("logger") as string; // 先从配置获取位置
	if (loggerPath === undefined || loggerPath.length === 0) {
		loggerPath = path.join(ctx.logUri.fsPath, 'log.txt');
	}
	return loggerPath;
}

const init = async (context: vscode.ExtensionContext) => {
	createLogger(await getLoggerPath(context)); // 设置日志
	const driverPath = vscode.workspace.getConfiguration("sis001-downloader").get("chromeDriverPath") as string;
	process.env.driverPath = driverPath;
};

const activate = async (context: vscode.ExtensionContext) => {
	await init(context);
	Logger.log('🎉 插件 "sis001-downloader" 现在启动了！');
	const disposable = vscode.commands.registerCommand(Commands.ParseNewListCommand, async () => await parseNewList(context));
	context.subscriptions.push(disposable);
}

const deactivate = () => {};

export {
  activate,
  deactivate,
}