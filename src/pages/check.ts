import Hexo from "hexo";
import { By, WebDriver } from "selenium-webdriver";
import { Repository } from "typeorm";
import { InfoModel } from "../entity/info";
import { Logger, makeBrowser } from "../util";

export async function checkPosts(repo: Repository<InfoModel>, hexo: Hexo) {
 
  const deployer = hexo.config.deploy as any;
  const branch = deployer["branch"] as string | undefined;
  const git = deployer["repo"] as string | undefined;

  if (branch === undefined || git === undefined) {
    return;
  }

  let url = git.split('.').slice(0, -1).join('.');
  url += `/find/${branch}`;
  const driver = await makeBrowser();
  try {
    await driver.get(url);
    const input = await driver.findElement(By.xpath(`//*[@id="tree-finder-field"]`));
    const entities = await repo.find();
    for (const e of entities) {
      if (e.isPosted) {
        continue;
      }
      const key = `${e.threadId}/index.html`;
      await input.click(); // 获取焦点
      await input.sendKeys(key); // 输入搜索结果
      await driver.sleep(300); // 等待请求返回
      e.isPosted = await isPosted(driver, key);
      await repo.save(e);
      await input.clear(); // 清空输入
    }
  } catch(e) {
    Logger.log('❌ 检查是否创建过帖子出错');
    Logger.error(e);
  } finally {
    await driver.quit();
  }
}

const isPosted = async (driver: WebDriver, key: string) => {
  let ret = false;
  try {
    const result = await driver.findElement(By.xpath('//*[@id="tree-browser"]/li/a'));
    const href = await result.getAttribute('href');
    ret = href.includes(key);
  } catch {
    ret = false;
  }
  return ret;
}