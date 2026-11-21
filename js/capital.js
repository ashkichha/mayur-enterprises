// ============================================================
// MAYUR ENTERPRISES — CAPITAL INVESTMENT & ASSETS MODULE
// Plant Installation Cost & Partner Equity Split (53.18% / 46.82%)
// ============================================================
(function() {
  'use strict';

  const formatMoney = (n) => {
    if (typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function') {
      return Utils.formatCurrency(n);
    }
    if (n == null || isNaN(n)) return '₹0';
    const abs = Math.abs(Math.round(n));
    return (n < 0 ? '-₹' : '₹') + abs.toLocaleString('en-IN');
  };

  const CapitalModule = {
    _chartInstances: [],

    getItems() {
      const local = Utils.loadLocal('capitalItems');
      if (local && Array.isArray(local) && local.length >= 20) return local;
      const capData = (window.SEED_DATA && window.SEED_DATA.capitalInvestment) || {};
      const items = Array.isArray(capData.items) ? JSON.parse(JSON.stringify(capData.items)) : [];
      Utils.saveLocal('capitalItems', items);
      return items;
    },

    saveItems(items) {
      Utils.saveLocal('capitalItems', items);
      if (window.SEED_DATA && window.SEED_DATA.capitalInvestment) {
        window.SEED_DATA.capitalInvestment.items = items;
      }
    },

    getData() {
      const capData = (window.SEED_DATA && window.SEED_DATA.capitalInvestment) || {};
      const items = this.getItems();
      const depRate = typeof capData.depreciationRate === 'number' ? capData.depreciationRate : 0.15;
      const depYears = [
        "FY 2023-24", "FY 2024-25", "FY 2025-26", "FY 2026-27",
        "FY 2027-28", "FY 2028-29", "FY 2029-30", "FY 2030-31"
      ];

      // Partition items by partner
      const hariomItems = [];
      const ashishItems = [];

      items.forEach((it, originalIdx) => {
        const itemWithIdx = { ...it, originalIdx };
        const p = (it.partner || '').toLowerCase();
        if (p.includes('hariom')) {
          hariomItems.push(itemWithIdx);
        } else {
          ashishItems.push(itemWithIdx);
        }
      });

      // Hariom calculations
      let hariomGross = 0;
      let hariomLess = 0;
      let hariomGstLess = 0;
      hariomItems.forEach(it => {
        const g = Number(it.grossAmount) || 0;
        const d = Number(it.deductions) || 0;
        hariomGross += g;
        if (it.sheetRef === 'Gst Less' || (it.description && it.description.toLowerCase().includes('gst'))) {
          hariomGstLess += d;
        } else if (d < 0) {
          hariomLess += d;
        }
      });
      const hariomAfterLess = hariomGross + hariomLess;
      const hariomNet = hariomAfterLess + hariomGstLess;

      // Ashish calculations
      let ashishGross = 0;
      let ashishDeductions = 0;
      ashishItems.forEach(it => {
        ashishGross += Number(it.grossAmount) || 0;
        ashishDeductions += Number(it.deductions) || 0;
      });
      const ashishNet = ashishGross + ashishDeductions;

      // Total Capital Project Cost
      const costOfCapitalProject = hariomNet + ashishNet;
      const hariomShare = costOfCapitalProject > 0 ? (hariomNet / costOfCapitalProject) * 100 : 53.18;
      const ashishShare = costOfCapitalProject > 0 ? (ashishNet / costOfCapitalProject) * 100 : 46.82;

      // Depreciation Schedule (15% WDV for 8 FYs)
      let currentOpening = costOfCapitalProject;
      let totalAnnualDep = 0;
      const schedule = [];

      depYears.forEach((fy, idx) => {
        const annualDep = Math.round(currentOpening * depRate);
        const closing = currentOpening - annualDep;
        totalAnnualDep += annualDep;

        let notes = '';
        if (idx === 0) notes = 'Initial capitalisation & 1st year WDV depreciation';
        else if (idx === 1) notes = '2nd year WDV depreciation @ 15%';
        else if (idx === 2) notes = '3rd year WDV depreciation @ 15%';
        else if (fy === 'FY 2026-27') notes = '4th year WDV depreciation (Contract Period Ends)';
        else if (idx === depYears.length - 1) notes = `Final WDV residual value: ${formatMoney(closing)}`;
        else notes = `${idx + 1}th year WDV depreciation @ ${(depRate * 100).toFixed(0)}%`;

        schedule.push({
          fy,
          opening: currentOpening,
          rate: depRate,
          annualDep,
          closing,
          ledger: 'Plant & Machinery (Bus Washing Plant)',
          notes
        });

        currentOpening = closing;
      });

      const finalClosingWDV = schedule.length > 0 ? schedule[schedule.length - 1].closing : 0;

      return {
        items,
        hariomItems,
        ashishItems,
        hariomGross,
        hariomLess,
        hariomAfterLess,
        hariomGstLess,
        hariomNet,
        ashishNet,
        costOfCapitalProject,
        hariomShare,
        ashishShare,
        schedule,
        totalAnnualDep,
        finalClosingWDV,
        depRate
      };
    },

    render(container) {
      if (!container) return;
      const data = this.getData();

      // Destroy old charts
      if (this._chartInstances && this._chartInstances.length > 0) {
        this._chartInstances.forEach(c => {
          try { c.destroy(); } catch(e) {}
        });
      }
      this._chartInstances = [];

      let html = '';

      // 1. Title & Header
      html += `
        <div class="page-header">
          <h2>CAPITAL PROJECT BUDGET &amp; PLANT INSTALLATION ASSETS</h2>
          <p>UPSRTC Badaun Bus Washing Plant Installation Cost &bull; Foundation of Partner Equity Ratio: Hariom Singh (53.18%) &bull; Ashish Singh (46.82%)</p>
        </div>
      `;

      // KPI Cards
      html += `
        <div class="kpi-grid">
          <div class="kpi-card green">
            <div class="kpi-label">Cost of Capital Project (Plant Cost)</div>
            <div class="kpi-value">${formatMoney(data.costOfCapitalProject)}</div>
            <div class="kpi-sub">Total Plant Installation &amp; Setup Investment</div>
          </div>
          <div class="kpi-card purple">
            <div class="kpi-label">Exp By Hariom Singh (53.18%)</div>
            <div class="kpi-value">${formatMoney(data.hariomNet)}</div>
            <div class="kpi-sub">Net Share: ${data.hariomShare.toFixed(2)}% of Capital Project</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">Exp By Ashish Singh (46.82%)</div>
            <div class="kpi-value">${formatMoney(data.ashishNet)}</div>
            <div class="kpi-sub">Net Share: ${data.ashishShare.toFixed(2)}% of Capital Project</div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-label">Asset Closing WDV (15% WDV)</div>
            <div class="kpi-value">${formatMoney(data.finalClosingWDV)}</div>
            <div class="kpi-sub">Plant &amp; Machinery Residual Value</div>
          </div>
        </div>
      `;

      // 2. Main Budget Document Table
      html += `
        <div class="card" id="card-capital-budget">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <div>
              <div class="card-title" style="margin-bottom:2px; border-bottom:none; padding-bottom:0;">
                Capital Project Budget for UPSRTC Badaun
              </div>
              <div style="font-size:12px; color:var(--text-muted);">
                Plant Installation Breakdown &amp; Decided Partnership Ratio (Hariom Singh 53.18% / Ashish Singh 46.82%)
              </div>
            </div>
            <div style="display:flex; gap:8px;" class="no-print">
              <button class="btn btn-outline btn-sm" id="btn-print-cap">🖨️ Print Budget</button>
              <button class="btn btn-outline btn-sm" id="btn-export-cap">📥 Export CSV</button>
              <button class="btn btn-outline btn-sm" id="btn-reset-cap" title="Reset to original paper document">↺ Reset to Document</button>
              <button class="btn btn-primary btn-sm" id="btn-add-cap-item">➕ Add Entry</button>
            </div>
          </div>

          <div class="table-wrap">
            <table class="table" style="font-size:12.5px;">
              <thead>
                <tr style="background:#1e3a5f; color:#ffffff;">
                  <th style="width:120px;">Sheet No</th>
                  <th class="num" style="width:180px;">Exp By Hariom Singh (₹)</th>
                  <th class="num" style="width:180px;">Exp By Ashish Singh (₹)</th>
                  <th>Detail</th>
                  <th class="no-print" style="width:110px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
      `;

      // Section 1: Hariom Singh Entries
      data.hariomItems.forEach(it => {
        const isLessRow = it.sheetRef === 'Less' || it.sheetRef === 'Gst Less' || it.deductions < 0;
        const amt = isLessRow ? it.deductions : it.grossAmount;
        const amtStr = formatMoney(Math.abs(amt));
        const amtDisplay = amt < 0 ? `-${amtStr}` : amtStr;
        const rowStyle = isLessRow ? 'background:#fffaf0; font-weight:600;' : '';

        html += `
          <tr style="${rowStyle}">
            <td><strong>${it.sheetRef}</strong></td>
            <td class="num ${amt < 0 ? 'negative' : ''}">${amtDisplay}</td>
            <td class="num" style="color:#cbd5e0;">-</td>
            <td>${it.description}</td>
            <td class="actions-cell no-print" style="text-align:center;">
              <button class="btn-action edit btn-edit-cap" data-index="${it.originalIdx}" title="Edit">✏️</button>
              <button class="btn-action delete btn-delete-cap" data-index="${it.originalIdx}" title="Delete">🗑️</button>
            </td>
          </tr>
        `;
      });

      // Hariom Subtotal breakdown matching the image exactly
      html += `
        <tr class="total-row" style="background:#edf2f7; border-top:2px solid #cbd5e0;">
          <td><strong>Total</strong></td>
          <td class="num"><strong>${formatMoney(data.hariomGross)}</strong></td>
          <td class="num" style="color:#cbd5e0;">-</td>
          <td><strong>Subtotal Expenses (Hariom Singh)</strong></td>
          <td class="no-print">-</td>
        </tr>
        <tr style="background:#fff5f5; font-weight:600;">
          <td><strong>Less</strong></td>
          <td class="num negative"><strong>${formatMoney(data.hariomLess)}</strong></td>
          <td class="num" style="color:#cbd5e0;">-</td>
          <td>Less: Refund / Adjustment</td>
          <td class="no-print">-</td>
        </tr>
        <tr class="total-row" style="background:#edf2f7;">
          <td><strong>Total</strong></td>
          <td class="num"><strong>${formatMoney(data.hariomAfterLess)}</strong></td>
          <td class="num" style="color:#cbd5e0;">-</td>
          <td>Total After Less</td>
          <td class="no-print">-</td>
        </tr>
        <tr style="background:#fff5f5; font-weight:600;">
          <td><strong>Gst Less</strong></td>
          <td class="num negative"><strong>${formatMoney(data.hariomGstLess)}</strong></td>
          <td class="num" style="color:#cbd5e0;">-</td>
          <td>Gst Less Adjustment</td>
          <td class="no-print">-</td>
        </tr>
        <tr class="total-row" style="background:#e6fffa; border-top:2px solid #319795; border-bottom:3px solid #234e52;">
          <td><strong style="color:#234e52;">Total (Hariom Singh)</strong></td>
          <td class="num positive" style="font-size:14px; font-weight:800;"><strong>${formatMoney(data.hariomNet)}</strong></td>
          <td class="num" style="color:#cbd5e0;">-</td>
          <td><strong style="color:#234e52;">Net Invested by Hariom Singh (53.18%)</strong></td>
          <td class="no-print">-</td>
        </tr>
      `;

      // Separator row
      html += `
        <tr style="background:#f7fafc; height:18px;">
          <td colspan="5" style="border:none;"></td>
        </tr>
      `;

      // Section 2: Ashish Singh Entries
      data.ashishItems.forEach(it => {
        const amt = it.deductions < 0 ? it.deductions : it.grossAmount;
        const amtStr = formatMoney(Math.abs(amt));
        const amtDisplay = amt < 0 ? `-${amtStr}` : amtStr;

        html += `
          <tr>
            <td><strong>${it.sheetRef}</strong></td>
            <td class="num" style="color:#cbd5e0;">-</td>
            <td class="num ${amt < 0 ? 'negative' : ''}">${amtDisplay}</td>
            <td>${it.description}</td>
            <td class="actions-cell no-print" style="text-align:center;">
              <button class="btn-action edit btn-edit-cap" data-index="${it.originalIdx}" title="Edit">✏️</button>
              <button class="btn-action delete btn-delete-cap" data-index="${it.originalIdx}" title="Delete">🗑️</button>
            </td>
          </tr>
        `;
      });

      // Ashish Subtotal
      html += `
        <tr class="total-row" style="background:#e6fffa; border-top:2px solid #319795; border-bottom:3px solid #234e52;">
          <td><strong style="color:#234e52;">Total (Ashish Singh)</strong></td>
          <td class="num" style="color:#cbd5e0;">-</td>
          <td class="num positive" style="font-size:14px; font-weight:800;"><strong>${formatMoney(data.ashishNet)}</strong></td>
          <td><strong style="color:#234e52;">Net Invested by Ashish Singh (46.82%)</strong></td>
          <td class="no-print">-</td>
        </tr>
      `;

      // Separator row
      html += `
        <tr style="background:#f7fafc; height:18px;">
          <td colspan="5" style="border:none;"></td>
        </tr>
      `;

      // Grand Summary Rows (matching document footer)
      html += `
        <tr class="total-row" style="background:#1e3a5f; color:#ffffff; font-size:14px;">
          <td style="color:#ffffff;"><strong>Total</strong></td>
          <td class="num" style="color:#ecc94b; font-size:15px; font-weight:800;"><strong>${formatMoney(data.hariomNet)}</strong></td>
          <td class="num" style="color:#ecc94b; font-size:15px; font-weight:800;"><strong>${formatMoney(data.ashishNet)}</strong></td>
          <td colspan="2" style="color:#ffffff;"><strong>${formatMoney(data.costOfCapitalProject)} Cost Of Capital Project</strong></td>
        </tr>
        <tr class="total-row" style="background:#0f2b48; color:#ffffff; font-size:13px;">
          <td style="color:#ffffff;"><strong>Partner Share %</strong></td>
          <td class="num" style="color:#68d391; font-weight:800;"><strong>${data.hariomShare.toFixed(2)}%</strong></td>
          <td class="num" style="color:#68d391; font-weight:800;"><strong>${data.ashishShare.toFixed(2)}%</strong></td>
          <td colspan="2" style="color:#e2e8f0;">Decided Capital Ratio (Hariom Singh 53.18% / Ashish Singh 46.82%)</td>
        </tr>
      `;

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;

      // 3. Section B: Depreciation Schedule (15% WDV)
      html += `
        <div class="card">
          <div class="card-title">Fixed Assets Depreciation Schedule (15% WDV)</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Financial Year</th>
                  <th class="num">Opening WDV (₹)</th>
                  <th class="num">Depreciation Rate</th>
                  <th class="num">Annual Depreciation (₹)</th>
                  <th class="num">Closing WDV (₹)</th>
                  <th>Busy Asset Ledger</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
      `;

      data.schedule.forEach(row => {
        html += `
          <tr>
            <td><strong>${row.fy}</strong></td>
            <td class="num">${formatMoney(row.opening)}</td>
            <td class="num">${(row.rate * 100).toFixed(0)}%</td>
            <td class="num negative">${formatMoney(row.annualDep)}</td>
            <td class="num font-bold">${formatMoney(row.closing)}</td>
            <td>${row.ledger}</td>
            <td><span style="color:var(--text-muted); font-size:11px;">${row.notes}</span></td>
          </tr>
        `;
      });

      html += `
                <tr class="total-row">
                  <td><strong>Total Cumulative</strong></td>
                  <td class="num">${formatMoney(data.costOfCapitalProject)}</td>
                  <td class="num">15% WDV</td>
                  <td class="num negative"><strong>${formatMoney(data.totalAnnualDep)}</strong></td>
                  <td class="num positive"><strong>${formatMoney(data.finalClosingWDV)}</strong></td>
                  <td>Plant &amp; Machinery</td>
                  <td>Residual Asset Valuation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // 4. Charts Section
      html += `
        <div class="charts-grid no-print">
          <div class="card">
            <div class="card-title">Plant Installation Equity Split (%)</div>
            <div class="chart-container">
              <canvas id="capital-share-chart"></canvas>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Asset WDV &amp; Depreciation Schedule</div>
            <div class="chart-container">
              <canvas id="depreciation-trend-chart"></canvas>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Render Charts
      this.renderCharts(data);

      // Bind Event Listeners
      this.attachEvents(container, data);
    },

    renderCharts(data) {
      if (typeof window.Chart === 'undefined') return;

      const shareCanvas = document.getElementById('capital-share-chart');
      if (shareCanvas) {
        try {
          const shareChart = new window.Chart(shareCanvas, {
            type: 'doughnut',
            data: {
              labels: [
                `Hariom Singh (${data.hariomShare.toFixed(2)}%)`,
                `Ashish Singh (${data.ashishShare.toFixed(2)}%)`
              ],
              datasets: [{
                data: [data.hariomNet, data.ashishNet],
                backgroundColor: ['#805ad5', '#dd6b20'],
                hoverOffset: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                  callbacks: {
                    label: function(ctx) {
                      return ` ${ctx.label}: ${formatMoney(ctx.raw)}`;
                    }
                  }
                }
              }
            }
          });
          this._chartInstances.push(shareChart);
        } catch(e) {}
      }

      const depCanvas = document.getElementById('depreciation-trend-chart');
      if (depCanvas) {
        try {
          const labels = data.schedule.map(s => s.fy);
          const closingData = data.schedule.map(s => s.closing);
          const depData = data.schedule.map(s => s.annualDep);

          const depChart = new window.Chart(depCanvas, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Closing WDV (₹)',
                  data: closingData,
                  backgroundColor: '#2c5282',
                  order: 2
                },
                {
                  label: 'Annual Depreciation (₹)',
                  data: depData,
                  backgroundColor: '#e53e3e',
                  order: 3
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (val) => '₹' + (val / 1000).toLocaleString('en-IN') + 'k'
                  }
                }
              },
              plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
                  }
                }
              }
            }
          });
          this._chartInstances.push(depChart);
        } catch(e) {}
      }
    },

    attachEvents(container, data) {
      // Print
      const btnPrint = container.querySelector('#btn-print-cap');
      if (btnPrint) {
        btnPrint.addEventListener('click', () => window.print());
      }

      // Export CSV
      const btnExport = container.querySelector('#btn-export-cap');
      if (btnExport) {
        btnExport.addEventListener('click', () => {
          let csv = 'Sheet No,Exp By Hariom Singh,Exp By Ashish Singh,Detail\n';
          data.hariomItems.forEach(it => {
            const amt = it.deductions < 0 ? it.deductions : it.grossAmount;
            csv += `"${it.sheetRef}","${amt}","","${it.description.replace(/"/g, '""')}"\n`;
          });
          csv += `"Total","${data.hariomGross}","","Subtotal Hariom Singh"\n`;
          csv += `"Less","${data.hariomLess}","","Less: Refund / Adjustment"\n`;
          csv += `"Total","${data.hariomAfterLess}","","Total After Less"\n`;
          csv += `"Gst Less","${data.hariomGstLess}","","Gst Less"\n`;
          csv += `"Total (Hariom Singh)","${data.hariomNet}","","Net Hariom Singh"\n\n`;

          data.ashishItems.forEach(it => {
            const amt = it.deductions < 0 ? it.deductions : it.grossAmount;
            csv += `"${it.sheetRef}","","${amt}","${it.description.replace(/"/g, '""')}"\n`;
          });
          csv += `"Total (Ashish Singh)","","${data.ashishNet}","Net Ashish Singh"\n\n`;

          csv += `"Total","${data.hariomNet}","${data.ashishNet}","${data.costOfCapitalProject} Cost Of Capital Project"\n`;
          csv += `"Partner Share %","${data.hariomShare.toFixed(2)}%","${data.ashishShare.toFixed(2)}%","100.00%"\n`;

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Capital_Project_Budget_UPSRTC_Badaun_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }

      // Reset to original document
      const btnReset = container.querySelector('#btn-reset-cap');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          AppModal.confirm(
            '↺ Reset Capital Budget',
            'Are you sure you want to restore the original plant installation budget items from the document?',
            () => {
              localStorage.removeItem('ME_capitalItems');
              CapitalModule.render(container);
            }
          );
        });
      }

      // Add Capital Item
      const btnAddCap = container.querySelector('#btn-add-cap-item');
      if (btnAddCap) {
        btnAddCap.addEventListener('click', () => {
          const html = `
            <div class="form-row">
              <div class="form-group"><label>Sheet Ref</label><input id="f-cap-sheet" type="text" placeholder="e.g. Sheet No 1"></div>
              <div class="form-group">
                <label>Partner / Contributor</label>
                <select id="f-cap-partner">
                  <option value="Hariom Singh">Hariom Singh</option>
                  <option value="Ashish Singh">Ashish Singh</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Particulars / Detail</label><input id="f-cap-desc" type="text" placeholder="Detail of plant expense or machinery" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Gross Amount (₹)</label><input id="f-cap-gross" type="number" min="0" value="0"></div>
              <div class="form-group"><label>Deductions / Less (₹, enter negative or 0)</label><input id="f-cap-ded" type="number" value="0"></div>
            </div>
          `;
          AppModal.show('➕ Add Capital Project Item', html, () => {
            const desc = document.getElementById('f-cap-desc').value.trim();
            if (!desc) {
              alert('Detail description cannot be empty.');
              return;
            }
            const newItem = {
              sheetRef: document.getElementById('f-cap-sheet').value.trim() || 'Custom',
              partner: document.getElementById('f-cap-partner').value,
              description: desc,
              grossAmount: parseFloat(document.getElementById('f-cap-gross').value) || 0,
              deductions: parseFloat(document.getElementById('f-cap-ded').value) || 0
            };
            const currentItems = CapitalModule.getItems();
            currentItems.push(newItem);
            CapitalModule.saveItems(currentItems);
            CapitalModule.render(container);
          });
        });
      }

      // Edit Item listeners
      container.querySelectorAll('.btn-edit-cap').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          const currentItems = CapitalModule.getItems();
          const it = currentItems[idx];
          if (!it) return;

          const html = `
            <div class="form-row">
              <div class="form-group"><label>Sheet Ref</label><input id="edit-cap-sheet" type="text" value="${it.sheetRef || ''}"></div>
              <div class="form-group">
                <label>Partner / Contributor</label>
                <select id="edit-cap-partner">
                  <option value="Hariom Singh" ${it.partner === 'Hariom Singh' ? 'selected' : ''}>Hariom Singh</option>
                  <option value="Ashish Singh" ${it.partner === 'Ashish Singh' ? 'selected' : ''}>Ashish Singh</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Particulars / Detail</label><input id="edit-cap-desc" type="text" value="${it.description || ''}" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Gross Amount (₹)</label><input id="edit-cap-gross" type="number" value="${it.grossAmount}"></div>
              <div class="form-group"><label>Deductions / Less (₹)</label><input id="edit-cap-ded" type="number" value="${it.deductions}"></div>
            </div>
          `;

          AppModal.show('✏️ Edit Capital Item', html, () => {
            const desc = document.getElementById('edit-cap-desc').value.trim();
            if (!desc) {
              alert('Description cannot be empty.');
              return;
            }
            currentItems[idx] = {
              sheetRef: document.getElementById('edit-cap-sheet').value.trim(),
              partner: document.getElementById('edit-cap-partner').value,
              description: desc,
              grossAmount: parseFloat(document.getElementById('edit-cap-gross').value) || 0,
              deductions: parseFloat(document.getElementById('edit-cap-ded').value) || 0
            };
            CapitalModule.saveItems(currentItems);
            CapitalModule.render(container);
          });
        });
      });

      // Delete Item listeners
      container.querySelectorAll('.btn-delete-cap').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          const currentItems = CapitalModule.getItems();
          const it = currentItems[idx];
          if (!it) return;

          AppModal.confirm(
            '🗑️ Delete Capital Item',
            `Are you sure you want to delete <strong>${it.description}</strong>?`,
            () => {
              currentItems.splice(idx, 1);
              CapitalModule.saveItems(currentItems);
              CapitalModule.render(container);
            }
          );
        });
      });
    }
  };

  window.CapitalModule = CapitalModule;
})();
