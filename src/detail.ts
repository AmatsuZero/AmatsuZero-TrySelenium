import { By, WebDriver } from "selenium-webdriver";
import { InfoModel } from "./entity/info";
import { makeBrowser, Logger } from "./util";

const findTorrentLink = async (driver: WebDriver) => {
  const links = await driver.findElements(By.xpath("//a"));
  let addr = '';
  for (const link of links) {
    const str = await link.getAttribute("href");
    if (str === null || str === undefined || str.length === 0) {
      continue;
    }
    const url = new URL(str);
    if (url !== undefined && url.pathname === "/bbs/attachment.php") {
      try {
        await driver.get(url.href); // 跳转到下载中心
        Logger.log(`🔗 即将提取种子链接: ${url.href}`);
        const href = await driver.findElement(By.xpath('//*[@id="downloadBtn"]'));
        addr = await href.getAttribute("href");
        break;
      } catch(e) {
        Logger.log(`❌ 提取下载链接失败：${url.href}`);
        Logger.error(e);
      }
    }
  }
  return addr;
}

export default class DetailPage {
  public href: string;

  public constructor(href: string) {
    this.href = href;
  }

  public async extractInfo() {
    const driver = await makeBrowser();
    try {
      await driver.get(this.href);
      const msgFont = await driver.findElement(By.className("t_msgfont"));
      const detail = new InfoModel(msgFont, this.threadId());
      detail.category = "new";
      await detail.build();
      detail.torrentLink = await findTorrentLink(driver); // 提取种子链接
      return detail;
    } catch (e) {
      Logger.log(`❌ 提取页面信息失败: ${this.href}`);
      Logger.error(e);
    } finally {
      await driver.close();
    }
  }

  private threadId() {
    let link = this.href.substring(this.href.lastIndexOf('/') + 1); // 获取最后一部分
    link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
    const id = link.split("-")[1];
    return parseInt(id, 10);
  }
}