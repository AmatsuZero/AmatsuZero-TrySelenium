import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { ExtensionContext, workspace, window } from 'vscode';
import { Logger, prepareConnection } from '../util';
import { parseNewListPage, parseACGListPage } from '../route';
import { createPosts } from '../pages';
import { initDriver } from './google';
import { Connection } from 'typeorm';

const mkdir = promisify(fs.mkdir);

const getDataFolderPath = async (ctx: ExtensionContext) => {
  let dirPath = ctx.globalStorageUri.fsPath;
  if (!fs.existsSync(dirPath)) {
    dirPath = path.normalize(path.join(dirPath, '..')); // 父文件夹一定存在
    dirPath = path.join(dirPath, 'sis001-downloadwer-data');
    if (!fs.existsSync(dirPath)) {
      await mkdir(dirPath);
    }
  }
  return dirPath;
}

const getDBPath = async (ctx: ExtensionContext) => {
	let database = workspace.getConfiguration("sis001-downloader").get("database") as string; // 先从配置获取位置
    if (database === undefined || database.length === 0) {
      database = await getDataFolderPath(ctx);
      database = path.join(database, 'database.sqlite');
    }
		return database;
}

const parseNewList = async (ctx: ExtensionContext, startPage = 1) => {
	window.showInformationMessage('⚙️ 从插件解析新作品列表！');
	const { connection, hasHistoryData } = await prepareConnection(await getDBPath(ctx));
	try {
		await parseNewListPage(connection, startPage, hasHistoryData);
	} catch(e) {
    window.showErrorMessage("❌ 解析新作品列表出错");
    Logger.error(e);
	} finally {
		await connection.close();
	}
};

const parseACGList = async (ctx: ExtensionContext, startPage = 1) => {
  window.showInformationMessage('⚙️ 从插件解析 ACG 列表！');
  const { connection, hasHistoryData } = await prepareConnection(await getDBPath(ctx));
  try {
    await parseACGListPage(connection, startPage, hasHistoryData);
	} catch(e) {
    window.showErrorMessage("❌ 解析新作品列表出错");
    Logger.error(e);
	} finally {
		await connection.close();
	}
};

const generatePosts = async (ctx: ExtensionContext) => {
  window.showInformationMessage('⚙️ 开始生成帖子！'); 
  const { connection } = await prepareConnection(await getDBPath(ctx));
  try {
    await initDriver(ctx);
    await createPosts(connection);
  } catch(e) {
    window.showErrorMessage("❌ 创建帖子出错");
    Logger.error(e);
  } finally {
    await connection.close();
  }

};

const Commands = {
  ParseNewListCommand: 'video-previewer.parseNewList',
  ParseACGListCommand: 'video-previewer.parseACGList',
  GeneratePostsCommand: 'video-previewer.generatePosts'
};

export {
  parseNewList,
  parseACGList,
  Commands,
  generatePosts,
  getDataFolderPath,
}
