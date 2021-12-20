import { createConnection } from "typeorm";
import { InfoModel } from "./entity/info";
import { extracName, Logger } from "./util";

export async function nameExtraction() {
  const connection = await createConnection();
  const repo = connection.getRepository(InfoModel);
  const info = await repo.find();
  for (const e of info) {
    if(e.actors.length > 0) {
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