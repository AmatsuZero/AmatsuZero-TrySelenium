import { URL } from 'url';
import DetailPage from './detail';
import { By, WebElement } from 'selenium-webdriver';
import { InfoModel } from './entity/info';
import { NewListPage, ThreadInfo } from "./newlist";
import { Logger, makeBrowser, PageCode, SISPaths, getThreadId, ShouldCountinue } from "./util";

export class NovelDetail extends DetailPage {
  public async extractInfo() {
    const driver = await makeBrowser();
    try {
      await driver.get(this.href);
      const tMsg = driver.findElement(By.className("t_msgfont"));
      const model = new InfoModel(tMsg, this.threadId());
      await model.buildNovel();
      model.category = this.category();
      return model;
    } catch (e) {
      Logger.log(`❌ 提取小说出错：${this.href}`);
      Logger.error(e);
    } finally {
      await driver.close();
    }
  }

  protected category() {
    return "novel";
  }
}

export class NovelList extends NewListPage {
  protected currentPageURL(): string {
    const path = `${SISPaths.NOVEL}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }

  protected pathReplacement(): string {
    return PageCode.NOVEL;
  }

  protected title() {
    return "小说";
  }

  protected category() {
    return "novel";
  }

  protected async findOutElements() {
    if (this.driver === undefined) {
      return [];
    }
    let parent = await this.driver.findElement(By.xpath('//*[@id="forum_383"]'));
    const elems = await parent.findElements(By.xpath("//tbody"));
    const links: WebElement[] = [];
    for (const elm of elems) {
      const id = await elm.getAttribute("id");
      if (!(id.startsWith("stickthread_") || id.startsWith("normalthread_"))) {
        continue;
      }
      links.push(elm);
    }
    return links;
  }

  protected async extractLinks(elms: WebElement[]) {
    const hrefs: ThreadInfo[] = [];
    for (const elm of elms) {
      const stickerId = await elm.getAttribute("id");
      const id = stickerId.split("_")[1];
      const link = elm.findElement(By.xpath(`//*[@id="thread_${id}"]/a`));
      const info = new ThreadInfo('', '');
      info.href = await link.getAttribute('href');
      // try {
      //   const link = await elm.findElement(By.xpath(`//tbody[@id="${stickerId}"]/tr/th/em/a`));
      //   info.tag = await link.getText();
      // } catch (e) {
      //   Logger.log(e);
      // }
      hrefs.push(info);
    }
    return hrefs;
  }
}