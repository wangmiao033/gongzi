(() => {
  'use strict';
  const KEY = 'payroll_attendance_system_v1';
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (error) { state = {}; }

  state.employees = Array.isArray(state.employees) ? state.employees : [];
  state.months = state.months || {};
  const month = state.months['2026-06'];
  if (!month || !month.rows) return;

  const chaofan = '广州超凡响应网络科技有限公司';
  const xiongdong = '广州熊动科技有限公司';
  const byId = (id) => state.employees.find((item) => item.id === id);

  const records = {
    e_gh:  { actual: 7000, bonus: 250, tax: 50.38 },
    e_lhj: { actual: 5500, bonus: 0,   tax: 0 },
    e_wwb: { actual: 4900, bonus: 0,   tax: 0 },
    e_mcm: { actual: 6000, bonus: 0,   tax: 0 }
  };

  Object.entries(records).forEach(([id, values]) => {
    const employee = byId(id);
    const row = month.rows[id];
    if (!employee || !row) return;
    employee.companyName = chaofan;
    row.companyName = chaofan;
    row.actualSalaryOverride = values.actual;
    row.bonus = values.bonus;
    row.compensation = 0;
    row.fullAttendanceBonus = 0;
    row.salaryAdjustment = 0;
    row.probationSalary = 0;
    row.birthdayExpense = 0;
    row.physicalExpense = 0;
    row.taxSupplement = 0;
    row.pension = 440.80;
    row.medical = 124.68;
    row.unemployment = 5.00;
    row.housing = 0;
    row.leaveDeductionOverride = 0;
    row.latePenaltyOverride = 0;
    row.tax = values.tax;
    row.note = '财务最终核算：2026年6月';
  });

  const wangMiao = byId('e_wm') || state.employees.find((item) => item.name === '王淼');
  if (wangMiao && month.rows[wangMiao.id]) {
    wangMiao.companyName = xiongdong;
    month.rows[wangMiao.id].companyName = xiongdong;
  }

  state.companies = [chaofan, xiongdong];
  state.financeConfirmed = state.financeConfirmed || {};
  state.financeConfirmed['2026-06'] = true;
  localStorage.setItem(KEY, JSON.stringify(state));
})();
