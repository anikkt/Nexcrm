window.NexCRM = window.NexCRM || {};

(function () {
  function renderSidebar(activePage) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const user = NexCRM.Auth.getUser();
    if (!user) return;
    const I = NexCRM.icon;
    // Accept explicit page or derive from hash
    const page = activePage || (location.hash.slice(1).split('/')[0].split('?')[0]) || 'dashboard';
    const unread = NexCRM.Store.Notifications.unreadCount(user.id);
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0)+(user.name.charCodeAt(1)||0))%cc.length;

    const nav = [
      { id:'dashboard',    icon:'dashboard', label:'Dashboard' },
      { id:'tickets',      icon:'tickets',   label:'Tickets' },
      { id:'customers',    icon:'customers', label:'Customers' },
      ...(NexCRM.Auth.isAdmin()||NexCRM.Auth.isManager()?[{id:'users',icon:'users',label:'Users'}]:[]),
      { id:'notifications',icon:'bell',      label:'Notifications', badge:unread },
      { id:'profile',      icon:'settings',  label:'Profile & Settings' },
    ];
    const ph=[
      {icon:'trending',label:'Sales Pipeline'},
      {icon:'book',    label:'Knowledge Base'},
      {icon:'barchart',label:'Analytics'},
      {icon:'zap',     label:'Automations'},
    ];

    // Render current user avatar (handles preset/image avatars)
    const avatarHtml = _userAvatarHtml(user, 28);

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon">${I('layers',16)}</div>
        <span class="logo-text">NexCRM</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        ${nav.map(n=>`
          <a href="#${n.id}" class="nav-item${page===n.id?' active':''}">
            <span class="nav-icon">${I(n.icon)}</span>
            <span class="nav-label">${n.label}</span>
            ${n.badge?`<span class="nav-badge">${n.badge}</span>`:''}
          </a>`).join('')}
        <div class="nav-section-label" style="margin-top:14px">Coming soon</div>
        ${ph.map(p=>`<div class="nav-item nav-disabled"><span class="nav-icon">${I(p.icon)}</span><span class="nav-label">${p.label}</span><span class="soon-badge">Soon</span></div>`).join('')}
      </nav>
      <div class="sidebar-user">
        ${avatarHtml}
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${NexCRM.Utils.esc(user.name)}</div>
          <div class="sidebar-user-role">${user.role.charAt(0).toUpperCase()+user.role.slice(1)}</div>
        </div>
        <button class="btn-logout" onclick="NexCRM.Auth.logout()" title="Logout">${I('logout',15)}</button>
      </div>`;
  }

  function _userAvatarHtml(user, size) {
    if (!user) return '';
    const av = user.avatar;
    if (av?.type === 'image' && av.data) {
      return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${av.data}" style="width:100%;height:100%;object-fit:cover"></div>`;
    }
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0)+(user.name.charCodeAt(1)||0))%cc.length;
    const bg = av?.type==='preset' ? av.bg : cc[ci];
    const fg = av?.type==='preset' ? av.color : bg+'22';
    const ini = user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    if (av?.type==='preset') {
      return `<div class="sidebar-avatar" style="background:${bg};color:${fg}">${ini}</div>`;
    }
    return `<div class="sidebar-avatar" style="background:${bg}22;border:1.5px solid ${bg}44;color:${bg}">${ini}</div>`;
  }

  function renderTopbar(title) {
    const user = NexCRM.Auth.getUser();
    const topbar = document.getElementById('topbar');
    if (!user || !topbar) return;
    document.title = title + ' — NexCRM';
    const I = NexCRM.icon;
    const unread = NexCRM.Store.Notifications.unreadCount(user.id);
    const isDark = document.body.classList.contains('dark');
    const topbarAvatarHtml = _topbarAvatarHtml(user, 32);

    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="sidebar-toggle" onclick="NexCRM.Layout.toggleSidebar()">${I('menu',20)}</button>
        <h1 class="page-title">${NexCRM.Utils.esc(title)}</h1>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          ${I('search',14)}
          <input type="text" placeholder="Search anything…" id="global-search"
            onkeydown="if(event.key==='Enter')NexCRM.Layout.commitSearch(this.value)">
        </div>
        <a href="#notifications" class="notif-btn">${I('bell',17)}${unread>0?`<span class="notif-count">${unread}</span>`:''}</a>
        <button class="theme-btn" id="theme-btn" onclick="NexCRM.Layout.toggleTheme()" title="Toggle dark mode">${isDark?I('sun',17):I('moon',17)}</button>
        ${topbarAvatarHtml}
      </div>`;
  }

  function _topbarAvatarHtml(user, size) {
    const av = user.avatar;
    if (av?.type === 'image' && av.data) {
      return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;cursor:pointer" onclick="location.hash='#profile'" title="My profile"><img src="${av.data}" style="width:100%;height:100%;object-fit:cover"></div>`;
    }
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0)+(user.name.charCodeAt(1)||0))%cc.length;
    const bg = av?.type==='preset' ? av.bg : cc[ci];
    const fg = av?.type==='preset' ? av.color : '#fff';
    const ini = user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    if (av?.type==='preset') {
      return `<div class="topbar-avatar" style="background:${bg};color:${fg};cursor:pointer" onclick="location.hash='#profile'">${ini}</div>`;
    }
    return `<div class="topbar-avatar" style="background:${bg}22;border:1.5px solid ${bg}44;color:${bg};cursor:pointer" onclick="location.hash='#profile'">${ini}</div>`;
  }

  function commitSearch(val) {
    if (val.trim()) location.hash = '#tickets?q=' + encodeURIComponent(val.trim());
  }
  function toggleSidebar() { document.querySelector('.app-sidebar')?.classList.toggle('collapsed'); }
  function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.innerHTML = isDark ? NexCRM.icon('sun',17) : NexCRM.icon('moon',17);
    localStorage.setItem('ncm_theme', isDark ? 'dark' : 'light');
  }
  function applyTheme() {
    if (localStorage.getItem('ncm_theme') === 'dark') document.body.classList.add('dark');
  }

  window.NexCRM.Layout = { renderSidebar, renderTopbar, toggleSidebar, toggleTheme, applyTheme, commitSearch, _userAvatarHtml, _topbarAvatarHtml };
})();
