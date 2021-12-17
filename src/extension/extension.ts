import * as vscode from 'vscode';
import { createLogger, Logger } from '../util';
import { Commands, parseNewList } from './route';

const activate = async (context: vscode.ExtensionContext) => {
	createLogger(context);
	Logger.log('🎉 插件 "sis001-downloader" 现在启动了！');
	const disposable = vscode.commands.registerCommand(Commands.ParseNewListCommand, async () => await parseNewList(context));
	context.subscriptions.push(disposable);
}

const deactivate = () => {};

export {
  activate,
  deactivate,
}