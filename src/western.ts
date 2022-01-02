import { NewListPage, ThreadInfo } from "./newlist";
import { Logger, PageCode, SISPaths } from "./util";
import DetailPage from "./detail";

export class WesternList extends NewListPage {

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
  
  protected category() {
    return "western";
  }
}