import { By, WebDriver } from "selenium-webdriver";
import DetailPage from "./detail";
import { InfoModel } from "./entity/info";
import { makeBrowser } from "./util";

export default class ACGDetailPage extends DetailPage {
  public async extractInfo() {
    const driver = await makeBrowser();
    try {
      await driver.get(this.href);
      const msgFont = await driver.findElement(By.className("t_msgfont"));
      const detail = new InfoModel(msgFont, this.threadId());
      detail.tag = this.tag;
      detail.category = this.category();
      await detail.buildACG();
      if (detail.title === undefined || detail.title.length === 0) { // 存在 title 没提取出来的情况，补救一下
        detail.title = await this.extractTitle(driver, detail.postId);
      }
      await this.findTorrentLink(detail, driver); // 提取种子链接
      return detail;
    } catch (e) {
      await this.handleException(e, driver);
    }
  }

  protected async extractTitle(driver: WebDriver, postId: string) {
    const h2Elemnt = driver.findElement(By.xpath(`//*[@id="pid${postId}"]/tbody/tr[1]/td[2]/div[4]/h2`));
    return h2Elemnt.getText();
  }
}