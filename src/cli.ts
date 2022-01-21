import { Logger, parseInitArgs, prepareConnection } from './util';
import { resume, specifiedPages, parseNewListPage, updateNewTags, parseACGListPage, parseNoveListPage, parseWesternListPage } from './route';
import { nameExtraction } from './name_extraction';
import { Connection } from 'typeorm';
import { createPosts } from './pages';
import fs from 'fs/promises';
import { GoogleDriver } from './pages/google';

(async () => {
  let conn: Connection | null | undefined;
  try {
    const { startpage, pages, isResume, isUpdateTags, isUpdateNames, isHexo, CREDENTIAL_PATH, TOKEN_PATH } = await parseInitArgs();
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
      const token = await fs.readFile(CREDENTIAL_PATH, 'utf-8');
      const cred = JSON.parse(token);
      const driver = new GoogleDriver(TOKEN_PATH, cred);
      await driver.authorize((driver) => {
        return driver.getAccessTokenNTerminal();
      });
      await createPosts(connection, driver);
    } else {
      await parseNewListPage(connection, startpage, hasHistoryData);
      await parseNoveListPage(connection, startpage, hasHistoryData);
      await parseACGListPage(connection, startpage, hasHistoryData);
      await parseWesternListPage(connection, startpage, hasHistoryData);
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

