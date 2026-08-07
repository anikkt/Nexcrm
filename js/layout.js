window.NexCRM = window.NexCRM || {};

(function () {
  function renderSidebar() {
    const user = NexCRM.Auth.getUser();
    const sidebar = document.getElementById('sidebar');
    if (!user || !sidebar) return;
    const page = (location.hash.slice(1).split('/')[0].split('?')[0]) || 'dashboard';
    const unread = NexCRM.Store.Notifications.unreadCount(user.id);
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0) + (user.name.charCodeAt(1)||0)) % cc.length;

    const nav = [
      { id:'dashboard',    icon:'⊞',  label:'Dashboard' },
      { id:'tickets',      icon:'🎫', label:'Tickets' },
      { id:'customers',    icon:'👥', label:'Customers' },
      ...(NexCRM.Auth.isAdmin() || NexCRM.Auth.isManager() ? [{ id:'users', icon:'👤', label:'Users' }] : []),
      { id:'notifications',icon:'🔔', label:'Notifications', badge: unread },
      { id:'profile',      icon:'⚙️', label:'Profile & Settings' },
    ];
    const ph = [{ icon:'📈', l:'Sales Pipeline' }, { icon:'📚', l:'Knowledge Base' }, { icon:'📊', l:'Analytics' }];

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon">N</div>
        <span class="logo-text">NexCRM</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        ${nav.map(n => `
          <a href="#${n.id}" class="nav-item${page === n.id ? ' active' : ''}">
            <span class="nav-icon">${n.icon}</span>
            <span class="nav-label">${n.label}</span>
            ${n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}
          </a>`).join('')}
        <div class="nav-section-label" style="margin-top:14px">Coming soon</div>
        ${ph.map(p => `<div class="nav-item nav-disabled"><span class="nav-icon">${p.icon}</span><span class="nav-label">${p.l}</span><span class="soon-badge">Soon</span></div>`).join('')}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-avatar" style="background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]}">${user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${NexCRM.Utils.esc(user.name)}</div>
          <div class="sidebar-user-role">${user.role.charAt(0).toUpperCase()+user.role.slice(1)}</div>
        </div>
        <button class="btn-logout" onclick="NexCRM.Auth.logout()" title="Logout">⏻</button>
      </div>`;
  }

  function renderTopbar(title) {
    const user = NexCRM.Auth.getUser();
    const topbar = document.getElementById('topbar');
    if (!user || !topbar) return;
    document.title = title + ' — NexCRM';
    const unread = NexCRM.Store.Notifications.unreadCount(user.id);
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0) + (user.name.charCodeAt(1)||0)) % cc.length;

    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="sidebar-toggle" onclick="NexCRM.Layout.toggleSidebar()">☰</button>
        <h1 class="page-title">${NexCRM.Utils.esc(title)}</h1>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <span>🔍</span>
          <input type="text" placeholder="Search tickets, customers…" id="global-search" oninput="NexCRM.Layout.handleSearch(this.value)">
        </div>
        <a href="#notifications" class="notif-btn">${unread > 0 ? `🔔<span class="notif-count">${unread}</span>` : '🔔'}</a>
        <button class="theme-btn" onclick="NexCRM.Layout.toggleTheme()">🌙</button>
        <div class="topbar-avatar" style="background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]};cursor:pointer" onclick="location.hash='#profile'" title="My profile">
          ${user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
        </div>
      </div>`;
  }

  function toggleSidebar() { document.querySelector('.app-sidebar')?.classList.toggle('collapsed'); }
  function toggleTheme() {
    document.body.classList.toggle('dark');
    const btn = document.querySelector('.theme-btn');
    if (btn) btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  }
  function handleSearch(val) {
    if (val.length > 1) { location.hash = '#tickets?q=' + encodeURIComponent(val); }
  }
  function refresh() { const page = (location.hash.slice(1).split('/')[0].split('?')[0]) || 'dashboard'; renderSidebar(page); }

  window.NexCRM.Layout = { renderSidebar, renderTopbar, toggleSidebar, toggleTheme, handleSearch, refresh };
})();
