import { WebDriver, By, WebElement } from "selenium-webdriver";
import { Repository } from "typeorm";
import { URL } from "url";
import { InfoModel } from "./entity/info";
import { getThreadId, Logger, makeBrowser, PageCode, ShouldCountinue, SISPaths } from "./util";

class ThreadInfo {
  public href: string;
  public tag: string;

  public constructor(href: string, tag: string) {
    this.href = href;
    this.tag = tag;
  }

  public toString() {
    return `【标签】${this.tag} 【链接】${this.href}`;
  }
}

class NewListPage {
  public currentPage = 1;
  public host: string;
  public maxPage = -1;
  public driver?: WebDriver;
  public latestId: number;
  public earliestid: number;
  public dbRepo?: Repository<InfoModel>;

  public constructor(host: string, latestId: number, earliestid: number) {
    this.host = host;
    this.latestId = latestId;
    this.earliestid = earliestid;
  }

  public async getAllThreadLinks(block: (hrefs: ThreadInfo[]) => Promise<void>) {
    do {
      try {
        const links = await this.getAllThreadsOnCurrentPage();
        const validLinks: ThreadInfo[] = [];
        for (const link of links) {
          if (await this.threadsFilter(link.href)) {
            validLinks.push(link);
          }
        }
        await block(validLinks);
        await this.nextPage();
      } catch (e) {
        ShouldCountinue();
        Logger.log("❌ 提取新作品页面出错了");
        Logger.error(e);
      }
    } while (this.currentPage <= this.maxPage)
    this.destroy();
  }

  public async updateTags() {
    if (this.dbRepo === undefined) {
      return;
    }
    let modelId = this.latestId;
    do {
      try {
        let links = await this.getAllThreadsOnCurrentPage();
        links = links.filter(link => link.tag.length > 0);
        for (const link of links) {
          const threadId = getThreadId(link.href);
          const model = await this.dbRepo.findOne({ threadId });
          if (model !== undefined) {
            modelId = model.threadId;
            model.tag = link.tag;
            await this.dbRepo.save(model);
          }
        }
        await this.nextPage();
      } catch (e) {
        ShouldCountinue();
        Logger.log("❌ 更新标签失败");
        Logger.error(e);
      }
    } while (modelId > this.earliestid)
    this.destroy();
  }

  public async getAllThreadsOnCurrentPage(needClose = false) {
    if (this.driver === undefined) {
      this.driver = await makeBrowser();
    }
    const url = this.currentPageURL();
    let elms: WebElement[] = [];
    try {
      Logger.log(`🔗 即将打开${this.title()}第${this.currentPage}页：${url}`);
      await this.driver.get(url);
      if (this.maxPage === -1) {
        await this.findMaxPage();
      }
      elms = await this.findOutElements();
    } catch (e) {
      ShouldCountinue();
      Logger.log(`❌ 解析详情失败：${url}`);
      Logger.error(e);
    }
    if (needClose) {
      this.destroy();
    }
    return this.extractLinks(elms);
  }

  protected category() {
    return "new";
  }

  protected async extractLinks(elms: WebElement[]) {
    const hrefs: ThreadInfo[] = [];
    for (const elm of elms) {
      const id = await elm.getAttribute("id");
      if (id.startsWith("normalthread_")) {
        const threadId = id.split("_")[1];
        const link = elm.findElement(By.xpath(`//*[@id="thread_${threadId}"]/a`));
        const href = await link.getAttribute("href");
        let tag = '';
        try {
          const tagElm = await elm.findElement(By.xpath(`//*[@id="normalthread_${threadId}"]/tr/th/em/a`));
          tag = await tagElm.getText();
        } catch { }
        hrefs.push(new ThreadInfo(href, tag));
      }
    }

    return hrefs;
  }

  protected async findOutElements() {
    if (this.driver === undefined) {
      return [];
    }
    let parent = await this.driver.findElement(By.className("mainbox threadlist"));
    const id = this.pathReplacement().replace("-", "_");
    parent = await parent.findElement(By.xpath(`//*[@id='${id}']`));
    return parent.findElements(By.xpath("//tbody"));
  }

  protected currentPageURL() {
    const path = `${SISPaths.NEW}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }

  protected async nextPage() {
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
      ShouldCountinue();
      Logger.log(`❌ 进入到下一页失败，当前页面：${this.currentPage}`);
      Logger.error(e);
    }
  }

  protected async findMaxPage() {
    if (this.driver === undefined) {
      return
    }
    try {
      const pageBtns = await this.driver.findElement(By.className("pages_btns"));
      const last = await pageBtns.findElement(By.className("last"));
      let link = await last.getAttribute("href");
      link = link.substring(link.lastIndexOf('/') + 1); // 获取最后一部分
      link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
      this.maxPage = parseInt(link.split(`${this.pathReplacement()}-`)[1], 10);
      Logger.log(`📖 ${this.title()}一共${this.maxPage}页`);
    } catch (e) {
      ShouldCountinue();
      Logger.log('❌ 查找最大页面失败');
      Logger.error(e);
    }
  }

  protected async threadsFilter(link: string) {
    if (this.dbRepo === undefined) {
      return true;
    }
    const id = getThreadId(link);
    const model = await this.dbRepo.findOne({ threadId: id, category: this.category() });
    const needParse = model === undefined;
    if (!needParse) {
      Logger.log(`✈️ 跳过链接：${link}`);
    }
    return needParse;
  }

  protected async destroy() {
    if (this.driver === undefined) {
      return
    }
    await this.driver.close();
    this.driver = undefined;
  }

  protected pathReplacement() {
    return PageCode.NEW;
  }

  protected title() {
    return "新作品";
  }
}

export {
  NewListPage,
  ThreadInfo,
}