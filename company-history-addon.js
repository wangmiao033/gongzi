(() => {
  'use strict';

  const STORAGE_KEY = 'payroll_attendance_system_v1';
  const TARGET_COMPANY = '广州熊动科技有限公司';
  let scheduled = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function selectedMonth() {
    return $('#historyMonth')?.value || readState().currentMonth || '';
  }

  function money(value) {
    return Number(value || 0).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function targetArchives(state) {
    return Object.values(state.payrollArchives || {}).filter((item) => item?.company === TARGET_COMPANY);
  }

  function companyForEmployee(state, month, employeeId) {
    const monthRow = state.months?.[month]?.rows?.[employeeId];
    if (monthRow?.companyName) return monthRow.companyName;

    const archive = state.payrollArchives?.[`${month}::${TARGET_COMPANY}`];
    if (archive?.rows?.some((row) => row.employeeId === employeeId)) return TARGET_COMPANY;

    const employee = (state.employees || []).find((item) => item.id === employeeId);
    return employee?.companyName || '未设置公司';
  }

  function ensureFixedCompanyField() {
    const toolbar = $('#historyView .page-heading .toolbar');
    if (!toolbar) return null;

    let select = $('#historyCompany');
    let wrap = select?.closest('.field-inline');

    if (!select) {
      wrap = document.createElement('div');
      wrap.className = 'field-inline history-fixed-company-field';
      wrap.innerHTML = `<label>所属公司</label><select id="historyCompany" aria-hidden="true"><option value="${TARGET_COMPANY}">${TARGET_COMPANY}</option></select><span class="history-fixed-company-badge">${TARGET_COMPANY}</span>`;
      const monthField = toolbar.querySelector('.field-inline');
      if (monthField) monthField.insertAdjacentElement('afterend', wrap);
      else toolbar.prepend(wrap);
      select = $('#historyCompany');
    }

    if (select) {
      const expected = `<option value="${TARGET_COMPANY}">${TARGET_COMPANY}</option>`;
      if (select.innerHTML !== expected) select.innerHTML = expected;
      select.value = TARGET_COMPANY;
      select.hidden = true;
      select.setAttribute('aria-hidden', 'true');
    }

    if (wrap) {
      wrap.classList.add('history-fixed-company-field');
      const label = wrap.querySelector('label');
      if (label) label.textContent = '所属公司';
      let badge = wrap.querySelector('.history-fixed-company-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'history-fixed-company-badge';
        wrap.appendChild(badge);
      }
      badge.textContent = TARGET_COMPANY;
    }

    return select;
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

  function filterDetailRows(state, month) {
    $$('#historyDetail tr').forEach((row) => {
      const slip = row.querySelector('[data-hslip]');
      if (!slip) return;
      const company = companyForEmployee(state, month, slip.dataset.hslip);

      let cell = row.querySelector('[data-company-cell]');
      if (!cell) {
        cell = document.createElement('td');
        cell.dataset.companyCell = '1';
        row.prepend(cell);
      }
      cell.innerHTML = `<strong>${company}</strong>`;
      row.dataset.companyName = company;
      row.style.display = company === TARGET_COMPANY ? '' : 'none';
    });
  }

  function filterMonthlySummary() {
    $$('#historySummary tr').forEach((row) => {
      const company = row.cells?.[1]?.textContent?.trim() || '';
      if (company) row.style.display = company === TARGET_COMPANY ? '' : 'none';
    });
  }

  function filterArchiveRecords() {
    $$('#archiveHistoryContent .archive-record').forEach((record) => {
      const company = record.querySelector('.archive-record-head strong')?.textContent?.trim() || '';
      record.style.display = company === TARGET_COMPANY ? '' : 'none';
    });
  }

  function updateCards(state) {
    const archives = targetArchives(state);
    const months = new Set(archives.map((item) => item.month).filter(Boolean));
    const totals = archives.reduce((sum, item) => {
      const value = item.totals || {};
      sum.gross += Number(value.gross || 0);
      sum.deduction += Number(value.social || 0) + Number(value.housing || 0) + Number(value.otherDeductions || 0) + Number(value.tax || 0);
      sum.net += Number(value.net || 0);
      return sum;
    }, { gross: 0, deduction: 0, net: 0 });

    const cards = $$('#historyView .metric-card, #historyView .card');
    const setCard = (labelText, value) => {
      const card = cards.find((item) => item.querySelector('.metric-label')?.textContent.includes(labelText));
      const valueElement = card?.querySelector('.metric-value');
      if (valueElement) valueElement.textContent = value;
    };

    setCard('已保存月份', String(months.size));
    setCard('累计税前工资', money(totals.gross));
    setCard('累计扣除与个税', money(totals.deduction));
    setCard('累计实发工资', money(totals.net));
  }

  function updateTitle() {
    const title = $('#historyTitle');
    if (!title) return;
    const monthText = $('#historyMonth option:checked')?.textContent || selectedMonth() || '历史';
    title.textContent = `${monthText} · ${TARGET_COMPANY}工资明细`;
  }

  function installStyles() {
    if ($('#history-fixed-company-style')) return;
    const style = document.createElement('style');
    style.id = 'history-fixed-company-style';
    style.textContent = `
      .history-fixed-company-field{gap:8px}
      .history-fixed-company-badge{display:inline-flex;align-items:center;min-height:36px;padding:7px 12px;border:1px solid #b8dbe4;border-radius:9px;background:#eef7f8;color:#155e70;font-weight:700;white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function apply() {
    scheduled = false;
    if (!$('#historyView')) return;

    installStyles();
    ensureFixedCompanyField();

    const state = readState();
    const month = selectedMonth();
    ensureCompanyColumn();
    filterDetailRows(state, month);
    filterMonthlySummary();
    filterArchiveRecords();
    updateCards(state);
    updateTitle();
  }

  function scheduleApply(delay = 0) {
    if (delay) {
      setTimeout(scheduleApply, delay);
      return;
    }
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  document.addEventListener('change', (event) => {
    if (event.target?.id === 'historyMonth' || event.target?.id === 'historyStatus') {
      [30, 120, 350].forEach(scheduleApply);
    }
  });

  document.addEventListener('click', (event) => {
    const slip = event.target.closest('[data-hslip]');
    if (slip) {
      setTimeout(() => {
        const title = $('#slipModal .slip-title');
        if (title) title.textContent = TARGET_COMPANY;
      }, 30);
    }
    if (event.target.closest('.nav-btn,[data-view],[data-hmonth]')) {
      [80, 250, 600].forEach(scheduleApply);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleApply());
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const view = $('#historyView');
    if (view) {
      clearInterval(timer);
      observer.observe(view, { childList: true, subtree: true });
      scheduleApply();
    } else if (attempts > 100) {
      clearInterval(timer);
    }
  }, 100);
})();