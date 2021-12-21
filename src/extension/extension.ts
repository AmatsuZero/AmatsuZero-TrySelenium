import path from 'path';
import * as vscode from 'vscode';
import { createLogger, Logger, processLogByLine } from '../util';
import { Commands, parseACGList, parseNewList } from './route';

const getLoggerPath = async (ctx: vscode.ExtensionContext) => {
	let loggerPath = vscode.workspace.getConfiguration("sis001-downloader").get("logger") as string; // 先从配置获取位置
	if (loggerPath === undefined || loggerPath.length === 0) {
		loggerPath = path.join(ctx.logUri.fsPath, 'log.txt');
	}
	return loggerPath;
}

const init = async (context: vscode.ExtensionContext) => {
	const loggerPath = await getLoggerPath(context); // 设置日志
	createLogger(loggerPath); 
	const driverPath = vscode.workspace.getConfiguration("sis001-downloader").get("chromeDriverPath") as string;
	process.env.driverPath = driverPath;
	return processLogByLine(loggerPath);
};

const activate = async (context: vscode.ExtensionContext) => {
	const { startPage, retryPages } = await init(context);
	Logger.log(`🎉 插件 "sis001-downloader" 现在启动了！需要重试的有：\n${retryPages.join("\n")}`);
	context.subscriptions.push(vscode.commands.registerCommand(Commands.ParseNewListCommand, 
		async () => await parseNewList(context, startPage)));
	context.subscriptions.push(vscode.commands.registerCommand(Commands.ParseACGListCommand, 
		async () => await parseACGList(context, startPage)));
}

const deactivate = () => {};

export {
  activate,
  deactivate,
}