import { spawn } from 'child_process';
import path from 'path';
import { createConnection } from "typeorm";
import { InfoModel } from "../dist/entity/info"

const scriptpath = path.join(__dirname, 'name_extraction.py');

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

(async () => {
  const connection = await createConnection();
  const repo = connection.getRepository(InfoModel);
  const info = await repo.find();

  for (const e of info) {
    const actors = await extracName(e.title);
    e.actors = actors;
    await repo.save(e);
    console.log(`${e.title}: ${actors}`);
  }
  connection.close();
  process.exit(0);
})();
