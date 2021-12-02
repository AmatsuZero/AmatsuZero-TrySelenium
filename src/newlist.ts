import { WebDriver, By, WebElement } from "selenium-webdriver";
import { URL } from "url";
import { makeBrowser, PageCode, SISPaths } from "./util";


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

  public constructor(host: string) {
    this.host = host;
  }

  public async getAllThreadLinks(block: (hrefs: string[]) => Promise<void>) {
    do {
      try {
        const links = await this.getAllThreadsOnCurrentPage();
        await block(links);
        await this.nextPage();
      } catch (e) {
        console.error(e);
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
      console.log(`🔗即将访问：${url}`);
      await this.driver.get(url);
      if (this.maxPage === -1) {
        await this.findMaxPage()
      }
      let parent = await this.driver.findElement(By.className("mainbox threadlist"));
      const id = PageCode.NEW.replace("-", "_");
      parent = await parent.findElement(By.xpath(`//*[@id='${id}']`));
      elms = await parent.findElements(By.xpath("//tbody"));
    } catch (e) {
      console.error(e);
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
    // 找到下一个按钮，并点击
    const pageBtns = await this.driver.findElement(By.className("pages_btns"));
    const newxBtn = await pageBtns.findElement(By.className("next"));
    await newxBtn.click();
    this.currentPage += 1;
  }

  private async findMaxPage() {
    if (this.driver === undefined) {
      return
    }
    const pageBtns = await this.driver.findElement(By.className("pages_btns"));
    const last = await pageBtns.findElement(By.className("last"));
    let link = await last.getAttribute("href");
    link = link.substring(link.lastIndexOf('/') + 1); // 获取最后一部分
    link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
    this.maxPage = parseInt(link.split(`${PageCode.NEW}-`)[1], 10);
  }

  private async destroy() {
    if (this.driver === undefined) {
      return
    }
    await this.driver.close();
    this.driver = undefined;
  }
}