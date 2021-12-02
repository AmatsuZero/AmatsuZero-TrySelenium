import { Connection, createConnection } from "typeorm";
import DetailPage from './detail';
import { InfoModel } from "./entity/info";
import NewListPage from './newlist';
import { findAvailableHost } from './util';

const parseNewlistData = async (connection: Connection, hrefs: string[]) => {
  const repo = connection.getRepository(InfoModel);
  for (const href of hrefs) {
    const detail = new DetailPage(href);
    const info = await detail.extractInfo();
    console.log(info);
    if (info === undefined) {
      continue;
    }
    await repo.save(info);
  }
};

(async () => {
  const connection = await createConnection();
  try {
    const host = await findAvailableHost();
    if (host.length === 0) {
      console.log('没有可以访问的域名');
    } else {
      const newListPage = new NewListPage(host);
      await newListPage.getAllThreadLinks(async (hrefs) => parseNewlistData(connection, hrefs));
    }
  } catch (e) {
    console.error(e);
  } finally {
    connection.close();
  }
})();