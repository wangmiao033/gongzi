(() => {
  'use strict';
  const KEY = 'payroll_attendance_system_v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const moneyValue = (text) => Number(String(text || '').replace(/[^0-9.-]/g, '')) || 0;
  const money = (v) => Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let currentFilter = '全部公司';
  let selectedSlipCompany = '';

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
      decorate();
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
    select.innerHTML = options.map((name) => `<option value="${name.replace(/"/g, '&quot;')}" ${name === currentFilter ? 'selected' : ''}>${name}</option>`).join('');
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
    const body = $('#historyDetail');
    if (!body) return;
    $$('#historyDetail tr').forEach((tr) => {
      const button = tr.querySelector('[data-hslip]');
      if (!button) return;
      const id = button.dataset.hslip;
      const company = companyFor(id);
      let cell = tr.querySelector('[data-company-cell]');
      if (!cell) {
        cell = document.createElement('td');
        cell.dataset.companyCell = '1';
        tr.prepend(cell);
      }
      cell.innerHTML = `<strong>${company}</strong>`;
      tr.dataset.companyName = company;
      tr.style.display = currentFilter === '全部公司' || currentFilter === company ? '' : 'none';
    });
  }

  function updateFoot() {
    const foot = $('#historyFoot');
    if (!foot) return;
    const visible = $$('#historyDetail tr').filter((tr) => tr.style.display !== 'none' && tr.querySelector('[data-hslip]'));
    if (!visible.length) {
      foot.innerHTML = '<tr><td colspan="11" class="empty">该公司在所选月份没有工资记录</td></tr>';
      return;
    }
    const totals = { gross: 0, social: 0, other: 0, tax: 0, net: 0 };
    visible.forEach((tr) => {
      const cells = tr.children;
      totals.gross += moneyValue(cells[5]?.textContent);
      totals.social += moneyValue(cells[6]?.textContent);
      totals.other += moneyValue(cells[7]?.textContent);
      totals.tax += moneyValue(cells[8]?.textContent);
      totals.net += moneyValue(cells[9]?.textContent);
    });
    foot.innerHTML = `<tr><td>合计</td><td>${currentFilter === '全部公司' ? '全部公司' : currentFilter}</td><td>${visible.length} 人</td><td colspan="2">-</td><td>¥ ${money(totals.gross)}</td><td>¥ ${money(totals.social)}</td><td>¥ ${money(totals.other)}</td><td>¥ ${money(totals.tax)}</td><td>¥ ${money(totals.net)}</td><td>-</td></tr>`;
  }

  function updateTitle() {
    const title = $('#historyTitle');
    if (!title) return;
    const monthText = $('#historyMonth option:checked')?.textContent || '历史';
    title.textContent = `${monthText}${currentFilter === '全部公司' ? '' : ` · ${currentFilter}`}工资明细`;
  }

  function decorate() {
    if (!$('#historyView')) return;
    ensureFilter();
    updateOptions();
    ensureCompanyColumn();
    decorateRows();
    updateFoot();
    updateTitle();
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
      setTimeout(decorate, 40);
    }
  });

  const observer = new MutationObserver(() => decorate());
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const view = $('#historyView');
    if (view) {
      clearInterval(timer);
      observer.observe(view, { childList: true, subtree: true });
      decorate();
    } else if (attempts > 60) {
      clearInterval(timer);
    }
  }, 100);
})();
