import * as vscode from 'vscode';
import { Logger, prepareConnection } from '../util';
import { parseNewListPage } from '../route';

const parseNewList = async (ctx: vscode.ExtensionContext) => {
	vscode.window.showInformationMessage('⚙️ 从插件解析新作品列表！');
	const { connection, hasHistoryData } = await prepareConnection(ctx);
	try {
		await parseNewListPage(connection, 1, hasHistoryData);
	} catch(e) {
    vscode.window.showErrorMessage("❌ 解析新作品列表出错");
    Logger.error(e);
	} finally {
		await connection.close();
	}
};

const Commands = {
  ParseNewListCommand: 'video-previewer.parseNewList'
};

export {
  parseNewList,
  Commands
}
