import { findAvailableHost } from "../src/util";
import ACGList from '../src/acglist';

beforeAll(() => jest.setTimeout(3 * 60000))

test('解析域名', async () => {
  const host = await findAvailableHost();
  expect(host).not.toBeNull();
});

test('解析动漫列表',async () => {
  const host = await findAvailableHost();
  const acgList = new ACGList(host, 0, 0);
  const links = await acgList.getAllThreadsOnCurrentPage();
  console.log(links);
});