'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { monthRange, normalizeMonthRecord } = require('../lib/wecom-attendance');

test('monthRange uses Asia/Shanghai month boundaries', () => {
  const range = monthRange('2026-07');
  assert.equal(new Date(range.start * 1000).toISOString(), '2026-06-30T16:00:00.000Z');
  assert.equal(new Date(range.end * 1000).toISOString(), '2026-07-31T16:00:00.000Z');
});

test('normalizes leave, absence and late data into payroll fields', () => {
  const result = normalizeMonthRecord({
    base_info: { acctid: 'zhangsan', name: '张三', rule_info: { groupname: '标准班' } },
    summary_info: { work_days: 22, regular_days: 18, except_days: 2 },
    exception_infos: [
      { exception: 1, count: 2, duration: 900 },
      { exception: 4, count: 1, duration: 86400 }
    ],
    sp_items: [{ type: 1, name: '年假', count: 1, duration: 86400, time_type: 0 }]
  });
  assert.deepEqual({
    attendanceDays: result.attendanceDays,
    leaveDays: result.leaveDays,
    absentDays: result.absentDays,
    lateCount: result.lateCount,
    lateMinutes: result.lateMinutes
  }, { attendanceDays: 20, leaveDays: 1, absentDays: 1, lateCount: 2, lateMinutes: 15 });
});

test('converts hourly leave using an eight-hour workday', () => {
  const result = normalizeMonthRecord({
    base_info: { acctid: 'lisi', name: '李四' },
    summary_info: { work_days: 21 },
    sp_items: [{ type: 1, name: '事假', duration: 14400, time_type: 1 }]
  }, 8);
  assert.equal(result.leaveDays, 0.5);
  assert.equal(result.attendanceDays, 20.5);
});
