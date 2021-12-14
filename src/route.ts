import { Connection } from 'typeorm';
import { NewListPage, ThreadInfo } from './newlist';
import DetailPage from './detail';
import { InfoModel } from "./entity/info";
import { findAvailableHost, Logger, ShouldCountinue } from './util';
import ACGList from './acglist';
import ACGDetailPage from './acgdetail';

const parseNewlistData = async (connection: Connection, hrefs: ThreadInfo[]) => {
  const repo = connection.getRepository(InfoModel);
  for (const href of hrefs) {
    Logger.log(`🔍 即将解析详情页面：${href.href}`);
    const detail = new DetailPage(href.href, href.tag);
    try {
      const info = await detail.extractInfo();
      if (info === undefined) {
        continue;
      }
      await repo.save(info);
      Logger.log(`🍺 解析完成: ${href.tag}-${info.title}`);
    } catch (e) {
      ShouldCountinue();
      Logger.error(`❌ 解析保存失败: ${href.tag}-${href.href}`);
      Logger.error(e);
    }
  }
};

const parseACGListData = async (connection: Connection, hrefs: ThreadInfo[]) => {
  const repo = connection.getRepository(InfoModel);
  for (const href of hrefs) {
    Logger.log(`🔍 即将解析详情页面：${href.href}`);
    const detail = new ACGDetailPage(href.href, href.tag);
    try {
      const info = await detail.extractInfo();
      if (info === undefined) {
        continue;
      }
      await repo.save(info);
      Logger.log(`🍺 解析完成: ${href.tag}-${info.title}`);
    } catch (e) {
      ShouldCountinue();
      Logger.error(`❌ 解析保存失败: ${href.tag}-${href.href}`);
      Logger.error(e);
    }
  }
};

const beforeParse = async (connection: Connection, category: string, hasHistoryData: boolean) => {
  const host = await findAvailableHost();
  if (host.length === 0) {
    throw new Error("❌ 没有可以访问的域名");
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
      where: [{ category }],
      order: { threadId: 'DESC' }
    });
    if (latest !== undefined) {
      Logger.log(`📝  历史数据最新一条是：${latest.threadId}：${latest.title}`);
      latestId = latest.threadId;
    }
    const earliest = await repo.findOne({
      where: [{ category }],
      order: { threadId: 'ASC' }
    });
    if (earliest !== undefined) {
      Logger.log(`📝  历史数据最早一条是：${earliest.threadId}：${earliest.title}`);
      earliestId = earliest.threadId;
    }
    earliestId = earliest !== undefined ? earliest.threadId : -1;
  }
  return {
    host,
    latestId,
    earliestId
  }
};

const parseNewListPage = async (connection: Connection, startPage: number, hasHistoryData: boolean) => {
  const { host, latestId, earliestId } = await beforeParse(connection, "new", hasHistoryData);
  Logger.log('✨ 开始解析新作品列表');
  const newListPage = new NewListPage(host, latestId, earliestId);
  newListPage.currentPage = startPage;
  await newListPage.getAllThreadLinks(async (hrefs) => parseNewlistData(connection, hrefs));
  Logger.log('✨ 解析新作品列表结束');
};

const parseACGListPage = async (connection: Connection, startPage: number, hasHistoryData: boolean) => {
  const { host, latestId, earliestId } = await beforeParse(connection, "acg", hasHistoryData);
  Logger.log('✨ 开始解析 ACG 列表');
  const acgList = new ACGList(host, latestId, earliestId);
  acgList.currentPage = startPage;
  await acgList.getAllThreadLinks(async (hrefs) => parseACGListData(connection, hrefs));
  Logger.log('✨ 解析 ACG 列表结束');
};

export {
  parseNewlistData,
  parseNewListPage,
  parseACGListPage,
}