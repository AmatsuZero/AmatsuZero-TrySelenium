import { By, WebDriver } from "selenium-webdriver";
import { InfoModel } from "./entity/info";
import { makeBrowser, Logger, getThreadId } from "./util";

const MaxRetryCount = 3;
const SleepTime = 1000;

const canRetry = (e: any, cnt: number) => {
  const info = e as { name: string };
  return (info.name === "NoSuchElementError" || info.name === "TimeoutError") && cnt < MaxRetryCount;
}

export default class DetailPage {
  public href: string;
  private retryCount = 0;
  private torrentRetryCnt = 0;

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
      await this.findTorrentLink(detail, driver); // 提取种子链接
      return detail;
    } catch (e) {
      const info = e as { name: string };
      if (info.name === "NoSuchElementError" && this.retryCount < MaxRetryCount) {
        this.retryCount += 1;
        Logger.log(`❌ 提取页面信息失败, 第 ${this.retryCount} 次重试: ${this.href}`);
        driver.sleep(SleepTime); // sleep 1s 后重试
        this.extractInfo();
      } else {
        Logger.log(`❌ 提取页面信息失败: ${this.href}`);
        Logger.error(e);
      }
    } finally {
      await driver.close();
    }
  }

  private async findTorrentLink(model: InfoModel, driver: WebDriver, pageLink = "") {
    let links: string[] = [];

    if (pageLink.length > 0) {
      links.push(pageLink);
    } else  {
      const attrs = await driver.findElements(By.xpath("//a"));
      links = await Promise.all(attrs.map(async (attr) => await attr.getAttribute("href")));
    }
    links = links.filter((link) => link !== undefined && link !== null && link.length > 0);
  
    for (const link of links) {
      const url = new URL(link);
      if (url !== undefined && url.pathname === "/bbs/attachment.php") {
        try {
          await driver.get(url.href); // 跳转到下载中心
          Logger.log(`🔗 即将提取种子链接: ${url.href}`);
          const href = await driver.findElement(By.xpath('//*[@id="downloadBtn"]'));
          model.torrentLink = await href.getAttribute("href");
          break;
        } catch(e) {
          if (canRetry(e, this.torrentRetryCnt)) {
            this.torrentRetryCnt += 1;
            Logger.log(`❌ 提取下载链接失败, 第 ${this.torrentRetryCnt} 次重试: ${url.href}`);
            driver.sleep(SleepTime); // sleep 1s 后重试
            await this.findTorrentLink(model, driver, url.href);
          } else {
            Logger.log(`❌ 提取下载链接失败：${url.href}`);
            Logger.error(e);
          }
        } 
      }
    }
  }

  private threadId() {
    return getThreadId(this.href);
  }
}