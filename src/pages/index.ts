import Hexo from 'hexo';
import path from 'path';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { existsSync, createWriteStream, promises } from 'fs';
import { Connection } from 'typeorm';
import { InfoModel } from '../entity/info';
import { Logger } from '../util';
import { title } from 'process';

const hexoDir = path.join(__dirname, '../..', 'hexo');
const postDir = path.join(hexoDir, 'source/_posts');

const hexo = new Hexo(hexoDir, {
  debug: process.env.NODE_ENV === 'DEBUG',
  config: path.join(hexoDir, '_config.yml')
});

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
title: ${model.title}
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

const download = async (url: string, dest: string) => {
  const resp = await _download(url);
  if (resp === undefined) {
    return;
  }
  return save(resp, dest);
};

const _download = async (url: string) => {
  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
    try {
      const resposne = await axios({
        url,
        responseType: 'stream',
      });
      return resposne;
    } catch(err) {
      Logger.error(`下载错误: ${err}`);
      retries += 1;
    }
  }
  Logger.log(`下载失败次数太多了！！！`);
}

const save = (response:AxiosResponse,  dest: string) => new Promise<void>((resolve, reject) => {
  response.data
  .pipe(createWriteStream(dest))
  .on('finish', () => resolve())
  .on('error', (e: any) => reject(e));
});

const downloadAssets = async (model: InfoModel) => {
  const assetsDir = path.join(postDir, `${model.threadId}`);
  if (existsSync(assetsDir)) {
    await promises.rmdir(assetsDir, { recursive: true,});
  }
  await promises.mkdir(assetsDir, { recursive: true });
  let idx = 0;
  for (const pic of model.thumbnails) {
    const dest = path.join(assetsDir, `${idx}${path.extname(pic)}`);
    await download(pic, dest);
    idx += 1;
  }
  const dest = path.join(assetsDir, `${model.postId}.torrent`);
  await download(model.torrentLink, dest);
  return assetsDir;
}

export async function createNewListPosts(connection:Connection) {
  const repo = connection.getRepository(InfoModel);
  try {
    let postsList = await promises.readdir(postDir);
    postsList = postsList.filter(post => path.extname(post) === '.md');
    postsList = postsList.map(filename => filename.split('.').slice(0, -1).join('.'));
    const entities = await repo.find({category: "new"});
    const ids = new Set(postsList);
    await hexo.init();
    let triggerSize = 0;
    for (const entity of entities) {
      if (ids.has(`${entity.threadId}`)) {
        continue;
      }
      const assetDir = await downloadAssets(entity);
      triggerSize += await writeContent(entity, assetDir);
      Logger.log(`帖子 ${entity.threadId}.md 生成完毕🎉  准备部署……`);
      if (triggerSize * 0.000001 >= 90) { // Github 单次提交上限是 100MB，这里略小于上限触发
        await hexo.call('clean');
        await hexo.call('deploy', {_ :["-g"]});
        Logger.log(`生成接近 100MB，部署完成🍺`);
        triggerSize = 0;
      }
    }
  } catch (e) {
    Logger.error(e);
  } finally {
    await hexo.exit();
  }
}