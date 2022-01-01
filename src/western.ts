import axios, { Axios } from "axios";
import cheerio from "cheerio";
import retry from 'async-retry';
import { NewListPage, ThreadInfo } from "./newlist";
import { Logger, PageCode, SISPaths } from "./util";

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
    const response = await this.getResponse(this.currentPageURL());
    if (response === undefined) {
      return info;
    }
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

  protected getResponse(url: string, retries = 5) {
    return retry(async (bail) => {
      const res = await this.axios.get(url, {
        responseType: 'document'
      });
      if (res.status === 403) {
        // don't retry upon 403
        bail(new Error('Unauthorized'));
        return;
      }
      return res;
    } , {retries})
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