window.NexCRM = window.NexCRM || {};

(function () {
  function render() {
    NexCRM.Layout.renderTopbar('Notifications');
    NexCRM.Layout.renderSidebar('notifications');
    const user=NexCRM.Auth.getUser(), S=NexCRM.Utils, Ic=NexCRM.icon;
    const notifs=NexCRM.Store.Notifications.getAll(user.id);
    const unread=notifs.filter(n=>!n.read).length;
    const typeCfg={
      info:    {icon:'alert_c', bg:'#ecfeff', color:'#0e7490'},
      success: {icon:'check_c', bg:'#ecfdf5', color:'#065f46'},
      warning: {icon:'alert_t', bg:'#fffbeb', color:'#b45309'},
      danger:  {icon:'alert_t', bg:'#fff1f2', color:'#be123c'},
    };
    const items=notifs.map(n=>{
      const t=typeCfg[n.type]||typeCfg.info;
      return `<div class="notif-item${n.read?'':' unread'}" onclick="NexCRM.Notifications.handleClick('${n.id}','${S.esc(n.link||'')}')">
        ${!n.read?'<div class="notif-dot"></div>':''}
        <div class="notif-icon" style="background:${t.bg};color:${t.color}">${Ic(t.icon,16)}</div>
        <div style="flex:1;min-width:0">
          <div class="notif-title${n.read?'':' fw'}">${S.esc(n.title)}</div>
          <div class="notif-body">${S.esc(n.body)}</div>
          <div class="notif-time">${S.fmtRelative(n.createdAt)}</div>
        </div>
        <button class="icon-btn" style="flex-shrink:0;color:var(--s400)" onclick="event.stopPropagation();NexCRM.Notifications.remove('${n.id}')" title="Dismiss">${Ic('x',13)}</button>
      </div>`;
    }).join('')||`<div class="empty-state">${Ic('bell',32)}<div class="empty-state-title">All clear</div><div class="empty-state-body">No notifications to show.</div></div>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div class="card-title" style="font-size:16px">Notifications</div><div class="text-muted" style="font-size:12px">${unread>0?`${unread} unread`:'All caught up'}</div></div>
          ${unread>0?`<button class="btn btn-ghost btn-sm" onclick="NexCRM.Notifications.markAllRead()">${Ic('check_c',13)} Mark all as read</button>`:''}
        </div>
        <div>${items}</div>
      </div>`;
  }

  function handleClick(id,link){NexCRM.Store.Notifications.markRead(id);NexCRM.Layout.renderSidebar('notifications');if(link&&link!=='#'){location.hash=link.replace(/^#/,'');}else render();}
  function remove(id){NexCRM.Store.Notifications.delete(id);render();NexCRM.Layout.renderSidebar('notifications');}
  function markAllRead(){const user=NexCRM.Auth.getUser();NexCRM.Store.Notifications.markAllRead(user.id);NexCRM.toast('All read','success');render();NexCRM.Layout.renderSidebar('notifications');}

  window.NexCRM.Notifications={render,handleClick,remove,markAllRead};
})();
