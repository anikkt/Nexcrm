window.NexCRM = window.NexCRM || {};

(function () {
  function render() {
    NexCRM.Layout.renderTopbar('Notifications');
    NexCRM.Layout.renderSidebar();
    const user = NexCRM.Auth.getUser();
    const S = NexCRM.Utils;
    const notifs = NexCRM.Store.Notifications.getAll(user.id);
    const unread = notifs.filter(n => !n.read).length;

    const typeIconBg = {
      info:    { icon:'ℹ️', bg:'#ecfeff' },
      success: { icon:'✅', bg:'#ecfdf5' },
      warning: { icon:'⚠️', bg:'#fffbeb' },
      danger:  { icon:'🚨', bg:'#fff1f2' },
    };

    const items = notifs.map(n => {
      const t = typeIconBg[n.type] || typeIconBg.info;
      return `
        <div class="notif-item${n.read?'':' unread'}" onclick="NexCRM.Notifications.handleClick('${n.id}','${S.esc(n.link||'')}')">
          ${!n.read ? '<div class="notif-dot"></div>' : ''}
          <div class="notif-icon" style="background:${t.bg}">${t.icon}</div>
          <div style="flex:1;min-width:0">
            <div class="notif-title${n.read?'':' fw'}">${S.esc(n.title)}</div>
            <div class="notif-body">${S.esc(n.body)}</div>
            <div class="notif-time">${S.fmtRelative(n.createdAt)}</div>
          </div>
          <button class="icon-btn" style="flex-shrink:0" onclick="event.stopPropagation();NexCRM.Notifications.remove('${n.id}')" title="Dismiss">×</button>
        </div>`;
    }).join('') || `<div class="empty-state"><div style="font-size:32px">🔔</div><div class="empty-state-title">All clear</div><div class="empty-state-body">No notifications to show.</div></div>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="card-title" style="font-size:16px">Notifications</div>
            <div class="text-muted" style="font-size:12px">${unread > 0 ? `${unread} unread` : 'All caught up'}</div>
          </div>
          ${unread > 0 ? `<button class="btn btn-ghost btn-sm" onclick="NexCRM.Notifications.markAllRead()">✓ Mark all as read</button>` : ''}
        </div>
        <div>${items}</div>
      </div>`;
  }

  function handleClick(id, link) {
    NexCRM.Store.Notifications.markRead(id);
    NexCRM.Layout.renderSidebar();
    if (link && link !== '#') { location.hash = link.replace(/^#/,''); }
    else render();
  }
  function remove(id) {
    NexCRM.Store.Notifications.delete(id);
    render();
    NexCRM.Layout.renderSidebar();
  }
  function markAllRead() {
    const user = NexCRM.Auth.getUser();
    NexCRM.Store.Notifications.markAllRead(user.id);
    NexCRM.toast('All notifications marked as read', 'success');
    render();
    NexCRM.Layout.renderSidebar();
  }

  window.NexCRM.Notifications = { render, handleClick, remove, markAllRead };
})();
