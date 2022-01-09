import { NewListPage } from "./newlist";
import { PageCode, SISPaths } from "./util";
import DetailPage from "./detail";

export class WesternList extends NewListPage {

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

  protected maxPageSelector() {
    return '#wrapper > div:nth-child(1) > div:nth-child(10) > div > a.last';
  }
}

export class WesternDetail extends DetailPage {
  
  protected category() {
    return "western";
  }
}