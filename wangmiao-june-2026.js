(() => {
  'use strict';
  const KEY = 'payroll_attendance_system_v1';
  let state;
  try {
    state = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch (error) {
    state = {};
  }

  state.employees = Array.isArray(state.employees) ? state.employees : [];
  let person = state.employees.find((item) => item.id === 'e_wm' || item.name === '王淼');
  if (!person) {
    person = { id: 'e_wm', name: '王淼', active: false };
    state.employees.push(person);
  }

  Object.assign(person, {
    id: person.id || 'e_wm',
    name: '王淼',
    baseSalaryPart: 3000,
    performanceSalary: 12000,
    baseSalary: 15000,
    socialBaseMode: 'custom',
    socialDeclaredSalary: 15000,
    socialBases: {
      ...(person.socialBases || {}),
      pension: 5510,
      medical: 6234,
      unemployment: 2500,
      injury: 2500,
      housing: 24000
    },
    housingEnabled: true
  });
  if (typeof person.active !== 'boolean') person.active = false;

  state.months = state.months || {};
  state.months['2026-06'] = state.months['2026-06'] || {
    standardDays: 21,
    salaryMode: 'fixed',
    rows: {}
  };
  state.months['2026-06'].rows = state.months['2026-06'].rows || {};
  state.months['2026-06'].rows[person.id] = {
    ...(state.months['2026-06'].rows[person.id] || {}),
    attendanceDays: 21,
    leaveDays: 0,
    absentDays: 0,
    lateCount: 0,
    lateMinutes: 0,
    compensation: 0,
    fullAttendanceBonus: 0,
    salaryAdjustment: 0,
    bonus: 0,
    probationSalary: 0,
    birthdayExpense: 0,
    physicalExpense: 0,
    taxSupplement: 0,
    pension: 440.80,
    medical: 124.68,
    unemployment: 5.00,
    housing: 1200.00,
    leaveDeductionOverride: 0,
    latePenaltyOverride: 0,
    tax: 822.95,
    taxExemptIncome: 0,
    specialAdditionalDeduction: 0,
    otherTaxDeduction: 0,
    taxRelief: 0,
    note: '2026年6月历史工资',
    actualSalaryOverride: 15000
  };

  localStorage.setItem(KEY, JSON.stringify(state));
})();
