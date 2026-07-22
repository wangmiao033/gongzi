((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WecomAttendanceImport = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const FIELD_LABELS = {
    name: '姓名',
    userId: '企业微信 UserID',
    workDays: '应出勤天数',
    attendanceDays: '出勤天数',
    leaveDays: '请假天数',
    absentDays: '旷工天数',
    lateCount: '迟到次数',
    lateMinutes: '迟到分钟'
  };

  const text = (value) => String(value ?? '').trim();
  const normalizedText = (value) => text(value).replace(/\s+/g, '').toLowerCase();
  const cleanHeader = (value) => normalizedText(value)
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .replace(/[：:、，,。\.\-_/]/g, '');

  function number(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function parseDays(value, header = '', dailyWorkHours = 8) {
    const raw = text(value);
    if (!raw || raw === '-' || raw === '--' || raw === '/') return null;
    const day = Number(raw.match(/(-?\d+(?:\.\d+)?)\s*天/)?.[1] || 0);
    const hour = Number(raw.match(/(-?\d+(?:\.\d+)?)\s*(?:小时|时)/)?.[1] || 0);
    const minute = Number(raw.match(/(-?\d+(?:\.\d+)?)\s*(?:分钟|分)/)?.[1] || 0);
    if (/天|小时|分钟|\d+\s*时/.test(raw)) return round(day + hour / dailyWorkHours + minute / dailyWorkHours / 60);
    const parsed = number(raw);
    if (parsed === null) return null;
    const unit = cleanHeader(header);
    if (/小时|时长小时|\(h\)/.test(unit)) return round(parsed / dailyWorkHours);
    if (/分钟|时长分钟|min/.test(unit)) return round(parsed / dailyWorkHours / 60);
    return round(parsed);
  }

  function parseMinutes(value, header = '') {
    const raw = text(value);
    if (!raw || raw === '-' || raw === '--' || raw === '/') return null;
    const hour = Number(raw.match(/(-?\d+(?:\.\d+)?)\s*(?:小时|时)/)?.[1] || 0);
    const minute = Number(raw.match(/(-?\d+(?:\.\d+)?)\s*(?:分钟|分)/)?.[1] || 0);
    if (/小时|分钟|\d+\s*时/.test(raw)) return Math.max(Math.round(hour * 60 + minute), 0);
    const clock = raw.match(/^(\d{1,3}):(\d{1,2})(?::\d{1,2})?$/);
    if (clock) return Math.max(Number(clock[1]) * 60 + Number(clock[2]), 0);
    const parsed = number(raw);
    if (parsed === null) return null;
    return Math.max(Math.round(/小时|\(h\)/.test(cleanHeader(header)) ? parsed * 60 : parsed), 0);
  }

  function fieldForHeader(header) {
    const value = cleanHeader(header);
    if (!value) return null;
    if (/^(姓名|员工姓名|成员姓名|用户姓名|人员姓名|名字)$/.test(value)) return 'name';
    if (/^(账号|帐号|成员账号|员工账号|企业微信账号|userid|用户id|成员userid|企业微信userid)$/.test(value)) return 'userId';
    if (/^(部门|所属部门|部门名称)$/.test(value)) return 'department';
    if (/(应出勤天数|应出勤\(天\)|应出勤$|应出勤时长天)/.test(value)) return 'workDays';
    if (/(实际出勤天数|实际出勤\(天\)|出勤天数|计薪出勤天数|正常出勤天数)/.test(value)) return 'attendanceDays';
    if (!/次数|次$/.test(value) && /(请假天数|请假\(天\)|请假时长天|请假合计)/.test(value)) return 'leaveDays';
    if (!/次数|次$/.test(value) && /(旷工天数|旷工\(天\)|旷工时长天|旷工合计)/.test(value)) return 'absentDays';
    if (/(迟到次数|迟到\(次\)|迟到次$)/.test(value)) return 'lateCount';
    if (/(迟到分钟|迟到时长|迟到累计|迟到总时长)/.test(value) && !/次数/.test(value)) return 'lateMinutes';
    if (!/次数|次$/.test(value) && /(年假|事假|病假|调休|婚假|产假|陪产假|丧假|哺乳假|育儿假|护理假|其他假|请假)/.test(value)) return 'leaveComponent';
    return null;
  }

  function fillForward(row, width) {
    const result = [];
    let last = '';
    for (let index = 0; index < width; index += 1) {
      const current = text(row?.[index]);
      if (current) last = current;
      result.push(current || last);
    }
    return result;
  }

  function buildHeaders(rows, start, depth) {
    const width = Math.max(...rows.slice(start, start + depth).map((row) => row?.length || 0), 0);
    if (!width) return [];
    const levels = [];
    for (let offset = 0; offset < depth; offset += 1) levels.push(fillForward(rows[start + offset] || [], width));
    return Array.from({ length: width }, (_, column) => {
      const pieces = [];
      for (const level of levels) {
        const value = text(level[column]);
        if (value && !pieces.includes(value)) pieces.push(value);
      }
      return pieces.join(' ');
    });
  }

  function mappedColumns(headers) {
    return headers.map((header, index) => ({ index, header, field: fieldForHeader(header) })).filter((item) => item.field);
  }

  function headerScore(columns) {
    const fields = new Set(columns.map((item) => item.field));
    const identity = fields.has('name') || fields.has('userId');
    const metricCount = ['workDays', 'attendanceDays', 'leaveDays', 'absentDays', 'lateCount', 'lateMinutes', 'leaveComponent']
      .filter((field) => fields.has(field)).length;
    if (!identity || !metricCount) return -1;
    return (fields.has('name') ? 4 : 0) + (fields.has('userId') ? 4 : 0) + metricCount * 3 + columns.length;
  }

  function findHeader(rows) {
    let best = null;
    const limit = Math.min(rows.length, 24);
    for (let start = 0; start < limit; start += 1) {
      for (const depth of [1, 2]) {
        if (start + depth > rows.length) continue;
        const headers = buildHeaders(rows, start, depth);
        const columns = mappedColumns(headers);
        const score = headerScore(columns);
        if (score < 0) continue;
        const candidate = { start, depth, headers, columns, score };
        if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.depth < best.depth)) best = candidate;
      }
    }
    return best;
  }

  function valueFor(row, columns, field) {
    const column = columns.find((item) => item.field === field);
    return column ? row[column.index] : undefined;
  }

  function parseSheet(sheet, dailyWorkHours = 8) {
    const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
    const header = findHeader(rows);
    if (!header) return null;
    const records = [];
    const leaveColumns = header.columns.filter((item) => item.field === 'leaveComponent');
    for (let index = header.start + header.depth; index < rows.length; index += 1) {
      const row = rows[index] || [];
      const name = text(valueFor(row, header.columns, 'name'));
      const userId = text(valueFor(row, header.columns, 'userId'));
      if (!name && !userId) continue;
      if (/^(合计|总计|汇总|小计|说明)$/.test(name)) continue;
      const readDays = (field) => {
        const column = header.columns.find((item) => item.field === field);
        return column ? parseDays(row[column.index], column.header, dailyWorkHours) : null;
      };
      const readNumber = (field) => {
        const column = header.columns.find((item) => item.field === field);
        return column ? number(row[column.index]) : null;
      };
      let leaveDays = readDays('leaveDays');
      if (leaveDays === null && leaveColumns.length) {
        const values = leaveColumns.map((column) => parseDays(row[column.index], column.header, dailyWorkHours)).filter((value) => value !== null);
        leaveDays = values.length ? round(values.reduce((sum, value) => sum + value, 0)) : null;
      }
      const workDays = readDays('workDays');
      const absentDays = readDays('absentDays');
      let attendanceDays = readDays('attendanceDays');
      if (attendanceDays === null && workDays !== null && (leaveDays !== null || absentDays !== null)) {
        attendanceDays = round(Math.max(workDays - (leaveDays || 0) - (absentDays || 0), 0));
      }
      const lateColumn = header.columns.find((item) => item.field === 'lateMinutes');
      records.push({
        name,
        userId,
        department: text(valueFor(row, header.columns, 'department')),
        workDays,
        attendanceDays,
        leaveDays,
        absentDays,
        lateCount: readNumber('lateCount'),
        lateMinutes: lateColumn ? parseMinutes(row[lateColumn.index], lateColumn.header) : null,
        sourceRow: index + 1
      });
    }
    const detectedFields = [...new Set(header.columns.map((item) => item.field === 'leaveComponent' ? 'leaveDays' : item.field))]
      .filter((field) => FIELD_LABELS[field]);
    const nameBonus = /月报|月度|汇总|统计/.test(text(sheet.name)) ? 8 : (/日报|明细|原始/.test(text(sheet.name)) ? -4 : 0);
    return {
      sheetName: text(sheet.name) || '工作表',
      headerRow: header.start + 1,
      detectedFields,
      records,
      score: header.score + nameBonus + Math.min(records.length, 30) / 10
    };
  }

  function parseSheets(sheets, dailyWorkHours = 8) {
    const candidates = (sheets || []).map((sheet) => parseSheet(sheet, dailyWorkHours)).filter((item) => item?.records.length);
    if (!candidates.length) throw new Error('没有找到可识别的考勤汇总表，请导出企业微信“月度汇总”后重试');
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const duplicateKeys = new Set();
    const seen = new Set();
    for (const record of best.records) {
      const key = normalizedText(record.userId || record.name);
      if (!key) continue;
      if (seen.has(key)) duplicateKeys.add(key);
      seen.add(key);
    }
    return {
      ...best,
      duplicateKeys: [...duplicateKeys],
      candidateSheets: candidates.map((item) => item.sheetName)
    };
  }

  function matchEmployees(employees, records) {
    const byUserId = new Map();
    const byName = new Map();
    for (const record of records || []) {
      const userId = normalizedText(record.userId);
      const name = normalizedText(record.name);
      if (userId) {
        const list = byUserId.get(userId) || [];
        list.push(record);
        byUserId.set(userId, list);
      }
      if (name) {
        const list = byName.get(name) || [];
        list.push(record);
        byName.set(name, list);
      }
    }
    return (employees || []).map((employee) => {
      const idMatches = byUserId.get(normalizedText(employee.wecomUserId)) || [];
      const nameMatches = byName.get(normalizedText(employee.name)) || [];
      const matches = idMatches.length ? idMatches : nameMatches;
      return {
        employee,
        record: matches.length === 1 ? matches[0] : null,
        matchType: idMatches.length === 1 ? 'UserID' : (nameMatches.length === 1 ? '姓名' : ''),
        ambiguous: matches.length > 1
      };
    });
  }

  return { parseDays, parseMinutes, fieldForHeader, findHeader, parseSheet, parseSheets, matchEmployees, normalizedText };
});
