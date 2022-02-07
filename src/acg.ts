import { By } from 'selenium-webdriver';
import { URL } from 'url';
import DetailPage from './detail';
import { InfoModel } from './entity/info';
import { NewListPage } from "./newlist";
import { makeBrowser, PageCode, SISPaths } from "./util";

export class ACGList extends NewListPage {
  protected currentPageURL(): string {
    const path = `${SISPaths.ACG}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }

  protected pathReplacement(): string {
    return PageCode.ACG;
  }

  protected title() {
    return "ACG";
  }

  protected category() {
    return "acg";
  }

  protected maxPageSelector() {
    return "#wrapper > div:nth-child(1) > div:nth-child(10) > div > a.last";
  }
}

export class ACGDetailPage extends DetailPage {
  public async extractInfo() {
    if (!process.env.useTrySelenium) {
      return super.extractInfo();
    }

    const driver = await makeBrowser();
    try {
      await driver.get(this.href);
      const msgFont = await driver.findElement(By.className("t_msgfont"));
      const detail = new InfoModel(msgFont, this.threadId());
      detail.tag = this.tag;
      detail.category = this.category();
      await detail.buildACG();
      if (detail.title === undefined || detail.title.length === 0) { // 存在 title 没提取出来的情况，补救一下
        detail.title = await driver.getTitle();
        detail.title = detail.title.split("-")[0];
        detail.title = detail.title.trim();
      }
      await this.findTorrentLink(detail, driver); // 提取种子链接
      return detail;
    } catch (e) {
      await this.handleException(e, driver);
    }
  }

  protected category() {
      return "acg";
  }
}