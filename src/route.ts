import { Connection, Repository } from 'typeorm';
import { NewListPage, ThreadInfo } from './newlist';
import DetailPage from './detail';
import { InfoModel } from "./entity/info";
import { findAvailableHost, Logger, ShouldCountinue } from './util';
import ACGList from './acglist';
import ACGDetailPage from './acgdetail';

const parseNewlistData = async (repo: Repository<InfoModel>, hrefs: ThreadInfo[]) => {
  for (const href of hrefs) {
    Logger.log(`🔍 即将解析新作品详情页面：${href.href}`);
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

const parseACGListData = async (repo: Repository<InfoModel>, hrefs: ThreadInfo[]) => {
  for (const href of hrefs) {
    Logger.log(`🔍 即将解析ACG详情页面：${href.href}`);
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
    const repo = connection.getRepository(InfoModel);
    const cnt = await repo.count();
    Logger.log("💻 有历史数据，更新添加～");
    // 查找最后和最新一条数据的 thread id
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
  const repo = connection.getRepository(InfoModel);
  newListPage.dbRepo = repo;
  await newListPage.getAllThreadLinks(async (hrefs) => parseNewlistData(repo, hrefs));
  Logger.log('✨ 解析新作品列表结束');
};

const parseACGListPage = async (connection: Connection, startPage: number, hasHistoryData: boolean) => {
  const { host, latestId, earliestId } = await beforeParse(connection, "acg", hasHistoryData);
  Logger.log('✨ 开始解析 ACG 列表');
  const acgList = new ACGList(host, latestId, earliestId);
  const repo = connection.getRepository(InfoModel);
  acgList.currentPage = startPage;
  await acgList.getAllThreadLinks(async (hrefs) => parseACGListData(repo, hrefs));
  Logger.log('✨ 解析 ACG 列表结束');
};

const updateNewTags = async (connection: Connection) => {
  const { host, latestId, earliestId } = await beforeParse(connection, "new", true);
  const newListPage = new NewListPage(host, latestId, earliestId);
  newListPage.dbRepo = connection.getRepository(InfoModel);
  Logger.log('✨ 开始更新新列表标签');
  await newListPage.updateTags();
  Logger.log('✨ 更新新列表标签结束');
}

const specifiedPages = async (connection: Connection, pages: ThreadInfo[]) => {
  Logger.log("🔧 开始解析单独页面");
  const repo = connection.getRepository(InfoModel);
  await parseNewlistData(repo, pages);
};

const resume = async (connection: Connection, start: number, pages: ThreadInfo[]) => {
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

export {
  parseNewlistData,
  parseNewListPage,
  parseACGListPage,
  updateNewTags,
  specifiedPages,
  resume,
}