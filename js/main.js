// main.js — bootstrap and router
(function () {
  // Apply saved theme before anything renders
  if (localStorage.getItem('ncm_theme') === 'dark') document.body.classList.add('dark');

  // Show a loading screen while Firebase loads
  document.getElementById('page-content').innerHTML = `
    <div style="height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
      <div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite"></div>
      <div style="font-size:14px;color:var(--text-3)">Connecting to database…</div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;

  // Wait for Firebase data before doing anything
  NexCRM._ready.then(() => {
    const user = NexCRM.Auth.requireAuth();
    if (!user) return;

    // Re-render current page when Firebase pushes updates from another user
    NexCRM._onDataUpdate = function () {
      // Don't interrupt if modal is open or user is typing
      const modal = document.getElementById('modal-backdrop');
      if (modal && !modal.classList.contains('hidden')) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      route();
    };

    document.addEventListener('keydown', e => { if (e.key === 'Escape') NexCRM.Utils.closeModal(); });
    window.addEventListener('hashchange', route);
    route();
  });

  function route() {
    const raw      = location.hash.slice(1) || 'dashboard';
    const base     = raw.split('?')[0];
    const [page, ...rest] = base.split('/');
    const query    = raw.includes('?') ? raw.split('?')[1] : '';
    const params   = Object.fromEntries(new URLSearchParams(query));

    switch (page) {
      case 'dashboard':    NexCRM.Dashboard.render(); break;
      case 'tickets':
        if (rest[0]) NexCRM.Tickets.render(rest[0]);
        else NexCRM.Tickets.renderList(params.q !== undefined ? decodeURIComponent(params.q) : undefined);
        break;
      case 'customers':    NexCRM.Customers.render(rest[0] || null); break;
      case 'departments':  NexCRM.Departments.render(); break;
      case 'categories':   NexCRM.Categories.render(); break;
      case 'reports':      NexCRM.Reports.render(); break;
      case 'sla':          NexCRM.SLA.render(); break;
      case 'users':
        if (NexCRM.Auth.isAdmin() || NexCRM.Auth.isManager()) NexCRM.Users.render();
        else { NexCRM.toast('Access denied', 'error'); location.hash = '#dashboard'; }
        break;
      case 'notifications': NexCRM.Notifications.render(); break;
      case 'profile':       NexCRM.Profile.render(); break;
      default:              NexCRM.Dashboard.render();
    }
  }
})();
