import { By } from 'selenium-webdriver';
import { createConnection } from "typeorm";
import DetailPage from './detail';
import { InfoModel } from './entity/info';
import NewListPage from './newlist';
import { findAvailableHost, makeSafariBrowser } from './util';

(async () => {
  try {
    const connection = await createConnection();
    const detail = new DetailPage("http://162.252.9.2/bbs/thread-11174550-1-1.html");
    const info = await detail.extractInfo();
    console.log(info);
    await connection.manager.save(info);
  
    const posts = await connection.manager.find(InfoModel);
    console.log("Loaded posts: ", posts);
  } catch (e) {
    console.error(e);
  }
})();
