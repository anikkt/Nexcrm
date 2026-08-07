window.NexCRM = window.NexCRM || {};

(function () {
  const ROLES = {
    admin:   { l:'Admin',   desc:'Full access — manage all data, users and settings' },
    manager: { l:'Manager', desc:'Manage tickets, customers; view reports and users' },
    analyst: { l:'Analyst', desc:'View and update assigned tickets; add comments' },
    user:    { l:'User',    desc:'Basic access — view assigned tickets only' },
  };

  function render() {
    // Redirect non-admins/managers
    if (!NexCRM.Auth.isAdmin() && !NexCRM.Auth.isManager()) { location.hash = '#dashboard'; return; }
    NexCRM.Layout.renderTopbar('Users');
    NexCRM.Layout.renderSidebar();
    const S = NexCRM.Utils;
    const currentUser = NexCRM.Auth.getUser();
    const users = NexCRM.Store.Users.getAll();

    const rows = users.map(u => {
      const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
      const ci = ((u.name.charCodeAt(0)||0)+(u.name.charCodeAt(1)||0))%cc.length;
      const ini = u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const isSelf = u.id === currentUser.id;
      return `
        <div class="user-row">
          <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]};flex-shrink:0">${ini}</div>
          <div class="user-info">
            <div class="user-name">${S.esc(u.name)}${isSelf?' <span style="font-size:11px;color:var(--primary)">(you)</span>':''}</div>
            <div class="user-email">${S.esc(u.email)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap">
            <span class="role-pill ${u.role}">${ROLES[u.role]?.l || u.role}</span>
            <span class="text-muted" style="font-size:11px">${S.esc(u.department||'—')}</span>
            <span class="badge" style="background:${u.active?'#ecfdf5':'#f1f5f9'};color:${u.active?'#065f46':'#6b7280'}">${u.active?'Active':'Inactive'}</span>
          </div>
          ${NexCRM.Auth.isAdmin() ? `
          <div style="display:flex;gap:4px;flex-shrink:0" onclick="event.stopPropagation()">
            <button class="icon-btn" onclick="NexCRM.Users.openEditModal('${u.id}')" title="Edit">✏️</button>
            ${!isSelf ? `<button class="icon-btn" onclick="NexCRM.Users.toggleActive('${u.id}','${S.esc(u.name)}',${u.active})" title="${u.active?'Deactivate':'Activate'}">${u.active?'🔒':'🔓'}</button>` : ''}
          </div>` : ''}
        </div>`;
    }).join('');

    const stats = Object.entries(ROLES).map(([k,v]) => {
      const count = users.filter(u => u.role === k && u.active).length;
      return `<div class="kpi-card" style="padding:14px 18px"><div class="kpi-value" style="font-size:22px">${count}</div><div class="kpi-label">${v.l}${count!==1?'s':''}</div></div>`;
    }).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${stats}</div>
        <div class="card-flush">
          <div style="padding:16px 18px;border-bottom:1px solid var(--s100);display:flex;align-items:center;justify-content:space-between">
            <span class="card-title">Team members (${users.length})</span>
            ${NexCRM.Auth.isAdmin() ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Users.openCreateModal()">+ Add user</button>` : ''}
          </div>
          ${rows || `<div class="empty-state">No users found.</div>`}
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:14px">Role permissions</div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>Role</th><th>Description</th><th>Manage tickets</th><th>Manage customers</th><th>Manage users</th><th>Settings</th></tr></thead>
              <tbody>
                <tr><td><span class="role-pill admin">Admin</span></td><td class="td-sm">Full access</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
                <tr><td><span class="role-pill manager">Manager</span></td><td class="td-sm">Day-to-day ops</td><td>✅</td><td>✅</td><td>👁 View</td><td>❌</td></tr>
                <tr><td><span class="role-pill analyst">Analyst</span></td><td class="td-sm">Assigned work</td><td>Assigned only</td><td>👁 View</td><td>❌</td><td>❌</td></tr>
                <tr><td><span class="role-pill user">User</span></td><td class="td-sm">Basic access</td><td>Assigned only</td><td>❌</td><td>❌</td><td>❌</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function _userForm(u, isNew) {
    const S = NexCRM.Utils;
    const depts = NexCRM.Store.Settings.get().departments || [];
    const deptOpts = depts.map(d => `<option value="${d}" ${u&&u.department===d?'selected':''}>${S.esc(d)}</option>`).join('');
    const roleOpts = Object.entries(ROLES).map(([k,v]) => `<option value="${k}" ${u&&u.role===k?'selected':''}>${v.l} — ${v.desc}</option>`).join('');
    return `<div class="form-grid">
      <div class="form-field"><label>Full name <span class="required">*</span></label><input type="text" id="fu-name" class="input" value="${u?S.esc(u.name):''}" placeholder="First and last name"></div>
      <div class="form-field"><label>Email <span class="required">*</span></label><input type="email" id="fu-email" class="input" value="${u?S.esc(u.email):''}" placeholder="user@company.com" ${!isNew?'disabled style="background:var(--s50)"':''}></div>
      ${isNew ? `<div class="form-field"><label>Password <span class="required">*</span></label><input type="text" id="fu-pwd" class="input" value="${_genPwd()}" placeholder="Temporary password"><div class="form-help">Share this with the user. They can change it in their profile.</div></div>` : ''}
      <div class="form-field"><label>Role <span class="required">*</span></label><select id="fu-role" class="input" style="font-size:12px">${roleOpts}</select></div>
      <div class="form-field"><label>Department</label><select id="fu-dept" class="input"><option value="">— None —</option>${deptOpts}</select></div>
      <div class="form-field"><label>Phone</label><input type="tel" id="fu-phone" class="input" value="${u?S.esc(u.phone||''):''}" placeholder="+1 555 000 0000"></div>
    </div>`;
  }

  function _genPwd() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function openCreateModal() {
    NexCRM.Utils.openModal('Add user', _userForm(null, true),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Users.create()">Create account</button>`, 'lg');
  }

  function openEditModal(id) {
    const u = NexCRM.Store.Users.get(id);
    if (!u) return;
    NexCRM.Utils.openModal(`Edit ${u.name}`, _userForm(u, false),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Users.update('${id}')">Save changes</button>`, 'lg');
  }

  function create() {
    const S = NexCRM.Utils;
    const name  = document.getElementById('fu-name')?.value.trim();
    const email = document.getElementById('fu-email')?.value.trim();
    const pwd   = document.getElementById('fu-pwd')?.value.trim();
    const role  = document.getElementById('fu-role')?.value;
    const dept  = document.getElementById('fu-dept')?.value || '';
    const phone = document.getElementById('fu-phone')?.value.trim() || '';
    if (!name)  { NexCRM.toast('Name is required', 'error'); return; }
    if (!email) { NexCRM.toast('Email is required', 'error'); return; }
    if (!pwd)   { NexCRM.toast('Password is required', 'error'); return; }
    if (NexCRM.Store.Users.getByEmail(email)) { NexCRM.toast('Email already in use', 'error'); return; }
    NexCRM.Store.Users.create({ name, email, password: pwd, role, department: dept, phone });
    NexCRM.Utils.closeModal();
    NexCRM.toast(`${name} added as ${ROLES[role]?.l||role}`, 'success');
    render();
  }

  function update(id) {
    const name  = document.getElementById('fu-name')?.value.trim();
    const role  = document.getElementById('fu-role')?.value;
    const dept  = document.getElementById('fu-dept')?.value || '';
    const phone = document.getElementById('fu-phone')?.value.trim() || '';
    if (!name) { NexCRM.toast('Name is required', 'error'); return; }
    NexCRM.Store.Users.update(id, { name, role, department: dept, phone });
    NexCRM.Utils.closeModal();
    NexCRM.toast('User updated', 'success');
    render();
  }

  function toggleActive(id, name, current) {
    const action = current ? 'deactivate' : 'reactivate';
    NexCRM.Utils.confirm(`${action.charAt(0).toUpperCase()+action.slice(1)} <strong>${name}</strong>?`, () => {
      NexCRM.Store.Users.update(id, { active: !current });
      NexCRM.toast(`${name} ${action}d`, 'success');
      render();
    }, action.charAt(0).toUpperCase()+action.slice(1), current ? 'danger' : 'primary');
  }

  window.NexCRM.Users = { render, openCreateModal, openEditModal, create, update, toggleActive };
})();
