import { findAvailableHost } from './util';

(async () => {
  const host = await findAvailableHost();
  if (host.length === 0) {
    console.log('没有可以访问的域名');
    return;
  }


})();