import { URL } from 'url';
import { NewListPage } from "./newlist";
import { PageCode, SISPaths } from "./util";

export default class ACGList extends NewListPage {
  protected currentPageURL(): string {
    const path = `${SISPaths.ACG}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }

  protected pathReplacement(): string {
    return PageCode.ACG;
  }

  protected title() {
    return "ACG";
  }
}