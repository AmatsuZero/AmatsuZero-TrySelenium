import { Connection, createConnection } from "typeorm";
import DetailPage from './detail';
import { InfoModel } from "./entity/info";
import NewListPage from './newlist';
import { findAvailableHost, Logger } from './util';

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
    } catch(e) {
      Logger.error(`❌ 解析保存失败: ${href}`);
      Logger.error(e);
    }
  }
};

(async () => {
  Logger.log(`🚀 启动任务：${new Date().toLocaleString('zh-CN')}`);
  const connection = await createConnection();
  try {
    const host = await findAvailableHost();
    if (host.length === 0) {
      Logger.error('❌ 没有可以访问的域名', -1);
    } else {
      Logger.log(`☁️ 使用域名为：${host}`);
      Logger.log('✨ 开始解析新作品列表');
      const newListPage = new NewListPage(host);
      await newListPage.getAllThreadLinks(async (hrefs) => parseNewlistData(connection, hrefs));
    }
  } catch (e) {
    Logger.log('❌ 好吧，我也不知道这里出了什么错');
    Logger.error(e);
  } finally {
    Logger.log(`🚀 任务结束：${new Date().toLocaleString('zh-CN')}`);
    connection.close();
  }
})();