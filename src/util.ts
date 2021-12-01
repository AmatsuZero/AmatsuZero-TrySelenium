import {
  Browser,
  Builder,
} from 'selenium-webdriver';

const expectedTitle = 'SiS001! Board - [第一会所 邀请注册]';

const PageCode = {
  NEW: 'forum-561'
}

const SISPaths = {
  INDEX: "/bbs",
  NEW: `/bbs/${PageCode.NEW}`
}

const hosts = [
  // "https://sis001.com/",
  "http://154.84.6.38/",
  "http://162.252.9.11/",
  "http://154.84.5.249/",
  "http://154.84.5.211/",
  "http://162.252.9.2/"
]

const makeSafariBrowser = async () => await new Builder().forBrowser(Browser.SAFARI).build();

const findAvailableHost = async () => {
  let expectedHost = '';
  for (const host of hosts) {
    const driver = await makeSafariBrowser();
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
  makeSafariBrowser,
  findAvailableHost,
  SISPaths,
  PageCode
}