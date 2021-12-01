import {
  Browser,
  Builder,
} from 'selenium-webdriver';

const expectedTitle = 'SiS001! Board - [第一会所 邀请注册]';

const SISPaths = {
  INDEX: "/bbs",
  NEW: "/bbs/forum-561-1.html"
}

const hosts = [
  "https://sis001.com/",
  "http://154.84.6.38/",
  "http://162.252.9.11/",
  "http://154.84.5.249/",
  "http://154.84.5.211/",
  "http://162.252.9.2/"
]

const findAvailableHost = async () => {
  let expectedHost = '';
    for (const host of hosts) {
      const driver = await new Builder().forBrowser(Browser.SAFARI).build();
      try {
        const bbs = new URL(SISPaths.INDEX, host)
        await driver.get(bbs.href);
        const title = await driver.getTitle();
        if (title === expectedTitle) {
          expectedHost = host;
          break;
        }
      } catch (e) {
        console.error(e);
      } finally {
        await driver.quit();
      }
  }
  return expectedHost;
}

export {
  findAvailableHost,
  SISPaths
}