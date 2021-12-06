import fs from 'fs';
import path from "path";
import { Connection, createConnection } from "typeorm";
import DetailPage from './detail';
import { InfoModel } from "./entity/info";
import NewListPage from './newlist';
import { findAvailableHost, Logger, parseInitArgs, ShouldCountinue } from './util';

const parseNewlistData = async (connection: Connection, hrefs: string[]) => {
  const repo = connection.getRepository(InfoModel);
  for (const href of hrefs) {
    Logger.log(`🔍 即将解析详情页面：${href}`);
    const detail = new DetailPage(href);
    try {
      const info = await detail.extractInfo();
      if (info === undefined) {
        continue;
      }
      await repo.save(info);
      Logger.log(`🍺 解析完成: ${info.title}`);
    } catch (e) {
      ShouldCountinue();
      Logger.error(`❌ 解析保存失败: ${href}`);
      Logger.error(e);
    }
  }
};

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

const parseNewListPage = async (connection: Connection, startPage: number, hasHistoryData: boolean) => {
  const host = await findAvailableHost();
  if (host.length === 0) {
    Logger.error('❌ 没有可以访问的域名', -1);
    return;
  } else {
    Logger.log(`☁️ 使用域名为：${host}`);    
  }
  let latestId = -1;
  let earliestId = -1;
  if (!hasHistoryData) {
    Logger.log("💻 本地没有历史数据，全新开始～");
  } else {
    Logger.log("💻 有历史数据，更新添加～");
    // 查找最后和最新一条数据的 thread id
    const repo = connection.getRepository(InfoModel);
    const latest = await repo.findOne({
      order: { threadId: 'DESC' }
    });
    if (latest !== undefined) {
      Logger.log(`📝  历史数据最新一条是：${latest.threadId}：${latest.title}`);
      latestId = latest.threadId;
    }
    const earliest = await repo.findOne({
      order: { threadId: 'ASC' }
    });
    if (earliest !== undefined) {
      Logger.log(`📝  历史数据最早一条是：${earliest.threadId}：${earliest.title}`);
      earliestId = earliest.threadId;
    }
    earliestId = earliest !== undefined ? earliest.threadId : -1;
  }
  Logger.log('✨ 开始解析新作品列表');
  const newListPage = new NewListPage(host, latestId, earliestId);
  newListPage.currentPage = startPage;
  await newListPage.getAllThreadLinks(async (hrefs) => parseNewlistData(connection, hrefs));
  Logger.log('✨ 解析新作品列表结束');
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