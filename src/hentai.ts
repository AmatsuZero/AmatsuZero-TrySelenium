import HentaiPreviewPage from "./hentaiPage";
import { Logger, parseInitArgs } from "./util";

(async () => {
  await parseInitArgs();
  if (process.argv.length === 0) {
    Logger.log(`❌ 缺少 URL`);
  }
  // 拿到下载地址
  const url = process.argv[0];
  const hentai = new HentaiPreviewPage(url);
  await hentai.start();
})()