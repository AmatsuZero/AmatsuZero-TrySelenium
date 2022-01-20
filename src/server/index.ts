import express, { NextFunction, Request, Response } from 'express';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { engine } from 'express-handlebars';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { Connection } from 'typeorm';
import { InfoModel } from '../entity/info';
import { InitDriver, OAuthCredentials, persistenceOfToken } from '../pages/google';
import { parseNewListPage } from '../route';
import { createLogger, Logger, prepareConnection } from '../util';
import { google } from 'googleapis';

const hostname = 'localhost';
const port = 3000;
const app = express();
const dataDir = path.join(__dirname, '../..', 'data');
const credentialPath = path.join(dataDir, 'credentials.json');
const tokenPath = path.join(dataDir, 'gdToken');

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const time = new Date();
  Logger.log(`[${time.toLocaleString()}] ${req.method} ${req.url}`);
  next();
};

app.use(loggingMiddleware);
// 指定模板存放目录
app.set('views', path.join(__dirname, 'views'));
// 指定模板引擎为 Handlebars
app.set('view engine', 'hbs');
app.use(express.static('public'));
app.engine('hbs', engine({
  layoutsDir: path.join(__dirname, '/views/layouts'),
  extname: 'hbs',
  // partialsDir: path.join(__dirname, '/views/partials/'),
}));

app.get("/", (req, res) => {
  res.send('Hello');
});

app.get("/parse", async (req, res) => {
  
});

let _oauth2: OAuth2Client;

app.get('/oauth2', async (req, res) => {
  const code = req.query.code as string;
  if (_oauth2 === undefined) {
    const content = await fs.readFile(credentialPath, 'utf8');
    const credentials = JSON.parse(content) as OAuthCredentials;
    const { client_secret, client_id, redirect_uris } = credentials.web;
    _oauth2 = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]
    );
  }
  const oAuth2Clinet = _oauth2;
  if (existsSync(tokenPath)) {
    const token = await fs.readFile(tokenPath, 'utf-8');
    res.redirect(`/posts?credentials=${token}`);
  } else if (code !== undefined && code.length > 0) {
    try {
      const response = await oAuth2Clinet.getToken(code);
      await persistenceOfToken(tokenPath, response.tokens)
      const token = JSON.stringify(response.tokens);
      res.redirect(`/posts?credentials=${token}`);
    } catch (e) {
      res.send(e);
    }
  } else {
    const authUrl = oAuth2Clinet.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
      redirect_uri: `http://${hostname}:${port}/oauth2/`,
    });
    res.redirect(authUrl);  
  }
});

app.get("/posts", async (req, res) => {  
  const credentials = req.query.credentials as string;
  if (credentials !== undefined && credentials.length > 0) {
    const token = JSON.parse(credentials) as Credentials;
    _oauth2.setCredentials(token);
    const drive = google.drive({version: 'v3', auth: _oauth2});
    res.send('success');
  } else {
    res.redirect("/oauth2")
  }
});

app.listen(port, () => {
  createLogger();
  Logger.log(`Server running at http://${hostname}:${port}/`);
});