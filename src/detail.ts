import { By } from "selenium-webdriver";
import { InfoModel } from "./entity/info";
import { makeSafariBrowser } from "./util";

export default class DetailPage {
  public href: string;

  public constructor(href: string) {
    this.href = href;
  }

  public async extractInfo() {
    const driver = await makeSafariBrowser();
    try {
      await driver.get(this.href);
      const msgFont = await driver.findElement(By.className("t_msgfont"));
      const detail = new InfoModel(msgFont, this.threadId());
      await detail.build();
      return detail;
    } catch (e) {
      console.error(e);
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