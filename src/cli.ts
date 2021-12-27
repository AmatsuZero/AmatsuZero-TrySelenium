import { Logger, parseInitArgs, prepareConnection } from './util';
import { resume, specifiedPages, parseNewListPage, updateNewTags, parseACGListPage } from './route';
import { nameExtraction } from './name_extraction';
import { Connection } from 'typeorm';
import { createPosts } from './pages';

(async () => {
  let conn: Connection | null | undefined;
  try {
    const { startpage, pages, isResume, isUpdateTags, isUpdateNames, isHexo } = await parseInitArgs();
    Logger.log(`🚀 启动任务：${new Date().toLocaleString('zh-CN')}`);
    const { connection, hasHistoryData } = await prepareConnection();
    conn = connection;
    if (isUpdateTags) {
      await updateNewTags(connection);
    } else if (isUpdateNames) {
      await nameExtraction(connection);
    } else if (isResume) {
      await resume(connection, startpage, pages);
    } else if (pages.length > 0) {
      await specifiedPages(connection, pages);
    } else if (isHexo) {
      await createPosts(connection);
    } else {
      await parseNewListPage(connection, startpage, hasHistoryData);
      await parseACGListPage(connection, startpage, hasHistoryData);
    }
  } catch (e) {
    Logger.log('❌ 好吧，我也不知道这里出了什么错');
    Logger.error(e);
  } finally {
    Logger.log(`🚀 任务结束：${new Date().toLocaleString('zh-CN')}`);
    if (conn !== null && conn !== undefined) {
      await conn.close()
    }
    process.exit(0);
  }
})();

