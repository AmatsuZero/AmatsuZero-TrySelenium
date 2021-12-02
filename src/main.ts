import DetailPage from './detail';
import NewListPage from './newlist';
import { findAvailableHost } from './util';

(async () => {
  // const host = await findAvailableHost();
  // if (host.length === 0) {
  //   console.log('没有可以访问的域名');
  //   return;
  // }
  // http://162.252.9.2/bbs/thread-11174550-1-1.html
  // const newListPage = new NewListPage(host);
  // const hrefs = await newListPage.getAllThreadLinks();
  // console.log(hrefs);

  const detail = new DetailPage("http://162.252.9.2/bbs/thread-11174550-1-1.html");
  const info = await detail.extractInfo();
  console.log(info);
})();