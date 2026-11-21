// ============================================================
// EMPLOYEE ATTENDANCE & REPLACEMENT REGISTER MODULE
// ============================================================
window.AttendanceModule = {
  render(container) {
    const D = window.SEED_DATA;
    const config = D.config;
    const data = this.getData();

    container.innerHTML = `
      <div class="page-header">
        <h2>Employee Attendance & Hourly Replacement / Relief Register</h2>
        <p>Tracks Daily 10-Hr Shifts, Partial Absence Hours, Replacement / Relief Employee Hours & Auto-Calculated Earned/Credit Hours</p>
      </div>

      <div class="card" style="padding:12px 20px">
        <div style="display:flex;gap:30px;flex-wrap:wrap;font-size:13px;align-items:center;">
          <div><strong>Standard Shift Hrs/Day:</strong> ${config.stdShiftHrs}</div>
          <div><strong>Monthly Std Days:</strong> ${config.stdMonthlyDays}</div>
          <div><strong>Standard Monthly Hrs:</strong> ${config.stdShiftHrs * config.stdMonthlyDays}</div>
          <div><strong>Active Employees:</strong> ${Utils.getEmployeeNames().join(', ')}</div>
        </div>
      </div>

      <div class="card">
        <div class="tab-bar">
          <button class="tab-btn active" data-tab="daily">📋 Daily Attendance Log</button>
          <button class="tab-btn" data-tab="summary">📊 Monthly Summary</button>
        </div>

        <div class="btn-group no-print" style="margin-bottom:12px;display:flex;gap:8px;">
          <button class="btn btn-primary" id="btn-add-attendance">➕ Add Attendance Entry</button>
          <button class="btn btn-outline" id="btn-goto-staff" title="Add, edit or delete employees in Staff Master">👨‍💼 Manage Employees</button>
        </div>

        <div class="tab-content active" id="tab-daily">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>Month</th><th>Scheduled Employee</th>
                  <th class="num">Shift Hrs</th><th class="num">Hours Worked</th><th class="num">Absent/Left Hrs</th>
                  <th>Relief Employee</th><th class="num">Relief Hours</th><th class="num">OT Hrs</th>
                  <th class="num">Net Credit (Scheduled)</th><th class="num">Net Credit (Relief)</th>
                  <th class="no-print" style="width:130px;">Actions</th>
                </tr>
              </thead>
              <tbody id="att-daily-tbody"></tbody>
            </table>
          </div>
        </div>

        <div class="tab-content" id="tab-summary">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Month</th><th class="num">Own Shift Worked</th>
                  <th class="num">Absent Hrs</th><th class="num">Relief Given Hrs</th>
                  <th class="num">Total Worked + Relief</th><th class="num">Std Monthly Hrs</th>
                  <th class="num">Shortfall Hrs</th><th class="num">Extra/Relief Hrs</th>
                  <th class="num">Net Payable Hrs</th><th class="num">Est. Hour Value (₹)</th>
                </tr>
              </thead>
              <tbody id="att-summary-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });

    // Render daily log
    const dailyTbody = document.getElementById('att-daily-tbody');
    data.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${Utils.formatDate(r.date)}</td>
        <td>${r.month}</td>
        <td><strong>${r.employee}</strong></td>
        <td class="num">${r.shiftHrs}</td>
        <td class="num">${r.hoursWorked}</td>
        <td class="num ${r.absentHrs > 0 ? 'negative' : ''}">${r.absentHrs}</td>
        <td>${r.reliefEmployee || 'None'}</td>
        <td class="num">${r.reliefHoursWorked}</td>
        <td class="num ${r.otHrs > 0 ? 'positive' : ''}">${r.otHrs}</td>
        <td class="num">${r.hoursWorked}</td>
        <td class="num">${r.reliefHoursWorked}</td>
        <td class="actions-cell no-print">
          <button class="btn-action edit btn-edit-att" data-index="${i}" title="Edit Record">✏️ Edit</button>
          <button class="btn-action delete btn-delete-att" data-index="${i}" title="Delete Record">🗑️</button>
        </td>
      `;
      dailyTbody.appendChild(tr);
    });

    if (data.length === 0) {
      dailyTbody.innerHTML = '<tr><td colspan="13" class="empty-state">No attendance records yet. Click "Add Attendance Entry" to begin.</td></tr>';
    }

    // Render monthly summary
    const summaryTbody = document.getElementById('att-summary-tbody');
    const stdHrs = config.stdShiftHrs * config.stdMonthlyDays;
    const hourValue = config.baseSalary / stdHrs;

    // Group by employee and month
    const empMonthMap = {};
    data.forEach(r => {
      const key = r.employee + '|' + r.month;
      if (!empMonthMap[key]) {
        empMonthMap[key] = { employee: r.employee, month: r.month, ownWorked: 0, absent: 0, reliefGiven: 0, otHrs: 0 };
      }
      empMonthMap[key].ownWorked += r.hoursWorked;
      empMonthMap[key].absent += r.absentHrs;
      empMonthMap[key].otHrs += r.otHrs;
    });

    // Calculate relief given (hours where this employee acted as relief for others)
    data.forEach(r => {
      if (r.reliefEmployee && r.reliefEmployee !== 'None') {
        const key = r.reliefEmployee + '|' + r.month;
        if (empMonthMap[key]) {
          empMonthMap[key].reliefGiven += r.reliefHoursWorked;
        }
      }
    });

    Object.values(empMonthMap).forEach(s => {
      const totalWorked = s.ownWorked + s.reliefGiven;
      const shortfall = Math.max(0, stdHrs - totalWorked);
      const extra = Math.max(0, totalWorked - stdHrs);
      const netPayable = totalWorked + s.otHrs;
      const estValue = Math.round(netPayable * hourValue);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${s.employee}</strong></td>
        <td>${s.month}</td>
        <td class="num">${s.ownWorked}</td>
        <td class="num ${s.absent > 0 ? 'negative' : ''}">${s.absent}</td>
        <td class="num">${s.reliefGiven}</td>
        <td class="num"><strong>${totalWorked}</strong></td>
        <td class="num">${stdHrs}</td>
        <td class="num ${shortfall > 0 ? 'negative' : ''}">${shortfall}</td>
        <td class="num ${extra > 0 ? 'positive' : ''}">${extra}</td>
        <td class="num"><strong>${netPayable}</strong></td>
        <td class="num">${Utils.formatCurrency(estValue)}</td>
      `;
      summaryTbody.appendChild(tr);
    });

    if (Object.keys(empMonthMap).length === 0) {
      summaryTbody.innerHTML = '<tr><td colspan="11" class="empty-state">No summary data available.</td></tr>';
    }

    // Go to staff master event
    const btnGotoStaff = document.getElementById('btn-goto-staff');
    if (btnGotoStaff) {
      btnGotoStaff.addEventListener('click', () => {
        if (window.PayrollModule && window.PayrollModule.setActiveTab) {
          window.PayrollModule.setActiveTab('tab-employees');
        }
        const payrollNavItem = document.querySelector('.nav-item[data-id="payroll"]');
        if (payrollNavItem) payrollNavItem.click();
      });
    }

    // Add attendance button
    document.getElementById('btn-add-attendance').addEventListener('click', () => {
      const activeEmps = Utils.getEmployeeNames();
      const empOpts = activeEmps.map(e => `<option>${e}</option>`).join('');
      const reliefOpts = `<option>None</option>` + activeEmps.map(e => `<option>${e}</option>`).join('');
      const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
      const html = `
        <div class="form-row">
          <div class="form-group"><label>Date</label><input id="f-date" type="date" value="${Utils.today()}"></div>
          <div class="form-group">
            <label>Month</label>
            <input id="f-month" list="att-months-list" placeholder="e.g. Oct-2026, Mar-2027" required>
            <datalist id="att-months-list">
              ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
            </datalist>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Employee</label><select id="f-emp">${empOpts}</select></div>
          <div class="form-group"><label>Hours Worked</label><input id="f-worked" type="number" value="10" min="0" max="24"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Absent/Left Hrs</label><input id="f-absent" type="number" value="0" min="0"></div>
          <div class="form-group"><label>Relief Employee</label><select id="f-relief">${reliefOpts}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Relief Hours</label><input id="f-reliefhrs" type="number" value="0" min="0"></div>
          <div class="form-group"><label>OT Hours</label><input id="f-ot" type="number" value="0" min="0"></div>
        </div>
      `;
      window.AppModal.show('➕ Add Attendance Entry', html, () => {
        const dateVal = document.getElementById('f-date').value;
        const entry = {
          date: dateVal,
          month: document.getElementById('f-month').value.trim() || 'Oct-2026',
          employee: document.getElementById('f-emp').value,
          shiftHrs: config.stdShiftHrs,
          hoursWorked: parseInt(document.getElementById('f-worked').value) || 0,
          absentHrs: parseInt(document.getElementById('f-absent').value) || 0,
          reliefEmployee: document.getElementById('f-relief').value,
          reliefHoursWorked: parseInt(document.getElementById('f-reliefhrs').value) || 0,
          otHrs: parseInt(document.getElementById('f-ot').value) || 0
        };
        const allData = this.getData();
        allData.push(entry);
        Utils.saveLocal('attendance', allData);
        this.render(container);
      });
    });

    // Attach Edit and Delete listeners
    container.querySelectorAll('.btn-edit-att').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const r = data[idx];
        if (!r) return;

        const activeEmps = Utils.getEmployeeNames();
        // Ensure current employee is in the options even if marked inactive
        if (r.employee && !activeEmps.includes(r.employee)) activeEmps.push(r.employee);
        const empOpts = activeEmps.map(emp => `<option value="${emp}" ${emp === r.employee ? 'selected' : ''}>${emp}</option>`).join('');
        const reliefOpts = `<option value="None" ${r.reliefEmployee === 'None' || !r.reliefEmployee ? 'selected' : ''}>None</option>` +
          activeEmps.map(emp => `<option value="${emp}" ${emp === r.reliefEmployee ? 'selected' : ''}>${emp}</option>`).join('');
        const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];

        const html = `
          <div class="form-row">
            <div class="form-group"><label>Date</label><input id="edit-att-date" type="date" value="${r.date}"></div>
            <div class="form-group">
              <label>Month</label>
              <input id="edit-att-month" list="edit-att-months-list" value="${r.month}" required>
              <datalist id="edit-att-months-list">
                ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
              </datalist>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Scheduled Employee</label><select id="edit-att-emp">${empOpts}</select></div>
            <div class="form-group"><label>Hours Worked</label><input id="edit-att-worked" type="number" value="${r.hoursWorked}" min="0" max="24"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Absent/Left Hrs</label><input id="edit-att-absent" type="number" value="${r.absentHrs}" min="0"></div>
            <div class="form-group"><label>Relief Employee</label><select id="edit-att-relief">${reliefOpts}</select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Relief Hours</label><input id="edit-att-reliefhrs" type="number" value="${r.reliefHoursWorked}" min="0"></div>
            <div class="form-group"><label>OT Hours</label><input id="edit-att-ot" type="number" value="${r.otHrs}" min="0"></div>
          </div>
        `;

        AppModal.show('✏️ Edit Attendance Record', html, () => {
          data[idx] = {
            date: document.getElementById('edit-att-date').value,
            month: document.getElementById('edit-att-month').value.trim() || r.month,
            employee: document.getElementById('edit-att-emp').value,
            shiftHrs: config.stdShiftHrs,
            hoursWorked: parseInt(document.getElementById('edit-att-worked').value) || 0,
            absentHrs: parseInt(document.getElementById('edit-att-absent').value) || 0,
            reliefEmployee: document.getElementById('edit-att-relief').value,
            reliefHoursWorked: parseInt(document.getElementById('edit-att-reliefhrs').value) || 0,
            otHrs: parseInt(document.getElementById('edit-att-ot').value) || 0
          };

          Utils.saveLocal('attendance', data);
          this.render(container);
        });
      });
    });

    container.querySelectorAll('.btn-delete-att').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const r = data[idx];
        if (!r) return;

        AppModal.confirm(
          '🗑️ Delete Attendance Record',
          `Are you sure you want to delete the attendance entry for <strong>${r.employee}</strong> on <strong>${Utils.formatDate(r.date)}</strong>?`,
          () => {
            data.splice(idx, 1);
            Utils.saveLocal('attendance', data);
            this.render(container);
          }
        );
      });
    });
  },

  getData() {
    return Utils.loadLocal('attendance') || [...window.SEED_DATA.attendance];
  }
};
