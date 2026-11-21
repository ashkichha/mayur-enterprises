// ============================================================
// MAYUR ENTERPRISES — CAPITAL INVESTMENT & ASSETS MODULE
// ============================================================
(function() {
  'use strict';

  // Helper for currency formatting with fallback
  const formatMoney = (n) => {
    if (typeof Utils !== 'undefined' && typeof Utils.formatCurrency === 'function') {
      return Utils.formatCurrency(n);
    }
    if (typeof window !== 'undefined' && window.Utils && typeof window.Utils.formatCurrency === 'function') {
      return window.Utils.formatCurrency(n);
    }
    if (n == null || isNaN(n)) return '₹0';
    const abs = Math.abs(Math.round(n));
    return (n < 0 ? '-₹' : '₹') + abs.toLocaleString('en-IN');
  };

  const CapitalModule = {
    _chartInstances: [],

    // Computes all capital figures, partner balances, and depreciation schedule
    getItems() {
      const local = Utils.loadLocal('capitalItems');
      if (local && Array.isArray(local) && local.length > 0) return local;
      const capData = (window.SEED_DATA && window.SEED_DATA.capitalInvestment) || {};
      return Array.isArray(capData.items) ? JSON.parse(JSON.stringify(capData.items)) : [];
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

      // Section A calculations
      let totalGross = 0;
      let totalDeductions = 0;
      items.forEach(it => {
        totalGross += (Number(it.grossAmount) || 0);
        totalDeductions += (Number(it.deductions) || 0);
      });
      const netCapital = totalGross + totalDeductions;

      // Section B calculations
      let hariomGross = 0;
      let hariomDeductions = 0;
      let ashishGross = 0;
      let ashishDeductions = 0;

      items.forEach(it => {
        const p = (it.partner || '').toLowerCase();
        const g = Number(it.grossAmount) || 0;
        const d = Number(it.deductions) || 0;
        if (p.includes('hariom')) {
          hariomGross += g;
          hariomDeductions += d;
        } else if (p.includes('ashish')) {
          ashishGross += g;
          ashishDeductions += d;
        }
      });

      const hariomNet = hariomGross + hariomDeductions;
      const ashishNet = ashishGross + ashishDeductions;
      const totalPartnerNet = hariomNet + ashishNet;

      const hariomShare = totalPartnerNet > 0 ? (hariomNet / totalPartnerNet) * 100 : 0;
      const ashishShare = totalPartnerNet > 0 ? (ashishNet / totalPartnerNet) * 100 : 0;

      // Section C calculations (15% WDV for 5 years)
      let currentOpening = netCapital;
      let totalAnnualDep = 0;
      const schedule = [];

      depYears.forEach((fy, idx) => {
        const annualDep = Math.round(currentOpening * depRate);
        const closing = currentOpening - annualDep;
        totalAnnualDep += annualDep;

        let notes = '';
        if (idx === 0) {
          notes = 'Initial capitalisation & 1st year WDV depreciation';
        } else if (idx === 1) {
          notes = '2nd year WDV depreciation @ 15%';
        } else if (idx === 2) {
          notes = '3rd year WDV depreciation @ 15%';
        } else if (idx === depYears.length - 1) {
          notes = `5th year WDV depreciation (Residual Value ${formatMoney(closing)})`;
        } else if (fy === 'FY 2026-27') {
          notes = '4th year WDV depreciation (Contract ends Jun-26)';
        } else {
          notes = `${idx + 1}th year WDV depreciation @ ${(depRate * 100).toFixed(0)}%`;
        }

        schedule.push({
          fy,
          opening: currentOpening,
          rate: depRate,
          annualDep,
          closing,
          ledger: 'Plant & Machinery',
          notes
        });

        currentOpening = closing;
      });

      const finalClosingWDV = schedule.length > 0 ? schedule[schedule.length - 1].closing : 0;

      return {
        items,
        totalGross,
        totalDeductions,
        netCapital,
        hariom: {
          name: 'Hariom Singh',
          gross: hariomGross,
          deductions: hariomDeductions,
          net: hariomNet,
          share: hariomShare
        },
        ashish: {
          name: 'Ashish Singh',
          gross: ashishGross,
          deductions: ashishDeductions,
          net: ashishNet,
          share: ashishShare
        },
        depRate,
        depYears,
        schedule,
        totalAnnualDep,
        finalClosingWDV
      };
    },

    render(container) {
      if (!container) return;
      const data = this.getData();

      // Destroy old charts if any
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
          <h2>CAPITAL INVESTMENT, ASSETS & DEPRECIATION SCHEDULE</h2>
          <p>Initial Plant Setup, Partner Capital Contribution & Fixed Asset WDV Schedule</p>
        </div>
      `;

      // KPI Summary Cards
      html += `
        <div class="kpi-grid">
          <div class="kpi-card blue">
            <div class="kpi-label">Total Gross Invested</div>
            <div class="kpi-value">${formatMoney(data.totalGross)}</div>
            <div class="kpi-sub">Total capital & setup expenses injected</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">Deductions & Adjustments</div>
            <div class="kpi-value">${formatMoney(data.totalDeductions)}</div>
            <div class="kpi-sub">NEFT refunds & GST input adjustments</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">Net Opening Capital (Plant Cost)</div>
            <div class="kpi-value">${formatMoney(data.netCapital)}</div>
            <div class="kpi-sub">Bus Washing Plant Initial Cost</div>
          </div>
          <div class="kpi-card purple">
            <div class="kpi-label">5-Year Closing WDV</div>
            <div class="kpi-value">${formatMoney(data.finalClosingWDV)}</div>
            <div class="kpi-sub">Asset Residual Value (15% WDV)</div>
          </div>
        </div>
      `;

      // 2. Section A - Project Cost Breakdown
      html += `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
            <div class="card-title" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
              Section A — Project Cost Breakdown
            </div>
            <button class="btn btn-primary btn-sm no-print" id="btn-add-cap-item">
              ➕ Add Capital Item
            </button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sheet Ref</th>
                  <th>Partner</th>
                  <th>Description</th>
                  <th class="num">Gross Amount(₹)</th>
                  <th class="num">Deductions/Adj(₹)</th>
                  <th class="no-print" style="width:120px;">Actions</th>
                </tr>
              </thead>
              <tbody>
      `;

      data.items.forEach((it, idx) => {
        const grossStr = formatMoney(it.grossAmount);
        const dedStr = formatMoney(it.deductions);
        const dedClass = it.deductions < 0 ? 'num negative' : 'num';
        html += `
                <tr>
                  <td><code>${it.sheetRef || '-'}</code></td>
                  <td><strong>${it.partner || '-'}</strong></td>
                  <td>${it.description || '-'}</td>
                  <td class="num">${grossStr}</td>
                  <td class="${dedClass}">${dedStr}</td>
                  <td class="actions-cell no-print">
                    <button class="btn-action edit btn-edit-cap" data-index="${idx}" title="Edit Capital Item">✏️ Edit</button>
                    <button class="btn-action delete btn-delete-cap" data-index="${idx}" title="Delete Item">🗑️</button>
                  </td>
                </tr>
        `;
      });

      html += `
                <tr class="total-row">
                  <td colspan="3"><strong>Total</strong></td>
                  <td class="num"><strong>${formatMoney(data.totalGross)}</strong></td>
                  <td class="num ${data.totalDeductions < 0 ? 'negative' : ''}"><strong>${formatMoney(data.totalDeductions)}</strong></td>
                  <td class="no-print">—</td>
                </tr>
                <tr class="total-row" style="background:#e6fffa !important; border-top:1px solid #319795;">
                  <td colspan="3"><strong>Net Capital (Gross + Deductions)</strong></td>
                  <td colspan="2" class="num positive" style="font-size:13px;"><strong>${formatMoney(data.netCapital)}</strong></td>
                  <td class="no-print">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // 3. Section B - Partner Opening Capital Balance
      html += `
        <div class="card">
          <div class="card-title">Section B — Partner Opening Capital Balance</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Partner Name</th>
                  <th class="num">Gross Invested(₹)</th>
                  <th class="num">Deductions/Adj(₹)</th>
                  <th class="num">Opening Capital Balance(₹)</th>
                  <th class="num">Capital Share(%)</th>
                  <th>Busy Account Group</th>
                  <th style="text-align:center;">Dr/Cr</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${data.hariom.name}</strong></td>
                  <td class="num">${formatMoney(data.hariom.gross)}</td>
                  <td class="num ${data.hariom.deductions < 0 ? 'negative' : ''}">${formatMoney(data.hariom.deductions)}</td>
                  <td class="num font-bold">${formatMoney(data.hariom.net)}</td>
                  <td class="num font-bold">${data.hariom.share.toFixed(2)}%</td>
                  <td>Capital Account</td>
                  <td style="text-align:center;"><span class="badge badge-green">Cr</span></td>
                </tr>
                <tr>
                  <td><strong>${data.ashish.name}</strong></td>
                  <td class="num">${formatMoney(data.ashish.gross)}</td>
                  <td class="num ${data.ashish.deductions < 0 ? 'negative' : ''}">${formatMoney(data.ashish.deductions)}</td>
                  <td class="num font-bold">${formatMoney(data.ashish.net)}</td>
                  <td class="num font-bold">${data.ashish.share.toFixed(2)}%</td>
                  <td>Capital Account</td>
                  <td style="text-align:center;"><span class="badge badge-green">Cr</span></td>
                </tr>
                <tr class="total-row">
                  <td><strong>Total Opening Capital</strong></td>
                  <td class="num"><strong>${formatMoney(data.totalGross)}</strong></td>
                  <td class="num ${data.totalDeductions < 0 ? 'negative' : ''}"><strong>${formatMoney(data.totalDeductions)}</strong></td>
                  <td class="num"><strong>${formatMoney(data.netCapital)}</strong></td>
                  <td class="num"><strong>100.00%</strong></td>
                  <td>Capital Account</td>
                  <td style="text-align:center;"><span class="badge badge-green">Cr</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // 4. Section C - Depreciation Schedule (15% WDV)
      html += `
        <div class="card">
          <div class="card-title">Section C — Depreciation Schedule (15% WDV)</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Financial Year</th>
                  <th class="num">Opening WDV(₹)</th>
                  <th class="num">Depreciation Rate</th>
                  <th class="num">Annual Depreciation(₹)</th>
                  <th class="num">Closing WDV(₹)</th>
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
                  <td><strong>Total (5 Years)</strong></td>
                  <td class="num">-</td>
                  <td class="num">${(data.depRate * 100).toFixed(0)}% WDV</td>
                  <td class="num negative"><strong>${formatMoney(data.totalAnnualDep)}</strong></td>
                  <td class="num positive"><strong>${formatMoney(data.finalClosingWDV)}</strong></td>
                  <td>Plant &amp; Machinery</td>
                  <td><strong>5-Year Cumulative WDV Schedule</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Charts Section (Visual Analytics)
      html += `
        <div class="charts-grid no-print">
          <div class="card">
            <div class="card-title">Partner Capital Share (%)</div>
            <div class="chart-container">
              <canvas id="capital-share-chart"></canvas>
            </div>
          </div>
          <div class="card">
            <div class="card-title">5-Year Asset WDV & Depreciation Trend</div>
            <div class="chart-container">
              <canvas id="depreciation-trend-chart"></canvas>
            </div>
          </div>
        </div>
      `;

      // Busy Accounting Integration Guide Card
      html += `
        <div class="card" style="background:#f8fafc;">
          <div class="card-title">Busy Accounting Software Master & Ledger Mapping</div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; font-size:12px;">
            <div style="border-left:3px solid var(--primary); padding-left:10px;">
              <strong>Partner Capital Masters:</strong><br>
              • <code>Hariom Singh Capital A/c</code> &rarr; Group: <em>Capital Account</em> (Cr Bal: ${formatMoney(data.hariom.net)})<br>
              • <code>Ashish Singh Capital A/c</code> &rarr; Group: <em>Capital Account</em> (Cr Bal: ${formatMoney(data.ashish.net)})
            </div>
            <div style="border-left:3px solid var(--accent); padding-left:10px;">
              <strong>Fixed Asset & Depreciation Masters:</strong><br>
              • <code>Plant &amp; Machinery (Bus Washing Plant)</code> &rarr; Group: <em>Fixed Assets</em> (Dr Bal: ${formatMoney(data.netCapital)})<br>
              • <code>Depreciation A/c</code> &rarr; Group: <em>Indirect Expenses</em> (Annual Rate: 15% WDV)
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Render Charts if Chart.js is loaded
      this.renderCharts(data);
    },

    renderCharts(data) {
      if (typeof Chart === 'undefined') return;

      // Chart 1: Partner Capital Share
      const shareCanvas = document.getElementById('capital-share-chart');
      if (shareCanvas) {
        try {
          const shareChart = new Chart(shareCanvas, {
            type: 'doughnut',
            data: {
              labels: [
                `${data.hariom.name} (${data.hariom.share.toFixed(1)}%)`,
                `${data.ashish.name} (${data.ashish.share.toFixed(1)}%)`
              ],
              datasets: [{
                data: [data.hariom.net, data.ashish.net],
                backgroundColor: ['#3182ce', '#38a169'],
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
        } catch(e) {
          console.warn('Failed to render capital share chart:', e);
        }
      }

      // Chart 2: Depreciation & Closing WDV Trend
      const depCanvas = document.getElementById('depreciation-trend-chart');
      if (depCanvas) {
        try {
          const labels = data.schedule.map(s => s.fy);
          const closingData = data.schedule.map(s => s.closing);
          const depData = data.schedule.map(s => s.annualDep);

          const depChart = new Chart(depCanvas, {
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
                    callback: function(val) {
                      return '₹' + (val / 1000).toLocaleString('en-IN') + 'k';
                    }
                  }
                }
              },
              plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                  callbacks: {
                    label: function(ctx) {
                      return ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`;
                    }
                  }
                }
              }
            }
          });
          this._chartInstances.push(depChart);
        } catch(e) {
          console.warn('Failed to render depreciation trend chart:', e);
        }
      }

      // Add Capital Item Event
      const btnAddCap = container.querySelector('#btn-add-cap-item');
      if (btnAddCap) {
        btnAddCap.addEventListener('click', () => {
          const html = `
            <div class="form-row">
              <div class="form-group"><label>Sheet Ref</label><input id="f-cap-sheet" type="text" placeholder="e.g. Sheet No 1"></div>
              <div class="form-group">
                <label>Partner / Source</label>
                <select id="f-cap-partner">
                  <option value="Hariom Singh">Hariom Singh</option>
                  <option value="Ashish Singh">Ashish Singh</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Particulars / Description</label><input id="f-cap-desc" type="text" placeholder="Detail of expense or injection" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Gross Amount (₹)</label><input id="f-cap-gross" type="number" min="0" value="0"></div>
              <div class="form-group"><label>Deductions / Adj (₹, enter negative or 0)</label><input id="f-cap-ded" type="number" value="0"></div>
            </div>
          `;
          AppModal.show('➕ Add Capital Project Item', html, () => {
            const desc = document.getElementById('f-cap-desc').value.trim();
            if (!desc) {
              alert('Description cannot be empty.');
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
                <label>Partner / Source</label>
                <select id="edit-cap-partner">
                  <option value="Hariom Singh" ${it.partner === 'Hariom Singh' ? 'selected' : ''}>Hariom Singh</option>
                  <option value="Ashish Singh" ${it.partner === 'Ashish Singh' ? 'selected' : ''}>Ashish Singh</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Particulars / Description</label><input id="edit-cap-desc" type="text" value="${it.description || ''}" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Gross Amount (₹)</label><input id="edit-cap-gross" type="number" value="${it.grossAmount}"></div>
              <div class="form-group"><label>Deductions / Adj (₹)</label><input id="edit-cap-ded" type="number" value="${it.deductions}"></div>
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
            `Are you sure you want to delete <strong>${it.description}</strong> (${formatMoney(it.grossAmount + it.deductions)})?`,
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

  // Expose to window
  window.CapitalModule = CapitalModule;
})();
