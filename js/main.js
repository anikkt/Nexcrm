// main.js — bootstrap and router
(function () {
  const user = NexCRM.Auth.requireAuth();
  if (!user) return;

  function route() {
    const raw  = location.hash.slice(1) || 'dashboard';
    const [pageSlug, ...rest] = raw.split('?')[0].split('/');
    const query = raw.includes('?') ? raw.split('?')[1] : '';
    const params = Object.fromEntries(new URLSearchParams(query));

    switch (pageSlug) {
      case 'dashboard':
        NexCRM.Dashboard.render();
        break;

      case 'tickets':
        if (rest[0]) NexCRM.Tickets.render(rest[0]);
        else { NexCRM.Tickets.render(); if (params.q) NexCRM.Tickets.renderList(params.q); }
        break;

      case 'customers':
        NexCRM.Customers.render(rest[0] || null);
        break;

      case 'users':
        if (NexCRM.Auth.isAdmin() || NexCRM.Auth.isManager()) NexCRM.Users.render();
        else { NexCRM.toast('Access denied', 'error'); location.hash = '#dashboard'; }
        break;

      case 'notifications':
        NexCRM.Notifications.render();
        break;

      case 'profile':
        NexCRM.Profile.render();
        break;

      default:
        NexCRM.Dashboard.render();
    }
  }

  // Keyboard shortcut: Esc closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') NexCRM.Utils.closeModal();
  });

  window.addEventListener('hashchange', route);
  route(); // initial render
})();
