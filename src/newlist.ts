import { WebDriver, By, WebElement } from "selenium-webdriver";
import { makeSafariBrowser, PageCode, SISPaths } from "./util";


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
  currentPage = 1
  driver?: WebDriver;
  host: string;
  maxPage = -1

  constructor(host: string) {
    this.host = host;
  }

  currentPageURL() {
    const path = `${SISPaths.NEW}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }
  
  async getAllThreadsOnCurrentPage() {
    if (this.driver === undefined) {
      this.driver = await makeSafariBrowser();
    }
    const url = this.currentPageURL();
    let elms: WebElement[] = [];
    try {
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
    return extractLinks(elms);
  }

  async newPage() {
    this.currentPage += 1;
  }

  async findMaxPage() {
    if (this.driver === undefined) {
      return
    }
    const pageBtns = await this.driver.findElement(By.className("pages_btns"));
    const last = await pageBtns.findElement(By.className("last"));
    let link = await last.getAttribute("href");
    link = link.substring(link.lastIndexOf('/') + 1); // 获取最后一部分
    link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
    this.maxPage = parseInt(link.split(`${PageCode.NEW}-`)[1]);
  }
}