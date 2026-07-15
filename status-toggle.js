(() => {
  const STORAGE_KEY = 'payroll_attendance_system_v1';

  const readState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      console.error('读取员工状态失败', error);
      return {};
    }
  };

  const writeState = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const defaultMonthRow = (state) => ({
    attendanceDays: Number(state.settings?.standardDays) || 21,
    leaveDays: 0,
    absentDays: 0,
    lateCount: 0,
    lateMinutes: 0,
    compensation: 0,
    fullAttendanceBonus: null,
    salaryAdjustment: 0,
    bonus: 0,
    probationSalary: 0,
    birthdayExpense: 0,
    physicalExpense: 0,
    taxSupplement: 0,
    pension: null,
    medical: null,
    unemployment: null,
    housing: null,
    leaveDeductionOverride: null,
    latePenaltyOverride: null,
    tax: null,
    taxExemptIncome: 0,
    specialAdditionalDeduction: null,
    otherTaxDeduction: null,
    taxRelief: 0,
    note: '',
    actualSalaryOverride: null
  });

  const installStyles = () => {
    if (document.getElementById('employee-status-toggle-style')) return;
    const style = document.createElement('style');
    style.id = 'employee-status-toggle-style';
    style.textContent = `
      .status-switch-button {
        border: 0;
        cursor: pointer;
        font: inherit;
        transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease;
      }
      .status-switch-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(15, 23, 42, .12);
        opacity: .92;
      }
      .status-switch-button:active { transform: translateY(0); }
    `;
    document.head.appendChild(style);
  };

  const decorateStatusCells = () => {
    installStyles();
    const body = document.getElementById('baseSalaryBody');
    if (!body) return;

    const state = readState();
    const employees = Array.isArray(state.employees) ? state.employees : [];
    const rows = Array.from(body.querySelectorAll('tr'));

    rows.forEach((row, index) => {
      const employee = employees[index];
      const cell = row.lastElementChild;
      if (!employee || !cell) return;

      const currentButton = cell.querySelector('[data-employee-status-toggle]');
      if (currentButton && currentButton.dataset.employeeStatusToggle === employee.id) return;

      cell.innerHTML = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `badge status-switch-button ${employee.active ? 'active' : 'inactive'}`;
      button.dataset.employeeStatusToggle = employee.id;
      button.textContent = employee.active ? '启用' : '停用';
      button.title = '点击切换员工状态';

      const help = document.createElement('div');
      help.className = 'help';
      help.textContent = employee.active ? '点击可停用' : '点击可启用';

      cell.append(button, help);
    });

    const tip = document.querySelector('#baseSalaryView .quick-tip');
    if (tip) {
      tip.textContent = '基础工资通常填 3,000 元，绩效工资填剩余固定工资；两项合计为每月“基本工资”。启用表示在职并自动加入新月份；停用表示不再加入后续月份，历史工资仍保留。点击状态即可切换。';
    }
  };

  const toggleStatus = (employeeId) => {
    const saveButton = document.getElementById('saveBaseSalaryBtn');
    if (saveButton) saveButton.click();

    const state = readState();
    const employee = (state.employees || []).find((item) => item.id === employeeId);
    if (!employee) {
      alert('没有找到该员工，请刷新页面后重试。');
      return;
    }

    if (employee.active) {
      const confirmed = confirm(
        `确定停用“${employee.name}”吗？\n\n` +
        '停用后，该员工不会自动加入后续月份工资表；当前月份和历史工资仍保留。'
      );
      if (!confirmed) return;
    }

    employee.active = !employee.active;

    if (employee.active) {
      state.months = state.months || {};
      const month = state.currentMonth || new Date().toISOString().slice(0, 7);
      state.months[month] = state.months[month] || {
        standardDays: Number(state.settings?.standardDays) || 21,
        salaryMode: state.settings?.salaryMode || 'fixed',
        rows: {}
      };
      state.months[month].rows = state.months[month].rows || {};
      if (!state.months[month].rows[employee.id]) {
        state.months[month].rows[employee.id] = defaultMonthRow(state);
      }
    }

    writeState(state);
    location.reload();
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-employee-status-toggle]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggleStatus(button.dataset.employeeStatusToggle);
  }, true);

  const start = () => {
    decorateStatusCells();
    const body = document.getElementById('baseSalaryBody');
    if (body) {
      new MutationObserver(decorateStatusCells).observe(body, {
        childList: true,
        subtree: true
      });
    }
    setTimeout(decorateStatusCells, 300);
    setTimeout(decorateStatusCells, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
