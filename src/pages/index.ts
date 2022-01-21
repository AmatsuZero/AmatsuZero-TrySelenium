import Hexo from 'hexo';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import retry from 'async-retry';
import { promises } from 'fs';
import { Connection, Repository } from 'typeorm';
import { InfoModel } from '../entity/info';
import { Logger } from '../util';
import { checkPosts } from './check';
import { GoogleDriver } from './google';

const hexoDir = path.join(__dirname, '../..', 'hexo');
const postDir = path.join(hexoDir, 'source/_posts');
const TriggerSize = 90 / 0.000001; // Github 单次提交上限是 100MB，这里略小于上限触发

const handleChineseTags = (title: string) => {
  if (title.includes("麻豆")) {
    return "麻豆传媒";
  } else if (title.includes("星空传媒")) {
    return "星空传媒";
  } else if (title.includes("果冻")) {
    return "果冻传媒";
  } else if (title.includes("天美")) {
    return "天美传媒";
  } else if (title.includes("蜜桃")) {
    return "蜜桃传媒";
  } else if (title.includes("乐播")) {
    return "乐播传媒";
  } else if (title.includes("涩污")) {
    return "涩污传媒";
  } else {
    return "";
  }
};

const writeContent = async (model: InfoModel, assetDir: string) => {
  let size = 0;
  let content = `---
title: ${handleTile(model.title)}
tags:`;
  content += `
- ${model.tag}
`;
  model.actors.forEach(actor => {
    const str = actor.replace(/[^\p{L}\p{N}\p{Z}]/gu, ''); // 去除标点符号
    if (str.length > 0) {
      content += `- ${actor}\n`;
    }
  });
  const chineseTag = handleChineseTags(model.title);
  if (chineseTag.length > 0) {
    content += `- ${chineseTag}\n`;
  }
  content += `categories: ${model.category}\n`;
  content += '---\n';
  content += `【影片名稱】：${model.title}
【出演女優】：${model.actors.join("，")}
【影片格式】：${model.format}
【影片大小】：${model.size}
【是否有碼】：${model.isBlurred ? "有" : "无"}
【特徵碼  】：${model.sig}
【种子文件】：[种子文件](${model.postId}.torrent)
【影片預覽】：\n`
  let pics = await promises.readdir(assetDir);
  for (const asset of pics) {
    const stat = await promises.stat(path.join(assetDir, asset));
    size += stat.size;
  }
  pics = pics.filter(pic => path.extname(pic) !== '.torrent');
  pics.forEach((pic, idx) => {
    if (idx === 0) {
      content += `{% asset_img ${pic} This is an image %}\n`
      content += '<escape><!-- more --></escape>\n';
    } else {
      content += `![${model.thumbnails[idx]}](${pic})`;
    }
  });
  const dest = path.join(postDir, `${model.threadId}.md`);
  await promises.writeFile(dest, content);
  const stat = await promises.stat(dest);
  size += stat.size;
  return size;
}

// https://pengzhenghao.github.io/blog/2018/03/19/20180319bug2/
// https://chrischen0405.github.io/2018/11/21/post20181121-2/
const handleTile = (originalTitle: string) => {
  let title = originalTitle.replace(":", ":&ensp");
  title = title.replace("[", "【");
  title = title.replace("]", "]");
  title = title.replace("\"", "");
  return title;
}

const writeNovel = async (model: InfoModel) => {
  let content = `---
title: ${handleTile(model.title)}
tags:`;
  content += `
- ${model.tag}
`;
  const breakLine = '\n<escape><!-- more --></escape>\n';
  content += `categories: ${model.category}\n`;
  content += '---\n';
  let paragrah = model.sig;
  let idx = paragrah.indexOf('字数');
  idx = paragrah.indexOf('\n', idx);
  if (idx !== -1) {
    paragrah = [paragrah.slice(0, idx), breakLine, paragrah.slice(idx)].join('');
  }
  content += paragrah;

  const dest = path.join(postDir, `${model.threadId}.md`);
  await promises.writeFile(dest, content);
  const stat = await promises.stat(dest);
  return stat.size;
};

class PostsCreator {
  public hexo: Hexo;
  private driver: GoogleDriver;
  private repo: Repository<InfoModel>;
  private ids: Set<String>

  public constructor(driver: GoogleDriver, connection: Connection) {
    this.driver = driver;
    this.hexo = new Hexo(hexoDir, {
      debug: process.env.NODE_ENV === 'DEBUG',
      config: path.join(hexoDir, '_config.yml')
    });
    this.repo = connection.getRepository(InfoModel);
    this.ids = new Set();
  }

  public async hexoInit() {
    let postsList = await promises.readdir(postDir);
    postsList = postsList.filter(post => path.extname(post) === '.md');
    postsList = postsList.map(filename => filename.split('.').slice(0, -1).join('.'));
    this.ids = new Set(postsList);
    await this.hexo.init();
  }

  public async checkPosts() {
    await checkPosts(this.repo, this.hexo);
  }

  public async createNewListPosts() {
    const entities = await this.repo.find({ category: "new" });
    let triggerSize = 0;
    for (const entity of entities) {
      if (this.ids.has(`${entity.threadId}`) || entity.isPosted) {
        continue;
      }
      const assetDir = await this.downloadAssets(entity);
      triggerSize += await writeContent(entity, assetDir);
      Logger.log(`新作品帖子 ${entity.threadId}.md 生成完毕🎉  准备部署……`);
      if (triggerSize >= TriggerSize) {
        await this.hexo.call('clean');
        await this.hexo.call('deploy', { _: ["-g"] });
        Logger.log(`生成接近 100MB，部署完成🍺`);
        triggerSize = 0;
      }
    }
    if (triggerSize !== 0) {
      await this.hexo.call('clean');
      await this.hexo.call('deploy', { _: ["-g"] });
    }
  }

  public async createNovelPosts() {
    const entities = await this.repo.find({ category: "novel" });
    let triggerSize = 0;
    for (const entity of entities) {
      if (this.ids.has(`${entity.threadId}`) || entity.isPosted) {
        continue;
      }
      triggerSize += await writeNovel(entity);
      Logger.log(`新小说帖子 ${entity.threadId}.md 生成完毕🎉  准备部署……`);
      if (triggerSize >= TriggerSize) {
        await this.hexo.call('clean');
        await this.hexo.call('deploy', { _: ["-g"] });
        Logger.log(`生成接近 100MB，部署完成🍺`);
        triggerSize = 0;
      }
    }
    if (triggerSize !== 0) {
      await this.hexo.call('clean');
      await this.hexo.call('deploy', { _: ["-g"] });
    }
  }

  private async download(url: string, idx: number, folderId: string) {
    const resp = await this._download(url);
    if (resp === undefined) {
      throw new Error("下载失败");
    }
    const name = `${idx}${path.extname(url)}`;
    return this.save(resp, name, folderId);
  }

  private async _download(url: string, retries = 3) {
    return await retry(async (bail) => {
      const res = await axios({
        url,
        responseType: 'stream',
        insecureHTTPParser: true,
      });
      if (res.status === 403) {
        // don't retry upon 403
        bail(new Error('Unauthorized'));
        return;
      }
      return res;
    }, {
      retries, onRetry: (e, attemp) => {
        Logger.error(e);
      }
    })
  }

  private async save(response: AxiosResponse, name: string, folderId: string) {
    const params = this.driver.createUploadFileMetaData(response, name, folderId);
    await this.driver.uploadLoadImage(params);
  }

  private async downloadAssets(model: InfoModel) {
    // 创建文件夹
    const assetsDir = await this.driver.createFolder(`${model.threadId}`);
    if (!assetsDir || assetsDir.length === 0) {
      throw new Error(`创建文件夹失败：${model.threadId}`);
    }
    let idx = 0;
    for (const pic of model.thumbnails) {
      await this.download(pic, idx, assetsDir);
      idx += 1;
    }
    const dest = path.join(assetsDir, `${model.postId}.torrent`);
    await this.download(model.torrentLink, 0, dest);
    return assetsDir;
  }
}

export async function createPosts(connection: Connection, driver: GoogleDriver) {
  const creator = new PostsCreator(driver, connection);
  await creator.hexoInit();
  try {
    if (process.env.checkIsPosted !== undefined) {
      await creator.checkPosts();
      return;
    }
    await creator.createNewListPosts();
    await creator.createNovelPosts();
  } catch (e) {
    Logger.error(e);
  } finally {
    await creator.hexo.exit();
  }
}