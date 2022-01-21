import { OAuth2Client, Credentials } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import readline from 'readline';
import { exec } from 'child_process';
import { Logger } from '../util';
import { AxiosResponse } from 'axios';

interface OAuthCredentialObject {
  client_id: string,
  project_id: string,
  auth_uri: string,
  token_uri: string,
  auth_provider_x509_cert_url: string,
  client_secret: string,
  redirect_uris: string[]
}

export interface OAuthCredentials {
  installed: OAuthCredentialObject
  web: OAuthCredentialObject
}

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

export class GoogleDriver {
  public driver?: drive_v3.Drive;
  public oAuth2Clinet: OAuth2Client;
  public scropes: string[];
  public tokenPath: string;
  public isAuthoried = false;

  public constructor(tokenPath: string, credentials: OAuthCredentialObject, 
    scopes = ['https://www.googleapis.com/auth/drive.metadata.readonly'], ) {
    this.tokenPath = tokenPath;
    const { client_secret, client_id, redirect_uris } = credentials;
    this.oAuth2Clinet = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]
    );
    this.driver = undefined;
    this.scropes = scopes;
  }

  public async authorize(getAccessToken: (driver: GoogleDriver) => Promise<Credentials>) {
    if (existsSync(this.tokenPath)) {
      const token = await fs.readFile(this.tokenPath, 'utf-8');
      this.oAuth2Clinet.setCredentials(JSON.parse(token));
    } else {
      const tokens = await getAccessToken(this);
      this.oAuth2Clinet.setCredentials(tokens);
    }
    this.driver = google.drive({ version: 'v3', auth: this.oAuth2Clinet });
    this.isAuthoried = true;
  }

  public async webInit(credentials: Credentials) {
    this.oAuth2Clinet.setCredentials(credentials);
    this.driver = google.drive({ version: 'v3', auth: this.oAuth2Clinet });
    this.isAuthoried = true;
  }

  public async createFolder(folderName: string) {
    const file = await this.driver?.files.create({
      fields: 'id',
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      }
    });
    return file?.data.id;
  }

  public createUploadFileMetaData(rsp: AxiosResponse, name: string, folerId: string): drive_v3.Params$Resource$Files$Create {
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
  }
  
  public async uploadLoadImage(fileParam: drive_v3.Params$Resource$Files$Create) {
    const file = await this.driver?.files.create(fileParam);
  }

  public async persistenceOfToken(tokens: Credentials) {
    const str = JSON.stringify(tokens);
    await fs.writeFile(this.tokenPath, str);
    return tokens
  }

  public getAccessTokenNTerminal() {
    return new Promise<Credentials>((resolve, reject) => {
      const authUrl = this.oAuth2Clinet.generateAuthUrl({
        access_type: 'offline',
        scope: this.scropes,
      });
      Logger.log('Authorize this app by visiting this url:', authUrl);
      openURL(authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        this.oAuth2Clinet.getToken(code)
          .then(response => {
            this.oAuth2Clinet.setCredentials(response.tokens);
            return response.tokens;
          })
          .then(tokens => this.persistenceOfToken(tokens))
          .then(tokens => resolve(tokens))
          .catch(err => reject(err));
      });
    });
  }
}

