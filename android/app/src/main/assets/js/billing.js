// ============================================================
// UPSRTC BILLING & GST PENALTY RECONCILIATION MODULE
// ============================================================
window.BillingModule = {
  render(container) {
    const D = window.SEED_DATA;
    const data = this.getData();

    // Calculate totals
    let totBilled = 0, totTaxable = 0, totGST = 0, totPenalty = 0, totGSTCN = 0, totBuses = 0;
    data.forEach(r => {
      totBilled += r.billedTotal;
      totTaxable += r.billedTaxable;
      totGST += r.billedGST;
      totPenalty += r.penaltyDeducted;
      totGSTCN += r.penaltyGSTCN;
      totBuses += r.approvedBuses;
    });

    container.innerHTML = `
      <div class="page-header">
        <h2>UPSRTC Monthly Billing & GST Penalty Reconciliation</h2>
        <p>All ${data.length} months populated — Bill To UPSRTC, Penalty, BILL GST, PENALTY GST CN</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-label">Total Billed (Incl. GST)</div>
          <div class="kpi-value">${Utils.formatCurrency(totBilled)}</div>
          <div class="kpi-sub">${Utils.formatNumber(totBuses)} buses approved</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-label">Total Penalty Deducted</div>
          <div class="kpi-value">${Utils.formatCurrency(totPenalty)}</div>
          <div class="kpi-sub">${data.filter(r=>r.penaltyDeducted>0).length} months with penalty</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Total Penalty GST CN</div>
          <div class="kpi-value">${Utils.formatCurrency(totGSTCN)}</div>
          <div class="kpi-sub">Credit Notes recovered</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-label">Net Cash (Billed − GST)</div>
          <div class="kpi-value">${Utils.formatCurrency(totBilled - totGST)}</div>
          <div class="kpi-sub">After deducting Bill GST</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Monthly Billing Details</div>
        <div class="btn-group no-print" style="margin-bottom:12px">
          <button class="btn btn-primary" id="btn-add-bill">➕ Add New Bill</button>
        </div>
        <div class="table-wrap">
          <table id="billing-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Month</th>
                <th>Sheet Ref</th>
                <th class="num">Approved Buses</th>
                <th class="num">Billed Taxable (₹)</th>
                <th class="num">Billed GST 18% (₹)</th>
                <th class="num">Billed Total (₹)</th>
                <th class="num">Penalty Deducted (₹)</th>
                <th class="num">Penalty GST CN (₹)</th>
                <th class="num">Net Penalty (₹)</th>
                <th>GST Recovery</th>
                <th class="num">Net Cash (₹)</th>
                <th class="no-print" style="width: 130px;">Actions</th>
              </tr>
            </thead>
            <tbody id="billing-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    // Render table rows
    const tbody = document.getElementById('billing-tbody');
    data.forEach((r, i) => {
      const netPenalty = r.penaltyDeducted - r.penaltyGSTCN;
      const netCash = r.billedTotal - r.billedGST;
      const badgeClass = r.gstRecoveryStatus === 'CN Adjusted' ? 'badge-green' : 'badge-gray';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i+1}</td>
        <td><strong>${r.month}</strong></td>
        <td style="font-size:11px">${r.sheetRef}</td>
        <td class="num">${Utils.formatNumber(r.approvedBuses)}</td>
        <td class="num">${Utils.formatCurrency(r.billedTaxable)}</td>
        <td class="num">${Utils.formatCurrency(r.billedGST)}</td>
        <td class="num"><strong>${Utils.formatCurrency(r.billedTotal)}</strong></td>
        <td class="num ${r.penaltyDeducted > 0 ? 'negative' : ''}">${Utils.formatCurrency(r.penaltyDeducted)}</td>
        <td class="num ${r.penaltyGSTCN > 0 ? 'positive' : ''}">${Utils.formatCurrency(r.penaltyGSTCN)}</td>
        <td class="num">${Utils.formatCurrency(netPenalty)}</td>
        <td><span class="badge ${badgeClass}">${r.gstRecoveryStatus}</span></td>
        <td class="num">${Utils.formatCurrency(netCash)}</td>
        <td class="actions-cell no-print">
          <button class="btn-action edit btn-edit-bill" data-index="${i}" title="Edit Bill">✏️ Edit</button>
          <button class="btn-action delete btn-delete-bill" data-index="${i}" title="Delete Bill">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Total row
    const totNetPenalty = totPenalty - totGSTCN;
    const totNetCash = totBilled - totGST;
    const totalTr = document.createElement('tr');
    totalTr.className = 'total-row';
    totalTr.innerHTML = `
      <td colspan="3"><strong>TOTAL (${data.length} Months)</strong></td>
      <td class="num"><strong>${Utils.formatNumber(totBuses)}</strong></td>
      <td class="num"><strong>${Utils.formatCurrency(totTaxable)}</strong></td>
      <td class="num"><strong>${Utils.formatCurrency(totGST)}</strong></td>
      <td class="num"><strong>${Utils.formatCurrency(totBilled)}</strong></td>
      <td class="num negative"><strong>${Utils.formatCurrency(totPenalty)}</strong></td>
      <td class="num positive"><strong>${Utils.formatCurrency(totGSTCN)}</strong></td>
      <td class="num"><strong>${Utils.formatCurrency(totNetPenalty)}</strong></td>
      <td></td>
      <td class="num"><strong>${Utils.formatCurrency(totNetCash)}</strong></td>
      <td class="no-print">—</td>
    `;
    tbody.appendChild(totalTr);

    // Add Bill button handler
    document.getElementById('btn-add-bill').addEventListener('click', () => {
      const months = Utils.getMonthsList ? Utils.getMonthsList(2023, 2035) : [];
      const html = `
        <div class="form-row">
          <div class="form-group">
            <label>Month</label>
            <input id="f-month" list="billing-months-list" placeholder="Select or type month (e.g. Jul-26, Jan-27)" required />
            <datalist id="billing-months-list">
              ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
            </datalist>
          </div>
          <div class="form-group"><label>Sheet Ref</label><input id="f-ref" type="text" placeholder="e.g. H:52 / A:"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Approved Buses</label><input id="f-buses" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Penalty Deducted (₹)</label><input id="f-penalty" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Penalty GST CN (₹)</label><input id="f-gstcn" type="number" min="0" value="0"></div>
        </div>
      `;
      window.AppModal.show('➕ Add New Billing Entry', html, () => {
        const monthVal = document.getElementById('f-month').value.trim();
        if (!monthVal) {
          alert('Month cannot be empty.');
          return;
        }
        const buses = parseInt(document.getElementById('f-buses').value) || 0;
        const penalty = parseFloat(document.getElementById('f-penalty').value) || 0;
        const gstcn = parseFloat(document.getElementById('f-gstcn').value) || 0;
        const ratePerBus = (D.config && D.config.ratePerBus) || 52;
        const gstRate = (D.config && D.config.gstRate) || 0.18;
        const taxable = buses * ratePerBus;
        const gst = Math.round(taxable * gstRate);
        const entry = {
          month: monthVal,
          sheetRef: document.getElementById('f-ref').value.trim() || 'New Bill',
          approvedBuses: buses,
          billedTaxable: taxable,
          billedGST: gst,
          billedTotal: taxable + gst,
          penaltyDeducted: penalty,
          penaltyGSTCN: gstcn,
          gstRecoveryStatus: gstcn > 0 ? 'CN Adjusted' : 'Nil'
        };
        const allData = this.getData();
        allData.push(entry);
        Utils.saveLocal('billing', allData);
        this.render(container);
      });
    });

    // Attach Edit and Delete listeners
    container.querySelectorAll('.btn-edit-bill').forEach(btn => {
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
              <input id="edit-b-month" list="edit-billing-months-list" value="${r.month}" required />
              <datalist id="edit-billing-months-list">
                ${months.map(m=>`<option value="${m}">${m}</option>`).join('')}
              </datalist>
            </div>
            <div class="form-group"><label>Sheet Ref</label><input id="edit-b-ref" type="text" value="${r.sheetRef || ''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Approved Buses</label><input id="edit-b-buses" type="number" min="0" value="${r.approvedBuses}"></div>
            <div class="form-group"><label>Penalty Deducted (₹)</label><input id="edit-b-penalty" type="number" min="0" value="${r.penaltyDeducted}"></div>
            <div class="form-group"><label>Penalty GST CN (₹)</label><input id="edit-b-gstcn" type="number" min="0" value="${r.penaltyGSTCN}"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>GST Recovery Status</label>
              <select id="edit-b-status">
                <option value="CN Adjusted" ${r.gstRecoveryStatus === 'CN Adjusted' ? 'selected' : ''}>CN Adjusted</option>
                <option value="Nil" ${r.gstRecoveryStatus === 'Nil' ? 'selected' : ''}>Nil</option>
                <option value="Pending" ${r.gstRecoveryStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              </select>
            </div>
          </div>
        `;

        AppModal.show('✏️ Edit Billing Entry', html, () => {
          const monthVal = document.getElementById('edit-b-month').value.trim();
          if (!monthVal) {
            alert('Month cannot be empty.');
            return;
          }
          const buses = parseInt(document.getElementById('edit-b-buses').value) || 0;
          const penalty = parseFloat(document.getElementById('edit-b-penalty').value) || 0;
          const gstcn = parseFloat(document.getElementById('edit-b-gstcn').value) || 0;
          const status = document.getElementById('edit-b-status').value;
          const ratePerBus = (D.config && D.config.ratePerBus) || 52;
          const gstRate = (D.config && D.config.gstRate) || 0.18;
          const taxable = buses * ratePerBus;
          const gst = Math.round(taxable * gstRate);

          data[idx] = {
            month: monthVal,
            sheetRef: document.getElementById('edit-b-ref').value.trim() || r.sheetRef,
            approvedBuses: buses,
            billedTaxable: taxable,
            billedGST: gst,
            billedTotal: taxable + gst,
            penaltyDeducted: penalty,
            penaltyGSTCN: gstcn,
            gstRecoveryStatus: status
          };

          Utils.saveLocal('billing', data);
          this.render(container);
        });
      });
    });

    container.querySelectorAll('.btn-delete-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const r = data[idx];
        if (!r) return;

        AppModal.confirm(
          '🗑️ Delete Billing Record',
          `Are you sure you want to delete the billing record for <strong>${r.month}</strong> (${Utils.formatCurrency(r.billedTotal)})?`,
          () => {
            data.splice(idx, 1);
            Utils.saveLocal('billing', data);
            this.render(container);
          }
        );
      });
    });
  },

  getData() {
    return Utils.loadLocal('billing') || [...window.SEED_DATA.billing];
  }
};
