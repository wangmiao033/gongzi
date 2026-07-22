'use strict';

const crypto = require('node:crypto');
const { getAccessToken, getRules, getMonthData } = require('./wecom-attendance');

const MAX_BODY_BYTES = 64 * 1024;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

function safeEqual(actual, expected) {
  const left = Buffer.from(String(actual || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireRelayToken(req, env) {
  const expected = String(env.WECOM_RELAY_TOKEN || '');
  if (!expected) throw Object.assign(new Error('中转服务尚未配置访问令牌'), { status: 503 });
  const authorization = String(req.headers.authorization || '');
  const actual = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!safeEqual(actual, expected)) throw Object.assign(new Error('中转服务访问令牌无效'), { status: 401 });
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('请求内容过大'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('请求内容不是有效 JSON'), { status: 400 });
  }
}

function createRelayHandler(options = {}) {
  const env = options.env || process.env;
  const api = options.api || { getAccessToken, getRules, getMonthData };
  const fetchImpl = options.fetchImpl || fetch;
  let tokenCache = { value: '', expiresAt: 0 };

  async function accessToken() {
    const corpId = env.WECOM_CORP_ID;
    const secret = env.WECOM_CHECKIN_SECRET;
    if (!corpId || !secret) throw Object.assign(new Error('企业微信 CorpID 或打卡应用 Secret 尚未配置'), { status: 503 });
    if (tokenCache.value && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
    tokenCache = {
      value: await api.getAccessToken(corpId, secret),
      expiresAt: Date.now() + 6_600_000
    };
    return tokenCache.value;
  }

  return async function relayHandler(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, {
        ok: true,
        service: 'gongzi-wecom-relay',
        configured: Boolean(env.WECOM_CORP_ID && env.WECOM_CHECKIN_SECRET && env.WECOM_RELAY_TOKEN)
      });
    }

    try {
      requireRelayToken(req, env);

      if (req.method === 'GET' && url.pathname === '/diagnostics/egress-ip') {
        const response = await fetchImpl('https://api.ipify.org?format=json', {
          headers: { accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`出口 IP 查询失败（HTTP ${response.status}）`);
        const data = await response.json();
        return send(res, 200, { ok: true, ip: String(data.ip || '') });
      }

      if (req.method !== 'POST' || url.pathname !== '/wecom-attendance') {
        return send(res, 404, { ok: false, error: '接口不存在' });
      }

      const body = await readJson(req);
      const action = body.action || 'month';
      const token = await accessToken();
      if (action === 'rules') {
        const data = await api.getRules(token);
        return send(res, 200, { ok: true, rules: data.group || data.group_list || data });
      }

      const userIds = [...new Set((body.userIds || []).map((value) => String(value).trim()).filter(Boolean))];
      if (!/^\d{4}-\d{2}$/.test(body.month || '')) throw Object.assign(new Error('请选择有效的工资月份'), { status: 400 });
      if (!userIds.length || userIds.length > 100) throw Object.assign(new Error('请配置 1 至 100 名员工的企业微信 UserID'), { status: 400 });
      const records = await api.getMonthData(token, body.month, userIds, Number(body.dailyWorkHours) || 8);
      return send(res, 200, { ok: true, month: body.month, records, requestedUserIds: userIds });
    } catch (error) {
      console.error('WeCom relay error', { message: error?.message, code: error?.code, status: error?.status });
      return send(res, error?.status || (error?.code ? 502 : 500), { ok: false, error: String(error?.message || error) });
    }
  };
}

module.exports = { createRelayHandler, safeEqual, readJson };
