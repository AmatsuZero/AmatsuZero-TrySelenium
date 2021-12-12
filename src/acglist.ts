import NewListPage from "./newlist";
import { SISPaths } from "./util";

export default class ACGList extends NewListPage {
  public title = "ACG";

  public getAllThreadsOnCurrentPage(needClose?: boolean): Promise<string[]> {
    const links = super.getAllThreadsOnCurrentPage(needClose);

    return links;
  }

  public currentPageURL(): string {
    const path = `${SISPaths.NEW}-${this.currentPage}.html`;
    return new URL(path, this.host).href;
  }
}