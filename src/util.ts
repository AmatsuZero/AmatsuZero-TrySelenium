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
import process from 'process';
import { createInterface } from 'readline';
import dotenv from "dotenv";
import { createConnection } from "typeorm";
import { ThreadInfo } from './newlist';
import { ExtensionContext } from 'vscode';

const expectedTitle = 'SiS001! Board - [第一会所 邀请注册]';
const logPath = path.join(__dirname, '..', 'log.txt');

const PageCode = {
  NEW: 'forum-561',
  ACG: 'forum-231',
}

const SISPaths = {
  INDEX: "/bbs",
  NEW: `/bbs/${PageCode.NEW}`,
  ACG: `bbs/${PageCode.ACG}`
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
  // 尝试解决超时问题：https://stackoverflow.com/questions/48450594/selenium-timed-out-receiving-message-from-renderer
  options.addArguments("enable-automation");
  options.addArguments("start-maximized");
  const builder = new Builder().forBrowser(Browser.CHROME);
  // vscode 插件下，chromedriver 路径也需要指定了
  let location = '';
  if (os.platform() === 'darwin') {
    location = '/usr/local/bin/chromedriver'; // 通过 homebrew 安装的路径
  } else if(os.platform() === 'linux') {// linux 需要指定 driver 位置
    location = path.join(__dirname, "..", "env/linux", "chromedriver");
    // 额外设置
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--disable-gpu'");
    options.addArguments("--no-sandbox");
  } 
  const serviceBuilder = new ServiceBuilder(location);
  builder.setChromeService(serviceBuilder);
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

let Logger: Console;

process.stdin.resume();// so the program will not close instantly

// do something when app is closing
process.on('exit', () => {
  Logger.log(`🔚 程序结束：${new Date().toLocaleString('zh-CN')}`);
});

// catches ctrl+c event
process.on('SIGINT', (code) => {
  Logger.error(`❌ 程序强制结束, #%d：${new Date().toLocaleString('zh-CN')}`,code);
  process.exit();
});

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', (code) => {
  Logger.error(`❌ 程序被杀死, #%d：${new Date().toLocaleString('zh-CN')}`,code);
  process.exit();
});
process.on('SIGUSR2',  (code) => {
  Logger.error(`❌ 程序被杀死, #%d：${new Date().toLocaleString('zh-CN')}`,code);
  process.exit();
});

// catches uncaught exceptions
process.on('uncaughtException',   (error, origin) => {
  Logger.log(`❌ 程序异常终止， 来源是${origin}：${new Date().toLocaleString('zh-CN')}`);
  Logger.error(error);
  process.exit();
});

const getThreadId = (href: string) => {
  let link = href.substring(href.lastIndexOf('/') + 1); // 获取最后一部分
  link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
  const id = link.split("-")[1];
  return parseInt(id, 10);
};

// 加载环境变量
dotenv.config();

const parseInitArgs = async () => {
  let startpage = 1
  let pages: ThreadInfo[] = [];
  let isResume = false;
  let isUpdateTags = false;
  // 检查起始页码
  for (const arg of process.argv) {
    if (arg.startsWith("--page")) {
      startpage = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--resume")) {
      isResume = true;
      const value = await processLogByLine(logPath);
      startpage = value.startPage;
      pages = value.retryPages;
    } else if (arg.startsWith("--single")) {
      pages = arg.split("")[1].split(",").map(page => new ThreadInfo(page, ""));
    } else if (arg.startsWith("--updateTags")) {
      isUpdateTags = true;
    }
  }
  createLogger();
  return { startpage, pages, isResume, isUpdateTags };
};

const createLogger = (ctx?: ExtensionContext) => {
  if (process.env.NODE_ENV === "TEST" || process.env.NODE_ENV === "DEBUG") {
    Logger = console;
  } else {
    let loggerPath = logPath;
    if (ctx !== undefined) {
      loggerPath = path.join(ctx.logUri.fsPath, 'log.txt');
    }
    const ws = fs.createWriteStream(loggerPath, {
      flags:'w', // 文件的打开模式
      mode:0o666, // 文件的权限设置
      encoding:'utf8', // 写入文件的字符的编码
      highWaterMark:3, // 最高水位线
      start:0, // 写入文件的起始索引位置        
      autoClose:true, // 是否自动关闭文档
    });
    Logger = new Console(ws, ws);
  }
};

const processLogByLine = async (path: string) => {
  const fileStream = fs.createReadStream(path);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.
  let startPage = -1;
  const retryPages: ThreadInfo[] = [];
  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    if (line.startsWith("🔗 即将打开新作品")) {
      const array = line.split("：")[0].match( /[0-9]/g);
      if (array !== null) {
        const page = parseInt(array.join(""), 10);
        if (page > startPage) {
          startPage = page;
        }
      }
    } else if (line.startsWith("❌ 提取页面信息失败:") 
    || line.startsWith("❌ 解析保存失败:")) {
      const href = line.split(": ")[1];
      const parts = href.split("-");
      retryPages.push(new ThreadInfo(parts[0], parts.length > 1 ? parts[1] : ""));
    } else if (line.startsWith("🔧 从上次日志恢复：")) {
      const num = line.split("：")[1];
      const page = parseInt(num, 10);
      if (page > startPage) {
        startPage = page;
      }
    }
  }
  return { startPage, retryPages };
};

let TotalFailuresCount = 0;
const MaxFailuresCount = 10;
const ShouldCountinue = () => {
  const ans = TotalFailuresCount >= MaxFailuresCount;
  if (ans) {
    Logger.log(`❌ 达到最大错误出现上限${MaxFailuresCount}，终止程序`);
    process.exit(-100);
  } else {
    TotalFailuresCount += 1;
  }
  return !ans;
}

const prepareConnection = async (ctx?: ExtensionContext) => {
  Logger.log("💻 准备创建数据库链接");
  const configPath = path.join(__dirname, '..', 'ormconfig.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { database } = config;
  const dataBasepath = path.join(__dirname, '..', database);
  const hasHistoryData = fs.existsSync(dataBasepath);
  const connection = await createConnection();
  return { connection, hasHistoryData };
};

export {
  makeBrowser,
  findAvailableHost,
  getThreadId,
  SISPaths,
  PageCode,
  Logger,
  parseInitArgs,
  ShouldCountinue,
  prepareConnection,
  createLogger
}