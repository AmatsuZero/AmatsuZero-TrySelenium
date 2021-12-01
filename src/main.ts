import NewListPage from './newlist';
import { findAvailableHost } from './util';

(async () => {
  const host = await findAvailableHost();
  if (host.length === 0) {
    console.log('没有可以访问的域名');
    return;
  }
  const newListPage = new NewListPage(host);
  const hrefs = await newListPage.getAllThreadsOnCurrentPage();
  console.log(hrefs);
})();