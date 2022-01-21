import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command('hexo', '生成 hexo 博客', yargs => {
    return yargs
  })
  .command('resume', '恢复爬虫', yargs => {
    return yargs 
  })
  .command('checkIsPosted', '检查是否已经已经发布帖子了', yargs => {

  })
  .option('chromeDriver', {
    type: 'string',
    defaultDescription: 'driver 路径'
  })
  .option('useSelenium', {
    type: 'boolean',
    default: 'false',
    description: '是否使用 Selenium 爬虫'
  })
  .option('page', {
    type: 'number',
    description: '页码'
  })
  .parse()
