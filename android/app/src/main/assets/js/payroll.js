// ============================================================
// MAYUR ENTERPRISES — STAFF PAYROLL & ADVANCE SETTLEMENT MODULE
// ============================================================
window.PayrollModule = (function() {
  'use strict';

  // State variables
  let payrollData = [];
  let advancesData = [];
  let activeTab = 'tab-payroll'; // 'tab-payroll' or 'tab-advances'
  let filterMonth = 'ALL';
  let filterEmployee = 'ALL';
  let showAdvanceFormCard = false;
  let showPayrollFormCard = false;
  let editingPayrollIndex = -1;

  // Month normalization helper
  function normalizeMonth(m) {
    if (!m) return '';
    m = String(m).trim().toLowerCase();
    const match = m.match(/^([a-z]{3})[- ]?(\d{2,4})$/);
    if (match) {
      const mon = match[1];
      let yr = match[2];
      if (yr.length === 4) yr = yr.slice(2);
      return `${mon}-${yr}`;
    }
    return m;
  }

  function isSameMonth(m1, m2) {
    if (!m1 || !m2) return false;
    if (m1 === m2) return true;
    return normalizeMonth(m1) === normalizeMonth(m2);
  }

  function isSameEmployee(e1, e2) {
    if (!e1 || !e2) return false;
    return String(e1).trim().toLowerCase() === String(e2).trim().toLowerCase();
  }

  // Load data from LocalStorage or SEED_DATA
  function loadData() {
    const localPayroll = Utils.loadLocal('payroll');
    if (localPayroll && Array.isArray(localPayroll) && localPayroll.length > 0) {
      payrollData = localPayroll;
    } else if (window.SEED_DATA && Array.isArray(window.SEED_DATA.payroll)) {
      payrollData = JSON.parse(JSON.stringify(window.SEED_DATA.payroll));
    } else {
      payrollData = [
        { employee: 'Ashu', month: 'Jun-2026', dutyHours: 300, otHours: 12, hourlyRate: 33.33 },
        { employee: 'Vipin', month: 'Jun-2026', dutyHours: 300, otHours: 10, hourlyRate: 33.33 },
        { employee: 'Yogesh', month: 'Jun-2026', dutyHours: 300, otHours: 8, hourlyRate: 33.33 },
        { employee: 'Vishal', month: 'Jun-2026', dutyHours: 300, otHours: 10, hourlyRate: 33.33 }
      ];
    }

    // Ensure all entries have hourly parameters (removing static basic salary dependency)
    payrollData.forEach(p => {
      if (p.dutyHours == null) {
        p.dutyHours = (p.baseSalary && p.baseSalary > 0) ? Math.round(p.baseSalary / 33.33) : 300;
      }
      if (p.hourlyRate == null) {
        p.hourlyRate = p.otRate || 33.33;
      }
      if (p.otHours == null) p.otHours = 0;
    });

    const localAdvances = Utils.loadLocal('advances');
    if (localAdvances && Array.isArray(localAdvances) && localAdvances.length > 0) {
      advancesData = localAdvances;
    } else if (window.SEED_DATA && Array.isArray(window.SEED_DATA.advances)) {
      advancesData = JSON.parse(JSON.stringify(window.SEED_DATA.advances));
    } else {
      advancesData = [
        { date: '2026-06-03', employee: 'Ashu', salaryMonth: 'Jun-2026', paidBy: 'Ashish Singh', amount: 2000, paymentMode: 'UPI', notes: 'Advance entry' },
        { date: '2026-06-06', employee: 'Vipin', salaryMonth: 'Jun-2026', paidBy: 'Hariom Singh', amount: 1500, paymentMode: 'Cash', notes: 'Advance entry' },
        { date: '2026-06-09', employee: 'Yogesh', salaryMonth: 'Jun-2026', paidBy: 'Ashish Singh', amount: 1000, paymentMode: 'UPI', notes: 'Advance entry' },
        { date: '2026-06-10', employee: 'Vishal', salaryMonth: 'Jun-2026', paidBy: 'Hariom Singh', amount: 2500, paymentMode: 'Cash', notes: 'Advance entry' }
      ];
    }

    // Sync to window.SEED_DATA
    if (window.SEED_DATA) {
      window.SEED_DATA.payroll = payrollData;
      window.SEED_DATA.advances = advancesData;
    }
  }

  function persistPayroll() {
    Utils.saveLocal('payroll', payrollData);
    if (window.SEED_DATA) window.SEED_DATA.payroll = payrollData;
  }

  function persistAdvances() {
    Utils.saveLocal('advances', advancesData);
    if (window.SEED_DATA) window.SEED_DATA.advances = advancesData;
  }

  // Get total advances for a specific employee & month
  function getAdvanceTotalFor(employee, month) {
    return advancesData
      .filter(a => isSameEmployee(a.employee, employee) && isSameMonth(a.salaryMonth, month))
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }

  // Available staff members
  function getStaffList() {
    const list = Utils.getEmployeeNames ? Utils.getEmployeeNames() : ['Ashu', 'Vipin', 'Yogesh', 'Vishal'];
    const set = new Set(list);
    payrollData.forEach(p => { if (p.employee) set.add(p.employee); });
    advancesData.forEach(a => { if (a.employee) set.add(a.employee); });
    return Array.from(set);
  }

  // Distinct list of months
  function getMonthsList() {
    const set = new Set();
    payrollData.forEach(p => { if (p.month) set.add(p.month); });
    advancesData.forEach(a => { if (a.salaryMonth) set.add(a.salaryMonth); });
    if (set.size === 0) set.add('Jun-2026');

    // Add standard contract months from Utils if available
    if (Utils.getMonthsList) {
      Utils.getMonthsList().forEach(m => {
        // e.g. Jun-26 -> Jun-2026 format support
        set.add(m);
      });
    }
    return Array.from(set);
  }

  // Calculate summary KPIs based on current filters (Hourly procedure)
  function calculateSummaryKPIs() {
    let filteredPayroll = payrollData.slice();
    if (filterEmployee !== 'ALL') {
      filteredPayroll = filteredPayroll.filter(p => isSameEmployee(p.employee, filterEmployee));
    }
    if (filterMonth !== 'ALL') {
      filteredPayroll = filteredPayroll.filter(p => isSameMonth(p.month, filterMonth));
    }

    let totalDutyHours = 0;
    let totalOTHours = 0;
    let totalGross = 0;
    let totalAdvance = 0;
    let totalNetBalance = 0;

    filteredPayroll.forEach(p => {
      const duty = Number(p.dutyHours) != null ? Number(p.dutyHours) : 300;
      const ot = Number(p.otHours) || 0;
      const rate = Number(p.hourlyRate) || 33.33;
      const gross = (duty + ot) * rate;
      const adv = getAdvanceTotalFor(p.employee, p.month);
      const net = gross - adv;

      totalDutyHours += duty;
      totalOTHours += ot;
      totalGross += gross;
      totalAdvance += adv;
      totalNetBalance += net;
    });

    return {
      totalDutyHours,
      totalOTHours,
      totalHours: totalDutyHours + totalOTHours,
      totalGross,
      totalAdvance,
      totalNetBalance,
      staffCount: filteredPayroll.length
    };
  }

  // Main render method
  function render(container) {
    loadData();

    // Reset container
    container.innerHTML = '';

    // 1. Page Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2>STAFF HOURLY PAYROLL, OVERTIME &amp; 15TH-OF-MONTH ADVANCE SETTLEMENT</h2>
      <p>Staff Roster: Ashu, Vipin, Yogesh, Vishal &bull; Purely Hourly Salary Procedure (Shift Hours + Overtime at Same Rate &bull; Mid-Month Advance Deductions)</p>
    `;
    container.appendChild(header);

    // 2. KPI Summary Grid
    const kpis = calculateSummaryKPIs();
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'kpi-grid';
    kpiGrid.id = 'payroll-kpi-grid';
    kpiGrid.innerHTML = `
      <div class="kpi-card blue">
        <div class="kpi-label">Total Shift Hours Worked</div>
        <div class="kpi-value" id="kpi-duty">${Utils.formatNumber(kpis.totalDutyHours)} Hrs</div>
        <div class="kpi-sub">${kpis.staffCount} Staff evaluated (Standard 10h shift)</div>
      </div>
      <div class="kpi-card orange">
        <div class="kpi-label">Total Overtime Hours</div>
        <div class="kpi-value" id="kpi-ot">${Utils.formatNumber(kpis.totalOTHours)} Hrs</div>
        <div class="kpi-sub">Calculated at standard hourly rate</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-label">Total Advances Taken</div>
        <div class="kpi-value" id="kpi-adv">${Utils.formatCurrency(kpis.totalAdvance)}</div>
        <div class="kpi-sub">Mid-month advances (1st-15th)</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Net Balance Payable on 15th</div>
        <div class="kpi-value" id="kpi-net">${Utils.formatCurrency(kpis.totalNetBalance)}</div>
        <div class="kpi-sub">Total Gross Earned minus Advances</div>
      </div>
    `;
    container.appendChild(kpiGrid);

    // 3. Global Filter Toolbar
    const filterCard = document.createElement('div');
    filterCard.className = 'card';
    filterCard.style.padding = '14px 18px';
    filterCard.style.marginBottom = '16px';

    const staffList = getStaffList();
    const monthsList = getMonthsList();

    let staffOptions = '<option value="ALL">All Staff Members</option>';
    staffList.forEach(s => {
      staffOptions += `<option value="${s}" ${filterEmployee === s ? 'selected' : ''}>${s}</option>`;
    });

    let monthOptions = '<option value="ALL">All Months</option>';
    // Prioritize months present in data
    const sortedMonths = Array.from(new Set([...payrollData.map(p => p.month), ...advancesData.map(a => a.salaryMonth), ...monthsList]));
    sortedMonths.forEach(m => {
      if (!m) return;
      monthOptions += `<option value="${m}" ${filterMonth === m ? 'selected' : ''}>${m}</option>`;
    });

    filterCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <strong style="font-size:12px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Filter:</strong>
          <div class="form-group" style="min-width:160px; margin-bottom:0;">
            <select id="payroll-filter-month" style="padding:6px 10px; font-size:12px;">
              ${monthOptions}
            </select>
          </div>
          <div class="form-group" style="min-width:160px; margin-bottom:0;">
            <select id="payroll-filter-employee" style="padding:6px 10px; font-size:12px;">
              ${staffOptions}
            </select>
          </div>
          <button class="btn btn-outline btn-sm" id="payroll-filter-reset" title="Reset Filters">Clear Filters</button>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline btn-sm" id="btn-restore-seed" title="Restore seed data from Excel config">↺ Reset to Seed Data</button>
        </div>
      </div>
    `;
    container.appendChild(filterCard);

    // 4. Tab Navigation Bar
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    tabBar.innerHTML = `
      <button class="tab-btn ${activeTab === 'tab-payroll' ? 'active' : ''}" id="btn-tab-payroll" data-target="tab-payroll">
        💼 Monthly Payroll
      </button>
      <button class="tab-btn ${activeTab === 'tab-advances' ? 'active' : ''}" id="btn-tab-advances" data-target="tab-advances">
        📝 Advance Ledger
      </button>
      <button class="tab-btn ${activeTab === 'tab-employees' ? 'active' : ''}" id="btn-tab-employees" data-target="tab-employees">
        👨‍💼 Employee Master (कर्मचारी सूची)
      </button>
    `;
    container.appendChild(tabBar);

    // 5. Tab Content: Tab A - Monthly Payroll
    const tabPayroll = document.createElement('div');
    tabPayroll.id = 'tab-payroll';
    tabPayroll.className = `tab-content ${activeTab === 'tab-payroll' ? 'active' : ''}`;
    tabPayroll.innerHTML = renderMonthlyPayrollTabHTML();
    container.appendChild(tabPayroll);

    // 6. Tab Content: Tab B - Advance Ledger
    const tabAdvances = document.createElement('div');
    tabAdvances.id = 'tab-advances';
    tabAdvances.className = `tab-content ${activeTab === 'tab-advances' ? 'active' : ''}`;
    tabAdvances.innerHTML = renderAdvanceLedgerTabHTML();
    container.appendChild(tabAdvances);

    // 7. Tab Content: Tab C - Employee Master
    const tabEmployees = document.createElement('div');
    tabEmployees.id = 'tab-employees';
    tabEmployees.className = `tab-content ${activeTab === 'tab-employees' ? 'active' : ''}`;
    tabEmployees.innerHTML = renderEmployeeMasterTabHTML();
    container.appendChild(tabEmployees);

    // 8. Attach All Event Listeners
    attachEventListeners(container);
  }

  // ------------------------------------------------------------
  // TAB A: Monthly Payroll HTML Generation
  // ------------------------------------------------------------
  function renderMonthlyPayrollTabHTML() {
    let filtered = payrollData.slice();
    if (filterEmployee !== 'ALL') {
      filtered = filtered.filter(p => isSameEmployee(p.employee, filterEmployee));
    }
    if (filterMonth !== 'ALL') {
      filtered = filtered.filter(p => isSameMonth(p.month, filterMonth));
    }

    let rowsHTML = '';
    let sumDutyHours = 0;
    let sumOTHours = 0;
    let sumTotalHours = 0;
    let sumGross = 0;
    let sumAdvance = 0;
    let sumNet = 0;

    if (filtered.length === 0) {
      rowsHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-muted);">No payroll records found for the selected criteria. Click "+ Add / Update Salary" to create one.</td></tr>`;
    } else {
      filtered.forEach((p) => {
        const originalIdx = payrollData.indexOf(p);
        const dutyHrs = Number(p.dutyHours) != null ? Number(p.dutyHours) : 300;
        const otHrs = Number(p.otHours) || 0;
        const hourlyRt = Number(p.hourlyRate) || 33.33;
        const totalHrs = dutyHrs + otHrs;
        const gross = Math.round(totalHrs * hourlyRt);
        const totalAdv = getAdvanceTotalFor(p.employee, p.month);
        const netBal = gross - totalAdv;

        sumDutyHours += dutyHrs;
        sumOTHours += otHrs;
        sumTotalHours += totalHrs;
        sumGross += gross;
        sumAdvance += totalAdv;
        sumNet += netBal;

        // Visual badge for net payable
        const netBadgeClass = netBal >= 0 ? 'badge-blue' : 'badge-yellow';

        rowsHTML += `
          <tr>
            <td><strong>${p.employee}</strong></td>
            <td><span class="badge badge-blue">${p.month}</span></td>
            <td class="num">${Utils.formatNumber(dutyHrs)} hrs</td>
            <td class="num" style="color:var(--primary); font-weight:700;">${Utils.formatNumber(otHrs)} hrs</td>
            <td class="num font-bold">${Utils.formatNumber(totalHrs)} hrs</td>
            <td class="num">₹${hourlyRt.toFixed(2)}/hr</td>
            <td class="num" style="font-weight:700;">${Utils.formatCurrency(gross)}</td>
            <td class="num" style="color:var(--danger); font-weight:600;">${Utils.formatCurrency(totalAdv)}</td>
            <td class="num ${netBal >= 0 ? 'positive' : 'negative'}" style="font-size:13px; font-weight:700;">
              <span class="badge ${netBadgeClass}">${Utils.formatCurrency(netBal)}</span>
            </td>
            <td style="text-align:center; white-space:nowrap;">
              <button class="btn btn-outline btn-sm btn-edit-payroll" data-index="${originalIdx}" title="Edit Hours &amp; Rates">✏️</button>
              <button class="btn btn-outline btn-sm btn-delete-payroll" data-index="${originalIdx}" style="color:var(--danger); border-color:#feb2b2;" title="Delete Record">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    const totalRowHTML = `
      <tr class="total-row">
        <td>TOTAL (${filtered.length} Staff)</td>
        <td>-</td>
        <td class="num">${Utils.formatNumber(sumDutyHours)} hrs</td>
        <td class="num" style="color:var(--primary);">${Utils.formatNumber(sumOTHours)} hrs</td>
        <td class="num font-bold">${Utils.formatNumber(sumTotalHours)} hrs</td>
        <td class="num">-</td>
        <td class="num">${Utils.formatCurrency(sumGross)}</td>
        <td class="num" style="color:var(--danger);">${Utils.formatCurrency(sumAdvance)}</td>
        <td class="num" style="color:var(--primary); font-size:14px;">${Utils.formatCurrency(sumNet)}</td>
        <td></td>
      </tr>
    `;

    const staffList = getStaffList();
    const monthsList = getMonthsList();

    const payrollFormDisplay = showPayrollFormCard ? 'block' : 'none';

    return `
      <!-- Collapsible Add/Update Payroll Form Card -->
      <div class="card" id="card-payroll-form" style="display:${payrollFormDisplay}; background:#fcfdfd; border:1px solid #cbd5e0; margin-bottom:16px;">
        <div class="card-title" id="payroll-form-title">
          ${editingPayrollIndex >= 0 ? '✏️ Edit Staff Hours & Overtime Entry' : '➕ Add Staff Monthly Hours & Overtime Entry'}
        </div>
        <form id="form-payroll">
          <div class="form-row">
            <div class="form-group">
              <label>Staff Member</label>
              <select id="payroll-form-employee" required>
                ${staffList.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Salary Month</label>
              <input type="text" id="payroll-form-month" list="datalist-payroll-months" placeholder="e.g. Jun-2026" required value="Jun-2026">
              <datalist id="datalist-payroll-months">
                ${monthsList.map(m => `<option value="${m}"></option>`).join('')}
              </datalist>
            </div>
            <div class="form-group">
              <label>Duty Shift Hours Worked</label>
              <input type="number" id="payroll-form-dutyhours" min="0" step="1" value="300" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Overtime (OT) Hours Worked</label>
              <input type="number" id="payroll-form-othours" min="0" step="0.5" value="0" placeholder="e.g. 10" required>
            </div>
            <div class="form-group">
              <label>Hourly Rate (₹/Hr - Same for Duty &amp; OT)</label>
              <input type="number" id="payroll-form-rate" min="0" step="0.01" value="33.33" required>
            </div>
            <div class="form-group">
              <label>Calculated Gross Earned (₹)</label>
              <input type="text" id="payroll-form-gross-preview" value="₹10,000" readonly style="background:#edf2f7; font-weight:700; color:var(--primary);">
            </div>
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-success" id="btn-save-payroll">💾 Save Hours &amp; Rate</button>
            <button type="button" class="btn btn-outline" id="btn-cancel-payroll">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Main Payroll Table Card -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          <div class="card-title" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
            Monthly Staff Hourly Payroll &amp; Overtime Register
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" id="btn-toggle-payroll-form">
              ➕ Add / Update Hours
            </button>
          </div>
        </div>

        <div style="font-size:11px; color:var(--text-muted); margin-bottom:12px; line-height:1.5;">
          • <strong>Hourly Basis:</strong> Salary is calculated purely per hour (Duty Hours + Overtime Hours) at the same hourly rate.<br>
          • <strong>15th Advance Deduction:</strong> Mid-month advances (1st–15th) are automatically subtracted to arrive at Net Payable on 15th.
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th class="num">Duty Hours (ड्यूटी घंटे)</th>
                <th class="num" style="color:var(--primary); font-weight:700;">OT Hours (ओवरटाइम घंटे)</th>
                <th class="num">Total Hours (कुल घंटे)</th>
                <th class="num">Rate (₹/Hr)</th>
                <th class="num">Gross Earned (कुल ₹)</th>
                <th class="num" style="color:var(--danger);">Advances Deducted (₹)</th>
                <th class="num">Net Balance on 15th (देय ₹)</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
            <tfoot>
              ${totalRowHTML}
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  // TAB B: Advance Ledger HTML Generation
  // ------------------------------------------------------------
  function renderAdvanceLedgerTabHTML() {
    let filtered = advancesData.slice();
    if (filterEmployee !== 'ALL') {
      filtered = filtered.filter(a => isSameEmployee(a.employee, filterEmployee));
    }
    if (filterMonth !== 'ALL') {
      filtered = filtered.filter(a => isSameMonth(a.salaryMonth, filterMonth));
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    let rowsHTML = '';
    let totalAdvanceAmount = 0;

    if (filtered.length === 0) {
      rowsHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No advance payment entries found. Click "+ Add Advance" to record an advance payment.</td></tr>`;
    } else {
      filtered.forEach((adv) => {
        const originalIdx = advancesData.indexOf(adv);
        const amt = Number(adv.amount) || 0;
        totalAdvanceAmount += amt;

        // Payment mode badge
        let modeBadge = `<span class="badge badge-gray">${adv.paymentMode || 'Cash'}</span>`;
        const modeLower = (adv.paymentMode || '').toLowerCase();
        if (modeLower.includes('upi') || modeLower.includes('bank') || modeLower.includes('neft')) {
          modeBadge = `<span class="badge badge-blue">${adv.paymentMode}</span>`;
        } else if (modeLower.includes('cash')) {
          modeBadge = `<span class="badge badge-yellow">${adv.paymentMode}</span>`;
        }

        // Paid by badge
        let paidByBadge = `<span class="badge badge-gray">${adv.paidBy || 'Firm'}</span>`;
        const paidLower = (adv.paidBy || '').toLowerCase();
        if (paidLower.includes('ashish')) {
          paidByBadge = `<span class="badge badge-blue">${adv.paidBy}</span>`;
        } else if (paidLower.includes('hariom')) {
          paidByBadge = `<span class="badge badge-yellow">${adv.paidBy}</span>`;
        }

        rowsHTML += `
          <tr>
            <td>${Utils.formatDate(adv.date)}</td>
            <td><strong>${adv.employee}</strong></td>
            <td><span class="badge badge-blue">${adv.salaryMonth}</span></td>
            <td>${paidByBadge}</td>
            <td class="num" style="color:var(--danger); font-weight:700;">${Utils.formatCurrency(amt)}</td>
            <td>${modeBadge}</td>
            <td>${adv.notes || '-'}</td>
            <td style="text-align:center; white-space:nowrap;">
              <button class="btn btn-outline btn-sm btn-delete-advance" data-index="${originalIdx}" style="color:var(--danger); border-color:#feb2b2;" title="Delete Advance">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    const totalRowHTML = `
      <tr class="total-row">
        <td>TOTAL (${filtered.length} Advances)</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td class="num" style="color:var(--danger); font-size:13px;">${Utils.formatCurrency(totalAdvanceAmount)}</td>
        <td>-</td>
        <td>-</td>
        <td></td>
      </tr>
    `;

    const staffList = getStaffList();
    const monthsList = getMonthsList();
    const advanceFormDisplay = showAdvanceFormCard ? 'block' : 'none';

    return `
      <!-- Collapsible Add Advance Form Card -->
      <div class="card" id="card-advance-form" style="display:${advanceFormDisplay}; background:#fcfdfd; border:1px solid #cbd5e0; margin-bottom:16px;">
        <div class="card-title">📝 Record New Staff Advance Payment</div>
        <form id="form-advance">
          <div class="form-row">
            <div class="form-group">
              <label>Payment Date</label>
              <input type="date" id="adv-form-date" value="${Utils.today()}" required>
            </div>
            <div class="form-group">
              <label>Employee Name</label>
              <select id="adv-form-employee" required>
                ${staffList.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Applicable Salary Month</label>
              <input type="text" id="adv-form-month" list="datalist-adv-months" placeholder="e.g. Jun-2026" required value="Jun-2026">
              <datalist id="datalist-adv-months">
                ${monthsList.map(m => `<option value="${m}"></option>`).join('')}
              </datalist>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Paid By (Partner / Account)</label>
              <select id="adv-form-paidby" required>
                <option value="Ashish Singh">Ashish Singh</option>
                <option value="Hariom Singh">Hariom Singh</option>
                <option value="Firm Bank/Cash">Firm Bank/Cash</option>
              </select>
            </div>
            <div class="form-group">
              <label>Advance Amount (₹)</label>
              <input type="number" id="adv-form-amount" min="1" step="100" placeholder="e.g. 2000" required>
            </div>
            <div class="form-group">
              <label>Payment Mode</label>
              <select id="adv-form-mode" required>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:2;">
              <label>Notes / Reason for Advance</label>
              <input type="text" id="adv-form-notes" placeholder="e.g. Emergency advance, festival advance, partial settlement">
            </div>
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-success" id="btn-save-advance">💾 Save Advance</button>
            <button type="button" class="btn btn-outline" id="btn-cancel-advance">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Advance Ledger Table Card -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          <div class="card-title" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
            Staff Advance Payment Ledger
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" id="btn-toggle-advance-form">
              ➕ Add Advance
            </button>
          </div>
        </div>

        <div style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">
          All mid-month cash/UPI advances taken by staff are automatically deducted from their monthly gross salary on the 15th-of-month settlement.
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Salary Month</th>
                <th>Paid By</th>
                <th class="num">Amount(₹)</th>
                <th>Payment Mode</th>
                <th>Notes</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
            <tfoot>
              ${totalRowHTML}
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  // TAB C: Employee Master HTML Generation (Add / Edit / Delete Staff)
  // ------------------------------------------------------------
  function renderEmployeeMasterTabHTML() {
    const employees = Utils.getEmployees ? Utils.getEmployees() : [];
    const activeStaff = employees.filter(e => e.status !== 'Inactive');
    const totalBaseSalary = activeStaff.reduce((sum, e) => sum + (Number(e.baseSalary) || 0), 0);

    const rowsHTML = employees.length === 0
      ? `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">No employees found. Click "➕ Add Employee" to create one.</td></tr>`
      : employees.map((emp, idx) => {
          const isActive = emp.status !== 'Inactive';
          const badgeClass = isActive ? 'badge-success' : 'badge-danger';
          const statusText = isActive ? 'Active' : 'Inactive';
          return `
            <tr>
              <td style="text-align:center; color:var(--text-muted); font-weight:600;">${idx + 1}</td>
              <td><strong>${emp.name}</strong></td>
              <td>${emp.designation || 'Washing Staff'}</td>
              <td class="num">${Utils.formatCurrency(emp.baseSalary || 10000)}</td>
              <td style="text-align:center;">${emp.shiftHrs || 10} Hrs/Day</td>
              <td class="num">₹${emp.otRate || 50}/hr</td>
              <td>${emp.phone || '-'}</td>
              <td style="text-align:center;"><span class="badge ${badgeClass}">${statusText}</span></td>
              <td class="actions-cell" style="text-align:center;">
                <button class="btn-action edit btn-edit-employee" data-index="${idx}" title="Edit Employee Details">✏️ Edit</button>
                <button class="btn-action delete btn-delete-employee" data-index="${idx}" data-name="${emp.name}" title="Delete Employee">🗑️ Delete</button>
              </td>
            </tr>
          `;
        }).join('');

    return `
      <!-- Employee Master Summary Card -->
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div class="card-title" style="margin-bottom:4px; border-bottom:none; padding-bottom:0;">
              👨‍💼 Employee Master Directory (कर्मचारी प्रबंधन)
            </div>
            <div style="font-size:12px; color:var(--text-muted);">
              Manage UPSRTC washing staff roster. Changes automatically update Attendance, Payroll and Advances dropdowns.
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" id="btn-add-employee">
              ➕ Add New Employee (नया कर्मचारी जोड़ें)
            </button>
          </div>
        </div>

        <div class="kpi-grid" style="margin-top:14px; margin-bottom:8px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <div class="kpi-card blue" style="padding:10px 14px;">
            <div class="kpi-label">Total Staff</div>
            <div class="kpi-value" style="font-size:20px;">${employees.length}</div>
            <div class="kpi-sub">Registered in system</div>
          </div>
          <div class="kpi-card green" style="padding:10px 14px;">
            <div class="kpi-label">Active Staff</div>
            <div class="kpi-value" style="font-size:20px;">${activeStaff.length}</div>
            <div class="kpi-sub">On active duty roster</div>
          </div>
          <div class="kpi-card purple" style="padding:10px 14px;">
            <div class="kpi-label">Monthly Payroll Base</div>
            <div class="kpi-value" style="font-size:20px;">${Utils.formatCurrency(totalBaseSalary)}</div>
            <div class="kpi-sub">Base salary commitment</div>
          </div>
        </div>
      </div>

      <!-- Employee Master Table Card -->
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">#</th>
                <th>Employee Name (नाम)</th>
                <th>Designation / Role</th>
                <th class="num">Base Salary</th>
                <th style="text-align:center;">Daily Shift</th>
                <th class="num">OT Rate</th>
                <th>Phone / Contact</th>
                <th style="text-align:center;">Status</th>
                <th style="text-align:center; width:130px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  // Attach Event Listeners to UI components
  // ------------------------------------------------------------
  function attachEventListeners(container) {
    // 1. Tab Bar switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        activeTab = target;

        // Update tab buttons
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.target === target));

        // Update tab contents
        container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === target));
      });
    });

    // 2. Month and Employee Filters
    const monthSelect = container.querySelector('#payroll-filter-month');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        filterMonth = e.target.value;
        refreshUI(container);
      });
    }

    const employeeSelect = container.querySelector('#payroll-filter-employee');
    if (employeeSelect) {
      employeeSelect.addEventListener('change', (e) => {
        filterEmployee = e.target.value;
        refreshUI(container);
      });
    }

    const resetFiltersBtn = container.querySelector('#payroll-filter-reset');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        filterMonth = 'ALL';
        filterEmployee = 'ALL';
        refreshUI(container);
      });
    }

    // 3. Restore seed data button
    const restoreSeedBtn = container.querySelector('#btn-restore-seed');
    if (restoreSeedBtn) {
      restoreSeedBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to restore original seed data for Payroll and Advances? Any newly added entries will be replaced.')) {
          localStorage.removeItem('ME_payroll');
          localStorage.removeItem('ME_advances');
          loadData();
          refreshUI(container);
        }
      });
    }

    // 4. Tab A: Payroll Form Toggling & OT Realtime calculation
    const togglePayrollBtn = container.querySelector('#btn-toggle-payroll-form');
    if (togglePayrollBtn) {
      togglePayrollBtn.addEventListener('click', () => {
        showPayrollFormCard = !showPayrollFormCard;
        editingPayrollIndex = -1;
        refreshPayrollTab(container);
      });
    }

    const cancelPayrollBtn = container.querySelector('#btn-cancel-payroll');
    if (cancelPayrollBtn) {
      cancelPayrollBtn.addEventListener('click', () => {
        showPayrollFormCard = false;
        editingPayrollIndex = -1;
        refreshPayrollTab(container);
      });
    }

    const dutyInput = container.querySelector('#payroll-form-dutyhours');
    const otHrsInput = container.querySelector('#payroll-form-othours');
    const rateInput = container.querySelector('#payroll-form-rate');
    const grossPreview = container.querySelector('#payroll-form-gross-preview');
    function updateGrossPreview() {
      if (!grossPreview) return;
      const duty = dutyInput ? (Number(dutyInput.value) || 0) : 0;
      const ot = otHrsInput ? (Number(otHrsInput.value) || 0) : 0;
      const rate = rateInput ? (Number(rateInput.value) || 0) : 0;
      grossPreview.value = Utils.formatCurrency((duty + ot) * rate);
    }
    if (dutyInput) dutyInput.addEventListener('input', updateGrossPreview);
    if (otHrsInput) otHrsInput.addEventListener('input', updateGrossPreview);
    if (rateInput) rateInput.addEventListener('input', updateGrossPreview);

    // 5. Submit Payroll Form
    const payrollForm = container.querySelector('#form-payroll');
    if (payrollForm) {
      payrollForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emp = container.querySelector('#payroll-form-employee').value.trim();
        const m = container.querySelector('#payroll-form-month').value.trim();
        const duty = Number(container.querySelector('#payroll-form-dutyhours').value) || 0;
        const otHrs = Number(container.querySelector('#payroll-form-othours').value) || 0;
        const rate = Number(container.querySelector('#payroll-form-rate').value) || 0;

        if (!emp || !m) {
          alert('Please enter employee name and month.');
          return;
        }

        const entry = { employee: emp, month: m, dutyHours: duty, otHours: otHrs, hourlyRate: rate };

        if (editingPayrollIndex >= 0 && editingPayrollIndex < payrollData.length) {
          payrollData[editingPayrollIndex] = entry;
        } else {
          // Check if entry already exists for same employee and month
          const existingIdx = payrollData.findIndex(p => isSameEmployee(p.employee, emp) && isSameMonth(p.month, m));
          if (existingIdx >= 0) {
            payrollData[existingIdx] = entry;
          } else {
            payrollData.push(entry);
          }
        }

        persistPayroll();
        showPayrollFormCard = false;
        editingPayrollIndex = -1;
        refreshUI(container);
      });
    }

    // 6. Edit and Delete Payroll
    container.querySelectorAll('.btn-edit-payroll').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        if (idx >= 0 && idx < payrollData.length) {
          editingPayrollIndex = idx;
          showPayrollFormCard = true;
          refreshPayrollTab(container);

          const item = payrollData[idx];
          const empSelect = container.querySelector('#payroll-form-employee');
          const monthInput = container.querySelector('#payroll-form-month');
          const dutyIn = container.querySelector('#payroll-form-dutyhours');
          const otHoursIn = container.querySelector('#payroll-form-othours');
          const rateIn = container.querySelector('#payroll-form-rate');

          if (empSelect) empSelect.value = item.employee;
          if (monthInput) monthInput.value = item.month;
          if (dutyIn) dutyIn.value = item.dutyHours != null ? item.dutyHours : 300;
          if (otHoursIn) otHoursIn.value = item.otHours || 0;
          if (rateIn) rateIn.value = item.hourlyRate || 33.33;
          updateGrossPreview();

          const formCard = container.querySelector('#card-payroll-form');
          if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    container.querySelectorAll('.btn-delete-payroll').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        if (idx >= 0 && idx < payrollData.length) {
          const item = payrollData[idx];
          if (confirm(`Delete payroll record for ${item.employee} (${item.month})?`)) {
            payrollData.splice(idx, 1);
            persistPayroll();
            refreshUI(container);
          }
        }
      });
    });

    // 7. Tab B: Advance Form Toggling
    const toggleAdvanceBtn = container.querySelector('#btn-toggle-advance-form');
    if (toggleAdvanceBtn) {
      toggleAdvanceBtn.addEventListener('click', () => {
        showAdvanceFormCard = !showAdvanceFormCard;
        refreshAdvanceTab(container);
      });
    }

    const cancelAdvanceBtn = container.querySelector('#btn-cancel-advance');
    if (cancelAdvanceBtn) {
      cancelAdvanceBtn.addEventListener('click', () => {
        showAdvanceFormCard = false;
        refreshAdvanceTab(container);
      });
    }

    // 8. Submit Advance Form
    const advanceForm = container.querySelector('#form-advance');
    if (advanceForm) {
      advanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = container.querySelector('#adv-form-date').value;
        const employee = container.querySelector('#adv-form-employee').value.trim();
        const salaryMonth = container.querySelector('#adv-form-month').value.trim();
        const paidBy = container.querySelector('#adv-form-paidby').value;
        const amount = Number(container.querySelector('#adv-form-amount').value) || 0;
        const paymentMode = container.querySelector('#adv-form-mode').value;
        const notes = container.querySelector('#adv-form-notes').value.trim();

        if (!date || !employee || !salaryMonth || amount <= 0) {
          alert('Please enter valid Date, Employee, Salary Month, and Amount (> 0).');
          return;
        }

        const newAdv = {
          date: date,
          employee: employee,
          salaryMonth: salaryMonth,
          paidBy: paidBy,
          amount: amount,
          paymentMode: paymentMode,
          notes: notes || 'Advance payment'
        };

        advancesData.push(newAdv);
        persistAdvances();

        showAdvanceFormCard = false;
        refreshUI(container);
      });
    }

    // 9. Delete Advance
    container.querySelectorAll('.btn-delete-advance').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        if (idx >= 0 && idx < advancesData.length) {
          const targetAdv = advancesData[idx];
          if (confirm(`Delete advance of ${Utils.formatCurrency(targetAdv.amount)} to ${targetAdv.employee} on ${Utils.formatDate(targetAdv.date)}?`)) {
            advancesData.splice(idx, 1);
            persistAdvances();
            refreshUI(container);
          }
        }
      });
    });

    // 10. Employee Master: Add New Employee
    const addEmpBtn = container.querySelector('#btn-add-employee');
    if (addEmpBtn) {
      addEmpBtn.addEventListener('click', () => {
        const formHTML = `
          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Employee Name (कर्मचारी का नाम)*</label>
            <input type="text" id="modal-emp-name" class="form-control" style="width:100%; padding:8px;" placeholder="e.g. Ramesh Kumar" required>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Designation / Role</label>
            <input type="text" id="modal-emp-role" class="form-control" style="width:100%; padding:8px;" value="Washing Staff" placeholder="e.g. Washing Staff, Supervisor">
          </div>
          <div class="form-row" style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Base Salary (₹/month)</label>
              <input type="number" id="modal-emp-salary" class="form-control" style="width:100%; padding:8px;" value="10000" min="0" step="500">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Shift Hours / Day</label>
              <input type="number" id="modal-emp-shift" class="form-control" style="width:100%; padding:8px;" value="10" min="1" max="24">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">OT Rate (₹/hour)</label>
              <input type="number" id="modal-emp-ot" class="form-control" style="width:100%; padding:8px;" value="50" min="0" step="5">
            </div>
          </div>
          <div class="form-row" style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Phone / Contact</label>
              <input type="text" id="modal-emp-phone" class="form-control" style="width:100%; padding:8px;" placeholder="e.g. 98765-43210">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Status</label>
              <select id="modal-emp-status" class="form-control" style="width:100%; padding:8px;">
                <option value="Active" selected>Active (सक्रिय)</option>
                <option value="Inactive">Inactive (निष्क्रिय)</option>
              </select>
            </div>
          </div>
        `;
        AppModal.show('➕ Add New Employee (नया कर्मचारी जोड़ें)', formHTML, () => {
          const nameInput = document.getElementById('modal-emp-name');
          const name = nameInput ? nameInput.value.trim() : '';
          if (!name) {
            alert('Employee name is required!');
            return;
          }
          const list = Utils.getEmployees();
          if (list.some(e => e.name.toLowerCase() === name.toLowerCase())) {
            alert(`Employee with name "${name}" already exists!`);
            return;
          }
          const newEmp = {
            id: Date.now(),
            name: name,
            designation: document.getElementById('modal-emp-role').value.trim() || 'Washing Staff',
            baseSalary: Number(document.getElementById('modal-emp-salary').value) || 10000,
            shiftHrs: Number(document.getElementById('modal-emp-shift').value) || 10,
            otRate: Number(document.getElementById('modal-emp-ot').value) || 50,
            phone: document.getElementById('modal-emp-phone').value.trim() || '',
            status: document.getElementById('modal-emp-status').value || 'Active'
          };
          list.push(newEmp);
          Utils.saveEmployees(list);
          activeTab = 'tab-employees';
          refreshUI(container);
        });
      });
    }

    // 11. Employee Master: Edit Employee
    container.querySelectorAll('.btn-edit-employee').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const list = Utils.getEmployees();
        if (idx < 0 || idx >= list.length) return;
        const emp = list[idx];
        const oldName = emp.name;

        const formHTML = `
          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Employee Name (कर्मचारी का नाम)*</label>
            <input type="text" id="modal-edit-emp-name" class="form-control" style="width:100%; padding:8px;" value="${emp.name}" required>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Designation / Role</label>
            <input type="text" id="modal-edit-emp-role" class="form-control" style="width:100%; padding:8px;" value="${emp.designation || 'Washing Staff'}">
          </div>
          <div class="form-row" style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Base Salary (₹/month)</label>
              <input type="number" id="modal-edit-emp-salary" class="form-control" style="width:100%; padding:8px;" value="${emp.baseSalary || 10000}" min="0" step="500">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Shift Hours / Day</label>
              <input type="number" id="modal-edit-emp-shift" class="form-control" style="width:100%; padding:8px;" value="${emp.shiftHrs || 10}" min="1" max="24">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">OT Rate (₹/hour)</label>
              <input type="number" id="modal-edit-emp-ot" class="form-control" style="width:100%; padding:8px;" value="${emp.otRate || 50}" min="0" step="5">
            </div>
          </div>
          <div class="form-row" style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Phone / Contact</label>
              <input type="text" id="modal-edit-emp-phone" class="form-control" style="width:100%; padding:8px;" value="${emp.phone || ''}">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Status</label>
              <select id="modal-edit-emp-status" class="form-control" style="width:100%; padding:8px;">
                <option value="Active" ${emp.status !== 'Inactive' ? 'selected' : ''}>Active (सक्रिय)</option>
                <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Inactive (निष्क्रिय)</option>
              </select>
            </div>
          </div>
        `;
        AppModal.show(`✏️ Edit Employee: ${emp.name}`, formHTML, () => {
          const newName = document.getElementById('modal-edit-emp-name').value.trim();
          if (!newName) {
            alert('Employee name is required!');
            return;
          }
          list[idx].name = newName;
          list[idx].designation = document.getElementById('modal-edit-emp-role').value.trim() || 'Washing Staff';
          list[idx].baseSalary = Number(document.getElementById('modal-edit-emp-salary').value) || 10000;
          list[idx].shiftHrs = Number(document.getElementById('modal-edit-emp-shift').value) || 10;
          list[idx].otRate = Number(document.getElementById('modal-edit-emp-ot').value) || 50;
          list[idx].phone = document.getElementById('modal-edit-emp-phone').value.trim() || '';
          list[idx].status = document.getElementById('modal-edit-emp-status').value || 'Active';

          if (oldName && oldName !== newName) {
            payrollData.forEach(p => { if (isSameEmployee(p.employee, oldName)) p.employee = newName; });
            advancesData.forEach(a => { if (isSameEmployee(a.employee, oldName)) a.employee = newName; });
            persistPayroll();
            persistAdvances();
          }

          Utils.saveEmployees(list);
          activeTab = 'tab-employees';
          refreshUI(container);
        });
      });
    });

    // 12. Employee Master: Delete Employee
    container.querySelectorAll('.btn-delete-employee').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const name = e.currentTarget.dataset.name;
        const list = Utils.getEmployees();
        if (idx < 0 || idx >= list.length) return;

        AppModal.confirm(
          '🗑️ Delete Employee',
          `Are you sure you want to delete employee <strong>${name}</strong> from the employee roster?`,
          () => {
            list.splice(idx, 1);
            Utils.saveEmployees(list);
            activeTab = 'tab-employees';
            refreshUI(container);
          }
        );
      });
    });
  }

  // Refresh entire UI while preserving active tab
  function refreshUI(container) {
    // 1. Update KPIs
    const kpis = calculateSummaryKPIs();
    const baseEl = container.querySelector('#kpi-base');
    const otEl = container.querySelector('#kpi-ot');
    const advEl = container.querySelector('#kpi-adv');
    const netEl = container.querySelector('#kpi-net');

    if (baseEl) baseEl.textContent = Utils.formatCurrency(kpis.totalBaseSalary);
    if (otEl) otEl.textContent = Utils.formatCurrency(kpis.totalOTAmount);
    if (advEl) advEl.textContent = Utils.formatCurrency(kpis.totalAdvance);
    if (netEl) netEl.textContent = Utils.formatCurrency(kpis.totalNetBalance);

    // 2. Refresh Tab A content
    const tabPayroll = container.querySelector('#tab-payroll');
    if (tabPayroll) {
      tabPayroll.innerHTML = renderMonthlyPayrollTabHTML();
    }

    // 3. Refresh Tab B content
    const tabAdvances = container.querySelector('#tab-advances');
    if (tabAdvances) {
      tabAdvances.innerHTML = renderAdvanceLedgerTabHTML();
    }

    // 4. Refresh Tab C content
    const tabEmployees = container.querySelector('#tab-employees');
    if (tabEmployees) {
      tabEmployees.innerHTML = renderEmployeeMasterTabHTML();
    }

    // 5. Re-bind listeners
    attachEventListeners(container);
  }

  function refreshPayrollTab(container) {
    const tabPayroll = container.querySelector('#tab-payroll');
    if (tabPayroll) {
      tabPayroll.innerHTML = renderMonthlyPayrollTabHTML();
      attachEventListeners(container);
    }
  }

  function refreshAdvanceTab(container) {
    const tabAdvances = container.querySelector('#tab-advances');
    if (tabAdvances) {
      tabAdvances.innerHTML = renderAdvanceLedgerTabHTML();
      attachEventListeners(container);
    }
  }

  // Initial load
  loadData();

  // Public API
  return {
    render: render,
    setActiveTab: (t) => { activeTab = t; },
    getPayrollData: () => payrollData,
    getAdvancesData: () => advancesData
  };

})();
