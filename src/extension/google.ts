import { OAuth2Client } from 'google-auth-library';
import { workspace, window, env, Uri, ExtensionContext } from 'vscode';
import path from 'path';
import { InitDriver, persistenceOfToken, SCOPES } from "../pages/google";
import { Logger } from "../util";
import { getDataFolderPath } from './route';

let TOKEN_PATH = workspace.getConfiguration("sis001-downloader").get("gdTokenPath") as string;
const CREDENTIAL_PATH = workspace.getConfiguration("sis001-downloader").get("credentials") as string;

const getAccessToken = async (oAuth2Client: OAuth2Client) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  Logger.log(`Authorize this app by visiting this url: ${authUrl}`);
  env.openExternal(Uri.parse(authUrl));
  const code = await window.showInputBox({
    title: 'Enter the code from that page here: ',
    ignoreFocusOut: true
  });
  if (code === undefined) throw new Error("Need Input code!!!");
  const { tokens } = await oAuth2Client.getToken(code);
  await persistenceOfToken(TOKEN_PATH, tokens);
  return tokens;
};

export async function initDriver(ctx: ExtensionContext) {
  let tokenPath = TOKEN_PATH;
  if (tokenPath === null || tokenPath === undefined || tokenPath.length === 0) {
    tokenPath = await getDataFolderPath(ctx);
    tokenPath = path.join(tokenPath, 'TOKEN');
    TOKEN_PATH = tokenPath;
  }
  const driver = await InitDriver(CREDENTIAL_PATH, tokenPath, getAccessToken);
  return driver;
}
