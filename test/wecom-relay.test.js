'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRelayHandler } = require('../relay/app');

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function testHandler(overrides = {}) {
  return createRelayHandler({
    env: {
      WECOM_CORP_ID: 'corp-test',
      WECOM_CHECKIN_SECRET: 'secret-test',
      WECOM_RELAY_TOKEN: 'relay-test'
    },
    api: {
      getAccessToken: async () => 'access-test',
      getRules: async () => ({ group: [{ groupname: '标准班' }] }),
      discoverRuleUsers: async () => ({ users: [{ userId: 'wangmiao', name: '王淼', source: '打卡规则' }], warnings: [] }),
      getMonthData: async (_token, month, userIds) => userIds.map((userId) => ({ userId, month }))
    },
    ...overrides
  });
}

test('health endpoint does not expose secrets', async () => {
  await withServer(testHandler(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      service: 'gongzi-wecom-relay',
      configured: true
    });
  });
});

test('attendance endpoint discovers rule users and returns matching month records', async () => {
  await withServer(testHandler(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/wecom-attendance`, {
      method: 'POST',
      headers: { authorization: 'Bearer relay-test', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'discover', month: '2026-07' })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      month: '2026-07',
      records: [{ userId: 'wangmiao', month: '2026-07' }],
      candidates: [{ userId: 'wangmiao', name: '王淼', source: '打卡规则', hasMonthData: true }],
      warnings: []
    });
  });
});

test('attendance endpoint rejects missing relay token', async () => {
  await withServer(testHandler(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/wecom-attendance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ month: '2026-07', userIds: ['wangmiao'] })
    });
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /令牌无效/);
  });
});

test('attendance endpoint returns monthly records after authentication', async () => {
  await withServer(testHandler(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/wecom-attendance`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer relay-test',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ month: '2026-07', userIds: ['wangmiao', 'gonghui'] })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      month: '2026-07',
      records: [
        { userId: 'wangmiao', month: '2026-07' },
        { userId: 'gonghui', month: '2026-07' }
      ],
      requestedUserIds: ['wangmiao', 'gonghui']
    });
  });
});
