import Hexo from 'hexo';
import path from 'path';
import axios from 'axios';
import { existsSync, createWriteStream, promises } from 'fs';
import { Connection } from 'typeorm';
import { InfoModel } from '../entity/info';
import { Logger } from '../util';

const hexoDir = path.join(__dirname, '../..', 'hexo');
const postDir = path.join(hexoDir, 'source/_posts');

const hexo = new Hexo(hexoDir, {
  debug: process.env.NODE_ENV === 'DEBUG',
  config: path.join(hexoDir, '_config.yml')
});

const writeContent = async (model: InfoModel, assetDir: string) => {
  let size = 0;
  let content = `---
title: ${model.title}
tags:`;
  content += `
- ${model.tag}
`;
  model.actors.forEach(actor => {
    content += `- ${actor}\n`;
  });
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

const download = (url: string, dest: string) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise<void>((resolve, reject) => {
        response.data
          .pipe(createWriteStream(dest))
          .on('finish', () => resolve())
          .on('error', (e: any) => reject(e));
      }),
  );

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

export async function createPosts(connection:Connection) {
  const repo = connection.getRepository(InfoModel);
  try {
    let postsList = await promises.readdir(postDir);
    postsList = postsList.filter(post => path.extname(post) === '.md');
    postsList = postsList.map(filename => filename.split('.').slice(0, -1).join('.'));
    const entities = await repo.find();
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