import { WebDriver, By, WebElement } from "selenium-webdriver";
import { URL } from "url";
import { getThreadId, Logger, makeBrowser, PageCode, SISPaths } from "./util";


const extractLinks = async (elms: WebElement[]) => {
  const hrefs: string[] = [];
  for (const elm of elms) {
    const id = await elm.getAttribute("id");
    if (id.startsWith("normalthread_")) {
      const link = elm.findElement(By.xpath(`//*[@id="thread_${id.split("_")[1]}"]/a`));
      const href = await link.getAttribute("href");
      hrefs.push(href);
    }
  }
  return hrefs;
}

export default class NewListPage {
  public currentPage = 1;
  public host: string;
  public maxPage = -1;
  public driver?: WebDriver;
  public latestId: number;
  public earliestid: number;

  public constructor(host: string, latestId: number, earliestid: number) {
    this.host = host;
    this.latestId = latestId;
    this.earliestid = earliestid;
  }

  public async getAllThreadLinks(block: (hrefs: string[]) => Promise<void>) {
    do {
      try {
        const links = await this.getAllThreadsOnCurrentPage();
        await block(links.filter(link => this.threadsFilter(link)));
        await this.nextPage();
      } catch (e) {
        Logger.log("❌ 提取新作品页面出错了");
        Logger.error(e);
      }
    } while (this.currentPage <= this.maxPage)
    this.destroy();
  }

  public async getAllThreadsOnCurrentPage(needClose = false) {
    if (this.driver === undefined) {
      this.driver = await makeBrowser();
    }
    const url = this.currentPageURL();
    let elms: WebElement[] = [];
    try {
      Logger.log(`🔗 即将打开新作品第${this.currentPage}页：${url}`);
      await this.driver.get(url);
      if (this.maxPage === -1) {
        await this.findMaxPage();
      }
      let parent = await this.driver.findElement(By.className("mainbox threadlist"));
      const id = PageCode.NEW.replace("-", "_");
      parent = await parent.findElement(By.xpath(`//*[@id='${id}']`));
      elms = await parent.findElements(By.xpath("//tbody"));
    } catch (e) {
      Logger.log(`❌ 解析详情失败：${url}`);
      Logger.error(e);
    }
    if (needClose) {
      this.destroy();
    }
    return extractLinks(elms);
  }

  private currentPageURL() {
    const path = `${SISPaths.NEW}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }

  private async nextPage() {
    if (this.driver === undefined || this.currentPage >= this.maxPage) {
      this.destroy();
      return
    }
    try {
      // 找到下一个按钮，并点击
      const pageBtns = await this.driver.findElement(By.className("pages_btns"));
      const newxBtn = await pageBtns.findElement(By.className("next"));
      await newxBtn.click();
      this.currentPage += 1;
      Logger.log("🏃 进入到下一页");
    } catch (e) {
      Logger.log(`❌ 进入到下一页失败，当前页面：${this.currentPage}`);
      Logger.error(e);
    }
  }

  private async findMaxPage() {
    if (this.driver === undefined) {
      return
    }
    try {
      const pageBtns = await this.driver.findElement(By.className("pages_btns"));
      const last = await pageBtns.findElement(By.className("last"));
      let link = await last.getAttribute("href");
      link = link.substring(link.lastIndexOf('/') + 1); // 获取最后一部分
      link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
      this.maxPage = parseInt(link.split(`${PageCode.NEW}-`)[1], 10);
      Logger.log(`📖 新作品一共${this.maxPage}页`);
    } catch (e) {
      Logger.log('❌ 查找最大页面失败');
      Logger.error(e);
    }
  }

  private threadsFilter(link: string) {
    const id = getThreadId(link);
    const needParse = id > this.latestId || id < this.earliestid;
    if (!needParse) {
      Logger.log(`✈️ 跳过链接：${link}`);
    }
    return needParse;
  }

  private async destroy() {
    if (this.driver === undefined) {
      return
    }
    await this.driver.close();
    this.driver = undefined;
  }
}