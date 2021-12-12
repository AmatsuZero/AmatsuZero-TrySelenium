import fs from 'fs';
import path from "path";
import { Connection, createConnection } from "typeorm";
import { Logger, parseInitArgs } from './util';
import { parseNewlistData, parseNewListPage } from './route';

const prepareConnection = async () => {
  Logger.log("💻 准备创建数据库链接");
  const configPath = path.join(__dirname, '..', 'ormconfig.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { database } = config;
  const dataBasepath = path.join(__dirname, '..', database);
  const hasHistoryData = fs.existsSync(dataBasepath);
  const connection = await createConnection();
  return { connection, hasHistoryData };
};

const specifiedPages = async (connection: Connection, pages: string[]) => {
  Logger.log("🔧 开始解析单独页面");
  await parseNewlistData(connection, pages);
};

const resume = async (connection: Connection, start: number, pages: string[]) => {
  // 防止恢复页面中失败，进而丢失上次是恢复到第几页了，先打一个信息出来
  if (start > 1) {
    Logger.log(`🔧 从上次日志恢复：${start}`);
  } else {
    Logger.log("🔧 从上次日志恢复");
  }
  if (pages.length > 0) {
    Logger.log(`🔧 要重新尝试下载的作品有：${pages.join("\n")}`);
  }
  await specifiedPages(connection, pages);
  await parseNewListPage(connection, start, true);
};

(async () => {
  const { startpage, pages, isResume } = await parseInitArgs();
  Logger.log(`🚀 启动任务：${new Date().toLocaleString('zh-CN')}`);
  const { connection, hasHistoryData } = await prepareConnection();
  try {
    if (isResume) {
      await resume(connection, startpage, pages);
    } else if (pages.length > 0) {
      await specifiedPages(connection, pages);
    } else {
      await parseNewListPage(connection, startpage, hasHistoryData);
    }
  } catch (e) {
    Logger.log('❌ 好吧，我也不知道这里出了什么错');
    Logger.error(e);
  } finally {
    Logger.log(`🚀 任务结束：${new Date().toLocaleString('zh-CN')}`);
    connection.close();
  }
})();

