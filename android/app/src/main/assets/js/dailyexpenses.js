// ============================================================
// MAYUR ENTERPRISES — DAILY PARTNERS EXPENSE LOG MODULE
// Evening Out-of-Pocket Expense Entry & 1-Click Sync to Partner Expenses
// ============================================================

window.DailyExpensesModule = (function() {
  'use strict';

  const STORAGE_KEY = 'dailyExpenses';

  // Seed sample initial records if none exist
  function getInitialSeed() {
    return [
      {
        id: 'DE-1',
        date: '2026-06-02',
        paidBy: 'Hariom Singh',
        category: 'Spare Parts / Machinery',
        description: 'High-pressure washing nozzle & clamp fitting',
        amount: 3200,
        paymentMode: 'UPI',
        voucher: 'V-0601',
        synced: true
      },
      {
        id: 'DE-2',
        date: '2026-06-05',
        paidBy: 'Ashish Singh',
        category: 'Diesel / Fuel & Transport',
        description: 'Diesel for generator backup & transport conveyance',
        amount: 2500,
        paymentMode: 'Cash',
        voucher: 'V-0602',
        synced: true
      },
      {
        id: 'DE-3',
        date: '2026-06-10',
        paidBy: 'Hariom Singh',
        category: 'Labor Refreshment / Tea',
        description: 'Evening tea & snacks for washing night shift staff',
        amount: 650,
        paymentMode: 'Cash',
        voucher: 'V-0603',
        synced: true
      },
      {
        id: 'DE-4',
        date: '2026-06-14',
        paidBy: 'Ashish Singh',
        category: 'Plant Cleaning / Chemical',
        description: 'Bus washing shampoo drum & grease degreaser',
        amount: 4800,
        paymentMode: 'Bank Transfer',
        voucher: 'V-0604',
        synced: true
      }
    ];
  }

  function getData() {
    const local = Utils.loadLocal(STORAGE_KEY);
    if (local && Array.isArray(local) && local.length > 0) return local;
    return getInitialSeed();
  }

  function saveData(data) {
    Utils.saveLocal(STORAGE_KEY, data);
  }

  function formatMonthFromDate(dateStr) {
    if (!dateStr) return 'Jun-26';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Jun-26';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = monthNames[d.getMonth()];
    const yr = String(d.getFullYear()).slice(-2);
    return `${m}-${yr}`;
  }

  function render(container) {
    if (!container) return;

    let data = getData();
    let filterPartner = 'ALL';
    let filterStatus = 'ALL';
    let filterSearch = '';
    let showAddForm = false;

    function buildView() {
      const todayStr = Utils.today();
      
      // Calculate KPIs
      let todayTotal = 0;
      let todayHariom = 0;
      let todayAshish = 0;
      let unsyncedTotal = 0;
      let unsyncedCount = 0;
      let grandTotal = 0;

      data.forEach(item => {
        const amt = Number(item.amount) || 0;
        grandTotal += amt;
        if (item.date === todayStr) {
          todayTotal += amt;
          if (item.paidBy === 'Hariom Singh') todayHariom += amt;
          else if (item.paidBy === 'Ashish Singh') todayAshish += amt;
        }
        if (!item.synced) {
          unsyncedTotal += amt;
          unsyncedCount++;
        }
      });

      // Filtered records
      let filtered = data.slice();
      if (filterPartner !== 'ALL') {
        filtered = filtered.filter(item => item.paidBy === filterPartner);
      }
      if (filterStatus === 'UNSYNCED') {
        filtered = filtered.filter(item => !item.synced);
      } else if (filterStatus === 'SYNCED') {
        filtered = filtered.filter(item => item.synced);
      }
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        filtered = filtered.filter(item => 
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.voucher && item.voucher.toLowerCase().includes(q)) ||
          (item.date && item.date.includes(q))
        );
      }

      // Sort by date descending
      filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      let rowsHTML = '';
      if (filtered.length === 0) {
        rowsHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">No daily expense entries found. Click "➕ Add Evening Expense" to record today's expenses.</td></tr>`;
      } else {
        filtered.forEach((item, idx) => {
          const originalIdx = data.indexOf(item);
          const amt = Number(item.amount) || 0;
          const partnerBadge = item.paidBy === 'Hariom Singh' ? 'badge-yellow' : 'badge-blue';
          const syncBadge = item.synced 
            ? `<span class="badge badge-green" title="Synced to Partner Expenses Sheet">🟢 Synced</span>` 
            : `<span class="badge badge-yellow" title="Pending Sync">🟡 Pending Sync</span>`;

          rowsHTML += `
            <tr>
              <td style="text-align:center; color:var(--text-muted); font-size:12px;">${idx + 1}</td>
              <td><strong>${Utils.formatDate(item.date)}</strong></td>
              <td><span class="badge ${partnerBadge}">${item.paidBy}</span></td>
              <td style="font-size:12px;">${item.category}</td>
              <td style="font-size:12px;">${item.description || '-'}</td>
              <td class="num" style="font-weight:700; color:var(--primary); font-size:13px;">${Utils.formatCurrency(amt)}</td>
              <td><span class="badge badge-gray">${item.paymentMode || 'Cash'}</span></td>
              <td style="font-size:12px; font-family:monospace;">${item.voucher || '-'}</td>
              <td style="text-align:center;">${syncBadge}</td>
              <td class="actions-cell no-print" style="text-align:center; white-space:nowrap;">
                <button class="btn-action edit btn-edit-daily" data-index="${originalIdx}" title="Edit Expense">✏️</button>
                <button class="btn-action delete btn-delete-daily" data-index="${originalIdx}" title="Delete Expense">🗑️</button>
              </td>
            </tr>
          `;
        });
      }

      const formDisplay = showAddForm ? 'block' : 'none';

      container.innerHTML = `
        <!-- Page Header -->
        <div class="page-header">
          <h2>DAILY PARTNERS EVENING EXPENSE LOG (रोज़ाना शाम का खर्च रजिस्टर)</h2>
          <p>
            Quick evening entry for daily out-of-pocket expenses paid by <strong>Hariom Singh</strong> or <strong>Ashish Singh</strong>.<br>
            Click <strong>"🔄 Sync to Partner Expenses Sheet"</strong> to automatically transfer all pending expenses into the Master Partner Expense Ledger and update Profit Settlement.
          </p>
        </div>

        <!-- Summary KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card blue">
            <div class="kpi-label">TODAY'S TOTAL EXPENSES</div>
            <div class="kpi-value">${Utils.formatCurrency(todayTotal)}</div>
            <div class="kpi-sub">Date: ${Utils.formatDate(todayStr)}</div>
          </div>

          <div class="kpi-card yellow">
            <div class="kpi-label">HARIOM SINGH (TODAY)</div>
            <div class="kpi-value">${Utils.formatCurrency(todayHariom)}</div>
            <div class="kpi-sub">Hariom Out-of-Pocket Today</div>
          </div>

          <div class="kpi-card orange">
            <div class="kpi-label">ASHISH SINGH (TODAY)</div>
            <div class="kpi-value">${Utils.formatCurrency(todayAshish)}</div>
            <div class="kpi-sub">Ashish Out-of-Pocket Today</div>
          </div>

          <div class="kpi-card ${unsyncedCount > 0 ? 'orange' : 'green'}">
            <div class="kpi-label">UNSYNCED PENDING EXPENSES</div>
            <div class="kpi-value">${Utils.formatCurrency(unsyncedTotal)}</div>
            <div class="kpi-sub">${unsyncedCount} Entries Pending Sheet Sync</div>
          </div>

          <div class="kpi-card purple">
            <div class="kpi-label">GRAND TOTAL LOGGED</div>
            <div class="kpi-value">${Utils.formatCurrency(grandTotal)}</div>
            <div class="kpi-sub">${data.length} Total Daily Entries</div>
          </div>
        </div>

        <!-- Collapsible Add Expense Form Card -->
        <div class="card" id="card-daily-form" style="display:${formDisplay}; background:#fcfdfd; border:1px solid #cbd5e0; margin-bottom:16px;">
          <div class="card-title">📝 Add Evening Daily Expense Entry (शाम की नई खर्च एंट्री)</div>
          <form id="form-daily-expense">
            <div class="form-row">
              <div class="form-group">
                <label>Date (तारीख) *</label>
                <input type="date" id="daily-form-date" value="${todayStr}" required>
              </div>
              <div class="form-group">
                <label>Paid By Partner (किसने खर्च किया) *</label>
                <select id="daily-form-paidby" required>
                  <option value="Hariom Singh">Hariom Singh (हरिओम सिंह)</option>
                  <option value="Ashish Singh">Ashish Singh (आशीष सिंह)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Expense Category (श्रेणी) *</label>
                <select id="daily-form-category" required>
                  <option value="Spare Parts / Machinery">Spare Parts / Machinery (स्पेयर पार्ट्स / मशीनरी)</option>
                  <option value="Diesel / Fuel &amp; Transport">Diesel / Fuel &amp; Transport (डीजल / पेट्रोल / वाहन खर्च)</option>
                  <option value="Plant Cleaning / Chemical">Plant Cleaning / Chemical (केमिकल / शैम्पू / ग्रीस)</option>
                  <option value="Labor Refreshment / Tea">Labor Refreshment / Tea (स्टाफ चाय / नाश्ता)</option>
                  <option value="Office &amp; Printing">Office &amp; Printing (स्टेशनरी / प्रिंटिंग)</option>
                  <option value="Depot Staff / Coordination">Depot Staff / Coordination (डिपो स्टाफ समन्वय)</option>
                  <option value="Miscellaneous">Miscellaneous (अन्य फुटकर खर्च)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:2;">
                <label>Description / Particulars (खर्च का पूरा विवरण) *</label>
                <input type="text" id="daily-form-desc" placeholder="e.g. Badaun plant washing nozzle replacement, grease drum purchase..." required>
              </div>
              <div class="form-group" style="flex:1;">
                <label>Amount (रुपये ₹) *</label>
                <input type="number" id="daily-form-amount" min="1" step="1" placeholder="e.g. 1500" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Payment Mode (भुगतान माध्यम)</label>
                <select id="daily-form-mode">
                  <option value="Cash">Cash (नकद)</option>
                  <option value="UPI">UPI / PhonePe / GPay</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div class="form-group">
                <label>Voucher / Bill No. / Ref (वाउचर / बिल संदर्भ)</label>
                <input type="text" id="daily-form-voucher" placeholder="e.g. V-0605 or Bill #">
              </div>
            </div>
            <div class="btn-group">
              <button type="submit" class="btn btn-success" id="btn-save-daily">💾 Save Evening Entry</button>
              <button type="button" class="btn btn-outline" id="btn-cancel-daily">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Filter & Actions Card -->
        <div class="card" style="padding:14px 20px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <div class="form-group" style="min-width:140px; margin-bottom:0;">
                <label style="font-size:10px; margin-bottom:2px;">FILTER PARTNER</label>
                <select id="filter-daily-partner" style="padding:6px 10px; font-size:12px;">
                  <option value="ALL" ${filterPartner === 'ALL' ? 'selected' : ''}>All Partners</option>
                  <option value="Hariom Singh" ${filterPartner === 'Hariom Singh' ? 'selected' : ''}>Hariom Singh</option>
                  <option value="Ashish Singh" ${filterPartner === 'Ashish Singh' ? 'selected' : ''}>Ashish Singh</option>
                </select>
              </div>

              <div class="form-group" style="min-width:140px; margin-bottom:0;">
                <label style="font-size:10px; margin-bottom:2px;">FILTER STATUS</label>
                <select id="filter-daily-status" style="padding:6px 10px; font-size:12px;">
                  <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
                  <option value="UNSYNCED" ${filterStatus === 'UNSYNCED' ? 'selected' : ''}>🟡 Pending Sync Only</option>
                  <option value="SYNCED" ${filterStatus === 'SYNCED' ? 'selected' : ''}>🟢 Synced Only</option>
                </select>
              </div>

              <div class="form-group" style="min-width:160px; margin-bottom:0;">
                <label style="font-size:10px; margin-bottom:2px;">SEARCH PARTICULARS</label>
                <input type="text" id="filter-daily-search" placeholder="Search particulars, bill..." value="${filterSearch}" style="padding:6px 10px; font-size:12px;">
              </div>
            </div>

            <div class="btn-group" style="margin-top:0; display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-success" id="btn-sync-to-expenses" title="Transfer all unsynced daily expenses to Partner Expenses Sheet">
                🔄 Sync to Partner Expenses Sheet (${unsyncedCount} New)
              </button>
              <button class="btn btn-primary" id="btn-toggle-daily-form">
                ➕ Add Evening Expense
              </button>
              <button class="btn btn-outline" id="btn-export-daily-csv">
                📥 Export CSV
              </button>
              <button class="btn btn-primary" id="btn-print-daily">
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        <!-- Daily Expenses Ledger Table Card -->
        <div class="card">
          <div class="card-title">Daily Expenses Register (${filtered.length} Entries)</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:40px; text-align:center;">#</th>
                  <th>Date (तारीख)</th>
                  <th>Paid By (पार्टनर)</th>
                  <th>Category (श्रेणी)</th>
                  <th>Particulars / Details (विवरण)</th>
                  <th class="num">Amount (रुपये)</th>
                  <th>Mode (माध्यम)</th>
                  <th>Voucher / Ref</th>
                  <th style="text-align:center;">Sync Status</th>
                  <th class="no-print" style="text-align:center; width:100px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5">TOTAL (${filtered.length} entries displayed)</td>
                  <td class="num" style="color:var(--primary); font-size:13px;">${Utils.formatCurrency(filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0))}</td>
                  <td colspan="3"></td>
                  <td class="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      attachEvents();
    }

    function attachEvents() {
      // Toggle form
      const toggleBtn = container.querySelector('#btn-toggle-daily-form');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          showAddForm = !showAddForm;
          buildView();
        });
      }

      const cancelBtn = container.querySelector('#btn-cancel-daily');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          showAddForm = false;
          buildView();
        });
      }

      // Submit Form
      const form = container.querySelector('#form-daily-expense');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const date = container.querySelector('#daily-form-date').value;
          const paidBy = container.querySelector('#daily-form-paidby').value;
          const category = container.querySelector('#daily-form-category').value;
          const desc = container.querySelector('#daily-form-desc').value.trim();
          const amount = parseFloat(container.querySelector('#daily-form-amount').value) || 0;
          const mode = container.querySelector('#daily-form-mode').value;
          const voucher = container.querySelector('#daily-form-voucher').value.trim();

          if (!date || !paidBy || !desc || amount <= 0) {
            alert('Please fill out all required fields with a valid amount (> 0).');
            return;
          }

          const newEntry = {
            id: 'DE-' + Date.now(),
            date: date,
            paidBy: paidBy,
            category: category,
            description: desc,
            amount: amount,
            paymentMode: mode,
            voucher: voucher || 'Daily-' + date.slice(5),
            synced: false
          };

          data.unshift(newEntry);
          saveData(data);
          showAddForm = false;
          buildView();
        });
      }

      // SYNC TO PARTNER EXPENSES SHEET
      const syncBtn = container.querySelector('#btn-sync-to-expenses');
      if (syncBtn) {
        syncBtn.addEventListener('click', () => {
          const unsynced = data.filter(item => !item.synced);
          if (unsynced.length === 0) {
            alert('All daily expense entries are already synced to the Partner Expenses Sheet!');
            return;
          }

          // Load master expenses
          let masterExpenses = Utils.loadLocal('expenses');
          if (!masterExpenses || !Array.isArray(masterExpenses)) {
            masterExpenses = (window.SEED_DATA && window.SEED_DATA.expenses) 
              ? JSON.parse(JSON.stringify(window.SEED_DATA.expenses)) 
              : [];
          }

          let syncedTotalAmt = 0;
          unsynced.forEach(item => {
            const m = formatMonthFromDate(item.date);
            const expenseRecord = {
              month: m,
              category: 'Partner Expense',
              description: `${item.description} [${item.category}]`,
              paidBy: item.paidBy,
              billNo: item.voucher || `Daily-${item.date}`,
              amount: Number(item.amount) || 0
            };
            masterExpenses.push(expenseRecord);
            syncedTotalAmt += Number(item.amount) || 0;
            item.synced = true;
          });

          // Save back master expenses and daily expenses
          Utils.saveLocal('expenses', masterExpenses);
          if (window.SEED_DATA) window.SEED_DATA.expenses = masterExpenses;
          saveData(data);

          // Update Profit Settlement as well if applicable
          const profitData = Utils.loadLocal('profitSettlement') || (window.SEED_DATA && window.SEED_DATA.profitSettlement);
          if (profitData && Array.isArray(profitData)) {
            unsynced.forEach(item => {
              const m = formatMonthFromDate(item.date);
              const pRow = profitData.find(p => p.month.toLowerCase() === m.toLowerCase());
              if (pRow) {
                if (item.paidBy === 'Hariom Singh') {
                  pRow.expHariom = (Number(pRow.expHariom) || 0) + (Number(item.amount) || 0);
                } else if (item.paidBy === 'Ashish Singh') {
                  pRow.expAshish = (Number(pRow.expAshish) || 0) + (Number(item.amount) || 0);
                }
              }
            });
            Utils.saveLocal('profitSettlement', profitData);
            if (window.SEED_DATA) window.SEED_DATA.profitSettlement = profitData;
          }

          AppModal.alert(
            '🔄 Sync Successful! (सिंक सफल)',
            `<p><strong>${unsynced.length}</strong> daily expense items totaling <strong>${Utils.formatCurrency(syncedTotalAmt)}</strong> have been transferred to:</p>
             <ul style="margin: 8px 0 8px 20px; font-size:13px; line-height:1.6;">
               <li><strong>Partner Expense Ledger (` + '`ME_expenses`' + `)</strong></li>
               <li><strong>Profit Waterfall Settlement Sheet</strong></li>
             </ul>
             <p style="color:var(--success); font-weight:600;">All daily entries are now marked 🟢 Synced!</p>`
          );

          buildView();
        });
      }

      // Filter events
      const partnerFilter = container.querySelector('#filter-daily-partner');
      if (partnerFilter) {
        partnerFilter.addEventListener('change', (e) => {
          filterPartner = e.target.value;
          buildView();
        });
      }

      const statusFilter = container.querySelector('#filter-daily-status');
      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          filterStatus = e.target.value;
          buildView();
        });
      }

      const searchFilter = container.querySelector('#filter-daily-search');
      if (searchFilter) {
        searchFilter.addEventListener('input', (e) => {
          filterSearch = e.target.value.trim();
          buildView();
        });
      }

      // Export CSV
      const exportBtn = container.querySelector('#btn-export-daily-csv');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const headers = ["#", "Date", "Partner", "Category", "Particulars", "Amount", "Mode", "Voucher", "Status"];
          const lines = [headers.join(",")];
          data.forEach((item, idx) => {
            lines.push([
              idx + 1,
              `"${item.date || ''}"`,
              `"${item.paidBy || ''}"`,
              `"${(item.category || '').replace(/"/g, '""')}"`,
              `"${(item.description || '').replace(/"/g, '""')}"`,
              Number(item.amount) || 0,
              `"${item.paymentMode || ''}"`,
              `"${item.voucher || ''}"`,
              item.synced ? "Synced" : "Pending"
            ].join(","));
          });

          const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Mayur_Enterprises_Daily_Expenses_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }

      // Print
      const printBtn = container.querySelector('#btn-print-daily');
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          window.print();
        });
      }

      // Edit Item
      container.querySelectorAll('.btn-edit-daily').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.dataset.index, 10);
          const item = data[idx];
          if (!item) return;

          const modalHTML = `
            <div class="form-row">
              <div class="form-group">
                <label>Date</label>
                <input type="date" id="edit-daily-date" value="${item.date}" required>
              </div>
              <div class="form-group">
                <label>Paid By</label>
                <select id="edit-daily-paidby">
                  <option value="Hariom Singh" ${item.paidBy === 'Hariom Singh' ? 'selected' : ''}>Hariom Singh</option>
                  <option value="Ashish Singh" ${item.paidBy === 'Ashish Singh' ? 'selected' : ''}>Ashish Singh</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <input type="text" id="edit-daily-category" value="${item.category || ''}" required>
              </div>
              <div class="form-group">
                <label>Amount (₹)</label>
                <input type="number" id="edit-daily-amount" value="${item.amount}" min="1" step="1" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:2;">
                <label>Description</label>
                <input type="text" id="edit-daily-desc" value="${item.description || ''}" required>
              </div>
              <div class="form-group" style="flex:1;">
                <label>Payment Mode</label>
                <select id="edit-daily-mode">
                  <option value="Cash" ${item.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                  <option value="UPI" ${item.paymentMode === 'UPI' ? 'selected' : ''}>UPI</option>
                  <option value="Bank Transfer" ${item.paymentMode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                  <option value="Cheque" ${item.paymentMode === 'Cheque' ? 'selected' : ''}>Cheque</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Voucher / Bill Ref</label>
                <input type="text" id="edit-daily-voucher" value="${item.voucher || ''}">
              </div>
            </div>
          `;

          AppModal.show('✏️ Edit Daily Expense Entry', modalHTML, () => {
            item.date = document.getElementById('edit-daily-date').value;
            item.paidBy = document.getElementById('edit-daily-paidby').value;
            item.category = document.getElementById('edit-daily-category').value.trim();
            item.amount = parseFloat(document.getElementById('edit-daily-amount').value) || 0;
            item.description = document.getElementById('edit-daily-desc').value.trim();
            item.paymentMode = document.getElementById('edit-daily-mode').value;
            item.voucher = document.getElementById('edit-daily-voucher').value.trim();
            item.synced = false; // Mark un-synced on change so it can be re-synced

            saveData(data);
            buildView();
          });
        });
      });

      // Delete Item
      container.querySelectorAll('.btn-delete-daily').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.dataset.index, 10);
          const item = data[idx];
          if (!item) return;

          AppModal.confirm(
            '🗑️ Delete Daily Expense Entry',
            `Are you sure you want to delete this expense of <strong>${Utils.formatCurrency(item.amount)}</strong> (${item.description}) paid by <strong>${item.paidBy}</strong> on ${Utils.formatDate(item.date)}?`,
            () => {
              data.splice(idx, 1);
              saveData(data);
              buildView();
            }
          );
        });
      });
    }

    buildView();
  }

  return {
    render: render,
    getData: getData,
    saveData: saveData
  };
})();
