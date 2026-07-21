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
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
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
    return `${addMonths(value, 1)}-15`;
  }

  function weekdayCount(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value || '');
    if (!match) return 21;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const days = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= days; day += 1) {
      const weekday = new Date(year, month, day).getDay();
      if (weekday !== 0 && weekday !== 6) count += 1;
    }
    return count;
  }

  function activeEmployee(employee) {
    if (!employee) return false;
    if (employee.active === false || employee.enabled === false || employee.isActive === false) return false;
    const status = String(employee.status || employee.employmentStatus || employee.workStatus || '').trim().toLowerCase();
    return !['disabled', 'inactive', 'stopped', 'terminated', 'left', '停用', '离职'].includes(status);
  }

  function employeeCompany(employee) {
    return String(employee?.companyName || '').trim();
  }

  function monthOptions(state) {
    return Object.keys(state.months || {}).sort().reverse();
  }

  function latestMonth(state) {
    return monthOptions(state)[0] || state.currentMonth || '';
  }

  function previousMonthBefore(state, target) {
    return monthOptions(state).find((month) => month < target) || latestMonth(state);
  }

  function configuredSocial(state, employee) {
    const settings = state.settings?.social || {};
    const personal = settings.personal || {};
    const bases = employee.socialBases || {};
    const pct = (base, rate) => Math.round(((Number(base) || 0) * (Number(rate) || 0) / 100 + Number.EPSILON) * 100) / 100;
    return {
      pension: pct(bases.pension, personal.pensionRate),
      medical: pct(bases.medical, personal.medicalRate),
      unemployment: pct(bases.unemployment, personal.unemploymentRate),
      housing: employee.housingEnabled ? pct(bases.housing, personal.housingRate) : 0
    };
  }

  function resetMonthlyRow(state, employee, sourceRow, standardDays) {
    const row = clone(sourceRow || {});
    const social = configuredSocial(state, employee);

    const zeroFields = [
      'leaveDays', 'personalLeaveDays', 'sickLeaveDays', 'absenceDays', 'absentDays',
      '旷工天数', 'lateCount', 'lateTimes', 'lateMinutes', 'overtimeDays',
      'compensation', 'fullAttendanceBonus', 'bonus', 'salaryAdjustment',
      'probationSalary', 'birthdayExpense', 'physicalExpense', 'taxSupplement',
      'otherIncome', 'otherDeduction', 'manualDeduction', 'manualTax', 'tax',
      'leaveDeduction', 'latePenalty', 'attendanceDeduction'
    ];
    zeroFields.forEach((field) => { row[field] = 0; });

    [
      'actualSalaryOverride', 'leaveDeductionOverride', 'latePenaltyOverride',
      'taxOverride', 'grossOverride', 'netOverride', 'manualGross', 'manualNet'
    ].forEach((field) => { delete row[field]; });

    row.attendanceDays = Number(standardDays) || 21;
    row.workDays = Number(standardDays) || 21;
    row.actualWorkDays = Number(standardDays) || 21;
    row.companyName = employeeCompany(employee);
    row.pension = Number.isFinite(Number(row.pension)) ? Number(row.pension) : social.pension;
    row.medical = Number.isFinite(Number(row.medical)) ? Number(row.medical) : social.medical;
    row.unemployment = Number.isFinite(Number(row.unemployment)) ? Number(row.unemployment) : social.unemployment;
    row.housing = Number.isFinite(Number(row.housing)) ? Number(row.housing) : social.housing;
    row.note = '';
    return row;
  }

  function roster(state) {
    const active = (state.employees || []).filter(activeEmployee);
    const inactive = (state.employees || []).filter((employee) => !activeEmployee(employee));
    const issues = [];
    active.forEach((employee) => {
      if (!employeeCompany(employee)) issues.push(`${employee.name}未设置所属公司`);
      if (!(Number(employee.baseSalary) > 0)) issues.push(`${employee.name}未设置有效工资结构`);
    });
    return { active, inactive, issues };
  }

  function groupedEmployees(employees) {
    const groups = new Map();
    employees.forEach((employee) => {
      const company = employeeCompany(employee) || '未设置公司';
      if (!groups.has(company)) groups.set(company, []);
      groups.get(company).push(employee);
    });
    return groups;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('archive-update'));
  }

  async function syncAndReload() {
    try { await window.PayrollWorkspace?.saveNow?.({ force: true }); } catch (error) {}
    try { await window.PayrollCloud?.saveNow?.({ force: true }); } catch (error) {}
    setTimeout(() => location.reload(), 300);
  }

  function installStyles() {
    if (document.getElementById('new-payroll-month-style')) return;
    const style = document.createElement('style');
    style.id = 'new-payroll-month-style';
    style.textContent = `
      .new-month-overlay{position:fixed;inset:0;z-index:100200;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px}
      .new-month-card{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 30px 90px rgba(15,23,42,.35);padding:28px;color:#0f172a}
      .new-month-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.new-month-head h2{margin:0 0 7px;font-size:23px}.new-month-head p{margin:0;color:#64748b;line-height:1.6}.new-month-close{border:0;background:#f1f5f9;width:36px;height:36px;border-radius:9px;font-size:20px;cursor:pointer}
      .new-month-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.new-month-field{display:grid;gap:7px}.new-month-field label{font-weight:700;font-size:13px}.new-month-field input,.new-month-field select{height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 11px;font:inherit}.new-month-full{grid-column:1/-1}
      .new-month-tip{margin-top:16px;padding:13px 15px;border:1px solid #cde2e7;border-radius:11px;background:#f3fafb;color:#315b67;font-size:13px;line-height:1.65}.new-month-tip strong{color:#0f647b}
      .new-month-roster{margin-top:14px;border:1px solid #dbe5ec;border-radius:12px;overflow:hidden}.new-month-roster-head{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:#f8fafc;font-weight:800}.new-month-company{padding:12px 14px;border-top:1px solid #e8eef3}.new-month-company:first-of-type{border-top:0}.new-month-company-title{display:flex;justify-content:space-between;gap:12px;font-weight:800;color:#155e70;margin-bottom:9px}.new-month-people{display:flex;flex-wrap:wrap;gap:8px}.new-month-person{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #d8e4eb;border-radius:9px;background:#fff}.new-month-person input{width:16px;height:16px}.new-month-warning{margin-top:12px;padding:11px 13px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.6}.new-month-inactive{margin-top:9px;color:#64748b;font-size:12px;line-height:1.6}
      .new-month-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.new-month-actions button{height:43px;border-radius:9px;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}.new-month-cancel{border:1px solid #cbd5e1;background:#fff;color:#334155}.new-month-submit{border:0;background:#0f879c;color:#fff}.new-month-submit:disabled{opacity:.55;cursor:not-allowed}
      .new-month-message{min-height:22px;margin-top:11px;color:#dc2626;font-size:13px}.new-month-message.ok{color:#15803d}
      .pay-date-chip,.month-integrity-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#eef7f8;color:#236274;font-size:12px;font-weight:700;white-space:nowrap}.pay-date-chip button,.month-integrity-chip button{border:0;background:transparent;color:#08758a;padding:0;cursor:pointer;font:inherit;font-weight:700}.month-integrity-chip.error{background:#fff1f2;color:#b42318}.month-integrity-chip.error button{color:#b42318}
      @media(max-width:620px){.new-month-grid{grid-template-columns:1fr}.new-month-full{grid-column:auto}.new-month-card{padding:21px}.new-month-company-title{display:block}}
    `;
    document.head.appendChild(style);
  }

  function closeModal() {
    modal?.remove();
    modal = null;
  }

  function renderRoster(container, state) {
    const { active, inactive, issues } = roster(state);
    const groups = groupedEmployees(active);
    container.innerHTML = `
      <div class="new-month-roster-head"><span>本月带入员工预览</span><span>${active.length} 人 · ${groups.size} 家公司</span></div>
      ${Array.from(groups.entries()).map(([company, employees]) => `
        <div class="new-month-company">
          <div class="new-month-company-title"><span>${esc(company)}</span><span>${employees.length} 人</span></div>
          <div class="new-month-people">
            ${employees.map((employee) => `
              <label class="new-month-person">
                <input type="checkbox" data-employee-id="${esc(employee.id)}" checked>
                <span>${esc(employee.name)}</span>
                <small>¥${Number(employee.baseSalary || 0).toLocaleString('zh-CN')}</small>
              </label>
            `).join('')}
          </div>
        </div>
      `).join('')}
      ${issues.length ? `<div class="new-month-warning"><strong>不能创建：</strong>${issues.map(esc).join('；')}</div>` : ''}
      ${inactive.length ? `<div class="new-month-inactive">未带入停用/离职员工：${inactive.map((employee) => esc(employee.name)).join('、')}</div>` : ''}
    `;
    return { active, issues };
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
          <div><h2>新建工资月份</h2><p>创建前必须确认公司和员工名单。系统带入固定工资结构与社保配置，清空当月考勤、奖金、请假、迟到、调薪和个税。</p></div>
          <button type="button" class="new-month-close">×</button>
        </div>
        <div class="new-month-grid">
          <div class="new-month-field"><label>工资所属月份</label><input type="month" id="newSalaryMonth" value="${targetMonth}"></div>
          <div class="new-month-field"><label>计划发薪日期</label><input type="date" id="newPayDate" value="${payDateForMonth(targetMonth)}"></div>
          <div class="new-month-field"><label>复制来源月份</label><select id="newSourceMonth">${months.map((month) => `<option value="${month}" ${month === sourceMonth ? 'selected' : ''}>${monthLabel(month)}</option>`).join('')}</select></div>
          <div class="new-month-field"><label>标准出勤天数</label><input type="number" min="1" max="31" step="0.5" id="newStandardDays" value="${standardDays}"></div>
          <div class="new-month-field new-month-full"><label>创建内容</label><select id="newMonthMode"><option value="copy">复制来源月工资结构和社保配置（推荐）</option><option value="blank">根据员工档案重新生成固定配置</option></select></div>
        </div>
        <div class="new-month-tip" id="newMonthTip"></div>
        <div class="new-month-roster" id="newMonthRoster"></div>
        <div class="new-month-message" id="newMonthMessage"></div>
        <div class="new-month-actions"><button type="button" class="new-month-cancel">取消</button><button type="button" class="new-month-submit">创建工资表</button></div>
      </div>`;
    document.body.appendChild(modal);

    const targetInput = modal.querySelector('#newSalaryMonth');
    const payInput = modal.querySelector('#newPayDate');
    const daysInput = modal.querySelector('#newStandardDays');
    const tip = modal.querySelector('#newMonthTip');
    const rosterBox = modal.querySelector('#newMonthRoster');
    const message = modal.querySelector('#newMonthMessage');
    const submit = modal.querySelector('.new-month-submit');
    const rosterResult = renderRoster(rosterBox, state);

    const refreshTip = () => {
      const selected = rosterBox.querySelectorAll('[data-employee-id]:checked').length;
      const companies = new Set(Array.from(rosterBox.querySelectorAll('[data-employee-id]:checked')).map((input) => {
        const employee = (state.employees || []).find((item) => item.id === input.dataset.employeeId);
        return employeeCompany(employee);
      }).filter(Boolean));
      tip.innerHTML = `<strong>${monthLabel(targetInput.value)}工资</strong>，计划于 <strong>${payInput.value || '未设置日期'}</strong> 发放；当前选择 <strong>${selected} 人 / ${companies.size} 家公司</strong>。标准出勤天数需结合中国法定节假日和调休人工确认。`;
      submit.disabled = rosterResult.issues.length > 0 || selected === 0;
    };

    targetInput.addEventListener('change', () => {
      payInput.value = payDateForMonth(targetInput.value);
      daysInput.value = weekdayCount(targetInput.value);
      refreshTip();
    });
    payInput.addEventListener('change', refreshTip);
    rosterBox.addEventListener('change', refreshTip);
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

      if (!/^\d{4}-\d{2}$/.test(target)) return void (message.textContent = '请选择工资所属月份。');
      if (nextState.months?.[target]) return void (message.textContent = `${monthLabel(target)}工资表已经存在，请直接进入该月份；如数据不完整，请使用页面上的“修复本月”功能。`);
      if (!payDate) return void (message.textContent = '请设置计划发薪日期。');

      const selectedIds = Array.from(rosterBox.querySelectorAll('[data-employee-id]:checked')).map((input) => input.dataset.employeeId);
      const employees = (nextState.employees || []).filter((employee) => selectedIds.includes(employee.id));
      if (!employees.length) return void (message.textContent = '至少选择一名员工。');

      const invalid = employees.filter((employee) => !employeeCompany(employee) || !(Number(employee.baseSalary) > 0));
      if (invalid.length) return void (message.textContent = `员工档案不完整：${invalid.map((employee) => employee.name).join('、')}`);

      const sourceData = clone(nextState.months?.[source] || {});
      const sourceRows = sourceData.rows || {};
      const rows = {};
      employees.forEach((employee) => {
        const sourceRow = mode === 'copy' ? sourceRows[employee.id] : {};
        rows[employee.id] = resetMonthlyRow(nextState, employee, sourceRow, days);
      });

      const rowCompanies = new Set(Object.values(rows).map((row) => row.companyName).filter(Boolean));
      const employeeCompanies = new Set(employees.map(employeeCompany));
      if (Object.keys(rows).length !== employees.length || rowCompanies.size !== employeeCompanies.size) {
        message.textContent = '创建前校验失败：员工或公司数量不一致，系统已停止保存。';
        return;
      }

      const newMonth = mode === 'copy' ? sourceData : {};
      newMonth.rows = rows;
      newMonth.standardWorkDays = days;
      newMonth.standardDays = days;
      newMonth.workDays = days;
      newMonth.salaryMonth = target;
      newMonth.payDate = payDate;
      newMonth.createdAt = new Date().toISOString();
      newMonth.sourceMonth = source || null;
      newMonth.rosterSnapshot = employees.map((employee) => ({
        employeeId: employee.id,
        name: employee.name,
        companyName: employeeCompany(employee),
        baseSalary: Number(employee.baseSalary) || 0
      }));

      nextState.months = nextState.months || {};
      nextState.months[target] = newMonth;
      nextState.currentMonth = target;
      nextState[PLAN_KEY] = nextState[PLAN_KEY] || {};
      nextState[PLAN_KEY][target] = {
        salaryMonth: target,
        plannedPayDate: payDate,
        sourceMonth: source || null,
        createdAt: new Date().toISOString(),
        status: 'draft',
        employeeCount: employees.length,
        companyCount: employeeCompanies.size
      };

      submit.disabled = true;
      message.classList.add('ok');
      message.textContent = `正在创建 ${monthLabel(target)}工资表：${employees.length} 人 / ${employeeCompanies.size} 家公司…`;
      saveState(nextState);
      await syncAndReload();
    });

    refreshTip();
  }

  function auditMonth(state, month) {
    const active = (state.employees || []).filter(activeEmployee);
    const rows = state.months?.[month]?.rows || {};
    const issues = [];

    active.forEach((employee) => {
      const row = rows[employee.id];
      if (!row) {
        issues.push({ employee, reason: '缺少工资记录' });
        return;
      }
      if (row.companyName !== employeeCompany(employee)) {
        issues.push({ employee, reason: '所属公司不一致' });
      }
      ['pension', 'medical', 'unemployment', 'housing'].forEach((field) => {
        if (row[field] == null || Number.isNaN(Number(row[field]))) {
          issues.push({ employee, reason: `${field}配置缺失` });
        }
      });
    });

    return {
      issues,
      activeCount: active.length,
      companyCount: new Set(active.map(employeeCompany).filter(Boolean)).size
    };
  }

  function repairMonth(month) {
    const state = read();
    const monthData = state.months?.[month];
    if (!monthData) return alert('当前月份不存在。');

    const sourceMonth = monthData.sourceMonth || previousMonthBefore(state, month);
    const sourceRows = state.months?.[sourceMonth]?.rows || {};
    const active = (state.employees || []).filter(activeEmployee);
    monthData.rows = monthData.rows || {};

    active.forEach((employee) => {
      const existing = monthData.rows[employee.id] || {};
      const sourceRow = sourceRows[employee.id] || {};
      const repaired = resetMonthlyRow(state, employee, { ...sourceRow, ...existing }, monthData.standardDays || state.settings?.standardDays || 21);
      monthData.rows[employee.id] = { ...existing, ...repaired, companyName: employeeCompany(employee) };
    });

    monthData.rosterSnapshot = active.map((employee) => ({
      employeeId: employee.id,
      name: employee.name,
      companyName: employeeCompany(employee),
      baseSalary: Number(employee.baseSalary) || 0
    }));
    saveState(state);
    syncAndReload();
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
      latest[PLAN_KEY][month] = { ...(latest[PLAN_KEY][month] || {}), salaryMonth: month, plannedPayDate: next };
      if (latest.months?.[month]) latest.months[month].payDate = next;
      saveState(latest);
      updatePayDateChip();
    });

    const audit = auditMonth(state, month);
    let integrity = document.querySelector('#monthIntegrityChip');
    if (!integrity) {
      integrity = document.createElement('span');
      integrity.id = 'monthIntegrityChip';
      integrity.className = 'month-integrity-chip';
      controls.appendChild(integrity);
    }
    integrity.classList.toggle('error', audit.issues.length > 0);
    integrity.innerHTML = audit.issues.length
      ? `本月数据不完整：${audit.issues.length} 项 <button type="button">修复本月</button>`
      : `本月数据完整：${audit.activeCount} 人 / ${audit.companyCount} 家公司`;
    integrity.querySelector('button')?.addEventListener('click', () => {
      const names = Array.from(new Set(audit.issues.map((item) => `${item.employee.name}：${item.reason}`))).join('\n');
      if (confirm(`将按员工档案和上一工资月修复当前月份：\n\n${names}\n\n继续吗？`)) repairMonth(month);
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