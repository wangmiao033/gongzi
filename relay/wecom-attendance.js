'use strict';

const WECOM_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

function assertWecomOk(data, operation) {
  if (!data || Number(data.errcode) !== 0) {
    const error = new Error(`${operation}失败：${data?.errmsg || '企业微信未返回有效数据'}（${data?.errcode ?? 'unknown'}）`);
    error.code = Number(data?.errcode) || 502;
    throw error;
  }
  return data;
}

function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) throw new Error('工资月份格式不正确');
  const [year, value] = month.split('-').map(Number);
  // 企业微信要求传入本地 0 点。固定使用中国时区，避免服务器 UTC 时区造成跨月。
  const start = Math.floor(Date.UTC(year, value - 1, 1, -8) / 1000);
  const end = Math.floor(Date.UTC(year, value, 1, -8) / 1000);
  return { start, end };
}

function durationToDays(item, dailyWorkHours = 8) {
  const duration = Math.max(Number(item?.duration) || 0, 0);
  if (Number(item?.time_type) === 1) return duration / 3600 / Math.max(Number(dailyWorkHours) || 8, 1);
  return duration / 86400;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function normalizeMonthRecord(record, dailyWorkHours = 8) {
  const base = record?.base_info || {};
  const summary = record?.summary_info || {};
  const exceptions = Array.isArray(record?.exception_infos) ? record.exception_infos : [];
  const approvals = Array.isArray(record?.sp_items) ? record.sp_items : [];
  const exception = (type) => exceptions.find((item) => Number(item.exception) === type) || {};
  const leaveItems = approvals.filter((item) => Number(item.type) === 1);
  const leaveDays = leaveItems.reduce((sum, item) => sum + durationToDays(item, dailyWorkHours), 0);
  const absent = exception(4);
  const absentDays = Number(absent.duration) > 0
    ? Number(absent.duration) / 86400
    : Number(absent.count) || 0;
  const late = exception(1);
  const workDays = Math.max(Number(summary.work_days) || 0, 0);

  return {
    userId: String(base.acctid || ''),
    name: String(base.name || ''),
    department: String(base.departs_name || ''),
    ruleName: String(base.rule_info?.groupname || ''),
    workDays: round(workDays),
    regularDays: round(Number(summary.regular_days) || 0),
    exceptionDays: round(Number(summary.except_days) || 0),
    attendanceDays: round(Math.max(workDays - leaveDays - absentDays, 0)),
    leaveDays: round(leaveDays),
    absentDays: round(absentDays),
    lateCount: Math.max(Number(late.count) || 0, 0),
    lateMinutes: Math.round(Math.max(Number(late.duration) || 0, 0) / 60),
    leaveBreakdown: leaveItems.map((item) => ({
      name: String(item.name || '请假'),
      count: Number(item.count) || 0,
      days: round(durationToDays(item, dailyWorkHours))
    })),
    source: record
  };
}

async function fetchJson(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`企业微信网络请求失败（HTTP ${response.status}）`);
  return data;
}

async function getAccessToken(corpId, secret, fetchImpl = fetch) {
  const url = new URL(`${WECOM_BASE}/gettoken`);
  url.searchParams.set('corpid', corpId);
  url.searchParams.set('corpsecret', secret);
  const data = await fetchJson(url, {}, fetchImpl);
  return assertWecomOk(data, '获取 access_token').access_token;
}

async function getRules(accessToken, fetchImpl = fetch) {
  const data = await fetchJson(`${WECOM_BASE}/checkin/getcorpcheckinoption?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  }, fetchImpl);
  return assertWecomOk(data, '获取打卡规则');
}

function extractRuleRanges(rules) {
  const userIds = new Set();
  const partyIds = new Set();
  const tagIds = new Set();
  const groups = Array.isArray(rules?.group) ? rules.group : (Array.isArray(rules?.group_list) ? rules.group_list : []);
  for (const group of groups) {
    const range = group?.range || {};
    for (const value of Array.isArray(range.userid) ? range.userid : []) {
      const userId = String(value || '').trim();
      if (userId) userIds.add(userId);
    }
    for (const value of Array.isArray(range.party_id) ? range.party_id : []) {
      const partyId = String(value || '').trim();
      if (partyId) partyIds.add(partyId);
    }
    for (const value of Array.isArray(range.tagid) ? range.tagid : []) {
      const tagId = String(value || '').trim();
      if (tagId) tagIds.add(tagId);
    }
  }
  return { userIds: [...userIds], partyIds: [...partyIds], tagIds: [...tagIds] };
}

async function getDepartmentUsers(accessToken, partyId, fetchImpl = fetch) {
  const url = new URL(`${WECOM_BASE}/user/simplelist`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('department_id', partyId);
  url.searchParams.set('fetch_child', '1');
  const data = assertWecomOk(await fetchJson(url, {}, fetchImpl), '获取部门成员');
  return Array.isArray(data.userlist) ? data.userlist : [];
}

async function getTagUsers(accessToken, tagId, fetchImpl = fetch) {
  const url = new URL(`${WECOM_BASE}/tag/get`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('tagid', tagId);
  const data = assertWecomOk(await fetchJson(url, {}, fetchImpl), '获取标签成员');
  return Array.isArray(data.userlist) ? data.userlist : [];
}

async function discoverRuleUsers(accessToken, fetchImpl = fetch) {
  const rules = await getRules(accessToken, fetchImpl);
  const ranges = extractRuleRanges(rules);
  const users = new Map(ranges.userIds.map((userId) => [userId, { userId, name: '', source: '打卡规则' }]));
  const warnings = [];

  for (const partyId of ranges.partyIds) {
    try {
      for (const item of await getDepartmentUsers(accessToken, partyId, fetchImpl)) {
        const userId = String(item?.userid || '').trim();
        if (userId) users.set(userId, { userId, name: String(item?.name || ''), source: '打卡部门' });
      }
    } catch (error) {
      warnings.push(`部门 ${partyId} 无法展开：${error.message}`);
    }
  }
  for (const tagId of ranges.tagIds) {
    try {
      for (const item of await getTagUsers(accessToken, tagId, fetchImpl)) {
        const userId = String(item?.userid || '').trim();
        if (userId) users.set(userId, { userId, name: String(item?.name || ''), source: '打卡标签' });
      }
    } catch (error) {
      warnings.push(`标签 ${tagId} 无法展开：${error.message}`);
    }
  }
  return { users: [...users.values()], ranges, warnings };
}

async function getMonthData(accessToken, month, userIds, dailyWorkHours = 8, fetchImpl = fetch) {
  const { start, end } = monthRange(month);
  const data = await fetchJson(`${WECOM_BASE}/checkin/getcheckin_monthdata?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ starttime: start, endtime: end, useridlist: userIds })
  }, fetchImpl);
  assertWecomOk(data, '获取打卡月报');
  return (data.datas || []).map((record) => normalizeMonthRecord(record, dailyWorkHours));
}

module.exports = {
  getAccessToken,
  getRules,
  getMonthData,
  discoverRuleUsers,
  extractRuleRanges,
  getDepartmentUsers,
  getTagUsers,
  monthRange,
  normalizeMonthRecord,
  durationToDays
};
