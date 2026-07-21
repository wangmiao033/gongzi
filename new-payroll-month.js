(() => {
  'use strict';

  const STORAGE_KEY = 'payroll_attendance_system_v1';
  const PLAN_KEY = 'payrollPaymentPlans';
  let modal = null;
  let mounted = false;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (error) { return {}; }
  };

  const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
  const pad = (value) => String(value).padStart(2, '0');
  const monthLabel = (value) => {
    if (!/^\d{4}-\d{2}$/.test(value || '')) return value || '-';
    const [year, month] = value.split('-');
    return `${year} 年 ${Number(month)} 月`;
  };

  function addMonths(value, count) {
    const match = /^(\d{4})-(\d{2})$/.exec(value || '');
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1 + count, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth() + count, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function payDateForMonth(value) {
    const nextMonth = addMonths(value, 1);
    return `${nextMonth}-15`;
  }

  function weekdayCount(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value || '');
    if (!match) return 21;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const days = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= days; day += 1) {
      const weekDay = new Date(year, month, day).getDay();
      if (weekDay !== 0 && weekDay !== 6) count += 1;
    }
    return count;
  }

  function activeEmployee(employee) {
    if (!employee) return false;
    if (employee.active === false || employee.enabled === false || employee.isActive === false) return false;
    const status = String(employee.status || employee.employmentStatus || employee.workStatus || '').trim().toLowerCase();
    return !['disabled', 'inactive', 'stopped', 'terminated', 'left', '停用', '离职'].includes(status);
  }

  function resetMonthlyRow(sourceRow, standardDays, companyName) {
    const row = clone(sourceRow || {});

    const zeroFields = [
      'leaveDays', 'personalLeaveDays', 'sickLeaveDays', 'absenceDays', 'absentDays',
      '旷工天数', 'lateCount', 'lateTimes', 'lateMinutes', 'overtimeDays',
      'compensation', 'fullAttendanceBonus', 'bonus', 'salaryAdjustment',
      'probationSalary', 'birthdayExpense', 'physicalExpense', 'taxSupplement',
      'otherIncome', 'otherDeduction', 'manualDeduction', 'manualTax', 'tax',
      'leaveDeduction', 'latePenalty', 'attendanceDeduction'
    ];
    zeroFields.forEach((field) => {
      if (field in row) row[field] = 0;
    });

    const clearFields = [
      'actualSalaryOverride', 'leaveDeductionOverride', 'latePenaltyOverride',
      'taxOverride', 'grossOverride', 'netOverride', 'manualGross', 'manualNet'
    ];
    clearFields.forEach((field) => {
      if (field in row) delete row[field];
    });

    row.attendanceDays = Number(standardDays) || 21;
    if ('workDays' in row) row.workDays = Number(standardDays) || 21;
    if ('actualWorkDays' in row) row.actualWorkDays = Number(standardDays) || 21;
    row.companyName = companyName || row.companyName || '广州超凡响应网络科技有限公司';
    row.note = '';
    return row;
  }

  function monthOptions(state) {
    return Object.keys(state.months || {}).sort().reverse();
  }

  function latestMonth(state) {
    return monthOptions(state)[0] || state.currentMonth || '';
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('archive-update'));
  }

  async function syncAndReload() {
    try { await window.PayrollWorkspace?.saveNow?.({ force: true }); } catch (error) {}
    try { await window.PayrollCloud?.saveNow?.({ force: true }); } catch (error) {}
    setTimeout(() => location.reload(), 250);
  }

  function installStyles() {
    if (document.getElementById('new-payroll-month-style')) return;
    const style = document.createElement('style');
    style.id = 'new-payroll-month-style';
    style.textContent = `
      .new-month-overlay{position:fixed;inset:0;z-index:100200;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px}
      .new-month-card{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 30px 90px rgba(15,23,42,.35);padding:28px;color:#0f172a}
      .new-month-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.new-month-head h2{margin:0 0 7px;font-size:23px}.new-month-head p{margin:0;color:#64748b;line-height:1.6}.new-month-close{border:0;background:#f1f5f9;width:36px;height:36px;border-radius:9px;font-size:20px;cursor:pointer}
      .new-month-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.new-month-field{display:grid;gap:7px}.new-month-field label{font-weight:700;font-size:13px}.new-month-field input,.new-month-field select{height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 11px;font:inherit}.new-month-full{grid-column:1/-1}
      .new-month-tip{margin-top:16px;padding:13px 15px;border:1px solid #cde2e7;border-radius:11px;background:#f3fafb;color:#315b67;font-size:13px;line-height:1.65}.new-month-tip strong{color:#0f647b}
      .new-month-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.new-month-actions button{height:43px;border-radius:9px;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}.new-month-cancel{border:1px solid #cbd5e1;background:#fff;color:#334155}.new-month-submit{border:0;background:#0f879c;color:#fff}.new-month-submit:disabled{opacity:.55;cursor:not-allowed}
      .new-month-message{min-height:22px;margin-top:11px;color:#dc2626;font-size:13px}.new-month-message.ok{color:#15803d}
      .pay-date-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#eef7f8;color:#236274;font-size:12px;font-weight:700;white-space:nowrap}.pay-date-chip button{border:0;background:transparent;color:#08758a;padding:0;cursor:pointer;font:inherit;font-weight:700}
      @media(max-width:620px){.new-month-grid{grid-template-columns:1fr}.new-month-full{grid-column:auto}.new-month-card{padding:21px}}
    `;
    document.head.appendChild(style);
  }

  function closeModal() {
    modal?.remove();
    modal = null;
  }

  function showModal(prefillMonth = '') {
    installStyles();
    closeModal();
    const state = read();
    const months = monthOptions(state);
    const sourceMonth = state.currentMonth && state.months?.[state.currentMonth]
      ? state.currentMonth
      : (months[0] || '');
    const targetMonth = prefillMonth || addMonths(sourceMonth || latestMonth(state), 1);
    const standardDays = weekdayCount(targetMonth);

    modal = document.createElement('div');
    modal.className = 'new-month-overlay';
    modal.innerHTML = `
      <div class="new-month-card" role="dialog" aria-modal="true">
        <div class="new-month-head">
          <div><h2>新建工资月份</h2><p>新月份只带入在职员工、工资结构、公司和社保配置；考勤、奖金、请假、迟到、调薪和个税会重新录入。</p></div>
          <button type="button" class="new-month-close">×</button>
        </div>
        <div class="new-month-grid">
          <div class="new-month-field"><label>工资所属月份</label><input type="month" id="newSalaryMonth" value="${targetMonth}"></div>
          <div class="new-month-field"><label>计划发薪日期</label><input type="date" id="newPayDate" value="${payDateForMonth(targetMonth)}"></div>
          <div class="new-month-field"><label>复制来源月份</label><select id="newSourceMonth">${months.map((month) => `<option value="${month}" ${month === sourceMonth ? 'selected' : ''}>${monthLabel(month)}</option>`).join('')}</select></div>
          <div class="new-month-field"><label>标准出勤天数</label><input type="number" min="1" max="31" step="0.5" id="newStandardDays" value="${standardDays}"></div>
          <div class="new-month-field new-month-full"><label>创建内容</label><select id="newMonthMode"><option value="copy">复制上月在职员工、工资结构和社保配置（推荐）</option><option value="blank">仅加入当前在职员工，其他项目从零录入</option></select></div>
        </div>
        <div class="new-month-tip" id="newMonthTip"></div>
        <div class="new-month-message" id="newMonthMessage"></div>
        <div class="new-month-actions"><button type="button" class="new-month-cancel">取消</button><button type="button" class="new-month-submit">创建工资表</button></div>
      </div>`;
    document.body.appendChild(modal);

    const targetInput = modal.querySelector('#newSalaryMonth');
    const payInput = modal.querySelector('#newPayDate');
    const daysInput = modal.querySelector('#newStandardDays');
    const tip = modal.querySelector('#newMonthTip');
    const message = modal.querySelector('#newMonthMessage');
    const submit = modal.querySelector('.new-month-submit');

    const refreshTip = () => {
      const target = targetInput.value;
      const payDate = payInput.value;
      tip.innerHTML = `<strong>${monthLabel(target)}工资</strong>，计划于 <strong>${payDate || '未设置日期'}</strong> 发放。创建后进入该月份录入考勤和当月变动。`;
    };

    targetInput.addEventListener('change', () => {
      payInput.value = payDateForMonth(targetInput.value);
      daysInput.value = weekdayCount(targetInput.value);
      refreshTip();
    });
    payInput.addEventListener('change', refreshTip);
    modal.querySelector('.new-month-close').addEventListener('click', closeModal);
    modal.querySelector('.new-month-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    submit.addEventListener('click', async () => {
      const target = targetInput.value;
      const payDate = payInput.value;
      const source = modal.querySelector('#newSourceMonth').value;
      const mode = modal.querySelector('#newMonthMode').value;
      const days = Number(daysInput.value) || 21;
      const nextState = read();

      if (!/^\d{4}-\d{2}$/.test(target)) {
        message.textContent = '请选择工资所属月份。';
        return;
      }
      if (nextState.months?.[target]) {
        message.textContent = `${monthLabel(target)}工资表已经存在，请直接在顶部选择该月份。`;
        return;
      }
      if (!payDate) {
        message.textContent = '请设置计划发薪日期。';
        return;
      }

      const sourceData = clone(nextState.months?.[source] || {});
      const sourceRows = sourceData.rows || {};
      const employees = (nextState.employees || []).filter(activeEmployee);
      const rows = {};

      employees.forEach((employee) => {
        const sourceRow = mode === 'copy' ? sourceRows[employee.id] : {};
        rows[employee.id] = resetMonthlyRow(sourceRow, days, employee.companyName || sourceRow?.companyName);
      });

      const newMonth = mode === 'copy' ? sourceData : {};
      newMonth.rows = rows;
      newMonth.standardWorkDays = days;
      newMonth.standardDays = days;
      newMonth.workDays = days;
      newMonth.salaryMonth = target;
      newMonth.payDate = payDate;
      newMonth.createdAt = new Date().toISOString();
      newMonth.sourceMonth = source || null;

      nextState.months = nextState.months || {};
      nextState.months[target] = newMonth;
      nextState.currentMonth = target;
      nextState[PLAN_KEY] = nextState[PLAN_KEY] || {};
      nextState[PLAN_KEY][target] = {
        salaryMonth: target,
        plannedPayDate: payDate,
        sourceMonth: source || null,
        createdAt: new Date().toISOString(),
        status: 'draft'
      };

      submit.disabled = true;
      message.classList.add('ok');
      message.textContent = `正在创建 ${monthLabel(target)}工资表…`;
      saveState(nextState);
      await syncAndReload();
    });

    refreshTip();
  }

  function updatePayDateChip() {
    const state = read();
    const month = state.currentMonth || document.querySelector('#monthPicker')?.value;
    const controls = document.querySelector('.archive-controls');
    if (!month || !controls) return;

    const plan = state[PLAN_KEY]?.[month] || {};
    const date = plan.plannedPayDate || state.months?.[month]?.payDate || '';
    let chip = document.querySelector('#plannedPayDateChip');
    if (!chip) {
      chip = document.createElement('span');
      chip.id = 'plannedPayDateChip';
      chip.className = 'pay-date-chip';
      controls.appendChild(chip);
    }
    chip.innerHTML = date
      ? `计划发薪：${date} <button type="button" title="修改发薪日期">修改</button>`
      : '<button type="button">设置计划发薪日期</button>';
    chip.querySelector('button')?.addEventListener('click', () => {
      const next = prompt(`${monthLabel(month)}工资的计划发薪日期（YYYY-MM-DD）`, date || payDateForMonth(month));
      if (!next) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return alert('日期格式应为 YYYY-MM-DD');
      const latest = read();
      latest[PLAN_KEY] = latest[PLAN_KEY] || {};
      latest[PLAN_KEY][month] = {
        ...(latest[PLAN_KEY][month] || {}),
        salaryMonth: month,
        plannedPayDate: next
      };
      if (latest.months?.[month]) latest.months[month].payDate = next;
      saveState(latest);
      updatePayDateChip();
    });
  }

  function installButton() {
    const toolbar = document.querySelector('#payrollView .page-heading .toolbar');
    if (!toolbar || document.querySelector('#createPayrollMonthBtn')) return false;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'createPayrollMonthBtn';
    button.className = 'btn primary';
    button.textContent = '新建工资月份';

    const copyButton = Array.from(toolbar.querySelectorAll('button')).find((item) => item.textContent.includes('复制上月'));
    if (copyButton) toolbar.insertBefore(button, copyButton);
    else toolbar.appendChild(button);
    button.addEventListener('click', () => showModal());
    return true;
  }

  function interceptUnknownMonth() {
    document.addEventListener('change', (event) => {
      if (event.target?.id !== 'monthPicker') return;
      const state = read();
      const selected = event.target.value;
      if (!selected || state.months?.[selected]) {
        setTimeout(updatePayDateChip, 100);
        return;
      }
      const previous = state.currentMonth || latestMonth(state);
      if (previous) event.target.value = previous;
      showModal(selected);
    }, true);
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    installStyles();
    interceptUnknownMonth();

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installButton()) {
        clearInterval(timer);
        setTimeout(updatePayDateChip, 100);
      } else if (attempts > 100) clearInterval(timer);
    }, 100);

    document.addEventListener('click', (event) => {
      if (event.target.closest('.nav-btn,[data-view]')) setTimeout(updatePayDateChip, 180);
    });
    document.addEventListener('change', (event) => {
      if (event.target?.id === 'monthPicker') setTimeout(updatePayDateChip, 180);
    });
    window.addEventListener('archive-update', () => setTimeout(updatePayDateChip, 80));
  }

  mount();
})();