(() => {
  'use strict';

  const STORAGE_KEY = 'payroll_attendance_system_v1';
  let modal;

  const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; } };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const num = (value) => Number(value) || 0;
  const monthLabel = (month) => /^\d{4}-\d{2}$/.test(month || '') ? `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月` : month;
  const normalizedName = (value) => String(value || '').trim().toLowerCase().replace(/[\s\-_··—–・•（）()]/g, '');

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
      .wecom-map-select{width:100%;min-width:220px;height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 9px;background:#fff;color:#0f172a;font:inherit}.wecom-map-select:focus{outline:2px solid rgba(15,135,156,.18);border-color:#0f879c}.wecom-auto{display:inline-block;margin-top:4px;color:#16835b;font-size:11px;font-weight:700}
      .wecom-file-drop{margin:18px 0;border:2px dashed #9accc0;border-radius:14px;background:#f2fbf8;padding:26px;text-align:center}.wecom-file-drop strong{display:block;font-size:17px;color:#145c48;margin-bottom:7px}.wecom-file-drop small{display:block;color:#64748b;line-height:1.6;margin-bottom:15px}.wecom-file-label{display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 18px;background:#16835b;color:#fff;border-radius:9px;font-weight:750;cursor:pointer}.wecom-file-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
      .wecom-field-input{width:78px;height:34px;border:1px solid #cbd5e1;border-radius:7px;padding:0 7px;text-align:right;font:inherit;color:#0f172a;background:#fff}.wecom-field-input:focus{outline:2px solid rgba(15,135,156,.2);border-color:#0f879c}.wecom-existing{display:block;color:#94a3b8;font-size:10px;margin-top:3px}.wecom-source{color:#64748b;font-size:11px}.wecom-secondary{background:#fff;border:1px solid #cbd5e1;color:#475569}.wecom-fields{margin-top:8px;color:#64748b;font-size:12px;line-height:1.6}
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
    const exemptRow = document.createElement('div');
    exemptRow.className = 'form-row full';
    exemptRow.innerHTML = `<label style="display:flex;align-items:center;gap:8px"><input id="employeeWecomAttendanceExempt" type="checkbox" style="width:auto">无需记录考勤</label><div class="wecom-userid-help">适用于老板、固定全职或其他不要求打卡的人员；同步时会永久跳过。</div>`;
    const statusRow = document.getElementById('employeeActive')?.closest('.form-row');
    form.insertBefore(divider, statusRow || null);
    form.insertBefore(row, statusRow || null);
    form.insertBefore(exemptRow, statusRow || null);
  }

  function populateEmployeeField() {
    const input = document.getElementById('employeeWecomUserId');
    const modalElement = document.getElementById('employeeModal');
    if (!input || !modalElement?.classList.contains('show')) return;
    const id = document.getElementById('employeeId')?.value;
    const employee = (read().employees || []).find((item) => item.id === id);
    input.value = employee?.wecomUserId || '';
    const exempt = document.getElementById('employeeWecomAttendanceExempt');
    if (exempt) exempt.checked = Boolean(employee?.wecomAttendanceExempt);
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
      const exempt = Boolean(document.getElementById('employeeWecomAttendanceExempt')?.checked);
      const state = read();
      const employee = (state.employees || []).find((item) => (id && item.id === id) || (!id && name && item.name === name));
      if (!employee) return;
      employee.wecomUserId = exempt ? '' : userId;
      employee.wecomAttendanceExempt = exempt;
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

  async function requestDiscover(month, dailyWorkHours) {
    const response = await fetch('/api/wecom-attendance', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ action: 'discover', month, dailyWorkHours })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `自动读取失败（HTTP ${response.status}）`);
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

  function suggestedCandidate(employee, candidates, used) {
    if (employee.wecomAttendanceExempt) return '__exempt__';
    const existing = String(employee.wecomUserId || '').trim();
    if (existing && candidates.some((item) => item.userId === existing)) return existing;
    const employeeName = normalizedName(employee.name);
    if (!employeeName) return '';
    const exact = candidates.filter((item) => normalizedName(item.name) === employeeName && !used.has(item.userId));
    if (exact.length === 1) return exact[0].userId;
    const partial = candidates.filter((item) => {
      const candidateName = normalizedName(item.name);
      return candidateName && !used.has(item.userId) && (candidateName.endsWith(employeeName) || employeeName.endsWith(candidateName));
    });
    return partial.length === 1 ? partial[0].userId : '';
  }

  function renderMappingPreview(state, month, employees, response) {
    const candidates = [...(response.candidates || [])];
    for (const employee of employees) {
      const userId = String(employee.wecomUserId || '').trim();
      if (userId && !candidates.some((item) => item.userId === userId)) {
        candidates.push({ userId, name: '', source: '已保存映射', hasMonthData: false });
      }
    }
    const used = new Set();
    const suggestions = new Map();
    for (const employee of employees) {
      const value = suggestedCandidate(employee, candidates, used);
      if (value) { suggestions.set(employee.id, value); if (value !== '__exempt__') used.add(value); }
    }
    const exemptCount = [...suggestions.values()].filter((value) => value === '__exempt__').length;
    const autoCount = suggestions.size - exemptCount;
    modal.innerHTML = `<div class="wecom-card" role="dialog" aria-modal="true">
      <div class="wecom-head"><div><h2>自动匹配企业微信员工</h2><p>${esc(monthLabel(month))} · 已从打卡规则读取 ${candidates.length} 个账号</p></div><button class="wecom-close">×</button></div>
      <div class="wecom-summary"><span class="wecom-chip">自动匹配 ${autoCount} 人</span><span class="wecom-chip">无需考勤 ${exemptCount} 人</span><span class="wecom-chip ${autoCount + exemptCount < employees.length ? 'warn' : ''}">待确认 ${employees.length - autoCount - exemptCount} 人</span></div>
      <div class="wecom-table-wrap"><table class="wecom-table"><thead><tr><th>工资员工</th><th>企业微信账号</th><th>当月数据</th></tr></thead><tbody>
        ${employees.map((employee) => {
          const selected = suggestions.get(employee.id) || '';
          const status = selected === '__exempt__' ? '永久跳过' : (selected && candidates.find((item) => item.userId === selected)?.hasMonthData ? '已读取' : '确认后读取');
          return `<tr><td><strong>${esc(employee.name)}</strong>${selected && selected !== '__exempt__' ? '<br><span class="wecom-auto">已按姓名自动匹配</span>' : ''}</td><td><select class="wecom-map-select" data-wecom-map="${esc(employee.id)}"><option value="">— 本次不导入 —</option><option value="__exempt__" ${selected === '__exempt__' ? 'selected' : ''}>— 无需考勤（永久跳过）—</option>${candidates.map((item) => `<option value="${esc(item.userId)}" ${item.userId === selected ? 'selected' : ''}>${esc(item.name || '未返回姓名')} · ${esc(item.userId)}</option>`).join('')}</select></td><td>${status}</td></tr>`;
        }).join('')}
      </tbody></table></div>
      ${response.warnings?.length ? `<div class="wecom-note">部分规则提示：${esc(response.warnings.join('；'))}</div>` : ''}
      <div class="wecom-note">系统只保存你确认的 UserID 映射，不会在此步修改工资。下一步还会显示出勤、请假、旷工和迟到预览，需再次确认才会写入工资表。</div>
      <div class="wecom-actions"><button class="wecom-secondary" id="wecomFileFallbackBtn">改用 Excel 导入</button><button class="wecom-cancel">取消</button><button class="wecom-confirm">确认映射并预览考勤</button></div>
    </div>`;
    modal.querySelector('.wecom-close').onclick = closeModal;
    modal.querySelector('.wecom-cancel').onclick = closeModal;
    modal.querySelector('#wecomFileFallbackBtn').onclick = () => { closeModal(); openImport(); };
    modal.querySelector('.wecom-confirm').onclick = async (event) => {
      const button = event.currentTarget;
      const selections = [...modal.querySelectorAll('[data-wecom-map]')].map((select) => ({ employeeId: select.dataset.wecomMap, userId: select.value }));
      const chosen = selections.filter((item) => item.userId && item.userId !== '__exempt__');
      const exempt = selections.filter((item) => item.userId === '__exempt__');
      if (!chosen.length && !exempt.length) return alert('请至少选择 1 名企业微信员工或设为“无需考勤”。');
      if (new Set(chosen.map((item) => item.userId)).size !== chosen.length) return alert('同一个企业微信账号不能映射给多名员工。');
      button.disabled = true;
      button.textContent = '正在读取考勤…';
      try {
        const latest = read();
        const selectedEmployees = [];
        for (const item of exempt) {
          const employee = (latest.employees || []).find((entry) => entry.id === item.employeeId);
          if (!employee) continue;
          employee.wecomUserId = '';
          employee.wecomAttendanceExempt = true;
        }
        for (const item of chosen) {
          const employee = (latest.employees || []).find((entry) => entry.id === item.employeeId);
          if (!employee) continue;
          employee.wecomUserId = item.userId;
          employee.wecomAttendanceExempt = false;
          selectedEmployees.push(employee);
        }
        save(latest);
        try { await window.PayrollWorkspace?.saveNow?.({ force: true }); } catch (_) {}
        try { await window.PayrollCloud?.saveNow?.({ force: true }); } catch (_) {}
        if (!selectedEmployees.length) {
          closeModal();
          alert('“无需考勤”已保存，以后同步将自动跳过。');
          return;
        }
        const data = await requestMonth(month, selectedEmployees, 8);
        renderPreview(latest, month, selectedEmployees, data);
      } catch (error) {
        button.disabled = false;
        button.textContent = '重试：确认映射并预览';
        alert(error.message);
      }
    };
  }

  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('payroll-xlsx-reader');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.XLSX), { once: true });
        existing.addEventListener('error', () => reject(new Error('Excel 读取组件加载失败')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = 'payroll-xlsx-reader';
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error('Excel 读取组件加载失败，请检查网络后重试'));
      document.head.appendChild(script);
    });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
        else if (char === '"') quoted = false;
        else value += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(value); value = ''; }
      else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
      else value += char;
    }
    if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
    return rows;
  }

  async function readAttendanceFile(file) {
    if (!file) throw new Error('请选择考勤文件');
    if (file.size > 15 * 1024 * 1024) throw new Error('考勤文件不能超过 15MB');
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('仅支持 .xlsx、.xls 或 .csv 文件');
    const buffer = await file.arrayBuffer();
    if (/\.csv$/i.test(file.name)) {
      let decoded = new TextDecoder('utf-8').decode(buffer);
      if ((decoded.match(/�/g) || []).length > 2) decoded = new TextDecoder('gb18030').decode(buffer);
      return window.WecomAttendanceImport.parseSheets([{ name: file.name, rows: parseCsv(decoded) }], 8);
    }
    const XLSX = await loadXlsx();
    if (!XLSX) throw new Error('Excel 读取组件未能启动');
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '', blankrows: false })
    }));
    return window.WecomAttendanceImport.parseSheets(sheets, 8);
  }

  function inputValue(value) {
    return value === null || value === undefined || value === '' ? '' : String(value);
  }

  function metricInput(employee, row, field, step = '0.01') {
    const current = row?.[field];
    return `<input class="wecom-field-input" type="number" min="0" step="${step}" data-import-field="${field}" data-import-employee="${esc(employee.id)}" value="${esc(inputValue(employee.__attendanceRecord?.[field]))}"><span class="wecom-existing">原 ${esc(inputValue(current) || '空')}</span>`;
  }

  function renderFilePreview(state, month, employees, parsed, fileName) {
    const matches = window.WecomAttendanceImport.matchEmployees(employees, parsed.records);
    const matchedRecords = new Set(matches.filter((item) => item.record).map((item) => item.record));
    const unmatchedSource = parsed.records.filter((record) => !matchedRecords.has(record));
    const locked = matches.filter((item) => item.record && archiveLocked(state, month, item.employee));
    const ambiguous = matches.filter((item) => item.ambiguous);
    const available = matches.filter((item) => item.record && !archiveLocked(state, month, item.employee));
    const monthRows = state.months?.[month]?.rows || {};
    for (const item of matches) item.employee.__attendanceRecord = item.record;
    modal.innerHTML = `<div class="wecom-card" role="dialog" aria-modal="true">
      <div class="wecom-head"><div><h2>企业微信考勤导入预览</h2><p>${esc(monthLabel(month))} · ${esc(fileName)} · 工作表“${esc(parsed.sheetName)}”</p></div><button class="wecom-close">×</button></div>
      <div class="wecom-summary"><span class="wecom-chip">已匹配 ${matches.filter((item) => item.record).length} 人</span><span class="wecom-chip ${unmatchedSource.length ? 'warn' : ''}">表中未匹配 ${unmatchedSource.length} 人</span><span class="wecom-chip ${ambiguous.length ? 'warn' : ''}">重名待处理 ${ambiguous.length} 人</span><span class="wecom-chip ${locked.length ? 'warn' : ''}">归档锁定 ${locked.length} 人</span></div>
      <div class="wecom-fields">识别字段：${esc(parsed.detectedFields.map((field) => ({ workDays:'应出勤', attendanceDays:'出勤', leaveDays:'请假', absentDays:'旷工', lateCount:'迟到次数', lateMinutes:'迟到分钟', name:'姓名', userId:'UserID' }[field] || field)).join('、'))}。空白框不会覆盖工资表原值，识别结果可以在确认前修改。</div>
      <div class="wecom-table-wrap"><table class="wecom-table"><thead><tr><th>写入</th><th>工资员工 / 匹配来源</th><th>应出勤</th><th>出勤</th><th>请假</th><th>旷工</th><th>迟到次数</th><th>迟到分钟</th></tr></thead><tbody>
        ${matches.map((item) => {
          const employee = item.employee;
          const source = item.record;
          const row = monthRows[employee.id];
          const disabled = !source || item.ambiguous || archiveLocked(state, month, employee);
          const reason = item.ambiguous ? '文件中存在重名记录' : (!source ? '文件中未找到' : (disabled ? '工资已归档' : `${item.matchType}匹配 · 第${source.sourceRow}行`));
          return `<tr class="${!source || item.ambiguous ? 'wecom-missing' : ''}"><td><input type="checkbox" data-import-check="${esc(employee.id)}" ${disabled ? 'disabled' : 'checked'}></td><td><strong>${esc(employee.name)}</strong><br><span class="wecom-source">${esc(source?.name || source?.userId || reason)} · ${esc(reason)}</span></td><td>${metricInput(employee,row,'workDays')}</td><td>${metricInput(employee,row,'attendanceDays')}</td><td>${metricInput(employee,row,'leaveDays')}</td><td>${metricInput(employee,row,'absentDays')}</td><td>${metricInput(employee,row,'lateCount','1')}</td><td>${metricInput(employee,row,'lateMinutes','1')}</td></tr>`;
        }).join('')}
      </tbody></table></div>
      ${unmatchedSource.length ? `<div class="wecom-note">表中未匹配到工资员工：${esc(unmatchedSource.slice(0, 12).map((record) => record.name || record.userId).join('、'))}${unmatchedSource.length > 12 ? '等' : ''}。这些记录不会写入。</div>` : ''}
      <div class="wecom-note">文件只在当前浏览器中读取，不会上传原始 Excel。确认后仅把勾选员工的非空考勤数字保存到 ${esc(monthLabel(month))}；已归档工资不会被修改。</div>
      <div class="wecom-actions"><button class="wecom-cancel">取消</button><button class="wecom-confirm" ${available.length ? '' : 'disabled'}>确认写入当月工资表</button></div>
    </div>`;
    for (const item of matches) delete item.employee.__attendanceRecord;
    modal.querySelector('.wecom-close').onclick = closeModal;
    modal.querySelector('.wecom-cancel').onclick = closeModal;
    modal.querySelector('.wecom-confirm').onclick = async () => {
      const latest = read();
      const monthData = latest.months?.[month];
      if (!monthData) return alert('当前工资月份不存在，请刷新后重试。');
      const selected = [...modal.querySelectorAll('[data-import-check]:checked')].map((input) => input.dataset.importCheck);
      const fields = ['workDays', 'attendanceDays', 'leaveDays', 'absentDays', 'lateCount', 'lateMinutes'];
      for (const item of matches.filter((entry) => selected.includes(entry.employee.id))) {
        if (!item.record || archiveLocked(latest, month, item.employee)) continue;
        const row = monthData.rows?.[item.employee.id];
        if (!row) continue;
        for (const field of fields) {
          const input = modal.querySelector(`[data-import-employee="${CSS.escape(item.employee.id)}"][data-import-field="${field}"]`);
          if (!input || input.value.trim() === '') continue;
          const value = Number(input.value);
          if (!Number.isFinite(value) || value < 0) continue;
          row[field] = ['lateCount', 'lateMinutes'].includes(field) ? Math.round(value) : Math.round((value + Number.EPSILON) * 100) / 100;
        }
        row.wecomAttendance = { importedAt: new Date().toISOString(), month, source: 'file', fileName, sheetName: parsed.sheetName, sourceRow: item.record.sourceRow };
      }
      latest.wecomAttendanceImports = latest.wecomAttendanceImports || [];
      latest.wecomAttendanceImports.push({ month, importedAt: new Date().toISOString(), employeeIds: selected, source: 'file', fileName, sheetName: parsed.sheetName, detectedFields: parsed.detectedFields });
      save(latest);
      try { await window.PayrollWorkspace?.saveNow?.({ force: true }); } catch (_) {}
      try { await window.PayrollCloud?.saveNow?.({ force: true }); } catch (_) {}
      closeModal();
      location.reload();
    };
  }

  function openImport() {
    installStyles();
    const state = read();
    const month = state.currentMonth;
    const monthRows = state.months?.[month]?.rows || {};
    const employees = (state.employees || []).filter((employee) => monthRows[employee.id]);
    modal = document.createElement('div');
    modal.className = 'wecom-overlay';
    modal.innerHTML = `<div class="wecom-card" role="dialog" aria-modal="true">
      <div class="wecom-head"><div><h2>导入企业微信考勤表</h2><p>${esc(monthLabel(month))} · 当前工资表 ${employees.length} 人</p></div><button class="wecom-close">×</button></div>
      <div class="wecom-file-drop"><strong>选择企业微信导出的月度考勤汇总</strong><small>支持 Excel（.xlsx、.xls）和 CSV，选择后先预览，不会立即修改工资。</small><label class="wecom-file-label" for="wecomAttendanceFile">选择考勤文件</label><input class="wecom-file-input" id="wecomAttendanceFile" type="file" accept=".xlsx,.xls,.csv"></div>
      <div class="wecom-note">建议从企业微信管理后台导出“考勤月报／月度汇总”。系统会优先按企业微信 UserID 匹配，没有 UserID 时按唯一姓名匹配。原始文件只在浏览器本地解析。</div>
      <div class="wecom-actions"><button class="wecom-secondary" id="wecomApiAdvancedBtn">高级：尝试 API 自动同步</button><button class="wecom-cancel">取消</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.wecom-close').onclick = closeModal;
    modal.querySelector('.wecom-cancel').onclick = closeModal;
    modal.querySelector('#wecomApiAdvancedBtn').onclick = () => { closeModal(); openSync(); };
    modal.querySelector('#wecomAttendanceFile').onchange = async (event) => {
      const file = event.target.files?.[0];
      const note = modal.querySelector('.wecom-note');
      if (!file) return;
      note.textContent = `正在读取 ${file.name}，请稍候…`;
      try {
        const parsed = await readAttendanceFile(file);
        renderFilePreview(state, month, employees, parsed, file.name);
      } catch (error) {
        note.outerHTML = `<div class="wecom-error"><strong>无法识别考勤文件</strong><br>${esc(error.message)}<br><small>请重新导出企业微信“月度汇总”，不要上传截图或 PDF。</small></div>`;
      }
    };
  }

  async function openSync() {
    installStyles();
    const state = read();
    const month = state.currentMonth;
    const monthRows = state.months?.[month]?.rows || {};
    const allMonthEmployees = (state.employees || []).filter((employee) => monthRows[employee.id]);
    const exemptEmployees = allMonthEmployees.filter((employee) => employee.wecomAttendanceExempt);
    const monthEmployees = allMonthEmployees.filter((employee) => !employee.wecomAttendanceExempt);
    const mapped = monthEmployees.filter((employee) => String(employee.wecomUserId || '').trim());
    const unmapped = monthEmployees.filter((employee) => !String(employee.wecomUserId || '').trim());
    modal = document.createElement('div');
    modal.className = 'wecom-overlay';
    modal.innerHTML = `<div class="wecom-card"><div class="wecom-head"><div><h2>正在读取企业微信考勤</h2><p>${esc(monthLabel(month))} · 已配置 ${mapped.length} 人，未配置 ${unmapped.length} 人，无需考勤 ${exemptEmployees.length} 人</p></div><button class="wecom-close">×</button></div><div class="wecom-note">正在通过安全服务端连接企业微信，请稍候…</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.wecom-close').onclick = closeModal;
    try {
      if (unmapped.length) {
        const data = await requestDiscover(month, 8);
        renderMappingPreview(state, month, monthEmployees, data);
        return;
      }
      const data = await requestMonth(month, mapped, 8);
      renderPreview(state, month, mapped, data);
    } catch (error) {
      modal.querySelector('.wecom-note').outerHTML = `<div class="wecom-error"><strong>无法同步考勤</strong><br>${esc(error.message)}<br><button class="wecom-secondary" id="wecomErrorFileBtn" style="margin-top:12px;height:38px;padding:0 12px;border-radius:8px">改用 Excel 导入</button></div>`;
      modal.querySelector('#wecomErrorFileBtn').onclick = () => { closeModal(); openImport(); };
    }
  }

  function addAttendanceButton() {
    const toolbar = document.querySelector('#payrollView .page-heading .toolbar');
    if (!toolbar || document.getElementById('importWecomAttendanceBtn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn wecom-sync-btn';
    button.id = 'importWecomAttendanceBtn';
    button.textContent = '同步企业微信考勤';
    button.onclick = openSync;
    toolbar.insertBefore(button, document.getElementById('exportCsvBtn'));
  }

  installStyles();
  bindEmployeeField();
  addAttendanceButton();
})();
