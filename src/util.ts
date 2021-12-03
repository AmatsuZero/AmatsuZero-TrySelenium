import {
  Browser,
  Builder,
} from 'selenium-webdriver';
import {
  ServiceBuilder,
  Options,
} from "selenium-webdriver/chrome";
import { URL } from 'url';
import path from 'path';
import fs from "fs";
import os from 'os';
import { Console } from 'console';

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
];

const makeBrowser = async () => {
  const options = new Options();
  options.addArguments("--headless"); // 创建无头浏览器
  const builder = new Builder().forBrowser(Browser.CHROME);
  if(os.platform() === 'linux') {// linux 需要指定 driver 位置
    const location = path.join(__dirname, "..", "env/linux", "chromedriver");
    const serviceBuilder = new ServiceBuilder(location);
    builder.setChromeService(serviceBuilder);

    // 额外设置
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--disable-gpu'");
    options.addArguments("--no-sandbox");
  }
  return await builder.setChromeOptions(options).build();
}

const findAvailableHost = async () => {
  let expectedHost = '';
  for (const host of hosts) {
    const driver = await makeBrowser();
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

const ws = fs.createWriteStream(path.join(__dirname, '..', 'log.txt'), {
  flags:'w', // 文件的打开模式
  mode:0o666, // 文件的权限设置
  encoding:'utf8', // 写入文件的字符的编码
  highWaterMark:3, // 最高水位线
  start:0, // 写入文件的起始索引位置        
  autoClose:true, // 是否自动关闭文档
})

const Logger = new Console(ws, ws);

export {
  makeBrowser,
  findAvailableHost,
  SISPaths,
  PageCode,
  Logger,
}