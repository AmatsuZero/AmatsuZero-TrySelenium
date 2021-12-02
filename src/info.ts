import { By, WebElement } from "selenium-webdriver";

class InfoModel {
  sourceElment: WebElement
  threadId: number
  title = ""
  actors: string[] = []
  format = ""
  postId = ""
  size = ""
  isBlurred = true
  sig = ""
  thumbnails: string[] = []

  constructor(elm: WebElement, id: number) {
    this.sourceElment = elm;
    this.threadId = id;
  }

  async build() {
    const postId = await this.sourceElment.getAttribute("id");
    this.postId = postId.split("_")[1]; // 获取 post id
    const lines = await this.sourceElment.findElements(By.xpath(`//*[@id="postmessage_${this.postId}"]/text()`));
    const separator = "：";
    // 提取信息
    for (const value of lines) {
      const str = await value.getText();
      if (str.includes("影片名稱")) {
        this.title = str.split(separator)[1];
      } else if (str.includes("影片格式")) {
        this.format = str.split(separator)[1];
      } else if (str.includes("影片大小")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("影片時間")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("是否有碼")) {
        this.isBlurred = str.split(separator)[1] === "有碼";
      } else if (str.includes("特徵碼")) {
        this.sig = str.split(separator)[1];
      } else if (str.includes("出演女優")) {
        this.actors = str.split(",");
      }
    }
    // 提取预览图链接
    const pics = await this.sourceElment.findElements(By.xpath(`//*[@id="postmessage_${this.postId}"]//img`));
    for (const pic of pics) {
      const link = await pic.getAttribute("src");
      if (link.length > 0) {
        this.thumbnails.push(link);
      }
    }
  }

  static schema() {
    return {
      name: "VideoInfo",
      properties: {
        _id: "int",
        name: "string",
        actors: {
          type: "list",
          objectType: "string",
          optional: true,
        },
        format: "string",
        size: "string",
        duration: "string",
        thumbnails: {
          type: "list",
          objectType: "string",
          optional: true,
        }
      },
      primaryKey: "_id",
    };
  }

  toString() {
    return `---- thread id: ${this.threadId} ---- 
    【影片名稱】：${this.title}
    【出演女優】：${this.actors.join("，")}
    【影片格式】：${this.format}
    【影片大小】：${this.size}
    【是否有碼】：${this.isBlurred ? "有" : "无"}
    【特徵碼  】：${this.sig}
    【影片預覽】：图片较大请等待，看不到图请使用代理。
    ${this.thumbnails.join("\n")}
    ---- post id: ${this.postId} ----
    `
  }
}

export {
  InfoModel
}