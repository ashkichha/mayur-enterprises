// ============================================================
// MAYUR ENTERPRISES — APP CONTROLLER
// ============================================================
(function() {
  const NAV_ITEMS = [
    { id: 'dashboard',  icon: '📊', label: 'Dashboard',           module: () => window.DashboardModule },
    { id: 'buslog',     icon: '🚌', label: 'Bus Washing Log',     module: () => window.BusLogModule },
    { id: 'billing',    icon: '📋', label: 'UPSRTC Billing',      module: () => window.BillingModule },
    { id: 'attendance', icon: '👥', label: 'Attendance',           module: () => window.AttendanceModule },
    { id: 'payroll',    icon: '💰', label: 'Staff Payroll',        module: () => window.PayrollModule },
    { id: 'expenses',   icon: '📑', label: 'Partner Expenses',     module: () => window.ExpensesModule },
    { id: 'profit',     icon: '📈', label: 'Profit Settlement',    module: () => window.ProfitModule },
    { id: 'busyexport', icon: '💾', label: 'Busy Export',          module: () => window.BusyExportModule },
    { id: 'capital',    icon: '🏗️', label: 'Capital & Assets',    module: () => window.CapitalModule },
    { id: 'invoice',    icon: '🧾', label: 'Tax Invoice',          module: () => window.InvoiceModule }
  ];

  let currentModule = null;

  function initApp() {
    renderSidebar();
    setupGlobalTools();
    setupMobileMenu();
    // Default to dashboard
    navigateTo('dashboard');
  }

  function setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const overlay = document.getElementById('mobile-overlay');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  function setupGlobalTools() {
    const backupBtn = document.getElementById('btn-backup-data');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        const backupObj = {
          exportDate: new Date().toISOString(),
          busLog: Utils.loadLocal('busLog'),
          billing: Utils.loadLocal('billing'),
          expenses: Utils.loadLocal('expenses'),
          profitSettlement: Utils.loadLocal('profitSettlement'),
          attendance: Utils.loadLocal('attendance'),
          payroll: Utils.loadLocal('payroll'),
          advances: Utils.loadLocal('advances'),
          capitalItems: Utils.loadLocal('capitalItems')
        };
        const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Mayur_Enterprises_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        AppModal.confirm(
          '⚠️ Reset All Data to Original Seed State',
          'Are you sure you want to reset all modified records back to the original Excel file data? All local edits, added records, and deletions will be reverted.',
          () => {
            const keys = ['busLog', 'billing', 'expenses', 'profitSettlement', 'attendance', 'payroll', 'advances', 'capitalItems'];
            keys.forEach(k => localStorage.removeItem('ME_' + k));
            alert('Data reset successfully! Reloading...');
            location.reload();
          }
        );
      });
    }
  }

  function renderSidebar() {
    const navContainer = document.getElementById('nav-items');
    navContainer.innerHTML = '';
    NAV_ITEMS.forEach(item => {
      const div = document.createElement('div');
      div.className = 'nav-item';
      div.dataset.id = item.id;
      div.innerHTML = `<span class="icon">${item.icon}</span><span>${item.label}</span>`;
      div.addEventListener('click', () => navigateTo(item.id));
      navContainer.appendChild(div);
    });
  }

  function navigateTo(id) {
    // Close mobile drawer if open
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });

    // Find module
    const navItem = NAV_ITEMS.find(n => n.id === id);
    if (!navItem) return;

    const mod = navItem.module();
    if (!mod) {
      const container = document.getElementById('main-content');
      container.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><p>Module "${navItem.label}" is loading...</p></div>`;
      return;
    }

    currentModule = id;
    const container = document.getElementById('main-content');
    container.innerHTML = '';
    container.className = 'main-content module-container';

    try {
      mod.render(container);
    } catch(e) {
      console.error(`Error rendering ${id}:`, e);
      container.innerHTML = `<div class="empty-state"><div class="icon">❌</div><p>Error loading ${navItem.label}: ${e.message}</p></div>`;
    }
  }

  // Global modal helper
  window.AppModal = {
    show(title, contentHTML, onSave) {
      let overlay = document.getElementById('app-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'app-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal" id="app-modal"><h3 id="modal-title"></h3><div id="modal-body"></div><div class="btn-group" id="modal-actions"></div></div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) AppModal.hide(); });
      }
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = contentHTML;
      const actions = document.getElementById('modal-actions');
      actions.innerHTML = '';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => AppModal.hide();
      actions.appendChild(cancelBtn);
      if (onSave) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => { onSave(); AppModal.hide(); };
        actions.appendChild(saveBtn);
      }
      overlay.classList.add('active');
    },
    confirm(title, message, onConfirm) {
      let overlay = document.getElementById('app-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'app-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal" id="app-modal"><h3 id="modal-title"></h3><div id="modal-body"></div><div class="btn-group" id="modal-actions"></div></div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) AppModal.hide(); });
      }
      document.getElementById('modal-title').textContent = title || 'Confirm Action';
      document.getElementById('modal-body').innerHTML = `<p style="font-size:14px;color:var(--text);margin-bottom:12px;">${message}</p>`;
      const actions = document.getElementById('modal-actions');
      actions.innerHTML = '';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => AppModal.hide();
      actions.appendChild(cancelBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-danger';
      confirmBtn.textContent = 'Delete';
      confirmBtn.onclick = () => {
        AppModal.hide();
        if (typeof onConfirm === 'function') onConfirm();
      };
      actions.appendChild(confirmBtn);
      overlay.classList.add('active');
    },
    hide() {
      const overlay = document.getElementById('app-modal-overlay');
      if (overlay) overlay.classList.remove('active');
    }
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
