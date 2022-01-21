import { workspace, window, env, Uri, ExtensionContext } from 'vscode';
import path from 'path';
import { GoogleDriver } from "../pages/google";
import { Logger } from "../util";
import { getDataFolderPath } from './route';
import fs from 'fs/promises';

let TOKEN_PATH = workspace.getConfiguration("sis001-downloader").get("gdTokenPath") as string;
const CREDENTIAL_PATH = workspace.getConfiguration("sis001-downloader").get("credentials") as string;

const getAccessToken = async (driver: GoogleDriver) => {
  const authUrl = driver.oAuth2Clinet.generateAuthUrl({
    access_type: 'offline',
    scope: driver.scropes,
  });
  Logger.log(`Authorize this app by visiting this url: ${authUrl}`);
  env.openExternal(Uri.parse(authUrl));
  const code = await window.showInputBox({
    title: 'Enter the code from that page here: ',
    ignoreFocusOut: true
  });
  if (code === undefined) throw new Error("Need Input code!!!");
  const { tokens } = await driver.oAuth2Clinet.getToken(code);
  await driver.persistenceOfToken(tokens);
  return tokens;
};

export async function initDriver(ctx: ExtensionContext) {
  let tokenPath = TOKEN_PATH;
  if (tokenPath === null || tokenPath === undefined || tokenPath.length === 0) {
    tokenPath = await getDataFolderPath(ctx);
    tokenPath = path.join(tokenPath, 'TOKEN');
    TOKEN_PATH = tokenPath;
  }
  
  const token = await fs.readFile(CREDENTIAL_PATH, 'utf-8');
  const cred = JSON.parse(token).installed;
  const driver = new GoogleDriver(tokenPath, cred);
  await driver.authorize(getAccessToken);
  return driver;
}
