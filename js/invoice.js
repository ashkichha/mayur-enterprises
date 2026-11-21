// ============================================================
// UPSRTC GST TAX INVOICE MODULE
// ============================================================
window.InvoiceModule = {
  render(container) {
    const D = window.SEED_DATA;
    const config = D.config;
    const lastInv = D.lastInvoice;

    // Auto-increment invoice number
    const nextNo = String(parseInt(lastInv.invoiceNo || '0') + 1).padStart(2, '0');

    container.innerHTML = `
      <div class="page-header">
        <h2>GST Tax Invoice Generator</h2>
        <p>Generate printable UPSRTC Tax Invoices with CGST/SGST calculation</p>
      </div>

      <!-- Invoice Form -->
      <div class="card no-print">
        <div class="card-title">Invoice Details</div>
        <div class="form-row">
          <div class="form-group"><label>Invoice No.</label><input id="inv-no" type="text" value="${nextNo}"></div>
          <div class="form-group"><label>Invoice Date</label><input id="inv-date" type="date" value="${Utils.today()}"></div>
          <div class="form-group"><label>Date of Supply</label><input id="inv-supply" type="date" value="${Utils.today()}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Billing Period</label><input id="inv-period" type="text" placeholder="e.g. 01/08/26 to 31/08/26, 01/01/27 to 31/01/27"></div>
          <div class="form-group"><label>Quantity (Buses)</label><input id="inv-qty" type="number" value="0"></div>
          <div class="form-group"><label>Rate Per Bus (₹)</label><input id="inv-rate" type="number" value="${config.ratePerBus || 52}"></div>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" id="btn-generate">🧾 Generate Invoice</button>
          <button class="btn btn-success" id="btn-print" style="display:none">🖨️ Print Invoice</button>
        </div>
      </div>

      <!-- Invoice Preview -->
      <div id="invoice-preview" style="display:none">
        <div class="card invoice-container" id="invoice-content"></div>
      </div>
    `;

    const self = this;

    document.getElementById('btn-generate').addEventListener('click', () => {
      const invNo = document.getElementById('inv-no').value;
      const invDate = document.getElementById('inv-date').value;
      const supplyDate = document.getElementById('inv-supply').value;
      const period = document.getElementById('inv-period').value;
      const qty = parseInt(document.getElementById('inv-qty').value) || 0;
      const rate = parseInt(document.getElementById('inv-rate').value) || config.ratePerBus;

      const amount = qty * rate;
      const taxableValue = amount;
      const cgst = Math.round(taxableValue * config.cgstRate);
      const sgst = Math.round(taxableValue * config.sgstRate);
      const totalTax = cgst + sgst;
      const totalAfterTax = taxableValue + totalTax;
      const amountInWords = Utils.numberToWords(totalAfterTax);

      const desc = `${config.contractRef} — Washing & cleaning of Bus on Route for Budaun Depot (Period ${period || 'N/A'})`;

      const preview = document.getElementById('invoice-preview');
      preview.style.display = 'block';
      document.getElementById('btn-print').style.display = 'inline-flex';

      document.getElementById('invoice-content').innerHTML = `
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:4px">
          <span>GSTIN : ${config.gstin}</span>
          <span>PAN : ${config.pan}</span>
          <span>Ph : ${config.phone}</span>
        </div>

        <div class="invoice-header">
          <h2>${config.companyName} — ${config.companySubtitle}</h2>
          <p>${config.address}</p>
        </div>

        <div style="text-align:center;margin:12px 0;font-size:16px;font-weight:800;color:var(--primary);letter-spacing:2px;border:2px solid var(--primary);padding:6px;border-radius:4px">
          TAX INVOICE
        </div>

        <!-- Meta Info -->
        <div class="invoice-meta">
          <div>
            <div class="invoice-meta-row"><span class="invoice-meta-label">Invoice No.</span><span><strong>${invNo}</strong></span></div>
            <div class="invoice-meta-row"><span class="invoice-meta-label">Invoice Date</span><span>${Utils.formatDate(invDate)}</span></div>
            <div class="invoice-meta-row"><span class="invoice-meta-label">Reverse Charge (Y/N)</span><span>N</span></div>
          </div>
          <div>
            <div class="invoice-meta-row"><span class="invoice-meta-label">Transport Mode</span><span>-</span></div>
            <div class="invoice-meta-row"><span class="invoice-meta-label">Vehicle Number</span><span>-</span></div>
            <div class="invoice-meta-row"><span class="invoice-meta-label">Date of Supply</span><span>${Utils.formatDate(supplyDate)}</span></div>
          </div>
        </div>

        <!-- Bill To / Ship To -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="invoice-party">
            <h4>BILL TO PARTY</h4>
            <div style="font-size:12px">
              <div><strong>Name:</strong> ${config.billToName}</div>
              <div><strong>Address:</strong> ${config.billToAddress}</div>
              <div><strong>GSTIN:</strong> ${config.billToGSTIN}</div>
            </div>
          </div>
          <div class="invoice-party">
            <h4>SHIP TO PARTY</h4>
            <div style="font-size:12px">
              <div><strong>Name:</strong> ${config.shipToName}</div>
              <div><strong>Address:</strong> ${config.shipToAddress}</div>
              <div><strong>GSTIN:</strong> ${config.shipToGSTIN}</div>
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <table style="margin-bottom:0">
          <thead>
            <tr>
              <th style="width:30px">S.No.</th>
              <th>Product Description</th>
              <th style="width:60px">HSN Code</th>
              <th style="width:40px">UOM</th>
              <th class="num" style="width:50px">Qty.</th>
              <th class="num" style="width:70px">Rate (₹)</th>
              <th class="num" style="width:80px">Amount (₹)</th>
              <th class="num" style="width:60px">Disc. (₹)</th>
              <th class="num" style="width:90px">Taxable Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td style="font-size:11px">${desc}</td>
              <td>${config.hsnCode}</td>
              <td>Bus</td>
              <td class="num">${Utils.formatNumber(qty)}</td>
              <td class="num">${Utils.formatCurrency(rate)}</td>
              <td class="num">${Utils.formatCurrency(amount)}</td>
              <td class="num">₹0</td>
              <td class="num"><strong>${Utils.formatCurrency(taxableValue)}</strong></td>
            </tr>
            <tr><td>2</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="num">₹0</td><td></td></tr>
            <tr><td>3</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="num">₹0</td><td></td></tr>
            <tr><td>4</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="num">₹0</td><td></td></tr>
            <tr class="total-row">
              <td colspan="4"><strong>TOTAL</strong></td>
              <td class="num"><strong>${Utils.formatNumber(qty)}</strong></td>
              <td></td>
              <td class="num"><strong>${Utils.formatCurrency(amount)}</strong></td>
              <td class="num"><strong>₹0</strong></td>
              <td class="num"><strong>${Utils.formatCurrency(taxableValue)}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Totals Section -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px">
          <div class="invoice-bank">
            <h4 style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:8px">BANK DETAILS</h4>
            <div style="font-size:12px">
              <div><strong>Bank Name:</strong> ${config.bankName}</div>
              <div><strong>A/C No.:</strong> ${config.bankAccount}</div>
              <div><strong>Bank IFSC:</strong> ${config.bankIFSC}</div>
            </div>
          </div>
          <div class="invoice-total-section">
            <div class="invoice-total-row"><span>Total Amount</span><span>${Utils.formatCurrency(taxableValue)}</span></div>
            <div class="invoice-total-row"><span>Less: Discount</span><span>₹0</span></div>
            <div class="invoice-total-row"><span>Total Amount before Tax</span><span>${Utils.formatCurrency(taxableValue)}</span></div>
            <div class="invoice-total-row"><span>Add: CGST @ 9%</span><span>${Utils.formatCurrency(cgst)}</span></div>
            <div class="invoice-total-row"><span>Add: SGST @ 9%</span><span>${Utils.formatCurrency(sgst)}</span></div>
            <div class="invoice-total-row" style="border-top:1px solid var(--border);font-weight:600"><span>Total Tax Amount</span><span>${Utils.formatCurrency(totalTax)}</span></div>
            <div class="invoice-total-row grand"><span>Total Amount after Tax</span><span>${Utils.formatCurrency(totalAfterTax)}</span></div>
            <div class="invoice-total-row"><span>GST on Reverse Charge</span><span>₹0</span></div>
          </div>
        </div>

        <!-- Amount in Words -->
        <div style="margin-top:16px;padding:10px;background:#f7fafc;border-radius:6px;border:1px solid var(--border);font-size:12px">
          <strong>Amount in Words:</strong> ${amountInWords}
        </div>

        <!-- Footer -->
        <div style="margin-top:12px;font-size:11px;color:#666;font-style:italic">
          Certified that the particulars given above are true and correct.
        </div>

        <div class="invoice-footer" style="margin-top:30px">
          <div></div>
          <div class="invoice-stamp">
            <p style="margin-bottom:40px">For ${config.companyName}</p>
            <p style="border-top:1px solid #333;padding-top:4px;font-size:11px">Authorised Signatory</p>
          </div>
        </div>
      `;

      // Scroll to preview
      preview.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btn-print').addEventListener('click', () => {
      window.print();
    });
  }
};
