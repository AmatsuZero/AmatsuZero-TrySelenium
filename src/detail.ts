import { URL } from 'url';
import { By, WebDriver } from "selenium-webdriver";
import { getSplitValue, InfoModel } from "./entity/info";
import { makeBrowser, Logger, getThreadId, ShouldCountinue } from "./util";
import path from 'path';
import axios, { Axios } from "axios";
import retry from 'async-retry';
import cheerio from "cheerio";

const MaxRetryCount = 3;
const SleepTime = 1000;

const canRetry = (e: any, cnt: number) => {
  const info = e as { name: string };
  return ShouldCountinue() 
  && (info.name === "NoSuchElementError" || info.name === "TimeoutError") 
  && cnt < MaxRetryCount;
}

export default class DetailPage {
  public href: string;
  public tag: string;
  private retryCount = 0;
  private torrentRetryCnt = 0;

  public constructor(href: string, tag: string) {
    this.href = href;
    this.tag = tag;
  }

  public async extractInfo() {
    if (!process.env.useTrySelenium) {
      return this.cheerioExtractInfo();
    }
    const driver = await makeBrowser();
    try {
      await driver.get(this.href);
      const msgFont = await driver.findElement(By.className("t_msgfont"));
      const detail = new InfoModel(msgFont, this.threadId());
      detail.tag = this.tag;
      detail.category = this.category();
      await detail.build();
      await this.findTorrentLink(detail, driver); // 提取种子链接
      return detail;
    } catch (e) {
      await this.handleException(e, driver);
    } finally {
      await driver.quit();
    }
  }

  protected async cheerioExtractInfo() {
    const response = await this.getResponse(this.href);
    if (response === undefined) {
      return undefined;
    }
    const $ = cheerio.load(response.data);
    if ($("#wrapper > div:nth-child(1) > div.box.message > p:nth-child(2)").text() === '您无权进行当前操作，这可能因以下原因之一造成') { // 无权查看，跳过
      return undefined;
    }
    const model = new InfoModel(undefined, this.threadId());
    model.category = this.category();
    model.tag = this.tag;
    model.isBlurred = false;
    const msgFont = $("div.t_msgfont").first();
    model.postId = msgFont.attr("id") || '';
    model.postId = model.postId.split("_")[1] || ''; // 获取 post id
    const text = $(`#postmessage_${model.postId}`).text();
    this.build(model, text.split("\n"));
    if (model.title.length === 0 || model.title === '---') {
      model.title = $(`#pid${model.postId} > tbody > tr:nth-child(1) > td.postcontent > div.postmessage.defaultpost > h2`).text();
    }
    // 提取图片
    $(`#postmessage_${model.postId} > img`)
    .map((_, el) => $(el).attr("src"))
    .filter((_, link) => {
      const extName = path.extname(link); // gif 图片是宣传图片，需要过滤掉
      return link.length > 0 && extName !== '.gif';
    }).each((_, link) => { model.thumbnails.push(link) });
    
    const link = $(`#pid${model.postId} > tbody > tr:nth-child(1) > ` + 
    'td.postcontent > div.postmessage.defaultpost > ' + 
    'div.box.postattachlist > dl.t_attachlist > dt > a')
    .filter((_, el) => {
      const href = $(el).attr("href") || '';
      const url = new URL(href, this.href);
      return url.pathname === '/bbs/attachment.php';
    }).attr("href");
    if (link !== undefined) {
      await this.cheerioGetTorrentLink(model, link);
    } else { // 没有提取到种子，跳过
      return undefined;
    }
    return model;
  }

  protected async cheerioGetTorrentLink(model: InfoModel, downloadURL: string) {
    let url = new URL(downloadURL, this.href);
    Logger.log(`🔗 即将提取种子链接: ${url.href}`);
    const response = await this.getResponse(url.href);
    const $ = cheerio.load(response.data);
    const link = $("#downloadBtn").attr("href") || '';
    url = new URL(link, this.href);
    model.torrentLink = url.href;
  }

  protected build(model: InfoModel, lines: string[]) {
    // 提取信息
    lines.forEach(str => {
      if (str.includes("影片名稱")) {
        model.title = getSplitValue(str);
      } else if (str.includes("影片格式")) {
        model.format = getSplitValue(str);
      } else if (str.includes("影片大小")|| str.includes("视频大小")) {
        model.size = getSplitValue(str);
      } else if (str.includes("影片時間")) {
        model.size = getSplitValue(str);
      } else if (str.includes("特徵碼") || str.includes("特 徵 碼")) {
        model.sig = getSplitValue(str);
      } else if (str.includes("出演女優")) {
        const value = getSplitValue(str);
        const actors = value.length > 0 ? value.split(",") : [];
        model.actors = actors.filter(name => name !== "等" 
        && name.replace(/[^\p{L}\p{N}\p{Z}]/gu, '').length > 0); // 过滤掉标点符号
      }
    });
  }

  protected async getResponse(url: string, retries = 3) {
    return await retry(async (bail) => {
      const res = await axios.get(url, {
        responseType: 'document'
      });
      if (res.status === 403) {
        // don't retry upon 403
        bail(new Error('Unauthorized'));
      }
      return res;
    } , {retries})
  }

  protected async handleException(e: any, driver: WebDriver) {
    const info = e as { name: string };
      if (info.name === "NoSuchElementError" && this.retryCount < MaxRetryCount) {
        this.retryCount += 1;
        Logger.log(`❌ 提取页面信息失败, 第 ${this.retryCount} 次重试: ${this.href}`);
        await driver.sleep(SleepTime); // sleep 1s 后重试
        await this.extractInfo();
      } else {
        Logger.log(`❌ 提取页面信息失败: ${this.tag}-${this.href}`);
        Logger.error(e);
      }
  }

  protected async findTorrentLink(model: InfoModel, driver: WebDriver, pageLink = "") {
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

  protected threadId() {
    return getThreadId(this.href);
  }

  protected category() {
    return "new";
  }
}