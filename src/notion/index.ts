import { Client } from "@notionhq/client";
import { InfoModel } from "../entity/info";
import { Logger } from "../util";

const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;

const notion = new Client({
  auth: notionToken
});

const addItem = async (model: InfoModel) => {
  if (notionToken === undefined || databaseId === undefined) {
    Logger.error("❌ 必须指定 notion token 和 databaseId", -2);
    return;
  }
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        title: [
          {
            "text": {
              "content": model.title
            },
          },
        ],
      }
    });
  } catch (e) {
    Logger.log(`❌ 导入到 Notion失败：${model}`);
    Logger.log(e);
  }
};

export {
  addItem,
}