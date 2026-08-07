window.NexCRM = window.NexCRM || {};

(function () {
  function renderSidebar() {
    const user = NexCRM.Auth.getUser();
    const sidebar = document.getElementById('sidebar');
    if (!user || !sidebar) return;
    const I = NexCRM.icon;
    const page = (location.hash.slice(1).split('/')[0].split('?')[0]) || 'dashboard';
    const unread = NexCRM.Store.Notifications.unreadCount(user.id);
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0) + (user.name.charCodeAt(1)||0)) % cc.length;

    const nav = [
      { id:'dashboard',     icon:'dashboard',  label:'Dashboard' },
      { id:'tickets',       icon:'tickets',    label:'Tickets' },
      { id:'customers',     icon:'customers',  label:'Customers' },
      ...(NexCRM.Auth.isAdmin() || NexCRM.Auth.isManager() ? [{ id:'users', icon:'users', label:'Users' }] : []),
      { id:'notifications', icon:'bell',       label:'Notifications', badge: unread },
      { id:'profile',       icon:'settings',   label:'Profile & Settings' },
    ];
    const ph = [
      { icon:'trending', l:'Sales Pipeline' },
      { icon:'book',     l:'Knowledge Base' },
      { icon:'barchart', l:'Analytics' },
      { icon:'zap',      l:'Automations' },
    ];

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon">${I('layers',16)}</div>
        <span class="logo-text">NexCRM</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        ${nav.map(n => `
          <a href="#${n.id}" class="nav-item${page === n.id ? ' active' : ''}">
            <span class="nav-icon">${I(n.icon)}</span>
            <span class="nav-label">${n.label}</span>
            ${n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}
          </a>`).join('')}
        <div class="nav-section-label" style="margin-top:14px">Coming soon</div>
        ${ph.map(p => `<div class="nav-item nav-disabled"><span class="nav-icon">${I(p.icon)}</span><span class="nav-label">${p.l}</span><span class="soon-badge">Soon</span></div>`).join('')}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-avatar" style="background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]}">${user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${NexCRM.Utils.esc(user.name)}</div>
          <div class="sidebar-user-role">${user.role.charAt(0).toUpperCase()+user.role.slice(1)}</div>
        </div>
        <button class="btn-logout" onclick="NexCRM.Auth.logout()" title="Logout">${I('logout',15)}</button>
      </div>`;
  }

  function renderTopbar(title) {
    const user = NexCRM.Auth.getUser();
    const topbar = document.getElementById('topbar');
    if (!user || !topbar) return;
    document.title = title + ' — NexCRM';
    const I = NexCRM.icon;
    const unread = NexCRM.Store.Notifications.unreadCount(user.id);
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0) + (user.name.charCodeAt(1)||0)) % cc.length;

    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="sidebar-toggle" onclick="NexCRM.Layout.toggleSidebar()">${I('menu',20)}</button>
        <h1 class="page-title">${NexCRM.Utils.esc(title)}</h1>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          ${I('search',14)}
          <input type="text" placeholder="Search anything…" id="global-search"
            oninput="NexCRM.Layout.onSearchInput(this.value)"
            onkeydown="if(event.key==='Enter')NexCRM.Layout.commitSearch(this.value)">
        </div>
        <a href="#notifications" class="notif-btn">${I('bell',17)}${unread > 0 ? `<span class="notif-count">${unread}</span>` : ''}</a>
        <button class="theme-btn" id="theme-btn" onclick="NexCRM.Layout.toggleTheme()" title="Toggle theme">${I('moon',17)}</button>
        <div class="topbar-avatar" style="background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]};cursor:pointer" onclick="location.hash='#profile'" title="My profile">
          ${user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
        </div>
      </div>`;
  }

  function onSearchInput(val) {
    // Do NOT navigate while typing — only on Enter
    // Optionally clear any pending search indication
  }
  function commitSearch(val) {
    if (val.trim()) location.hash = '#tickets?q=' + encodeURIComponent(val.trim());
  }

  function toggleSidebar() { document.querySelector('.app-sidebar')?.classList.toggle('collapsed'); }
  function toggleTheme() {
    document.body.classList.toggle('dark');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.innerHTML = document.body.classList.contains('dark') ? NexCRM.icon('sun',17) : NexCRM.icon('moon',17);
  }
  function refresh() { renderSidebar(); }

  window.NexCRM.Layout = { renderSidebar, renderTopbar, toggleSidebar, toggleTheme, onSearchInput, commitSearch, refresh };
})();
