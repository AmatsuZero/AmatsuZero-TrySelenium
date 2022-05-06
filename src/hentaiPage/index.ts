import axios, { Axios } from "axios";
import retry from 'async-retry';
import cheerio, { CheerioAPI } from "cheerio";

export default class HentaiPreviewPage {
  private mainPage: string;
  private axios: Axios;
  private maxPage: Number;

  public constructor(url: string) {
    this.mainPage = url;
    this.axios = axios.create();
    this.maxPage = -1;
  }

  public async start() {
    const response = await this.getResponse(this.mainPage);
    const $ = cheerio.load(response.data);
    this.findMaxPage($);
  }

  private async getList() {
    const response = await this.getResponse(this.mainPage);
    const $ = cheerio.load(response.data);
    const pics: string[] = []
   
  }

  private findMaxPage($: CheerioAPI) {
    $('body > div:nth-child(9) > table').children('.a').each((_, el) => {
      const page = $(el).text();
      if (page.length > 0 ) {
        const num = parseInt(page, 10);
        if (num > this.maxPage) {
          this.maxPage = num + 1;
        }
      }
    });
    if (this.maxPage === - 1) {
      this.maxPage = 1;
    }
  }

  private async getResponse(url: string, retries = 3) {
    return await retry(async (bail) => {
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
}