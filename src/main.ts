import { Logger, parseInitArgs, prepareConnection } from './util';
import { resume, specifiedPages, parseNewListPage, updateNewTags } from './route';

(async () => {
  const { startpage, pages, isResume, isUpdateTags } = await parseInitArgs();
  Logger.log(`🚀 启动任务：${new Date().toLocaleString('zh-CN')}`);
  const { connection, hasHistoryData } = await prepareConnection();
  try {
    if (isUpdateTags) {
      await updateNewTags(connection);
    } else if (isResume) {
      await resume(connection, startpage, pages);
    } else if (pages.length > 0) {
      await specifiedPages(connection, pages);
    } else {
      await parseNewListPage(connection, startpage, hasHistoryData);
      // await parseACGListPage(connection, startpage, hasHistoryData);
    }
  } catch (e) {
    Logger.log('❌ 好吧，我也不知道这里出了什么错');
    Logger.error(e);
  } finally {
    Logger.log(`🚀 任务结束：${new Date().toLocaleString('zh-CN')}`);
    connection.close();
  }
})();

