(() => {
  'use strict';

  const STORAGE_KEY = 'payroll_attendance_system_v1';
  let scheduled = false;
  let observer = null;

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (error) { return {}; }
  };

  const numberValue = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const money = (value) => numberValue(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function monthValue(state) {
    return state.currentMonth || document.querySelector('#monthPicker')?.value || '';
  }

  function employeeId(row) {
    return row.querySelector('[data-id]')?.dataset.id ||
      row.querySelector('[data-action]')?.dataset.id || '';
  }

  function companyFor(state, month, id) {
    const employee = (state.employees || []).find((item) => item.id === id);
    const monthRow = state.months?.[month]?.rows?.[id];
    return monthRow?.companyName || employee?.companyName || '广州超凡响应网络科技有限公司';
  }

  function cellValue(row, index) {
    const cell = row.children[index];
    if (!cell) return 0;
    const control = cell.querySelector('input,select');
    const raw = control ? (control.value !== '' ? control.value : control.placeholder) : cell.textContent;
    return numberValue(raw);
  }

  function visibleRows() {
    return Array.from(document.querySelectorAll('#payrollBody tr')).filter((row) => !row.classList.contains('company-filter-hidden'));
  }

  function setMetric(labelText, value, note) {
    const cards = Array.from(document.querySelectorAll('#payrollView .metric-card, #payrollView .card'));
    const card = cards.find((item) => item.querySelector('.metric-label')?.textContent.includes(labelText));
    if (!card) return;
    const valueElement = card.querySelector('.metric-value');
    if (valueElement) valueElement.textContent = value;
    if (note) {
      const noteElement = card.querySelector('.metric-note');
      if (noteElement) noteElement.textContent = note;
    }
  }

  function updateMetrics(rows, company) {
    const gross = rows.reduce((sum, row) => sum + cellValue(row, 17), 0);
    const deduction = rows.reduce((sum, row) => sum + cellValue(row, 25), 0);
    const tax = rows.reduce((sum, row) => sum + cellValue(row, 26), 0);
    const net = rows.reduce((sum, row) => sum + cellValue(row, 27), 0);

    setMetric('本月计薪人数', String(rows.length), `${company} · 标准出勤 21 天`);
    setMetric('税前工资合计', money(gross), '含奖金、补偿及其他收入');
    setMetric('扣除与个税', money(deduction + tax), '社保、公积金、请假、迟到及个税');
    setMetric('税后实发合计', money(net), '最终应支付金额');
  }

  function updateFooter(rows, company) {
    const table = document.querySelector('#payrollBody')?.closest('table');
    const footRow = table?.tFoot?.rows?.[0];
    if (!footRow) return;

    if (footRow.cells[0]) {
      footRow.cells[0].textContent = `合计 · ${company}`;
      footRow.cells[0].title = `当前仅统计 ${company}`;
    }

    for (let index = 8; index <= 27; index += 1) {
      const cell = footRow.cells[index];
      if (!cell) continue;
      const total = rows.reduce((sum, row) => sum + cellValue(row, index), 0);
      cell.textContent = money(total);
    }
  }

  function updateHint(select, count) {
    const control = select.closest('.field-inline');
    if (!control) return;
    let hint = document.querySelector('#companyFilterHint');
    if (!hint) {
      hint = document.createElement('span');
      hint.id = 'companyFilterHint';
      hint.className = 'company-filter-hint';
      control.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = `当前显示 ${count} 人`;
  }

  function applyFilter() {
    scheduled = false;
    const select = document.querySelector('#archiveCompany');
    const body = document.querySelector('#payrollBody');
    if (!select || !body || !select.value) return;

    const state = readState();
    const month = monthValue(state);
    const company = select.value;

    Array.from(body.querySelectorAll('tr')).forEach((row) => {
      const id = employeeId(row);
      const matches = id && companyFor(state, month, id) === company;
      row.classList.toggle('company-filter-hidden', !matches);
    });

    const rows = visibleRows();
    updateMetrics(rows, company);
    updateFooter(rows, company);
    updateHint(select, rows.length);

    const label = select.closest('.field-inline')?.querySelector('label');
    if (label) label.textContent = '核算公司（筛选）';
    select.title = '切换后只显示并统计所选公司的员工工资';
  }

  function scheduleApply(delay = 0) {
    if (scheduled && !delay) return;
    if (delay) {
      setTimeout(() => {
        scheduled = false;
        scheduleApply();
      }, delay);
      return;
    }
    scheduled = true;
    requestAnimationFrame(applyFilter);
  }

  function install() {
    if (document.getElementById('current-company-filter-style')) return;
    const style = document.createElement('style');
    style.id = 'current-company-filter-style';
    style.textContent = `
      #payrollBody tr.company-filter-hidden{display:none!important}
      .company-filter-hint{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#eef7f8;color:#236274;font-size:12px;font-weight:700;white-space:nowrap}
      tfoot td:first-child{max-width:190px;overflow:hidden;text-overflow:ellipsis}
    `;
    document.head.appendChild(style);

    document.addEventListener('change', (event) => {
      if (event.target?.id === 'archiveCompany') {
        [0, 50, 180].forEach((delay) => scheduleApply(delay));
      }
      if (event.target?.id === 'monthPicker') {
        [80, 250, 600].forEach((delay) => scheduleApply(delay));
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target?.closest('#payrollBody')) scheduleApply(30);
    });

    observer = new MutationObserver(() => scheduleApply());
    const wait = setInterval(() => {
      const body = document.querySelector('#payrollBody');
      const select = document.querySelector('#archiveCompany');
      if (body && select) {
        clearInterval(wait);
        observer.observe(body, { childList: true, subtree: true });
        scheduleApply();
      }
    }, 100);

    window.addEventListener('archive-update', () => scheduleApply(50));
  }

  install();
})();