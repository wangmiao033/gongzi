(() => {
  'use strict';

  const STORAGE_KEY = 'payroll_attendance_system_v1';
  let modal;

  const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; } };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const num = (value) => Number(value) || 0;
  const monthLabel = (month) => /^\d{4}-\d{2}$/.test(month || '') ? `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月` : month;

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('archive-update'));
  }

  function installStyles() {
    if (document.getElementById('wecom-attendance-styles')) return;
    const style = document.createElement('style');
    style.id = 'wecom-attendance-styles';
    style.textContent = `
      .wecom-sync-btn{background:#16835b!important;color:#fff!important;border-color:#16835b!important}.wecom-sync-btn:disabled{opacity:.55;cursor:not-allowed}
      .wecom-overlay{position:fixed;inset:0;z-index:100400;background:rgba(15,23,42,.64);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
      .wecom-card{width:min(980px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 30px 90px rgba(15,23,42,.38);padding:26px;color:#0f172a}
      .wecom-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.wecom-head h2{margin:0 0 7px;font-size:23px}.wecom-head p{margin:0;color:#64748b;line-height:1.6}.wecom-close{border:0;background:#f1f5f9;width:36px;height:36px;border-radius:9px;font-size:20px;cursor:pointer}
      .wecom-summary{display:flex;flex-wrap:wrap;gap:9px;margin:17px 0}.wecom-chip{padding:7px 10px;border-radius:999px;background:#eff8f5;color:#16634b;font-size:12px;font-weight:750}.wecom-chip.warn{background:#fff7ed;color:#9a3412}
      .wecom-table-wrap{overflow:auto;border:1px solid #dce5eb;border-radius:12px}.wecom-table{width:100%;border-collapse:collapse;min-width:840px}.wecom-table th,.wecom-table td{padding:10px 11px;border-bottom:1px solid #e7edf2;text-align:right;white-space:nowrap;font-size:13px}.wecom-table th{background:#f8fafc;color:#475569}.wecom-table th:first-child,.wecom-table td:first-child,.wecom-table th:nth-child(2),.wecom-table td:nth-child(2){text-align:left}.wecom-table tr:last-child td{border-bottom:0}.wecom-missing{color:#b42318;background:#fff8f8}.wecom-note{margin-top:13px;padding:12px 14px;border-radius:10px;background:#f8fafc;color:#64748b;font-size:13px;line-height:1.65}.wecom-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.wecom-actions button{height:42px;border-radius:9px;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}.wecom-cancel{background:#fff;border:1px solid #cbd5e1}.wecom-confirm{background:#0f879c;color:#fff;border:0}.wecom-confirm:disabled{opacity:.5}.wecom-error{padding:16px;border:1px solid #fecaca;background:#fff1f2;color:#9f1239;border-radius:11px;line-height:1.65}
      .wecom-userid-help{font-size:12px;color:#64748b;margin-top:5px;line-height:1.5}
    `;
    document.head.appendChild(style);
  }

  function addEmployeeField() {
    const form = document.getElementById('employeeForm');
    if (!form || document.getElementById('employeeWecomUserId')) return;
    const divider = document.createElement('div');
    divider.className = 'section-divider';
    divider.textContent = '企业微信考勤';
    const row = document.createElement('div');
    row.className = 'form-row full';
    row.innerHTML = `<label>企业微信 UserID</label><input id="employeeWecomUserId" autocomplete="off" placeholder="例如：WangMiao"><div class="wecom-userid-help">必须与企业微信管理后台的账号 UserID 完全一致，用于考勤数据映射；不是姓名、手机号或邮箱。</div>`;
    const statusRow = document.getElementById('employeeActive')?.closest('.form-row');
    form.insertBefore(divider, statusRow || null);
    form.insertBefore(row, statusRow || null);
  }

  function populateEmployeeField() {
    const input = document.getElementById('employeeWecomUserId');
    const modalElement = document.getElementById('employeeModal');
    if (!input || !modalElement?.classList.contains('show')) return;
    const id = document.getElementById('employeeId')?.value;
    const employee = (read().employees || []).find((item) => item.id === id);
    input.value = employee?.wecomUserId || '';
  }

  function bindEmployeeField() {
    addEmployeeField();
    const employeeModal = document.getElementById('employeeModal');
    if (employeeModal) new MutationObserver(populateEmployeeField).observe(employeeModal, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', (event) => {
      if (event.target.closest('#addEmployeeBtn,[data-employee-action="edit"]')) setTimeout(populateEmployeeField, 0);
    }, true);
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#saveEmployeeBtn')) return;
      const id = document.getElementById('employeeId')?.value;
      const name = document.getElementById('employeeName')?.value.trim();
      const userId = document.getElementById('employeeWecomUserId')?.value.trim() || '';
      const state = read();
      const employee = (state.employees || []).find((item) => (id && item.id === id) || (!id && name && item.name === name));
      if (!employee) return;
      employee.wecomUserId = userId;
      save(state);
    });
  }

  async function authHeaders() {
    const client = window.PayrollCloud?.getClient?.();
    if (!client) throw new Error('云端登录组件尚未就绪');
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('登录已失效，请重新登录');
    return { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` };
  }

  async function requestMonth(month, employees, dailyWorkHours) {
    const response = await fetch('/api/wecom-attendance', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ action: 'month', month, dailyWorkHours, userIds: employees.map((item) => item.wecomUserId) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `同步失败（HTTP ${response.status}）`);
    return data;
  }

  function closeModal() { modal?.remove(); modal = null; }

  function archiveLocked(state, month, employee) {
    const archive = state.payrollArchives?.[`${month}::${employee.companyName || ''}`];
    return ['archived', 'paid'].includes(archive?.status);
  }

  function renderPreview(state, month, employees, response) {
    const byUserId = new Map((response.records || []).map((item) => [item.userId, item]));
    const matched = employees.filter((employee) => byUserId.has(employee.wecomUserId));
    const missing = employees.filter((employee) => !byUserId.has(employee.wecomUserId));
    const locked = matched.filter((employee) => archiveLocked(state, month, employee));
    modal.innerHTML = `<div class="wecom-card" role="dialog" aria-modal="true">
      <div class="wecom-head"><div><h2>企业微信考勤预览</h2><p>${esc(monthLabel(month))} · 确认后才会写入工资表</p></div><button class="wecom-close">×</button></div>
      <div class="wecom-summary"><span class="wecom-chip">已映射 ${matched.length} 人</span><span class="wecom-chip ${missing.length ? 'warn' : ''}">未返回 ${missing.length} 人</span><span class="wecom-chip ${locked.length ? 'warn' : ''}">已归档锁定 ${locked.length} 人</span></div>
      <div class="wecom-table-wrap"><table class="wecom-table"><thead><tr><th>写入</th><th>员工 / UserID</th><th>企业微信姓名</th><th>应出勤</th><th>建议出勤</th><th>请假</th><th>旷工</th><th>迟到次数</th><th>迟到分钟</th></tr></thead><tbody>
        ${employees.map((employee) => { const row = byUserId.get(employee.wecomUserId); const disabled = !row || archiveLocked(state, month, employee); return `<tr class="${!row ? 'wecom-missing' : ''}"><td><input type="checkbox" data-wecom-employee="${esc(employee.id)}" ${disabled ? 'disabled' : 'checked'}></td><td><strong>${esc(employee.name)}</strong><br><small>${esc(employee.wecomUserId)}</small></td><td>${esc(row?.name || '企业微信未返回')}</td><td>${row ? row.workDays : '-'}</td><td>${row ? row.attendanceDays : '-'}</td><td>${row ? row.leaveDays : '-'}</td><td>${row ? row.absentDays : '-'}</td><td>${row ? row.lateCount : '-'}</td><td>${row ? row.lateMinutes : '-'}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="wecom-note">建议出勤天数 = 企业微信应出勤天数 − 请假天数 − 旷工天数；迟到仍计为出勤。小时制请假按每天 8 小时折算。未返回数据或工资已归档的员工不会写入。请先核对预览，再确认导入。</div>
      <div class="wecom-actions"><button class="wecom-cancel">取消</button><button class="wecom-confirm" ${matched.length === locked.length ? 'disabled' : ''}>确认写入当月工资表</button></div>
    </div>`;
    modal.querySelector('.wecom-close').onclick = closeModal;
    modal.querySelector('.wecom-cancel').onclick = closeModal;
    modal.querySelector('.wecom-confirm').onclick = async () => {
      const latest = read();
      const monthData = latest.months?.[month];
      if (!monthData) return alert('当前工资月份不存在，请刷新后重试。');
      const selected = [...modal.querySelectorAll('[data-wecom-employee]:checked')].map((input) => input.dataset.wecomEmployee);
      for (const employee of employees.filter((item) => selected.includes(item.id))) {
        if (archiveLocked(latest, month, employee)) continue;
        const source = byUserId.get(employee.wecomUserId);
        const row = monthData.rows?.[employee.id];
        if (!source || !row) continue;
        row.attendanceDays = source.attendanceDays;
        row.leaveDays = source.leaveDays;
        row.absentDays = source.absentDays;
        row.lateCount = source.lateCount;
        row.lateMinutes = source.lateMinutes;
        row.wecomAttendance = { syncedAt: new Date().toISOString(), month, userId: source.userId, source: source.source };
      }
      latest.wecomAttendanceImports = latest.wecomAttendanceImports || [];
      latest.wecomAttendanceImports.push({ month, importedAt: new Date().toISOString(), employeeIds: selected });
      save(latest);
      try { await window.PayrollWorkspace?.saveNow?.({ force: true }); } catch (_) {}
      try { await window.PayrollCloud?.saveNow?.({ force: true }); } catch (_) {}
      closeModal();
      location.reload();
    };
  }

  async function openSync() {
    installStyles();
    const state = read();
    const month = state.currentMonth;
    const monthRows = state.months?.[month]?.rows || {};
    const monthEmployees = (state.employees || []).filter((employee) => monthRows[employee.id]);
    const mapped = monthEmployees.filter((employee) => String(employee.wecomUserId || '').trim());
    const unmapped = monthEmployees.filter((employee) => !String(employee.wecomUserId || '').trim());
    modal = document.createElement('div');
    modal.className = 'wecom-overlay';
    modal.innerHTML = `<div class="wecom-card"><div class="wecom-head"><div><h2>正在读取企业微信考勤</h2><p>${esc(monthLabel(month))} · 已配置 ${mapped.length} 人，未配置 ${unmapped.length} 人</p></div><button class="wecom-close">×</button></div><div class="wecom-note">正在通过安全服务端连接企业微信，请稍候…</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.wecom-close').onclick = closeModal;
    if (!mapped.length) {
      modal.querySelector('.wecom-note').outerHTML = '<div class="wecom-error">当前月份没有员工配置企业微信 UserID。请先到“员工档案 → 编辑”填写映射。</div>';
      return;
    }
    try {
      const data = await requestMonth(month, mapped, 8);
      renderPreview(state, month, mapped, data);
    } catch (error) {
      modal.querySelector('.wecom-note').outerHTML = `<div class="wecom-error"><strong>无法同步考勤</strong><br>${esc(error.message)}</div>`;
    }
  }

  function addSyncButton() {
    const toolbar = document.querySelector('#payrollView .page-heading .toolbar');
    if (!toolbar || document.getElementById('syncWecomAttendanceBtn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn wecom-sync-btn';
    button.id = 'syncWecomAttendanceBtn';
    button.textContent = '同步企业微信考勤';
    button.onclick = openSync;
    toolbar.insertBefore(button, document.getElementById('exportCsvBtn'));
  }

  installStyles();
  bindEmployeeField();
  addSyncButton();
})();
