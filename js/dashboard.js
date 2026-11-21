window.DashboardModule = {
  render(container) {
    if (!container) return;

    // Destroy existing Chart.js instances if previously rendered
    if (window.DashboardModule._chartInstances) {
      window.DashboardModule._chartInstances.forEach(chart => {
        try { chart.destroy(); } catch (e) { /* ignore */ }
      });
    }
    window.DashboardModule._chartInstances = [];

    // Ensure Utils reference is available
    const U = window.Utils || (typeof Utils !== 'undefined' ? Utils : {
      formatCurrency: (n) => (n < 0 ? '-₹' : '₹') + Math.abs(Math.round(n || 0)).toLocaleString('en-IN'),
      formatNumber: (n) => Math.round(n || 0).toLocaleString('en-IN')
    });
    if (typeof window !== 'undefined' && !window.Utils && typeof Utils !== 'undefined') {
      window.Utils = Utils;
    }

    // Retrieve data (checking localStorage overrides first, then SEED_DATA)
    const seed = window.SEED_DATA || {};
    const config = seed.config || {};
    const billing = (U.loadLocal ? U.loadLocal('billing') : null) || seed.billing || [];
    const profitSettlement = (U.loadLocal ? U.loadLocal('profitSettlement') : null) || seed.profitSettlement || [];
    const capitalInvestment = (U.loadLocal ? U.loadLocal('capitalInvestment') : null) || seed.capitalInvestment || {};

    // 1. KPI: Total Bill To UPSRTC (sum of billing[].billedTotal)
    const totalBilledUPSRTC = billing.reduce((sum, r) => sum + (Number(r.billedTotal) || 0), 0);

    // 2. Compute 38-Month Profit Settlement Line Items & Yearly Totals
    let sumA = 0; // Bill To UPSRTC
    let sumB = 0; // Penalty
    let sumC = 0; // Electricity
    let sumD = 0; // Exp Hariom
    let sumE = 0; // Bill GST
    let sumG = 0; // Exp Ashish
    let sumF = 0; // Penalty GST CN
    let sumH = 0; // Profit/Loss
    let sumI = 0; // 10% Office Exp
    let sumJ = 0; // Net P/L
    let ashishOfficeExp = 0;
    let hariomOfficeExp = 0;

    const yearData = {};

    const officeExpRate = config.officeExpRate != null ? Number(config.officeExpRate) : 0.10;

    profitSettlement.forEach(r => {
      const A = Number(r.billToUPSRTC) || 0;
      const B = Number(r.penalty) || 0;
      const C = Number(r.electricity) || 0;
      const D = Number(r.expHariom) || 0;
      const E = Number(r.billGST) || 0;
      const G = Number(r.expAshish) || 0;
      const F = Number(r.penaltyGSTCN) || 0;

      // Profit/Loss per month: H = A - B - C - D - E + F - G
      const H = A - B - C - D - E + F - G;

      // Office Exp: I = 10% of H (if H > 0)
      const I = H > 0 ? (H * officeExpRate) : 0;

      // Net P/L: J = H - I
      const J = H - I;

      sumA += A;
      sumB += B;
      sumC += C;
      sumD += D;
      sumE += E;
      sumG += G;
      sumF += F;
      sumH += H;
      sumI += I;
      sumJ += J;

      // Check recipient for office expense: Hariom up to Sep-26, Ashish from Oct-26 onwards
      const isHariomOffice = typeof Utils !== 'undefined' && typeof Utils.isHariomOfficeMonth === 'function'
        ? Utils.isHariomOfficeMonth(r.month)
        : true;
      if (isHariomOffice) {
        hariomOfficeExp += I;
      } else {
        ashishOfficeExp += I;
      }

      // Group into dynamic yearly buckets
      const m = String(r.month || '');
      let yrKey = 'Other';
      const d = typeof Utils !== 'undefined' && typeof Utils.parseMonth === 'function' ? Utils.parseMonth(m) : null;
      if (d) {
        const fullYr = d.getFullYear();
        if (fullYr === 2023) yrKey = '2023 (May-Dec)';
        else yrKey = String(fullYr);
      } else {
        const parts = m.split(/[- /]/);
        if (parts[1]) {
          let y = parseInt(parts[1], 10);
          if (y < 100) y += 2000;
          if (y === 2023) yrKey = '2023 (May-Dec)';
          else yrKey = String(y);
        }
      }

      if (!yearData[yrKey]) {
        yearData[yrKey] = { bill: 0, pl: 0, netPL: 0 };
      }
      yearData[yrKey].bill += A;
      yearData[yrKey].pl += H;
      yearData[yrKey].netPL += J;
    });

    const yearLabels = Object.keys(yearData);

    // 3. Partner Share calculations
    const ashishPct = config.ashishShare != null ? Number(config.ashishShare) : 0.4682;
    const hariomPct = config.hariomShare != null ? Number(config.hariomShare) : 0.5318;

    const ashishShare = sumJ * ashishPct;
    const hariomShare = sumJ * hariomPct;
    const ashishTotal = ashishShare + ashishOfficeExp;
    const hariomTotal = hariomShare + hariomOfficeExp;

    // 4. Capital Project Cost calculation
    const capItems = capitalInvestment.items || [];
    let capGross = 0;
    let capDeductions = 0;
    capItems.forEach(item => {
      capGross += Number(item.grossAmount) || 0;
      capDeductions += Number(item.deductions) || 0;
    });
    const capitalProjectCost = capGross + capDeductions;

    // Contract parameters display variables
    const ratePerBusVal = config.ratePerBus != null ? U.formatCurrency(config.ratePerBus) : '₹52';
    const gstRateVal = config.gstRate != null ? `${Math.round(config.gstRate * 100)}%` : '18%';
    const cgstSgstDesc = `CGST ${Math.round((config.cgstRate || 0.09) * 100)}% + SGST ${Math.round((config.sgstRate || 0.09) * 100)}%`;
    const ashishPctStr = `${(ashishPct * 100).toFixed(2)}%`;
    const hariomPctStr = `${(hariomPct * 100).toFixed(2)}%`;
    const officeExpRuleStr = `${Math.round(officeExpRate * 100)}% of monthly Profit/Loss (H) if H > 0`;
    const deprRateVal = `${Math.round((config.depreciationRate != null ? config.depreciationRate : 0.15) * 100)}% WDV`;

    // Render HTML structure
    container.innerHTML = `
      <div class="page-header">
        <h2>Executive Dashboard</h2>
        <p>Overview of UPSRTC Bus Washing Contract &bull; Badaun Depot &bull; 38-Month Financial Summary &amp; Settlement</p>
      </div>

      <!-- Top KPI Cards Grid -->
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="kpi-card blue">
          <div class="kpi-label">Total Bill To UPSRTC</div>
          <div class="kpi-value">${U.formatCurrency(totalBilledUPSRTC)}</div>
          <div class="kpi-sub">38 Months Gross Billed (Line Item A)</div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-label">Cumulative Net P/L</div>
          <div class="kpi-value positive">${U.formatCurrency(sumJ)}</div>
          <div class="kpi-sub">Net Profit After 10% Office Exp</div>
        </div>

        <div class="kpi-card orange">
          <div class="kpi-label">Ashish Singh Share (46.82%)</div>
          <div class="kpi-value">${U.formatCurrency(ashishShare)}</div>
          <div class="kpi-sub">46.82% of Net Profit/Loss (Capital Ratio)</div>
        </div>

        <div class="kpi-card purple">
          <div class="kpi-label">Hariom Singh Share (53.18%)</div>
          <div class="kpi-value">${U.formatCurrency(hariomShare)}</div>
          <div class="kpi-sub">53.18% of Net Profit/Loss (Capital Ratio)</div>
        </div>

        <div class="kpi-card teal" style="border-left: 4px solid #319795;">
          <div class="kpi-label">10% Office Expense</div>
          <div class="kpi-value" style="color:#234e52;">${U.formatCurrency(sumI)}</div>
          <div class="kpi-sub">Separate Operating Expense (No Capital % Impact)</div>
        </div>
      </div>

      <!-- Parameters & Financial Breakdown Tables Grid -->
      <div class="charts-grid" style="margin-bottom: 20px;">
        <!-- Left Side: Contract & Partnership Parameters -->
        <div class="card">
          <div class="card-title">Contract &amp; Partnership Parameters</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th class="num">Value</th>
                  <th>Contract Rule / Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Rate Per Bus</strong></td>
                  <td class="num"><strong>${ratePerBusVal}</strong></td>
                  <td>Fixed rate per washed &amp; approved bus</td>
                </tr>
                <tr>
                  <td><strong>CGST + SGST Rate</strong></td>
                  <td class="num"><strong>${gstRateVal}</strong></td>
                  <td>${cgstSgstDesc} (HSN Code ${config.hsnCode || '9955'})</td>
                </tr>
                <tr>
                  <td><strong>Ashish Share</strong></td>
                  <td class="num"><strong>${ashishPctStr}</strong></td>
                  <td>Partnership sharing ratio on Net P/L</td>
                </tr>
                <tr>
                  <td><strong>Hariom Share</strong></td>
                  <td class="num"><strong>${hariomPctStr}</strong></td>
                  <td>Partnership sharing ratio on Net P/L</td>
                </tr>
                <tr>
                  <td><strong>10% Office Exp rule</strong></td>
                  <td class="num"><strong>${Math.round(officeExpRate * 100)}%</strong></td>
                  <td>${officeExpRuleStr} (Hariom up to Sep-26, Ashish from Oct-26)</td>
                </tr>
                <tr>
                  <td><strong>Capital Project Cost</strong></td>
                  <td class="num"><strong>${U.formatCurrency(capitalProjectCost)}</strong></td>
                  <td>Net Plant Setup (Gross ${U.formatCurrency(capGross)} less ${U.formatCurrency(Math.abs(capDeductions))})</td>
                </tr>
                <tr>
                  <td><strong>Depreciation Rate</strong></td>
                  <td class="num"><strong>${deprRateVal}</strong></td>
                  <td>15% Written Down Value (WDV) method</td>
                </tr>
                <tr>
                  <td><strong>Contract Records</strong></td>
                  <td class="num"><strong>${profitSettlement.length} Months</strong></td>
                  <td>${profitSettlement.length > 0 ? profitSettlement[0].month + ' to ' + profitSettlement[profitSettlement.length - 1].month : 'Flexible'} &bull; ${config.depot || 'Badaun Depot'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Side: Financial Breakdown -->
        <div class="card">
          <div class="card-title">${profitSettlement.length}-Month Financial Breakdown</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Line Item</th>
                  <th class="num">Cumulative Total</th>
                  <th class="num">% of Billing</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge badge-blue">A</span></td>
                  <td><strong>Bill To UPSRTC</strong></td>
                  <td class="num positive"><strong>${U.formatCurrency(sumA)}</strong></td>
                  <td class="num">100.00%</td>
                </tr>
                <tr>
                  <td><span class="badge badge-yellow">B</span></td>
                  <td>Penalty</td>
                  <td class="num negative">${U.formatCurrency(sumB)}</td>
                  <td class="num">${((sumB / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td><span class="badge badge-yellow">C</span></td>
                  <td>Electricity</td>
                  <td class="num negative">${U.formatCurrency(sumC)}</td>
                  <td class="num">${((sumC / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td><span class="badge badge-yellow">D</span></td>
                  <td>Exp Hariom</td>
                  <td class="num negative">${U.formatCurrency(sumD)}</td>
                  <td class="num">${((sumD / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td><span class="badge badge-yellow">E</span></td>
                  <td>Bill GST</td>
                  <td class="num negative">${U.formatCurrency(sumE)}</td>
                  <td class="num">${((sumE / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td><span class="badge badge-yellow">G</span></td>
                  <td>Exp Ashish</td>
                  <td class="num negative">${U.formatCurrency(sumG)}</td>
                  <td class="num">${((sumG / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td><span class="badge badge-green">F</span></td>
                  <td>Penalty GST CN</td>
                  <td class="num positive">${U.formatCurrency(sumF)}</td>
                  <td class="num">${((sumF / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr class="total-row">
                  <td><span class="badge badge-blue">H</span></td>
                  <td><strong>Profit/Loss (H=A-B-C-D-E+F-G)</strong></td>
                  <td class="num ${sumH >= 0 ? 'positive' : 'negative'}"><strong>${U.formatCurrency(sumH)}</strong></td>
                  <td class="num"><strong>${((sumH / sumA) * 100).toFixed(2)}%</strong></td>
                </tr>
                <tr>
                  <td><span class="badge badge-yellow">I</span></td>
                  <td>10% Office Exp</td>
                  <td class="num negative">${U.formatCurrency(sumI)}</td>
                  <td class="num">${((sumI / sumA) * 100).toFixed(2)}%</td>
                </tr>
                <tr class="total-row" style="background: #e6fffa !important;">
                  <td><span class="badge badge-green">J</span></td>
                  <td><strong>Net P/L (J=H-I)</strong></td>
                  <td class="num ${sumJ >= 0 ? 'positive' : 'negative'}"><strong>${U.formatCurrency(sumJ)}</strong></td>
                  <td class="num"><strong>${((sumJ / sumA) * 100).toFixed(2)}%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Charts Section Grid -->
      <div class="charts-grid">
        <!-- Partner Allocation PIE Chart -->
        <div class="card">
          <div class="card-title">Net Profit Distribution &amp; Office Expense Split</div>
          <div class="chart-container">
            <canvas id="dashboard-pie-chart"></canvas>
          </div>
          <div style="display: flex; justify-content: space-around; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 12px; text-align: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="width: 10px; height: 10px; background: #dd6b20; border-radius: 50%; display: inline-block;"></span>
                <strong>Ashish Singh (46.82%):</strong> <span>${U.formatCurrency(ashishShare)}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Capital Equity Profit Share</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="width: 10px; height: 10px; background: #805ad5; border-radius: 50%; display: inline-block;"></span>
                <strong>Hariom Singh (53.18%):</strong> <span>${U.formatCurrency(hariomShare)}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Capital Equity Profit Share</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="width: 10px; height: 10px; background: #319795; border-radius: 50%; display: inline-block;"></span>
                <strong>10% Office Expense:</strong> <span>${U.formatCurrency(sumI)}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Separate Operating Field</div>
            </div>
          </div>
        </div>

        <!-- Yearly Performance BAR Chart -->
        <div class="card">
          <div class="card-title">Yearly Financial Performance Summary</div>
          <div class="chart-container">
            <canvas id="dashboard-bar-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Render Charts using window.Chart
    if (typeof window.Chart !== 'undefined') {
      // 1. Partner Allocation Pie Chart
      const pieCanvas = container.querySelector('#dashboard-pie-chart');
      if (pieCanvas) {
        const pieChart = new window.Chart(pieCanvas, {
          type: 'pie',
          data: {
            labels: [
              `Ashish Singh Share (46.82%)`,
              `Hariom Singh Share (53.18%)`,
              `10% Office Expense (Separate Field)`
            ],
            datasets: [{
              data: [Math.round(ashishShare), Math.round(hariomShare), Math.round(sumI)],
              backgroundColor: ['#dd6b20', '#805ad5', '#319795'],
              hoverBackgroundColor: ['#c05621', '#6b46c1', '#234e52'],
              borderColor: '#ffffff',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 16,
                  boxWidth: 14,
                  font: { family: "'Segoe UI', Tahoma, sans-serif", size: 12 }
                }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const val = ctx.raw || 0;
                    const total = Math.round(ashishShare + hariomShare + sumI);
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                    return ` ${ctx.label}: ${U.formatCurrency(val)} (${pct}%)`;
                  }
                }
              }
            }
          }
        });
        window.DashboardModule._chartInstances.push(pieChart);
      }

      // 2. Yearly Performance Bar Chart
      const barCanvas = container.querySelector('#dashboard-bar-chart');
      if (barCanvas) {
        const barChart = new window.Chart(barCanvas, {
          type: 'bar',
          data: {
            labels: yearLabels,
            datasets: [
              {
                label: 'Bill To UPSRTC',
                data: yearLabels.map(k => Math.round(yearData[k].bill)),
                backgroundColor: '#3182ce',
                borderColor: '#2b6cb0',
                borderWidth: 1,
                borderRadius: 4
              },
              {
                label: 'Profit/Loss',
                data: yearLabels.map(k => Math.round(yearData[k].pl)),
                backgroundColor: '#d69e2e',
                borderColor: '#b7791f',
                borderWidth: 1,
                borderRadius: 4
              },
              {
                label: 'Net P/L',
                data: yearLabels.map(k => Math.round(yearData[k].netPL)),
                backgroundColor: '#38a169',
                borderColor: '#276749',
                borderWidth: 1,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 16,
                  boxWidth: 14,
                  font: { family: "'Segoe UI', Tahoma, sans-serif", size: 12 }
                }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${U.formatCurrency(ctx.raw)}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false }
              },
              y: {
                grid: { color: '#edf2f7' },
                ticks: {
                  callback: (val) => {
                    if (Math.abs(val) >= 100000) {
                      return '₹' + (val / 100000).toFixed(1) + 'L';
                    }
                    return U.formatCurrency(val);
                  }
                }
              }
            }
          }
        });
        window.DashboardModule._chartInstances.push(barChart);
      }
    } else {
      console.warn('Chart.js (window.Chart) is not loaded.');
      const chartContainers = container.querySelectorAll('.chart-container');
      chartContainers.forEach(cc => {
        cc.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">Chart library not loaded</div>';
      });
    }
  }
};
