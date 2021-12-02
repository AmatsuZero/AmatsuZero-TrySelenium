import { By } from 'selenium-webdriver';
import { createConnection } from "typeorm";
import DetailPage from './detail';
import { InfoModel } from './entity/info';
import NewListPage from './newlist';
import { findAvailableHost } from './util';

(async () => {
  try {
    const host = await findAvailableHost();
    if (host.length === 0) {
      console.log('没有可以访问的域名');
      return;
    }

    const newListPage = new NewListPage(host);
    const hrefs = await newListPage.getAllThreadsOnCurrentPage();
    
    for (const href of hrefs) {
      const connection = await createConnection();
      const detail = new DetailPage(href);
      const info = await detail.extractInfo();
      console.log(info);
      await connection.manager.save(info);
    }

  } catch (e) {
    console.error(e);
  }
})();
