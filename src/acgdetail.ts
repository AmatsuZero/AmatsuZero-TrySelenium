import { By, WebDriver } from "selenium-webdriver";
import DetailPage from "./detail";
import { InfoModel } from "./entity/info";
import { makeBrowser } from "./util";

export default class ACGDetailPage extends DetailPage {
  public async extractInfo() {
    const driver = await makeBrowser();
    try {
      const msgFont = await driver.findElement(By.className("t_msgfont"));
      const detail = new InfoModel(msgFont, this.threadId());
      detail.tag = this.tag;
      detail.category = this.category();
      await detail.buildACG();
      await this.findTorrentLink(detail, driver); // 提取种子链接
      return detail;
    } catch (e) {
      await this.handleException(e, driver);
    }
  }
}