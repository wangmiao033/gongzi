'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFixieFetch } = require('../lib/fixie-fetch');

test('uses the normal fetch implementation when Fixie is not configured', () => {
  const fallbackFetch = () => 'direct';
  assert.equal(createFixieFetch('', { fallbackFetch }), fallbackFetch);
});

test('adds a proxy dispatcher without exposing the proxy URL to the target request', async () => {
  class FakeProxyAgent {
    constructor(url) {
      this.url = url;
    }
  }
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return { ok: true };
  };
  const proxyUrl = 'http://user:secret@proxy.example:80';
  const proxiedFetch = createFixieFetch(proxyUrl, { ProxyAgentClass: FakeProxyAgent, fetchImpl });
  await proxiedFetch('https://qyapi.weixin.qq.com/cgi-bin/gettoken', { method: 'GET' });

  assert.equal(captured.url, 'https://qyapi.weixin.qq.com/cgi-bin/gettoken');
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.dispatcher.url, proxyUrl);
  assert.equal(JSON.stringify(captured).includes('Proxy-Authorization'), false);
});
