'use strict';

const { getAccessToken, getRules, getMonthData } = require('../lib/wecom-attendance');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bypekqxsnuvqbgvdosdl.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_TFfmF3_7t8ceSwP1B0iKxA_sfcb5kca';
let tokenCache = { value: '', expiresAt: 0 };

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

async function requireUser(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) throw Object.assign(new Error('请先登录工资系统'), { status: 401 });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization, apikey: SUPABASE_ANON_KEY }
  });
  if (!response.ok) throw Object.assign(new Error('登录已失效，请重新登录'), { status: 401 });
  const user = await response.json();
  const membership = await fetch(`${SUPABASE_URL}/rest/v1/payroll_workspace_members?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=user_id&limit=1`, {
    headers: { authorization, apikey: SUPABASE_ANON_KEY }
  });
  const rows = membership.ok ? await membership.json() : [];
  if (!Array.isArray(rows) || !rows.length) throw Object.assign(new Error('当前账号不是工资账套的有效成员'), { status: 403 });
  return user;
}

async function accessToken() {
  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_CHECKIN_SECRET;
  if (!corpId || !secret) throw Object.assign(new Error('企业微信考勤尚未配置，请管理员设置 Vercel 环境变量'), { status: 503 });
  if (tokenCache.value && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  tokenCache = { value: await getAccessToken(corpId, secret), expiresAt: Date.now() + 6_600_000 };
  return tokenCache.value;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: '只支持 POST 请求' });
  try {
    await requireUser(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action || 'month';
    const token = await accessToken();
    if (action === 'rules') {
      const data = await getRules(token);
      return send(res, 200, { ok: true, rules: data.group || data.group_list || data });
    }
    const userIds = [...new Set((body.userIds || []).map((value) => String(value).trim()).filter(Boolean))];
    if (!/^\d{4}-\d{2}$/.test(body.month || '')) throw Object.assign(new Error('请选择有效的工资月份'), { status: 400 });
    if (!userIds.length || userIds.length > 100) throw Object.assign(new Error('请配置 1 至 100 名员工的企业微信 UserID'), { status: 400 });
    const records = await getMonthData(token, body.month, userIds, Number(body.dailyWorkHours) || 8);
    return send(res, 200, { ok: true, month: body.month, records, requestedUserIds: userIds });
  } catch (error) {
    console.error('WeCom attendance error', { message: error?.message, code: error?.code, status: error?.status });
    return send(res, error?.status || (error?.code ? 502 : 500), { ok: false, error: String(error?.message || error) });
  }
};
