// ============================================================
// MAYUR ENTERPRISES — PROFIT WATERFALL & PARTNER SETTLEMENT MODULE
// ============================================================
(function() {
  'use strict';

  /**
   * Determine office recipient based on contract schedule:
   * "Hariom Singh" for months up to Sep-2026, "Ashish Singh" from Oct-2026.
   */
  function resolveOfficeRecipient(month, explicitRecipient) {
    if (explicitRecipient) return explicitRecipient;
    if (typeof Utils !== 'undefined' && typeof Utils.isHariomOfficeMonth === 'function') {
      return Utils.isHariomOfficeMonth(month) ? 'Hariom Singh' : 'Ashish Singh';
    }
    if (!month) return 'Hariom Singh';
    const parts = String(month).split('-');
    const monthNames = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    let yr = parseInt(parts[1], 10);
    if (yr < 100) yr += 2000;
    const d = new Date(yr, monthNames[parts[0]] || 0, 1);
    return d < new Date(2026, 9, 1) ? 'Hariom Singh' : 'Ashish Singh';
  }

  function isAshish(recipient) {
    return Boolean(recipient && /ashish/i.test(recipient));
  }

  function getPLClass(val) {
    if (val > 0) return 'positive';
    if (val < 0) return 'negative';
    return '';
  }

  function formatCurr(val) {
    if (typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function') {
      return Utils.formatCurrency(val);
    }
    if (val == null || isNaN(val)) return '₹0';
    const abs = Math.abs(Math.round(val));
    const s = abs.toLocaleString('en-IN');
    return (val < 0 ? '-₹' : '₹') + s;
  }

  function calculateRow(rawRow, config) {
    const billToUPSRTC = Number(rawRow.billToUPSRTC) || 0;
    const penalty = Number(rawRow.penalty) || 0;
    const electricity = Number(rawRow.electricity) || 0;
    const billGST = Number(rawRow.billGST) || 0;
    const expHariom = Number(rawRow.expHariom) || 0;
    const expAshish = Number(rawRow.expAshish) || 0;
    const penaltyGSTCN = Number(rawRow.penaltyGSTCN) || 0;

    // Profit/Loss (H) = A - B - C - D - E + F - G
    const profitLossH = billToUPSRTC - penalty - electricity - billGST - expHariom - expAshish + penaltyGSTCN;

    // 10% Office Exp (I) - max(0, H * 0.10), only when H > 0
    const officeExpRate = (config && config.officeExpRate != null) ? config.officeExpRate : 0.10;
    const officeExpI = profitLossH > 0 ? (profitLossH * officeExpRate) : 0;

    // Office recipient
    const recipient = resolveOfficeRecipient(rawRow.month, rawRow.officeRecipient);
    const ashishRecipient = isAshish(recipient);

    // Net P/L (J)
    const netPLJ = profitLossH - officeExpI;

    // Partner Shares
    const ashishRatio = (config && config.ashishShare != null) ? config.ashishShare : 0.4682;
    const hariomRatio = (config && config.hariomShare != null) ? config.hariomShare : 0.5318;
    const ashishShare = netPLJ * ashishRatio;
    const hariomShare = netPLJ * hariomRatio;

    // Partner Totals
    const ashishTotal = ashishShare + (ashishRecipient ? officeExpI : 0);
    const hariomTotal = hariomShare + (!ashishRecipient ? officeExpI : 0);

    return {
      month: rawRow.month,
      billToUPSRTC,
      penalty,
      electricity,
      billGST,
      expHariom,
      expAshish,
      penaltyGSTCN,
      profitLossH,
      officeExpI,
      officeRecipient: recipient,
      isAshishRecipient: ashishRecipient,
      netPLJ,
      ashishShare,
      hariomShare,
      ashishTotal,
      hariomTotal
    };
  }

  function calculateTotals(rows) {
    const initial = {
      billToUPSRTC: 0,
      penalty: 0,
      electricity: 0,
      billGST: 0,
      expHariom: 0,
      expAshish: 0,
      penaltyGSTCN: 0,
      profitLossH: 0,
      officeExpI: 0,
      netPLJ: 0,
      ashishShare: 0,
      hariomShare: 0,
      ashishTotal: 0,
      hariomTotal: 0,
      totalExpenses: 0,
      totalRevenue: 0
    };

    return rows.reduce((acc, r) => {
      acc.billToUPSRTC += r.billToUPSRTC;
      acc.penalty += r.penalty;
      acc.electricity += r.electricity;
      acc.billGST += r.billGST;
      acc.expHariom += r.expHariom;
      acc.expAshish += r.expAshish;
      acc.penaltyGSTCN += r.penaltyGSTCN;
      acc.profitLossH += r.profitLossH;
      acc.officeExpI += r.officeExpI;
      acc.netPLJ += r.netPLJ;
      acc.ashishShare += r.ashishShare;
      acc.hariomShare += r.hariomShare;
      acc.ashishTotal += r.ashishTotal;
      acc.hariomTotal += r.hariomTotal;
      acc.totalExpenses += (r.penalty + r.electricity + r.billGST + r.expHariom + r.expAshish);
      acc.totalRevenue += r.billToUPSRTC;
      return acc;
    }, initial);
  }

  function downloadCSV(rows, totals) {
    const headers = [
      "Month",
      "Bill To UPSRTC(A)",
      "Less:Penalty(B)",
      "Less:Electricity(C)",
      "Less:Bill GST(E)",
      "Less:Exp Hariom(D)",
      "Less:Exp Ashish(G)",
      "Add:Penalty GST CN(F)",
      "Profit/Loss(H)",
      "10% Office Exp(I)",
      "Office Recipient",
      "Net P/L(J)",
      "Ashish 46.82%",
      "Hariom 53.18%",
      "Ashish Total",
      "Hariom Total"
    ];

    const lines = [headers.join(",")];

    rows.forEach(r => {
      lines.push([
        `"${r.month}"`,
        Math.round(r.billToUPSRTC),
        Math.round(r.penalty),
        Math.round(r.electricity),
        Math.round(r.billGST),
        Math.round(r.expHariom),
        Math.round(r.expAshish),
        Math.round(r.penaltyGSTCN),
        Math.round(r.profitLossH),
        Math.round(r.officeExpI),
        `"${r.officeRecipient}"`,
        Math.round(r.netPLJ),
        Math.round(r.ashishShare),
        Math.round(r.hariomShare),
        Math.round(r.ashishTotal),
        Math.round(r.hariomTotal)
      ].join(","));
    });

    lines.push([
      `"Total (${rows.length} Months)"`,
      Math.round(totals.billToUPSRTC),
      Math.round(totals.penalty),
      Math.round(totals.electricity),
      Math.round(totals.billGST),
      Math.round(totals.expHariom),
      Math.round(totals.expAshish),
      Math.round(totals.penaltyGSTCN),
      Math.round(totals.profitLossH),
      Math.round(totals.officeExpI),
      `"-"`,
      Math.round(totals.netPLJ),
      Math.round(totals.ashishShare),
      Math.round(totals.hariomShare),
      Math.round(totals.ashishTotal),
      Math.round(totals.hariomTotal)
    ].join(","));

    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mayur_Enterprises_Profit_Settlement_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getProfitData() {
    const local = Utils.loadLocal('profitSettlement');
    if (local && Array.isArray(local) && local.length > 0) return local;
    if (window.SEED_DATA && Array.isArray(window.SEED_DATA.profitSettlement)) {
      return JSON.parse(JSON.stringify(window.SEED_DATA.profitSettlement));
    }
    return [];
  }

  function saveProfitData(data) {
    Utils.saveLocal('profitSettlement', data);
    if (window.SEED_DATA) window.SEED_DATA.profitSettlement = data;
  }

  const ProfitModule = {
    getData: getProfitData,
    saveData: saveProfitData,

    render(container) {
      if (!container) return;

      const seedData = getProfitData();
      const config = (window.SEED_DATA && window.SEED_DATA.config) || {};

      let allRows = seedData.map(r => calculateRow(r, config));

      // Extract distinct years dynamically
      const yearSet = new Set();
      seedData.forEach(r => {
        const d = Utils.parseMonth(r.month);
        if (d) yearSet.add(String(d.getFullYear()));
        else if (r.month) {
          const parts = String(r.month).split('-');
          if (parts[1]) {
            let y = parseInt(parts[1], 10);
            if (y < 100) y += 2000;
            yearSet.add(String(y));
          }
        }
      });
      const sortedYears = Array.from(yearSet).sort();

      let filterYear = 'all';
      let searchTerm = '';

      function getFilteredRows() {
        return allRows.filter(r => {
          if (filterYear !== 'all') {
            const yrSuffix = filterYear.slice(-2);
            if (!r.month.endsWith('-' + yrSuffix) && !r.month.endsWith('-' + filterYear)) {
              return false;
            }
          }
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchMonth = r.month.toLowerCase().includes(term);
            const matchRecipient = r.officeRecipient.toLowerCase().includes(term);
            if (!matchMonth && !matchRecipient) return false;
          }
          return true;
        });
      }

      function buildHTML() {
        const filteredRows = getFilteredRows();
        const totals = calculateTotals(filteredRows);

        const yearOptionsHTML = sortedYears.map(yr => {
          return `<option value="${yr}" ${filterYear === yr ? 'selected' : ''}>${yr}</option>`;
        }).join('');

        return `
          <!-- Page Header -->
          <div class="page-header">
            <h2>MONTHLY PROFIT WATERFALL &amp; PARTNER SETTLEMENT</h2>
            <p>
              <strong>10% Office Exp Rule:</strong> 10% Office Expense (I) = max(0, H &times; 10%) is deducted only when Profit/Loss (H) &gt; 0.
              Office expenses are credited to Hariom Singh for contract months up to Sep-2026, and to Ashish Singh from Oct-2026 onwards (including 2027..2030+).
              Net Profit/Loss (J = H - I) is distributed according to partnership equity: Ashish Singh (46.82%) and Hariom Singh (53.18%).
            </p>
          </div>

          <!-- Summary KPIs -->
          <div class="kpi-grid">
            <div class="kpi-card blue">
              <div class="kpi-label">TOTAL REVENUE</div>
              <div class="kpi-value">${formatCurr(totals.totalRevenue)}</div>
              <div class="kpi-sub">Billed to UPSRTC (Col A) &bull; +${formatCurr(totals.penaltyGSTCN)} GST CN</div>
            </div>

            <div class="kpi-card orange">
              <div class="kpi-label">TOTAL EXPENSES</div>
              <div class="kpi-value">${formatCurr(totals.totalExpenses)}</div>
              <div class="kpi-sub">Penalty, Electricity, GST &amp; Partner Exp</div>
            </div>

            <div class="kpi-card ${totals.profitLossH >= 0 ? 'green' : 'orange'}">
              <div class="kpi-label">TOTAL PROFIT / LOSS</div>
              <div class="kpi-value ${getPLClass(totals.profitLossH)}">${formatCurr(totals.profitLossH)}</div>
              <div class="kpi-sub">Waterfall Profit Before Office Exp (Col H)</div>
            </div>

            <div class="kpi-card purple">
              <div class="kpi-label">NET P/L AFTER OFFICE EXP</div>
              <div class="kpi-value ${getPLClass(totals.netPLJ)}">${formatCurr(totals.netPLJ)}</div>
              <div class="kpi-sub">Office Exp Deducted: ${formatCurr(totals.officeExpI)} (Col I)</div>
            </div>
          </div>

          <!-- Partner Settlement Summary Cards -->
          <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 20px;">
            <div class="kpi-card blue" style="background: linear-gradient(to right, #ffffff, #f0f7ff);">
              <div class="kpi-label" style="color: #2b6cb0;">ASHISH SINGH — TOTAL SETTLEMENT (46.82%)</div>
              <div class="kpi-value ${getPLClass(totals.ashishTotal)}">${formatCurr(totals.ashishTotal)}</div>
              <div class="kpi-sub">
                Profit Share: <strong>${formatCurr(totals.ashishShare)}</strong>
                &bull; Office Exp: <strong>${formatCurr(totals.ashishTotal - totals.ashishShare)}</strong>
              </div>
            </div>

            <div class="kpi-card green" style="background: linear-gradient(to right, #ffffff, #f0fff4);">
              <div class="kpi-label" style="color: #276749;">HARIOM SINGH — TOTAL SETTLEMENT (53.18%)</div>
              <div class="kpi-value ${getPLClass(totals.hariomTotal)}">${formatCurr(totals.hariomTotal)}</div>
              <div class="kpi-sub">
                Profit Share: <strong>${formatCurr(totals.hariomShare)}</strong>
                &bull; Office Exp: <strong>${formatCurr(totals.hariomTotal - totals.hariomShare)}</strong>
              </div>
            </div>
          </div>

          <!-- Filter & Action Bar -->
          <div class="card" style="padding: 14px 20px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div class="form-group" style="min-width: 140px; margin-bottom: 0;">
                  <label for="profit-year-filter" style="font-size: 10px; margin-bottom: 2px;">FILTER YEAR</label>
                  <select id="profit-year-filter" style="padding: 6px 10px; font-size: 12px;">
                    <option value="all" ${filterYear === 'all' ? 'selected' : ''}>All Years (${seedData.length} Mos)</option>
                    ${yearOptionsHTML}
                  </select>
                </div>

                <div class="form-group" style="min-width: 160px; margin-bottom: 0;">
                  <label for="profit-search" style="font-size: 10px; margin-bottom: 2px;">SEARCH MONTH</label>
                  <input type="text" id="profit-search" placeholder="e.g. May-23, Oct-26..." value="${searchTerm}" style="padding: 6px 10px; font-size: 12px;">
                </div>

                ${(filterYear !== 'all' || searchTerm) ? `
                  <button id="profit-reset-filter" class="btn btn-outline btn-sm" style="margin-top: 16px;">
                    ✕ Reset
                  </button>
                ` : ''}
              </div>

              <div class="btn-group" style="margin-top: 0; display:flex; gap:8px;">
                <button id="btn-add-profit" class="btn btn-primary btn-sm">
                  ➕ Add Settlement Entry
                </button>
                <button id="btn-sync-profit" class="btn btn-outline btn-sm" title="Auto-calculate & sync from Billing and Expenses">
                  🔄 Auto-Sync From Billing
                </button>
                <button id="btn-export-csv" class="btn btn-outline btn-sm">
                  📥 Export CSV
                </button>
                <button id="btn-print-table" class="btn btn-primary btn-sm">
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          <!-- Main Waterfall Table Card -->
          <div class="card">
            <div class="card-title">MONTHLY PROFIT WATERFALL &amp; PARTNER SETTLEMENT</div>
            <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
              <strong>Waterfall Flow:</strong> Billed UPSRTC (A) &minus; Penalty (B) &minus; Electricity (C) &minus; Bill GST (E) &minus; Exp Hariom (D) &minus; Exp Ashish (G) + Penalty GST CN (F) = <strong>Profit/Loss (H)</strong>.
              Then 10% Office Exp (I) = max(0, H &times; 10%) &rarr; <strong>Net P/L (J = H &minus; I)</strong> &rarr; Ashish (46.82%) &amp; Hariom (53.18%).
            </p>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="min-width: 80px;">Month</th>
                    <th class="num" style="min-width: 110px;">Bill To UPSRTC(A)</th>
                    <th class="num" style="min-width: 100px;">Less:Penalty(B)</th>
                    <th class="num" style="min-width: 105px;">Less:Electricity(C)</th>
                    <th class="num" style="min-width: 95px;">Less:Bill GST(E)</th>
                    <th class="num" style="min-width: 105px;">Less:Exp Hariom(D)</th>
                    <th class="num" style="min-width: 100px;">Less:Exp Ashish(G)</th>
                    <th class="num" style="min-width: 115px;">Add:Penalty GST CN(F)</th>
                    <th class="num" style="min-width: 105px;">Profit/Loss(H)</th>
                    <th class="num" style="min-width: 105px;">10% Office Exp(I)</th>
                    <th style="min-width: 120px;">Office Recipient</th>
                    <th class="num" style="min-width: 105px;">Net P/L(J)</th>
                    <th class="num" style="min-width: 105px;">Ashish 46.82%</th>
                    <th class="num" style="min-width: 105px;">Hariom 53.18%</th>
                    <th class="num" style="min-width: 105px;">Ashish Total</th>
                    <th class="num" style="min-width: 105px;">Hariom Total</th>
                    <th class="no-print" style="width: 120px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRows.length === 0 ? `
                    <tr>
                      <td colspan="17" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        No settlement records found matching current filter.
                      </td>
                    </tr>
                  ` : filteredRows.map(r => {
                    const originalIdx = seedData.findIndex(s => s.month === r.month);
                    return `
                    <tr>
                      <td><strong>${r.month}</strong></td>
                      <td class="num">${formatCurr(r.billToUPSRTC)}</td>
                      <td class="num">${formatCurr(r.penalty)}</td>
                      <td class="num">${formatCurr(r.electricity)}</td>
                      <td class="num">${formatCurr(r.billGST)}</td>
                      <td class="num">${formatCurr(r.expHariom)}</td>
                      <td class="num">${formatCurr(r.expAshish)}</td>
                      <td class="num">${formatCurr(r.penaltyGSTCN)}</td>
                      <td class="num ${getPLClass(r.profitLossH)}">${formatCurr(r.profitLossH)}</td>
                      <td class="num">${formatCurr(r.officeExpI)}</td>
                      <td>
                        <span class="badge ${r.isAshishRecipient ? 'badge-green' : 'badge-blue'}">
                          ${r.officeRecipient}
                        </span>
                      </td>
                      <td class="num ${getPLClass(r.netPLJ)}">${formatCurr(r.netPLJ)}</td>
                      <td class="num ${getPLClass(r.ashishShare)}">${formatCurr(r.ashishShare)}</td>
                      <td class="num ${getPLClass(r.hariomShare)}">${formatCurr(r.hariomShare)}</td>
                      <td class="num ${getPLClass(r.ashishTotal)}">${formatCurr(r.ashishTotal)}</td>
                      <td class="num ${getPLClass(r.hariomTotal)}">${formatCurr(r.hariomTotal)}</td>
                      <td class="actions-cell no-print">
                        <button class="btn-action edit btn-edit-profit" data-index="${originalIdx}" title="Edit Month Values">✏️ Edit</button>
                        <button class="btn-action delete btn-delete-profit" data-index="${originalIdx}" title="Delete Record">🗑️</button>
                      </td>
                    </tr>
                  `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="num">${formatCurr(totals.billToUPSRTC)}</td>
                    <td class="num">${formatCurr(totals.penalty)}</td>
                    <td class="num">${formatCurr(totals.electricity)}</td>
                    <td class="num">${formatCurr(totals.billGST)}</td>
                    <td class="num">${formatCurr(totals.expHariom)}</td>
                    <td class="num">${formatCurr(totals.expAshish)}</td>
                    <td class="num">${formatCurr(totals.penaltyGSTCN)}</td>
                    <td class="num ${getPLClass(totals.profitLossH)}">${formatCurr(totals.profitLossH)}</td>
                    <td class="num">${formatCurr(totals.officeExpI)}</td>
                    <td>—</td>
                    <td class="num ${getPLClass(totals.netPLJ)}">${formatCurr(totals.netPLJ)}</td>
                    <td class="num ${getPLClass(totals.ashishShare)}">${formatCurr(totals.ashishShare)}</td>
                    <td class="num ${getPLClass(totals.hariomShare)}">${formatCurr(totals.hariomShare)}</td>
                    <td class="num ${getPLClass(totals.ashishTotal)}">${formatCurr(totals.ashishTotal)}</td>
                    <td class="num ${getPLClass(totals.hariomTotal)}">${formatCurr(totals.hariomTotal)}</td>
                    <td class="no-print">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
      }

      function attachEvents() {
        const yearSelect = container.querySelector('#profit-year-filter');
        if (yearSelect) {
          yearSelect.addEventListener('change', (e) => {
            filterYear = e.target.value;
            refreshView();
          });
        }

        const searchInput = container.querySelector('#profit-search');
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.trim();
            refreshView();
          });
        }

        const resetBtn = container.querySelector('#profit-reset-filter');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            filterYear = 'all';
            searchTerm = '';
            refreshView();
          });
        }

        const exportBtn = container.querySelector('#btn-export-csv');
        if (exportBtn) {
          exportBtn.addEventListener('click', () => {
            const filtered = getFilteredRows();
            const totals = calculateTotals(filtered);
            downloadCSV(filtered, totals);
          });
        }

        const printBtn = container.querySelector('#btn-print-table');
        if (printBtn) {
          printBtn.addEventListener('click', () => {
            window.print();
          });
        }

        // Add settlement entry
        const addBtn = container.querySelector('#btn-add-profit');
        if (addBtn) {
          addBtn.addEventListener('click', () => {
            const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
            const html = `
              <div class="form-row">
                <div class="form-group">
                  <label>Month</label>
                  <input id="f-p-month" list="p-months-list" placeholder="Select or type month (e.g. Jul-26, Jan-27)" required />
                  <datalist id="p-months-list">
                    ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
                  </datalist>
                </div>
                <div class="form-group">
                  <label>Bill to UPSRTC (A)</label>
                  <input id="f-p-bill" type="number" min="0" value="0">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Less: Penalty (B)</label><input id="f-p-penalty" type="number" min="0" value="0"></div>
                <div class="form-group"><label>Less: Electricity (C)</label><input id="f-p-elec" type="number" min="0" value="0"></div>
                <div class="form-group"><label>Less: Bill GST (E)</label><input id="f-p-gst" type="number" min="0" value="0"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Less: Exp Hariom (D)</label><input id="f-p-exph" type="number" min="0" value="0"></div>
                <div class="form-group"><label>Less: Exp Ashish (G)</label><input id="f-p-expa" type="number" min="0" value="0"></div>
                <div class="form-group"><label>Add: Penalty GST CN (F)</label><input id="f-p-gstcn" type="number" min="0" value="0"></div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Office Exp Recipient</label>
                  <select id="f-p-recipient">
                    <option value="Auto">Auto (Hariom up to Sep-26, Ashish from Oct-26)</option>
                    <option value="Hariom Singh">Hariom Singh</option>
                    <option value="Ashish Singh">Ashish Singh</option>
                  </select>
                </div>
              </div>
            `;

            AppModal.show('➕ Add Monthly Profit Settlement', html, () => {
              const mVal = document.getElementById('f-p-month').value.trim();
              if (!mVal) {
                alert('Month cannot be empty.');
                return;
              }
              const recVal = document.getElementById('f-p-recipient').value;
              const explicitRec = recVal === 'Auto' ? resolveOfficeRecipient(mVal) : recVal;

              const newRow = {
                month: mVal,
                billToUPSRTC: parseFloat(document.getElementById('f-p-bill').value) || 0,
                penalty: parseFloat(document.getElementById('f-p-penalty').value) || 0,
                electricity: parseFloat(document.getElementById('f-p-elec').value) || 0,
                billGST: parseFloat(document.getElementById('f-p-gst').value) || 0,
                expHariom: parseFloat(document.getElementById('f-p-exph').value) || 0,
                expAshish: parseFloat(document.getElementById('f-p-expa').value) || 0,
                penaltyGSTCN: parseFloat(document.getElementById('f-p-gstcn').value) || 0,
                officeRecipient: explicitRec
              };

              seedData.push(newRow);
              saveProfitData(seedData);
              ProfitModule.render(container);
            });
          });
        }

        // Auto-sync button
        const syncBtn = container.querySelector('#btn-sync-profit');
        if (syncBtn) {
          syncBtn.addEventListener('click', () => {
            const billingData = (Utils.loadLocal ? Utils.loadLocal('billing') : null) || (window.SEED_DATA && window.SEED_DATA.billing) || [];
            const expensesData = (Utils.loadLocal ? Utils.loadLocal('expenses') : null) || (window.SEED_DATA && window.SEED_DATA.expenses) || [];

            let syncedCount = 0;
            billingData.forEach(b => {
              let existing = seedData.find(s => s.month.toLowerCase() === b.month.toLowerCase());
              // Calculate electricity & partner expenses for this month
              const monthExp = expensesData.filter(e => e.month.toLowerCase() === b.month.toLowerCase());
              const elec = monthExp.filter(e => e.category === 'Electricity').reduce((sum, e) => sum + e.amount, 0);
              const expH = monthExp.filter(e => e.paidBy === 'Hariom Singh').reduce((sum, e) => sum + e.amount, 0);
              const expA = monthExp.filter(e => e.paidBy === 'Ashish Singh').reduce((sum, e) => sum + e.amount, 0);

              if (existing) {
                existing.billToUPSRTC = b.billedTotal;
                existing.penalty = b.penaltyDeducted;
                existing.billGST = b.billedGST;
                existing.penaltyGSTCN = b.penaltyGSTCN;
                if (elec > 0) existing.electricity = elec;
                if (expH > 0) existing.expHariom = expH;
                if (expA > 0) existing.expAshish = expA;
              } else {
                seedData.push({
                  month: b.month,
                  billToUPSRTC: b.billedTotal,
                  penalty: b.penaltyDeducted,
                  electricity: elec,
                  billGST: b.billedGST,
                  expHariom: expH,
                  expAshish: expA,
                  penaltyGSTCN: b.penaltyGSTCN,
                  officeRecipient: resolveOfficeRecipient(b.month)
                });
                syncedCount++;
              }
            });

            saveProfitData(seedData);
            alert(`Synchronized successfully! Updated all matched months and added ${syncedCount} new billing months.`);
            ProfitModule.render(container);
          });
        }

        // Edit row listeners
        container.querySelectorAll('.btn-edit-profit').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index, 10);
            const r = seedData[idx];
            if (!r) return;

            const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
            const html = `
              <div class="form-row">
                <div class="form-group">
                  <label>Month</label>
                  <input id="edit-p-month" list="edit-p-months" value="${r.month}" required />
                  <datalist id="edit-p-months">
                    ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
                  </datalist>
                </div>
                <div class="form-group">
                  <label>Bill to UPSRTC (A)</label>
                  <input id="edit-p-bill" type="number" min="0" value="${r.billToUPSRTC}">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Less: Penalty (B)</label><input id="edit-p-penalty" type="number" min="0" value="${r.penalty}"></div>
                <div class="form-group"><label>Less: Electricity (C)</label><input id="edit-p-elec" type="number" min="0" value="${r.electricity}"></div>
                <div class="form-group"><label>Less: Bill GST (E)</label><input id="edit-p-gst" type="number" min="0" value="${r.billGST}"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Less: Exp Hariom (D)</label><input id="edit-p-exph" type="number" min="0" value="${r.expHariom}"></div>
                <div class="form-group"><label>Less: Exp Ashish (G)</label><input id="edit-p-expa" type="number" min="0" value="${r.expAshish}"></div>
                <div class="form-group"><label>Add: Penalty GST CN (F)</label><input id="edit-p-gstcn" type="number" min="0" value="${r.penaltyGSTCN}"></div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Office Exp Recipient</label>
                  <select id="edit-p-recipient">
                    <option value="Hariom Singh" ${r.officeRecipient === 'Hariom Singh' ? 'selected' : ''}>Hariom Singh (Before Oct-26)</option>
                    <option value="Ashish Singh" ${r.officeRecipient === 'Ashish Singh' ? 'selected' : ''}>Ashish Singh (Oct-26 Onwards)</option>
                  </select>
                </div>
              </div>
            `;

            AppModal.show('✏️ Edit Profit Settlement Row', html, () => {
              const mVal = document.getElementById('edit-p-month').value.trim();
              if (!mVal) {
                alert('Month cannot be empty.');
                return;
              }

              seedData[idx] = {
                month: mVal,
                billToUPSRTC: parseFloat(document.getElementById('edit-p-bill').value) || 0,
                penalty: parseFloat(document.getElementById('edit-p-penalty').value) || 0,
                electricity: parseFloat(document.getElementById('edit-p-elec').value) || 0,
                billGST: parseFloat(document.getElementById('edit-p-gst').value) || 0,
                expHariom: parseFloat(document.getElementById('edit-p-exph').value) || 0,
                expAshish: parseFloat(document.getElementById('edit-p-expa').value) || 0,
                penaltyGSTCN: parseFloat(document.getElementById('edit-p-gstcn').value) || 0,
                officeRecipient: document.getElementById('edit-p-recipient').value
              };

              saveProfitData(seedData);
              ProfitModule.render(container);
            });
          });
        });

        // Delete row listeners
        container.querySelectorAll('.btn-delete-profit').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index, 10);
            const r = seedData[idx];
            if (!r) return;

            AppModal.confirm(
              '🗑️ Delete Settlement Entry',
              `Are you sure you want to delete the profit settlement record for <strong>${r.month}</strong>?`,
              () => {
                seedData.splice(idx, 1);
                saveProfitData(seedData);
                ProfitModule.render(container);
              }
            );
          });
        });
      }

      function refreshView() {
        allRows = seedData.map(r => calculateRow(r, config));
        container.innerHTML = buildHTML();
        attachEvents();
        const searchInput = container.querySelector('#profit-search');
        if (searchInput && searchTerm) {
          searchInput.focus();
          searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
      }

      refreshView();
    }
  };

  window.ProfitModule = ProfitModule;
})();
