import axios, { Axios } from "axios";
import cheerio from "cheerio";
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
    const response = await this.axios.get(this.currentPageURL(), {
      responseType: 'document'
    });
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
    $(`#${PageCode.Western}`).children('tbody').each((i, elm) => {
      console.log(elm.attributes);
    });
    return info;
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