'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDays, parseMinutes, parseSheets, matchEmployees } = require('../wecom-attendance-import');

test('parses Chinese day and duration values', () => {
  assert.equal(parseDays('1天4小时', '请假时长', 8), 1.5);
  assert.equal(parseDays('4', '请假时长（小时）', 8), 0.5);
  assert.equal(parseMinutes('1小时15分钟', '迟到时长'), 75);
  assert.equal(parseMinutes('00:18', '迟到时长'), 18);
});

test('detects a two-row enterprise WeChat monthly summary header', () => {
  const parsed = parseSheets([{ name: '月度汇总', rows: [
    ['企业微信考勤月报'],
    ['姓名', '账号', '出勤统计', '', '', '', '', '异常统计'],
    ['', '', '应出勤天数', '实际出勤天数', '请假天数', '旷工天数', '迟到次数', '迟到时长（分钟）'],
    ['王淼', 'wangmiao', 22, 20.5, 1, 0.5, 2, 18],
    ['龚辉', 'gonghui', 22, 22, 0, 0, 0, 0],
    ['合计', '', 44, 42.5, 1, 0.5, 2, 18]
  ] }]);
  assert.equal(parsed.sheetName, '月度汇总');
  assert.equal(parsed.headerRow, 2);
  assert.deepEqual(parsed.records.map((record) => record.name), ['王淼', '龚辉']);
  assert.deepEqual(parsed.records[0], {
    name: '王淼', userId: 'wangmiao', department: '', workDays: 22,
    attendanceDays: 20.5, leaveDays: 1, absentDays: 0.5,
    lateCount: 2, lateMinutes: 18, sourceRow: 4
  });
});

test('sums leave-type columns when total leave is absent', () => {
  const parsed = parseSheets([{ name: '考勤统计', rows: [
    ['姓名', '应出勤天数', '年假（天）', '事假（小时）', '旷工天数', '迟到次数'],
    ['罗汉金', 21, 1, 4, 0, 1]
  ] }]);
  assert.equal(parsed.records[0].leaveDays, 1.5);
  assert.equal(parsed.records[0].attendanceDays, 19.5);
});

test('matches UserID first and unique names as a fallback', () => {
  const records = [
    { name: '财务显示名', userId: 'wm001' },
    { name: '龚辉', userId: '' }
  ];
  const result = matchEmployees([
    { id: '1', name: '王淼', wecomUserId: 'WM001' },
    { id: '2', name: '龚辉', wecomUserId: '' }
  ], records);
  assert.equal(result[0].record, records[0]);
  assert.equal(result[0].matchType, 'UserID');
  assert.equal(result[1].record, records[1]);
  assert.equal(result[1].matchType, '姓名');
});
