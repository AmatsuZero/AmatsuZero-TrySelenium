import { OAuth2Client, Credentials } from 'google-auth-library';
import { drive_v3, google } from 'googleapis'; 
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import readline from 'readline';
import { exec } from 'child_process';
import { Logger } from '../util';
import { AxiosResponse } from 'axios';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

interface OAuthCredentials {
  installed: {
    client_id: string,
    project_id: string,
    auth_uri: string,
    token_uri: string,
    auth_provider_x509_cert_url: string,
    client_secret: string,
    redirect_uris: string[]
  }
}

const authorize = async (credentials: OAuthCredentials, tokenPath: string, 
  getAccessToken: (client: OAuth2Client) => Promise<Credentials>) => {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Clinet = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]
  );
  if (existsSync(tokenPath)) {
    const token = await fs.readFile(tokenPath, 'utf-8');
    oAuth2Clinet.setCredentials(JSON.parse(token));
  } else {
    const tokens = await getAccessToken(oAuth2Clinet);
    oAuth2Clinet.setCredentials(tokens);
  }
  return oAuth2Clinet;
};

const openURL = (url: string) => {
  let opener = '';
  switch (process.platform) {
    case 'darwin':
      opener = 'open';
      break;
    case 'win32':
      opener = 'start';
      break;
    default:
      opener = 'xdg-open';
      break;
  } 
  return exec(`${opener} "${url.replace(/"/g, '\\\"')}"`);
};

const getAccessTokenNTerminal = (oAuth2Clinet: OAuth2Client, tokenPath: string) => new Promise((resolve, reject) => {
  const authUrl = oAuth2Clinet.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  Logger.log('Authorize this app by visiting this url:', authUrl);
  openURL(authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Clinet.getToken(code)
    .then(response => {
      oAuth2Clinet.setCredentials(response.tokens);
      return response.tokens;
    })
    .then(tokens => persistenceOfToken(tokenPath, tokens))
    .then(tokens => resolve(tokens))
    .catch(err => reject(err));
  });
});

let _driver: drive_v3.Drive | null;
const InitDriver = async (credentilaPath: string, tokenPath: string, getAccessToken: (client: OAuth2Client) => Promise<Credentials>) => {
  if (_driver !== null) {
    return _driver;
  }
  const content = await fs.readFile(credentilaPath, 'utf8');
  const credentilas = JSON.parse(content) as OAuthCredentials;
  const auth = await authorize(credentilas, tokenPath, getAccessToken);
  _driver = google.drive({version: 'v3', auth});
  return _driver;
};

const GetGoogleDriver = () => {
  if (_driver === null) {
    throw new Error("请先初始化！！！");
  }
  return _driver;
};

const persistenceOfToken = async (tokenPath: string, tokens: Credentials) => {
  const str = JSON.stringify(tokens);
  await fs.writeFile(tokenPath, str);
  return tokens
};

const createFolder = async (driver: drive_v3.Drive, folderName: string) => {
  const file = await driver.files.create({
    fields: 'id',
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    }
  });
  return file.data.id;
}

const createUploadFileMetaData = (rsp: AxiosResponse, name: string, folerId:string): drive_v3.Params$Resource$Files$Create => {
  const requestBody = {
    name,
    parents: [folerId]
  };
  const media = {
    mimeType: 'image/jpeg',
    body: createReadStream(rsp.data)
  };
  return {
    media,
    fields: 'id',
    requestBody
  }
};

const uploadLoadImage = async (driver: drive_v3.Drive, fileParam: drive_v3.Params$Resource$Files$Create) => {
  const file = await driver.files.create(fileParam);
};

export {
  InitDriver,
  SCOPES,
  persistenceOfToken,
  getAccessTokenNTerminal,
  createFolder,
  uploadLoadImage,
  GetGoogleDriver,
  createUploadFileMetaData
}