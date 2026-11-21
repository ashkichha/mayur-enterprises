// ============================================================
// PARTNER & ELECTRICITY EXPENSES MODULE
// ============================================================
window.ExpensesModule = {
  render(container) {
    const D = window.SEED_DATA;
    const data = this.getData();

    // Calculate totals by category
    let totHariom = 0, totAshish = 0, totElec = 0;
    data.forEach(r => {
      if (r.paidBy === 'Hariom Singh') totHariom += r.amount;
      else if (r.paidBy === 'Ashish Singh') totAshish += r.amount;
      if (r.category === 'Electricity') totElec += r.amount;
    });
    const totAll = data.reduce((s, r) => s + r.amount, 0);

    // Get unique months for filter
    const uniqueMonths = [...new Set(data.map(r => r.month))];

    container.innerHTML = `
      <div class="page-header">
        <h2>Plant Expense Ledger & Partner Out-of-Pocket Tracker</h2>
        <p>All 38 months of Electricity, Exp. By Hariom Singh, and Exp. By Ashish Singh from records.</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-label">Hariom Singh Expenses</div>
          <div class="kpi-value">${Utils.formatCurrency(totHariom)}</div>
          <div class="kpi-sub">${data.filter(r=>r.paidBy==='Hariom Singh').length} entries</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-label">Ashish Singh Expenses</div>
          <div class="kpi-value">${Utils.formatCurrency(totAshish)}</div>
          <div class="kpi-sub">${data.filter(r=>r.paidBy==='Ashish Singh').length} entries</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Electricity Expenses</div>
          <div class="kpi-value">${Utils.formatCurrency(totElec)}</div>
          <div class="kpi-sub">${data.filter(r=>r.category==='Electricity').length} months</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-label">Grand Total</div>
          <div class="kpi-value">${Utils.formatCurrency(totAll)}</div>
          <div class="kpi-sub">${data.length} total entries</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Expense Ledger</div>

        <div class="form-row no-print" style="margin-bottom:12px;align-items:flex-end">
          <div class="form-group" style="max-width:160px">
            <label>Filter Month</label>
            <select id="filter-month">
              <option value="">All Months</option>
              ${uniqueMonths.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="max-width:160px">
            <label>Filter Category</label>
            <select id="filter-cat">
              <option value="">All Categories</option>
              <option value="Electricity">Electricity</option>
              <option value="Partner Expense">Partner Expense</option>
            </select>
          </div>
          <div class="form-group" style="max-width:160px">
            <label>Filter Paid By</label>
            <select id="filter-paid">
              <option value="">All</option>
              <option value="Hariom Singh">Hariom Singh</option>
              <option value="Ashish Singh">Ashish Singh</option>
              <option value="Firm Bank/Cash">Firm Bank/Cash</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btn-add-expense">➕ Add Expense</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Month</th><th>Category</th><th>Description / Sheet Ref</th>
                <th>Paid By</th><th>Bill / Receipt No.</th><th class="num">Amount (₹)</th>
                <th class="no-print" style="width:130px;">Actions</th>
              </tr>
            </thead>
            <tbody id="exp-tbody"></tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Partner & Electricity Summary</div>
        <table>
          <thead>
            <tr><th>Category / Partner</th><th class="num">Total Amount (₹)</th><th>Share / Note</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Hariom Singh Expenses</strong></td><td class="num">${Utils.formatCurrency(totHariom)}</td><td>Reimbursable / Ledger</td><td><span class="badge badge-green">Verified</span></td></tr>
            <tr><td><strong>Ashish Singh Expenses</strong></td><td class="num">${Utils.formatCurrency(totAshish)}</td><td>Reimbursable / Ledger</td><td><span class="badge badge-green">Verified</span></td></tr>
            <tr><td><strong>Electricity Expenses</strong></td><td class="num">${Utils.formatCurrency(totElec)}</td><td>38 Months Power</td><td><span class="badge badge-green">Verified</span></td></tr>
            <tr class="total-row"><td><strong>GRAND TOTAL</strong></td><td class="num"><strong>${Utils.formatCurrency(totAll)}</strong></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
    `;

    // Render filtered table
    const renderTable = () => {
      const fm = document.getElementById('filter-month').value;
      const fc = document.getElementById('filter-cat').value;
      const fp = document.getElementById('filter-paid').value;

      let filtered = data;
      if (fm) filtered = filtered.filter(r => r.month === fm);
      if (fc) filtered = filtered.filter(r => r.category === fc);
      if (fp) filtered = filtered.filter(r => r.paidBy === fp);

      const tbody = document.getElementById('exp-tbody');
      tbody.innerHTML = '';
      let runTotal = 0;

      filtered.forEach((r, i) => {
        runTotal += r.amount;
        const catBadge = r.category === 'Electricity' ? 'badge-yellow' : 'badge-blue';
        const tr = document.createElement('tr');
        // Find actual index in `data`
        const realIdx = data.indexOf(r);
        tr.innerHTML = `
          <td>${i+1}</td>
          <td><strong>${r.month}</strong></td>
          <td><span class="badge ${catBadge}">${r.category}</span></td>
          <td style="font-size:11px">${r.description}</td>
          <td>${r.paidBy}</td>
          <td>${r.billNo}</td>
          <td class="num">${Utils.formatCurrency(r.amount)}</td>
          <td class="actions-cell no-print">
            <button class="btn-action edit btn-edit-exp" data-index="${realIdx}" title="Edit Expense">✏️ Edit</button>
            <button class="btn-action delete btn-delete-exp" data-index="${realIdx}" title="Delete Expense">🗑️</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      const totalTr = document.createElement('tr');
      totalTr.className = 'total-row';
      totalTr.innerHTML = `<td colspan="6"><strong>TOTAL (${filtered.length} entries)</strong></td><td class="num"><strong>${Utils.formatCurrency(runTotal)}</strong></td><td class="no-print">—</td>`;
      tbody.appendChild(totalTr);

      // Attach row action listeners
      tbody.querySelectorAll('.btn-edit-exp').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          const r = data[idx];
          if (!r) return;

          const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
          const html = `
            <div class="form-row">
              <div class="form-group">
                <label>Month</label>
                <input id="edit-exp-month" list="edit-exp-months" value="${r.month}" required />
                <datalist id="edit-exp-months">
                  ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
                </datalist>
              </div>
              <div class="form-group">
                <label>Category</label>
                <select id="edit-exp-cat">
                  <option value="Electricity" ${r.category === 'Electricity' ? 'selected' : ''}>Electricity</option>
                  <option value="Partner Expense" ${r.category === 'Partner Expense' ? 'selected' : ''}>Partner Expense</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Description / Sheet Ref</label><input id="edit-exp-desc" type="text" value="${r.description || ''}"></div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Paid By</label>
                <select id="edit-exp-paid">
                  <option value="Hariom Singh" ${r.paidBy === 'Hariom Singh' ? 'selected' : ''}>Hariom Singh</option>
                  <option value="Ashish Singh" ${r.paidBy === 'Ashish Singh' ? 'selected' : ''}>Ashish Singh</option>
                  <option value="Firm Bank/Cash" ${r.paidBy === 'Firm Bank/Cash' ? 'selected' : ''}>Firm Bank/Cash</option>
                </select>
              </div>
              <div class="form-group"><label>Bill / Receipt No.</label><input id="edit-exp-bill" type="text" value="${r.billNo || ''}"></div>
              <div class="form-group"><label>Amount (₹)</label><input id="edit-exp-amt" type="number" step="1" value="${r.amount}"></div>
            </div>
          `;

          AppModal.show('✏️ Edit Expense Entry', html, () => {
            const mVal = document.getElementById('edit-exp-month').value.trim();
            if (!mVal) {
              alert('Month cannot be empty.');
              return;
            }
            data[idx] = {
              month: mVal,
              category: document.getElementById('edit-exp-cat').value,
              description: document.getElementById('edit-exp-desc').value.trim(),
              paidBy: document.getElementById('edit-exp-paid').value,
              billNo: document.getElementById('edit-exp-bill').value.trim(),
              amount: parseFloat(document.getElementById('edit-exp-amt').value) || 0
            };
            Utils.saveLocal('expenses', data);
            ExpensesModule.render(container);
          });
        });
      });

      tbody.querySelectorAll('.btn-delete-exp').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          const r = data[idx];
          if (!r) return;

          AppModal.confirm(
            '🗑️ Delete Expense Entry',
            `Are you sure you want to delete this expense of <strong>${Utils.formatCurrency(r.amount)}</strong> (${r.description || r.category}) for <strong>${r.month}</strong>?`,
            () => {
              data.splice(idx, 1);
              Utils.saveLocal('expenses', data);
              ExpensesModule.render(container);
            }
          );
        });
      });
    };

    renderTable();

    // Filter handlers
    document.getElementById('filter-month').addEventListener('change', renderTable);
    document.getElementById('filter-cat').addEventListener('change', renderTable);
    document.getElementById('filter-paid').addEventListener('change', renderTable);

    // Add expense
    document.getElementById('btn-add-expense').addEventListener('click', () => {
      const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
      const html = `
        <div class="form-row">
          <div class="form-group">
            <label>Month</label>
            <input id="f-month" list="add-exp-months" placeholder="Select or type month (e.g. Aug-26, Mar-27)" required />
            <datalist id="add-exp-months">
              ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
            </datalist>
          </div>
          <div class="form-group"><label>Category</label>
            <select id="f-cat"><option>Electricity</option><option>Partner Expense</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Description</label><input id="f-desc" type="text" placeholder="Description / Sheet Ref"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Paid By</label>
            <select id="f-paid"><option>Firm Bank/Cash</option><option>Hariom Singh</option><option>Ashish Singh</option></select>
          </div>
          <div class="form-group"><label>Bill/Receipt No.</label><input id="f-bill" type="text"></div>
          <div class="form-group"><label>Amount (₹)</label><input id="f-amt" type="number" min="0" value="0"></div>
        </div>
      `;
      window.AppModal.show('➕ Add Expense Entry', html, () => {
        const mVal = document.getElementById('f-month').value.trim();
        if (!mVal) {
          alert('Month cannot be empty.');
          return;
        }
        const entry = {
          month: mVal,
          category: document.getElementById('f-cat').value,
          description: document.getElementById('f-desc').value.trim(),
          paidBy: document.getElementById('f-paid').value,
          billNo: document.getElementById('f-bill').value.trim(),
          amount: parseFloat(document.getElementById('f-amt').value) || 0
        };
        const allData = this.getData();
        allData.push(entry);
        Utils.saveLocal('expenses', allData);
        this.render(container);
      });
    });
  },

  getData() {
    return Utils.loadLocal('expenses') || [...window.SEED_DATA.expenses];
  }
};
