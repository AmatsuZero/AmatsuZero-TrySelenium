import path from "path";
import axios, { Axios } from "axios";
import cheerio from "cheerio";
import retry from 'async-retry';
import { NewListPage, ThreadInfo } from "./newlist";
import { Logger, PageCode, SISPaths } from "./util";
import DetailPage from "./detail";
import { getSplitValue, InfoModel } from "./entity/info";
import { URL } from "url";

export class WesternList extends NewListPage {

  protected axios: Axios;

  public constructor(host: string, latestId: number, earliestid: number) {
    super(host, latestId, earliestid);
    this.axios = axios.create({
      baseURL: this.host,
      timeout: 1000,
    });
  }

  public async getAllThreadsOnCurrentPage(needClose?: boolean) {
    let info: ThreadInfo[] = [];
    const url = this.currentPageURL();
    Logger.log(`🔗 即将打开${this.title()}第${this.currentPage}页：${this.host}${url}`);
    const response = await this.getResponse(url);
    const $ = cheerio.load(response.data);
    if (this.maxPage === -1) {
      let link = $('#wrapper > div:nth-child(1) > div:nth-child(10) > div > a.last').attr('href');
      if (link !== undefined) {
        link = link.substring(link.lastIndexOf('/') + 1); // 获取最后一部分
        link = link.split('.').slice(0, -1).join('.'); // 去掉扩展名
        this.maxPage = parseInt(link.split(`${this.pathReplacement()}-`)[1], 10);
        Logger.log(`📖 ${this.title()}一共${this.maxPage}页`);
      }
    }
    const host = `${this.host}bbs/`;
    $('#wrapper > div:nth-child(1) > div.mainbox.threadlist > form').find("tbody[id]")
    .filter((_, el) => {
      const attr = $(el).attr("id");
      return attr !== undefined ? attr.startsWith("normalthread_") : false;
    }).each((_, el) => {
      const tag = $(el).find("th > em > a").text() || '';
      const href = $(el).find("th > span > a").attr("href") || '';
      info.push(new ThreadInfo(host + href, tag));
    });
    return info;
  }

  protected getResponse(url: string, retries = 3) {
    return retry(async (bail) => {
      const res = await this.axios.get(url, {
        responseType: 'document'
      });
      if (res.status === 403) {
        // don't retry upon 403
        bail(new Error('Unauthorized'));
      }
      return res;
    } , {retries})
  }

  protected async nextPage() {
    this.currentPage += 1;
    Logger.log("🏃 进入到下一页");
  }

  protected currentPageURL(): string {
    return `${SISPaths.NONASIONA}-${this.currentPage}.html`
  }

  protected pathReplacement(): string {
    return PageCode.Western;
  }

  protected title() {
    return "欧美区"
  }

  protected category() {
    return "western"
  }
}

export class WesternDetail extends DetailPage {
  public async extractInfo() {
    const response = await this.getResponse(this.href);
    if (response === undefined) {
      return undefined;
    }
    const $ = cheerio.load(response.data);
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
      await this.getTorrentLink(model, link);
    }
    return model;
  }

  protected async getTorrentLink(model: InfoModel, downloadURL: string) {
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

  protected getResponse(url: string, retries = 3) {
    return retry(async (bail) => {
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

  protected category() {
    return "western";
  }
}