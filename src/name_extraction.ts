import { spawn } from 'child_process';
import path from 'path';
import { Connection } from "typeorm";
import { InfoModel } from "./entity/info";
import { Logger } from "./util";

const scriptpath = path.join(__dirname, '../scripts', 'name_extraction.py');

const extracName = (title: string) => new Promise<string[]>((resolve, reject) => {
  const pythonProcess = spawn('python3', [scriptpath, title]);
  pythonProcess.stdout.on("data", data => {
    const input: string = data.toString();
    const names = input.split(',')
      .map(n => n.replace('[', ""))
      .map(n => n.replace(']', ""))
      .map(n => n.trim())
      .map(n => n.replace(/'/g, ""));
    resolve(names); // <------------ by default converts to utf-8
    if (!pythonProcess.kill()) {
      console.log(`${pythonProcess} kill failed`);
    }
  });
  process.stderr.on("data", data => {
    reject(data);
    if (!pythonProcess.kill()) {
      console.log(`${pythonProcess} kill failed`);
    }
  });
});

export async function nameExtraction(connection: Connection) {
  const repo = connection.getRepository(InfoModel);
  const info = await repo.find({
    category: "new"
  }); // 目前只搜新作品列表
  for (const e of info) {
    if(e.actors.length > 0 || (e.title === undefined || e.title.length === 0)) {
      continue;
    }
    const actors = await extracName(e.title);
    e.actors = actors;
    await repo.save(e);
    Logger.log(`${e.title}: ${actors}`);
  }
  connection.close();
  process.exit(0);
}