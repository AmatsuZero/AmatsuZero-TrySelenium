import express, { NextFunction, Request, Response } from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { GoogleDriver } from '../pages/google';
import { createLogger, Logger, prepareConnection } from '../util';
import dotenv from "dotenv";
import { createPosts } from '../pages';
import { Connection } from 'typeorm/connection/Connection';

const hostname = 'localhost';
const port = 3000;
const app = express();
const GDDRIVER_KEY = "gdDriver";
const DB_CONNECTION = "DB_CONNECTION";

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

app.get('/oauth2', async (req, res) => {
  const code = req.query.code as string;
  const redirectUrl = req.query.redirectUrl as string;
  const driver = app.get(GDDRIVER_KEY) as GoogleDriver;
  if (driver === undefined) {
    res.status(500).send("Google Drive 初始化失败");
    return;
  }
  if (driver.isAuthoried) {
    res.status(200).send("认证成功");
    return;
  }
  const oAuth2Clinet = driver.oAuth2Clinet;
  if (existsSync(driver.tokenPath)) {
    const token = await fs.readFile(driver.tokenPath, 'utf-8');
    const cred = JSON.parse(token);
    await driver.webInit(cred);
    res.redirect(redirectUrl);
  } else if (code !== undefined && code.length > 0) {
    try {
      const response = await oAuth2Clinet.getToken(code);
      await driver.persistenceOfToken(response.tokens);
      driver.webInit(response.tokens);
      res.send("认证成功");
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
  const driver = app.get(GDDRIVER_KEY) as GoogleDriver;
  if (driver === undefined) {
    res.status(500).send("Google Drive 初始化失败");
    return;
  }
  if (driver.isAuthoried) {
    const conn = app.get(DB_CONNECTION) as Connection;
    await createPosts(conn, driver);
  } else {
    res.redirect("/oauth2?redirectUrl=/posts");
  }
});

app.listen(port, async () => {
  // 加载环境变量
  dotenv.config();
  createLogger();
  try {
    const tokenPath = process.env.TOKEN_PATH || "";
    const credentialPath = process.env.CREDENTIAL_PATH || "";
    const token = await fs.readFile(credentialPath, 'utf-8');
    const cred = JSON.parse(token).web;
    const driver = new GoogleDriver(tokenPath, cred);
    app.set(GDDRIVER_KEY, driver);

    const { connection } = await prepareConnection();
    app.set(DB_CONNECTION, connection);
  } catch (e) {
    Logger.error(e);
  }
  Logger.log(`Server running at http://${hostname}:${port}/`);
});