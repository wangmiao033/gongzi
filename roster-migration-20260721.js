(() => {
  'use strict';
  const KEY = 'payroll_attendance_system_v1';
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (error) { return; }
  if (!Array.isArray(state.employees)) return;

  const employee = state.employees.find((item) => item.id === 'e_wm' || item.name === '王淼');
  if (!employee) return;

  employee.active = true;
  employee.companyName = '广州熊动科技有限公司';
  employee.remark = '';
  employee.baseSalary = 15000;
  employee.baseSalaryPart = 3000;
  employee.performanceSalary = 12000;
  employee.socialDeclaredSalary = 15000;
  employee.socialBaseMode = 'custom';
  employee.housingEnabled = true;
  employee.socialBases = {
    ...(employee.socialBases || {}),
    pension: 5510,
    medical: 6234,
    unemployment: 2500,
    injury: 2500,
    housing: 24000
  };

  const july = state.months?.['2026-07'];
  if (july) {
    july.rows = july.rows || {};
    july.rows[employee.id] = {
      ...(july.rows[employee.id] || {}),
      companyName: '广州熊动科技有限公司',
      attendanceDays: Number(july.rows[employee.id]?.attendanceDays) || 21,
      leaveDays: Number(july.rows[employee.id]?.leaveDays) || 0,
      absentDays: Number(july.rows[employee.id]?.absentDays) || 0,
      lateCount: Number(july.rows[employee.id]?.lateCount) || 0,
      lateMinutes: Number(july.rows[employee.id]?.lateMinutes) || 0,
      bonus: Number(july.rows[employee.id]?.bonus) || 0,
      compensation: Number(july.rows[employee.id]?.compensation) || 0,
      fullAttendanceBonus: Number(july.rows[employee.id]?.fullAttendanceBonus) || 0,
      salaryAdjustment: Number(july.rows[employee.id]?.salaryAdjustment) || 0,
      pension: 440.80,
      medical: 124.68,
      unemployment: 5.00,
      housing: 1200.00,
      tax: Number(july.rows[employee.id]?.tax) || 0
    };
  }

  localStorage.setItem(KEY, JSON.stringify(state));
})();