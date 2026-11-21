// ============================================================
// BUSY ACCOUNTING SOFTWARE — VOUCHER EXPORT MODULE
// ============================================================
window.BusyExportModule = {
  render(container) {
    const D = window.SEED_DATA || {};
    const config = D.config || {};
    const ps = (Utils.loadLocal ? Utils.loadLocal('profitSettlement') : null) || D.profitSettlement || [];
    const capItems = (Utils.loadLocal ? Utils.loadLocal('capitalItems') : null) || (D.capitalInvestment && D.capitalInvestment.items) || [];

    // Calculate total capital
    let totalCapital = 0;
    let hariomCapital = 0, ashishCapital = 0;
    capItems.forEach(item => {
      const net = (Number(item.grossAmount) || 0) + (Number(item.deductions) || 0);
      totalCapital += net;
      const p = (item.partner || '').toLowerCase();
      if (p.includes('hariom')) hariomCapital += net;
      else if (p.includes('ashish')) ashishCapital += net;
    });

    // Generate all voucher rows
    const vouchers = [];
    let slsNo = 0, jvNo = 0;

    // Opening entry
    vouchers.push({date:'01-04-2023', type:'Opening', vNo:'OPN-01', account:'Plant & Machinery (Badaun)', drCr:'Dr', amount:totalCapital, narration:`Opening Fixed Asset - UPSRTC Badaun Plant (₹${Utils.formatNumber(totalCapital)})`});
    vouchers.push({date:'01-04-2023', type:'Opening', vNo:'OPN-01', account:'Hariom Singh - Capital A/c', drCr:'Cr', amount:hariomCapital, narration:`Opening Capital - Hariom Singh`});
    vouchers.push({date:'01-04-2023', type:'Opening', vNo:'OPN-01', account:'Ashish Singh - Capital A/c', drCr:'Cr', amount:ashishCapital, narration:`Opening Capital - Ashish Singh`});

    // Monthly entries
    ps.forEach((row, i) => {
      slsNo++;
      jvNo++;
      const sn = String(slsNo).padStart(2, '0');
      const jn = String(jvNo).padStart(2, '0');

      const taxableIncome = row.billToUPSRTC - row.billGST;
      const H = row.billToUPSRTC - row.penalty - row.electricity - row.billGST - row.expHariom - row.expAshish + row.penaltyGSTCN;
      const I = H > 0 ? Math.round(H * 0.10) : 0;
      const J = H - I;
      const ashishShare = Math.round(J * (config.ashishShare || 0.4682));
      const hariomShare = Math.round(J * (config.hariomShare || 0.5318));
      const officeRecipient = row.officeRecipient || (Utils.isHariomOfficeMonth(row.month) ? 'Hariom Singh' : 'Ashish Singh');
      const officeAccount = officeRecipient + ' - Capital A/c';

      // Sales Voucher
      vouchers.push({date:'', type:'Sales', vNo:`SLS-${sn}`, account:'UPSRTC Badaun Depot', drCr:'Dr', amount:row.billToUPSRTC, narration:`Bill to UPSRTC (${row.month})`});
      vouchers.push({date:'', type:'Sales', vNo:`SLS-${sn}`, account:'Bus Washing Service Income', drCr:'Cr', amount:taxableIncome, narration:`Taxable Income (${row.month})`});
      vouchers.push({date:'', type:'Sales', vNo:`SLS-${sn}`, account:'GST Output A/c', drCr:'Cr', amount:row.billGST, narration:`Bill GST (${row.month})`});

      // Journal Voucher
      vouchers.push({date:'', type:'Journal', vNo:`JV-${jn}`, account:'Profit & Loss Appropriation A/c', drCr:'Dr', amount:H, narration:`Profit/Loss Appropriation (${row.month})`});
      vouchers.push({date:'', type:'Journal', vNo:`JV-${jn}`, account:officeAccount, drCr:'Cr', amount:I, narration:`10% Office Exp (${row.month})`});
      vouchers.push({date:'', type:'Journal', vNo:`JV-${jn}`, account:'Ashish Singh - Capital A/c', drCr:'Cr', amount:ashishShare, narration:`Ashish Share 46.82% (${row.month})`});
      vouchers.push({date:'', type:'Journal', vNo:`JV-${jn}`, account:'Hariom Singh - Capital A/c', drCr:'Cr', amount:hariomShare, narration:`Hariom Share 53.18% (${row.month})`});
    });

    container.innerHTML = `
      <div class="page-header">
        <h2>Busy Accounting Software — Direct Voucher Import Sheet</h2>
        <p>Includes Opening CapEx + All Months (10% Office Exp credited to Hariom up to Sep-26, Ashish from Oct-26)</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-label">Total Voucher Entries</div>
          <div class="kpi-value">${vouchers.length}</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Sales Vouchers</div>
          <div class="kpi-value">${slsNo}</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-label">Journal Vouchers</div>
          <div class="kpi-value">${jvNo}</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-label">Opening Capital</div>
          <div class="kpi-value">${Utils.formatCurrency(totalCapital)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Voucher Import Data</div>
        <div class="btn-group no-print" style="margin-bottom:12px">
          <button class="btn btn-success" id="btn-export-csv">📥 Export as CSV</button>
        </div>
        <div class="table-wrap" style="max-height:600px;overflow-y:auto">
          <table class="busy-table" id="busy-table">
            <thead>
              <tr>
                <th>Voucher Date</th><th>Type</th><th>Voucher No</th>
                <th>Account Name</th><th>Dr/Cr</th><th class="num">Amount (₹)</th><th>Narration</th>
              </tr>
            </thead>
            <tbody id="busy-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    // Render table
    const tbody = document.getElementById('busy-tbody');
    vouchers.forEach(v => {
      const tr = document.createElement('tr');
      const typeBadge = v.type === 'Sales' ? 'badge-green' : v.type === 'Journal' ? 'badge-blue' : 'badge-yellow';
      const drCrClass = v.drCr === 'Dr' ? 'negative' : 'positive';
      tr.innerHTML = `
        <td>${v.date}</td>
        <td><span class="badge ${typeBadge}">${v.type}</span></td>
        <td><strong>${v.vNo}</strong></td>
        <td>${v.account}</td>
        <td class="${drCrClass}"><strong>${v.drCr}</strong></td>
        <td class="num">${Utils.formatCurrency(v.amount)}</td>
        <td style="font-size:10px">${v.narration}</td>
      `;
      tbody.appendChild(tr);
    });

    // Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const headers = ['Voucher_Date','Voucher_Type','Voucher_No','Account_Name','Dr_Cr','Amount','Short_Narration'];
      let csv = headers.join(',') + '\n';
      vouchers.forEach(v => {
        csv += [
          v.date,
          v.type,
          v.vNo,
          '"' + v.account.replace(/"/g, '""') + '"',
          v.drCr,
          v.amount,
          '"' + v.narration.replace(/"/g, '""') + '"'
        ].join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Mayur_Enterprises_Busy_Import.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
};
