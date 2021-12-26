import { extname } from 'path';
import { By, WebElement } from "selenium-webdriver";
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

const ContentType = {
  COLLECtiON: '合集',
  GAME: '成人游戏',
  THREED_ANIMATION: '3D动漫',
  UNCENSORED_COMICS: '无码漫画',
  CENSORED_CARTOON: '有码卡通',
  CENSORED_COMICS: '有码漫画'
};

@Entity()
class InfoModel {
  @PrimaryGeneratedColumn()
  public threadId: number;

  @Column("text", { nullable: true, default: "" })
  public title = "";

  @Column("simple-array", { nullable: true, default: '' })
  public actors: string[] = [];

  @Column("text", { nullable: true, default: "" })
  public format = "";

  @Column("text", { nullable: true, default: "" })
  public postId = "";

  @Column("text", { nullable: true, default: "" })
  public size = "";

  @Column("boolean", { nullable: true, default: true })
  public isBlurred: boolean;

  @Column("text", { nullable: true, default: "" })
  public sig = "";

  @Column("simple-array", { nullable: true, default: '' })
  public thumbnails: string[] = [];

  @Column("text", { nullable: true, default: "" })
  public torrentLink = "";

  @Column("text", { nullable: true, default: "" })
  public category = "unknown";

  @Column("text", { nullable: true, default: "" })
  public tag = "";

  private sourceElment: WebElement;

  public constructor(elm: WebElement, id: number) {
    this.sourceElment = elm;
    this.threadId = id;
    this.isBlurred = true;
  }

  public async build() {
    const postId = await this.sourceElment.getAttribute("id");
    this.postId = postId.split("_")[1]; // 获取 post id
    const lines = (await this.sourceElment.getText()).split("\n");
    const separator = "：";
    // 提取信息
    lines.forEach(str => {
      if (str.includes("影片名稱")) {
        this.title = str.split(separator)[1];
      } else if (str.includes("影片格式")) {
        this.format = str.split(separator)[1];
      } else if (str.includes("影片大小")|| str.includes("视频大小")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("影片時間")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("是否有碼")) {
        this.blurVerification(str.split(separator)[1]);
      } else if (str.includes("特徵碼")) {
        this.sig = str.split(separator)[1];
      } else if (str.includes("出演女優")) {
        const value = str.split(separator)[1];
        const actors = value.length > 0 ? value.split(" ") : [];
        this.actors = actors.filter(name => name !== "等");
      }
    });
    // 提取预览图链接
    const pics = await this.sourceElment.findElements(By.xpath(`//*[@id="postmessage_${this.postId}"]//img`));
    for (const pic of pics) {
      const link = await pic.getAttribute("src");
      const extName = extname(link); // gif 图片是宣传图片，需要过滤掉
      if (link.length > 0 && extName !== '.gif') {
        this.thumbnails.push(link);
      }
    }
  }

  public buildNotionProperties(pageId: string) {
    return {
      properties: {
        title: [
          {
            "text": {
              "content": this.title
            },
          },
        ],
      },
      children: [
        {
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: this.thumbnails[0]
            }
          }
        }
      ]
    }
  }

  public toString() {
    if (this.category === 'new') {
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
      `;
    } else {
      return `---- thread id: ${this.threadId} ---- 
      【类型】${this.tag}
      【名稱】：${this.title}
      【大小】：${this.size}
      【預覽】：图片较大请等待，看不到图请使用代理。
      ${this.thumbnails.join("\n")}
      ---- post id: ${this.postId} ----
      `;
    }
  }

  public async buildACG() {
    const postId = await this.sourceElment.getAttribute("id");
    this.postId = postId.split("_")[1]; // 获取 post id
    const lines = (await this.sourceElment.getText()).split("\n");
    switch(this.tag) { // 提取信息
    case ContentType.COLLECtiON: 
      this.buildCollectionInfo(lines);
      break;
    case ContentType.GAME: 
      this.buildGameInfo(lines);
      break;
    case ContentType.CENSORED_COMICS:
    case ContentType.UNCENSORED_COMICS:  
      this.buildComicsInfo(lines);
      break;
    case ContentType.THREED_ANIMATION:
      this.buildCartoonInfo(lines);
      break;
    default:
      this.tag = "杂";
      this.buildMiscInfo();
      break;
    }
    // 提取预览图链接
    let pics = await this.sourceElment.findElements(By.xpath(`//*[@id="postmessage_${this.postId}"]//img`));
    if (pics.length === 0) {
      pics = await this.sourceElment.findElements(By.xpath(`//*[@id="postmessage_${this.postId}"]/img`));
    }
    for (const pic of pics) {
      const link = await pic.getAttribute("src");
      if (link.length > 0) {
        this.thumbnails.push(link);
      }
    }
  }

  protected async buildCollectionInfo(lines: string[]) {
    const separator = "：";
    lines.forEach(str => {
      if (str.includes("影片名稱")) {
        this.title = str.split(separator)[1];
      } else if (str.includes("影片格式")) {
        this.format = str.split(separator)[1];
      } else if (str.includes("影片大小")|| str.includes("视频大小")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("影片時間")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("是否有碼")) {
        this.blurVerification(str.split(separator)[1]);
      } else if (str.includes("种子特征码")) {
        this.sig = str.split(separator)[1];
      } 
    });
  }

  protected async buildGameInfo(lines: string[]) {
    const separator = "：";
    lines.forEach(str => {
      if (str.includes("游戏名称")) {
        this.title = str.split(separator)[1];
      } else if (str.includes("游戏格式")) {
        this.format = str.split(separator)[1];
      } else if (str.includes("游戏大小")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("是否有碼")) {
        this.blurVerification(str.split(separator)[1]);
      } else if (str.includes("种子特征码")) {
        this.sig = str.split(separator)[1];
      } 
    });
  }

  protected async buildComicsInfo(lines: string[]) {
    const separator = "：";
    lines.forEach(str => {
      if (str.includes("漫画名称")) {
        this.title = str.split(separator)[1];
      } else if (str.includes("漫画格式")) {
        this.format = str.split(separator)[1];
      } else if (str.includes("漫画大小") || str.includes("文件大小")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("是否有碼") || str.includes("是否有碼")) {
        this.blurVerification(str.split(separator)[1]);
      } else if (str.includes("种子特征码") || str.includes("特 徵 碼")) {
        this.sig = str.split(separator)[1];
      } 
    });
  }

  protected async buildCartoonInfo(lines: string[]) {
    const separator = "：";
    lines.forEach(str => {
      if (str.includes("动画名称")) {
        this.title = str.split(separator)[1];
      } else if (str.includes("动画格式")) {
        this.format = str.split(separator)[1];
      } else if (str.includes("动画大小") || str.includes("文件大小")) {
        this.size = str.split(separator)[1];
      } else if (str.includes("是否有碼") || str.includes("是否有碼") || str.includes("有码无码")) {
        this.blurVerification(str.split(separator)[1]);
      } else if (str.includes("种子特征码") || str.includes("特 徵 碼")) {
        this.sig = str.split(separator)[1];
      } 
    });
  }

  protected async buildMiscInfo() {
    await this.build();
  }

  protected blurVerification(str: string) {
    const marks = ["有码", "有碼", "薄码"];
    this.isBlurred = marks.includes(str);
  }
}

export {
  InfoModel
}