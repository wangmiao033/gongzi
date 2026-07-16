(() => {
  'use strict';
  const KEY = 'payroll_attendance_system_v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const moneyValue = (text) => Number(String(text || '').replace(/[^0-9.-]/g, '')) || 0;
  const money = (v) => Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let currentFilter = '全部公司';
  let selectedSlipCompany = '';
  let scheduled = false;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (error) { return {}; }
  }

  function selectedMonth() {
    return $('#historyMonth')?.value || '';
  }

  function companyFor(id) {
    const state = read();
    const month = selectedMonth();
    const employee = (state.employees || []).find((item) => item.id === id);
    const row = state.months?.[month]?.rows?.[id];
    return row?.companyName || employee?.companyName || '未设置公司';
  }

  function ensureFilter() {
    const toolbar = $('#historyView .page-heading .toolbar');
    if (!toolbar || $('#historyCompany')) return;
    const wrap = document.createElement('div');
    wrap.className = 'field-inline';
    wrap.innerHTML = '<label>所属公司</label><select id="historyCompany"></select>';
    const monthField = toolbar.querySelector('.field-inline');
    if (monthField) monthField.insertAdjacentElement('afterend', wrap);
    else toolbar.prepend(wrap);
    $('#historyCompany').addEventListener('change', (event) => {
      currentFilter = event.target.value;
      scheduleDecorate();
    });
  }

  function updateOptions() {
    const select = $('#historyCompany');
    if (!select) return;
    const state = read();
    const month = selectedMonth();
    const companies = [...new Set(Object.keys(state.months?.[month]?.rows || {}).map((id) => {
      const employee = (state.employees || []).find((item) => item.id === id);
      const row = state.months?.[month]?.rows?.[id];
      return row?.companyName || employee?.companyName || '未设置公司';
    }))];
    const options = ['全部公司', ...companies];
    if (!options.includes(currentFilter)) currentFilter = '全部公司';
    const html = options.map((name) => `<option value="${name.replace(/"/g, '&quot;')}" ${name === currentFilter ? 'selected' : ''}>${name}</option>`).join('');
    if (select.innerHTML !== html) select.innerHTML = html;
    if (select.value !== currentFilter) select.value = currentFilter;
  }

  function ensureCompanyColumn() {
    const table = $('#historyDetail')?.closest('table');
    if (!table) return;
    const headerRow = table.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('[data-company-header]')) {
      const th = document.createElement('th');
      th.dataset.companyHeader = '1';
      th.textContent = '所属公司';
      headerRow.prepend(th);
      table.style.minWidth = '1260px';
    }
  }

  function decorateRows() {
    $$('#historyDetail tr').forEach((tr) => {
      const button = tr.querySelector('[data-hslip]');
      if (!button) return;
      const company = companyFor(button.dataset.hslip);
      let cell = tr.querySelector('[data-company-cell]');
      if (!cell) {
        cell = document.createElement('td');
        cell.dataset.companyCell = '1';
        tr.prepend(cell);
      }
      const html = `<strong>${company}</strong>`;
      if (cell.innerHTML !== html) cell.innerHTML = html;
      if (tr.dataset.companyName !== company) tr.dataset.companyName = company;
      const display = currentFilter === '全部公司' || currentFilter === company ? '' : 'none';
      if (tr.style.display !== display) tr.style.display = display;
    });
  }

  function updateFoot() {
    const foot = $('#historyFoot');
    if (!foot) return;
    const visible = $$('#historyDetail tr').filter((tr) => tr.style.display !== 'none' && tr.querySelector('[data-hslip]'));
    let html;
    if (!visible.length) {
      html = '<tr><td colspan="11" class="empty">该公司在所选月份没有工资记录</td></tr>';
    } else {
      const totals = { gross: 0, social: 0, other: 0, tax: 0, net: 0 };
      visible.forEach((tr) => {
        const cells = tr.children;
        totals.gross += moneyValue(cells[5]?.textContent);
        totals.social += moneyValue(cells[6]?.textContent);
        totals.other += moneyValue(cells[7]?.textContent);
        totals.tax += moneyValue(cells[8]?.textContent);
        totals.net += moneyValue(cells[9]?.textContent);
      });
      html = `<tr><td>合计</td><td>${currentFilter}</td><td>${visible.length} 人</td><td colspan="2">-</td><td>¥ ${money(totals.gross)}</td><td>¥ ${money(totals.social)}</td><td>¥ ${money(totals.other)}</td><td>¥ ${money(totals.tax)}</td><td>¥ ${money(totals.net)}</td><td>-</td></tr>`;
    }
    if (foot.innerHTML !== html) foot.innerHTML = html;
  }

  function updateTitle() {
    const title = $('#historyTitle');
    if (!title) return;
    const monthText = $('#historyMonth option:checked')?.textContent || '历史';
    const text = `${monthText}${currentFilter === '全部公司' ? '' : ` · ${currentFilter}`}工资明细`;
    if (title.textContent !== text) title.textContent = text;
  }

  function decorate() {
    scheduled = false;
    if (!$('#historyView')) return;
    ensureFilter();
    updateOptions();
    ensureCompanyColumn();
    decorateRows();
    updateFoot();
    updateTitle();
  }

  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(decorate);
  }

  document.addEventListener('click', (event) => {
    const slip = event.target.closest('[data-hslip]');
    if (slip) {
      selectedSlipCompany = companyFor(slip.dataset.hslip);
      setTimeout(() => {
        const title = $('#slipModal .slip-title');
        if (title && selectedSlipCompany) title.textContent = selectedSlipCompany;
      }, 30);
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target?.id === 'historyMonth') {
      currentFilter = '全部公司';
      setTimeout(scheduleDecorate, 40);
    }
  });

  const observer = new MutationObserver(scheduleDecorate);
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const view = $('#historyView');
    if (view) {
      clearInterval(timer);
      observer.observe(view, { childList: true, subtree: true });
      scheduleDecorate();
    } else if (attempts > 60) {
      clearInterval(timer);
    }
  }, 100);
})();
