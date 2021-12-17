import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { ExtensionContext, workspace, window } from 'vscode';
import { Logger, prepareConnection } from '../util';
import { parseNewListPage } from '../route';

const mkdir = promisify(fs.mkdir);

const getDBPath = async (ctx: ExtensionContext) => {
	let database = workspace.getConfiguration("sis001-downloader").get("database") as string; // 先从配置获取位置
    if (database === undefined || database.length === 0) {
      database = ctx.globalStorageUri.fsPath;
      if (!fs.existsSync(database)) {
        database = path.normalize(path.join(database, '..')); // 父文件夹一定存在
        database = path.join(database, 'sis001-downloadwer-data');
        if (!fs.existsSync(database)) {
          await mkdir(database);
        }
      }
      database = path.join(database, 'database.sqlite');
    }
		return database;
}

const parseNewList = async (ctx: ExtensionContext) => {
	window.showInformationMessage('⚙️ 从插件解析新作品列表！');
	const { connection, hasHistoryData } = await prepareConnection(await getDBPath(ctx));
	try {
		await parseNewListPage(connection, 1, hasHistoryData);
	} catch(e) {
    window.showErrorMessage("❌ 解析新作品列表出错");
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
