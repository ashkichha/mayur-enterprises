// ============================================================
// MAYUR ENTERPRISES — BUS WASHING LOG MODULE
// Monthly Bus Washing Register — Badaun Plant (May-23 to Jun-26)
// ============================================================

window.BusLogModule = (function() {
  const STORAGE_KEY = 'busLog';
  const DEPOT_ROUTE = 'Badaun UPSRTC Depot';
  const SHIFT_INFO = 'Full Day (10 Hrs)';

  // Helper to safely escape HTML entities
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Load data: localStorage first, then fallback to SEED_DATA.busLog
  function getBusLogData() {
    const localData = Utils.loadLocal(STORAGE_KEY);
    if (localData && Array.isArray(localData) && localData.length > 0) {
      return localData;
    }
    if (window.SEED_DATA && Array.isArray(window.SEED_DATA.busLog)) {
      return JSON.parse(JSON.stringify(window.SEED_DATA.busLog));
    }
    return [];
  }

  // Save data to localStorage and sync with memory
  function saveBusLogData(data) {
    Utils.saveLocal(STORAGE_KEY, data);
    if (window.SEED_DATA) {
      window.SEED_DATA.busLog = data;
    }
  }

  // Programmatic entry addition helper
  function addEntry(entry) {
    const data = getBusLogData();
    const newEntry = {
      month: entry.month || '',
      washedCount: parseInt(entry.washedCount, 10) || 0,
      batchRef: entry.batchRef || '',
      remarks: entry.remarks || ''
    };
    data.push(newEntry);
    saveBusLogData(data);
    return data;
  }

  // Main render method
  function render(container) {
    if (!container) return;

    const data = getBusLogData();

    // Summary calculations
    const totalMonths = data.length;
    const totalWashed = data.reduce((sum, item) => sum + (Number(item.washedCount) || 0), 0);
    const avgPerMonth = totalMonths > 0 ? Math.round(totalWashed / totalMonths) : 0;

    // Available months list for dropdown
    const allMonths = typeof Utils.getMonthsList === 'function' ? Utils.getMonthsList() : [];
    const loggedMonths = new Set(data.map(d => d.month));
    const nextSuggestedMonth = allMonths.find(m => !loggedMonths.has(m)) || allMonths[0] || '';

    const monthOptions = allMonths.map(m => {
      const isSelected = m === nextSuggestedMonth ? 'selected' : '';
      return `<option value="${escapeHtml(m)}" ${isSelected}>${escapeHtml(m)}</option>`;
    }).join('');

    // Table rows
    const tableRows = data.map((entry, index) => {
      const washed = Number(entry.washedCount) || 0;
      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(entry.month)}</strong></td>
          <td>${escapeHtml(entry.batchRef || '—')}</td>
          <td>${DEPOT_ROUTE}</td>
          <td>${SHIFT_INFO}</td>
          <td class="num">${Utils.formatNumber(washed)}</td>
          <td>${escapeHtml(entry.remarks || '—')}</td>
          <td class="actions-cell no-print">
            <button class="btn-action edit btn-edit-buslog" data-index="${index}" title="Edit Entry">✏️ Edit</button>
            <button class="btn-action delete btn-delete-buslog" data-index="${index}" title="Delete Entry">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    // Construct full HTML
    container.innerHTML = `
      <!-- Page Header -->
      <div class="page-header">
        <h2>MONTHLY BUS WASHING REGISTER — BADAUN PLANT</h2>
        <p>Operational records and washed bus count reconciliation for UPSRTC Badaun Depot (${totalMonths} Months Registered)</p>
      </div>

      <!-- Summary KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-label">Total Months Logged</div>
          <div class="kpi-value">${Utils.formatNumber(totalMonths)}</div>
          <div class="kpi-sub">Total billing cycles registered</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Total Buses Washed</div>
          <div class="kpi-value">${Utils.formatNumber(totalWashed)}</div>
          <div class="kpi-sub">Cumulative buses washed across all cycles</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-label">Average Per Month</div>
          <div class="kpi-value">${Utils.formatNumber(avgPerMonth)}</div>
          <div class="kpi-sub">Average washed volume per month</div>
        </div>
      </div>

      <!-- Register & Add Entry Card -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--accent); flex-wrap: wrap; gap: 10px;">
          <div class="card-title" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;">
            Bus Washing Register Log
          </div>
          <button class="btn btn-primary" id="btn-show-add-form" type="button">
            <span>➕</span> Add Entry
          </button>
        </div>

        <!-- Inline Add Entry Form (Initially Hidden) -->
        <div id="inline-add-container" style="display: none; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--primary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            Add New Bus Washing Entry
          </div>
          <form id="buslog-inline-form">
            <div class="form-row">
              <div class="form-group">
                <label for="buslog-month">Month *</label>
                <select id="buslog-month" required>
                  ${monthOptions}
                </select>
              </div>
              <div class="form-group">
                <label for="buslog-count">Washed Count *</label>
                <input type="number" id="buslog-count" min="0" step="1" placeholder="e.g. 2500" required />
              </div>
              <div class="form-group">
                <label for="buslog-batch">Batch Ref</label>
                <input type="text" id="buslog-batch" placeholder="e.g. Sheets H:57 | A:16" />
              </div>
              <div class="form-group">
                <label for="buslog-remarks">Remarks</label>
                <input type="text" id="buslog-remarks" placeholder="e.g. Reconciled with Hisab Kitab" />
              </div>
            </div>
            <div class="btn-group">
              <button type="submit" class="btn btn-primary">Save Entry</button>
              <button type="button" class="btn btn-outline" id="btn-cancel-add">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Data Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 100px;">Month</th>
                <th>Batch/Depot Reference</th>
                <th>Depot/Route</th>
                <th>Shift</th>
                <th class="num" style="width: 140px;">Washed Count</th>
                <th>Remarks</th>
                <th class="no-print" style="width: 130px;">Actions</th>
              </tr>
            </thead>
            <tbody id="buslog-table-body">
              ${tableRows}
              <tr class="total-row">
                <td>Total</td>
                <td>${totalMonths} Months</td>
                <td>—</td>
                <td>${DEPOT_ROUTE}</td>
                <td>${SHIFT_INFO}</td>
                <td class="num">${Utils.formatNumber(totalWashed)}</td>
                <td>Avg: ${Utils.formatNumber(avgPerMonth)} / mo</td>
                <td class="no-print">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event Listeners for inline form toggle and submit
    const btnShow = container.querySelector('#btn-show-add-form');
    const formContainer = container.querySelector('#inline-add-container');
    const btnCancel = container.querySelector('#btn-cancel-add');
    const form = container.querySelector('#buslog-inline-form');

    if (btnShow && formContainer) {
      btnShow.addEventListener('click', () => {
        const isHidden = formContainer.style.display === 'none' || formContainer.style.display === '';
        formContainer.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          const countInput = container.querySelector('#buslog-count');
          if (countInput) countInput.focus();
        }
      });
    }

    if (btnCancel && formContainer && form) {
      btnCancel.addEventListener('click', () => {
        form.reset();
        formContainer.style.display = 'none';
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const monthEl = container.querySelector('#buslog-month');
        const countEl = container.querySelector('#buslog-count');
        const batchEl = container.querySelector('#buslog-batch');
        const remarksEl = container.querySelector('#buslog-remarks');

        const monthVal = monthEl ? monthEl.value : '';
        const countVal = countEl ? parseInt(countEl.value, 10) : 0;
        const batchVal = batchEl ? batchEl.value.trim() : '';
        const remarksVal = remarksEl ? remarksEl.value.trim() : '';

        if (!monthVal) {
          alert('Please select or enter a month.');
          return;
        }

        if (isNaN(countVal) || countVal < 0) {
          alert('Please enter a valid washed count.');
          return;
        }

        addEntry({
          month: monthVal,
          washedCount: countVal,
          batchRef: batchVal,
          remarks: remarksVal
        });

        // Re-render to reflect new entry in summary cards and table
        render(container);
      });
    }

    // Attach Edit and Delete button listeners
    container.querySelectorAll('.btn-edit-buslog').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const entry = data[idx];
        if (!entry) return;

        const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
        const monthOpts = months.map(m => `<option value="${m}" ${m === entry.month ? 'selected' : ''}>${m}</option>`).join('');

        const modalHTML = `
          <div class="form-row">
            <div class="form-group">
              <label>Month</label>
              <input id="edit-buslog-month" list="edit-buslog-months-list" value="${escapeHtml(entry.month)}" required />
              <datalist id="edit-buslog-months-list">
                ${monthOpts}
              </datalist>
            </div>
            <div class="form-group">
              <label>Washed Count</label>
              <input type="number" id="edit-buslog-count" min="0" value="${entry.washedCount}" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Batch / Depot Reference</label>
              <input type="text" id="edit-buslog-batch" value="${escapeHtml(entry.batchRef || '')}" />
            </div>
            <div class="form-group">
              <label>Supervisor Remarks</label>
              <input type="text" id="edit-buslog-remarks" value="${escapeHtml(entry.remarks || '')}" />
            </div>
          </div>
        `;

        AppModal.show('✏️ Edit Bus Washing Entry', modalHTML, () => {
          const newMonth = document.getElementById('edit-buslog-month').value.trim();
          const newCount = parseInt(document.getElementById('edit-buslog-count').value, 10);
          const newBatch = document.getElementById('edit-buslog-batch').value.trim();
          const newRemarks = document.getElementById('edit-buslog-remarks').value.trim();

          if (!newMonth) {
            alert('Month cannot be empty.');
            return;
          }
          if (isNaN(newCount) || newCount < 0) {
            alert('Please enter a valid washed count.');
            return;
          }

          data[idx] = {
            month: newMonth,
            washedCount: newCount,
            batchRef: newBatch,
            remarks: newRemarks
          };

          saveBusLogData(data);
          render(container);
        });
      });
    });

    container.querySelectorAll('.btn-delete-buslog').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const entry = data[idx];
        if (!entry) return;

        AppModal.confirm(
          '🗑️ Delete Bus Log Entry',
          `Are you sure you want to delete the bus washing record for <strong>${escapeHtml(entry.month)}</strong> (${Utils.formatNumber(entry.washedCount)} buses)?`,
          () => {
            data.splice(idx, 1);
            saveBusLogData(data);
            render(container);
          }
        );
      });
    });
  }

  return {
    render: render,
    getData: getBusLogData,
    addEntry: addEntry
  };
})();
