// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const Utils = {
  formatCurrency(n) {
    if (n == null || isNaN(n)) return '₹0';
    const abs = Math.abs(Math.round(n));
    const s = abs.toLocaleString('en-IN');
    return (n < 0 ? '-₹' : '₹') + s;
  },
  formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return Math.round(n).toLocaleString('en-IN');
  },
  parseMonth(m) {
    if (!m) return null;
    const clean = String(m).trim();
    const parts = clean.split(/[- /]/);
    if (parts.length < 2) return null;
    const monthNames = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const mStr = parts[0].toLowerCase().slice(0, 3);
    const mi = monthNames[mStr];
    if (mi === undefined) return null;
    let yr = parseInt(parts[1], 10);
    if (isNaN(yr)) return null;
    if (yr < 100) yr += 2000;
    return new Date(yr, mi, 1);
  },
  monthLabel(m) { return m; },
  getMonthsList(startYear = 2023, endYear = 2032) {
    const months = [];
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let y = startYear; y <= endYear; y++) {
      for (let mi = 0; mi < 12; mi++) {
        if (y === 2023 && mi < 4) continue; // Contract started May-2023
        const label = names[mi] + '-' + String(y).slice(2);
        months.push(label);
      }
    }
    return months;
  },
  isHariomOfficeMonth(month) {
    const d = Utils.parseMonth(month);
    if (!d) return true;
    return d < new Date(2026, 9, 1); // Before Oct-2026 is Hariom, Oct-2026 onwards (2027..2030+) is Ashish
  },
  getEmployees() {
    const local = Utils.loadLocal('employeeMaster');
    if (local && Array.isArray(local) && local.length > 0) return local;
    const defaultList = [
      { id: 1, name: 'Ashu', designation: 'Washing Staff', baseSalary: 10000, shiftHrs: 10, otRate: 50, phone: '94571-00001', status: 'Active' },
      { id: 2, name: 'Vipin', designation: 'Washing Staff', baseSalary: 10000, shiftHrs: 10, otRate: 50, phone: '94571-00002', status: 'Active' },
      { id: 3, name: 'Yogesh', designation: 'Washing Staff', baseSalary: 10000, shiftHrs: 10, otRate: 50, phone: '94571-00003', status: 'Active' },
      { id: 4, name: 'Vishal', designation: 'Washing Staff', baseSalary: 10000, shiftHrs: 10, otRate: 50, phone: '94571-00004', status: 'Active' }
    ];
    return defaultList;
  },
  saveEmployees(list) {
    Utils.saveLocal('employeeMaster', list);
    if (window.SEED_DATA && window.SEED_DATA.config) {
      window.SEED_DATA.config.employees = list.filter(e => e.status !== 'Inactive').map(e => e.name);
    }
  },
  getEmployeeNames() {
    const list = Utils.getEmployees();
    return list.filter(e => e.status !== 'Inactive').map(e => e.name);
  },
  el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k,v]) => {
      if (k === 'className') e.className = v;
      else if (k === 'innerHTML') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null) return;
      if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
    return e;
  },
  saveLocal(key, data) {
    try { localStorage.setItem('ME_' + key, JSON.stringify(data)); } catch(e) { console.warn('Save failed:', e); }
  },
  loadLocal(key) {
    try { const d = localStorage.getItem('ME_' + key); return d ? JSON.parse(d) : null; } catch(e) { return null; }
  },
  numberToWords(n) {
    if (n === 0) return 'Zero';
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    function convert(num) {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '');
      if (num < 1000) return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' and ' + convert(num%100) : '');
      if (num < 100000) return convert(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' ' + convert(num%1000) : '');
      if (num < 10000000) return convert(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' ' + convert(num%100000) : '');
      return convert(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' ' + convert(num%10000000) : '');
    }
    const rupees = Math.floor(Math.abs(n));
    const paise = Math.round((Math.abs(n) - rupees) * 100);
    let result = convert(rupees) + ' Rupees';
    if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
    return result + ' Only';
  },
  formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2,'0');
    const mm = String(dt.getMonth()+1).padStart(2,'0');
    const yy = dt.getFullYear();
    return dd + '-' + mm + '-' + yy;
  },
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
};
