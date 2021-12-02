import { findAvailableHost } from "../src/util";

beforeAll(() => jest.setTimeout(3 * 60000))

test('测试', async () => {
  const host = await findAvailableHost();
  expect(host).not.toBeNull();
});