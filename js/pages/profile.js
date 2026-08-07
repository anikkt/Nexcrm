window.NexCRM = window.NexCRM || {};

(function () {
  function render() {
    NexCRM.Layout.renderTopbar('Profile & Settings');
    NexCRM.Layout.renderSidebar();
    const user = NexCRM.Auth.getUser();
    const S = NexCRM.Utils;
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((user.name.charCodeAt(0)||0)+(user.name.charCodeAt(1)||0))%cc.length;
    const ini = user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const depts = NexCRM.Store.Settings.get().departments || [];
    const np = user.notifPrefs || {};
    const isAdmin = NexCRM.Auth.isAdmin();

    const notifToggles = [
      { key:'assigned',     label:'Ticket assigned to me',      icon:'🎫' },
      { key:'statusUpdates',label:'Ticket status changes',      icon:'🔄' },
      { key:'newCustomer',  label:'New customer added',         icon:'👥' },
      { key:'mentions',     label:'Mentions in comments',       icon:'💬' },
      { key:'systemAlerts', label:'System alerts & downtime',   icon:'⚙️' },
      { key:'weeklyDigest', label:'Weekly digest email',        icon:'📬' },
    ].map(n => `
      <div class="notif-toggle-row">
        <div style="display:flex;align-items:center;gap:9px">
          <span style="font-size:15px">${n.icon}</span>
          <span style="font-size:13px;color:var(--text)">${n.label}</span>
        </div>
        <button class="toggle-switch${np[n.key]?' on':''}" id="tog-${n.key}" onclick="NexCRM.Profile.toggleNotif('${n.key}')">
          <div class="toggle-knob"></div>
        </button>
      </div>`).join('');

    const settings = NexCRM.Store.Settings.get();

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="grid-2">
          <!-- Profile card -->
          <div class="card">
            <div class="profile-header">
              <div class="profile-avatar-wrap">
                <div class="profile-avatar" style="background:${cc[ci]}22;border:2px solid ${cc[ci]}44;color:${cc[ci]}">${ini}</div>
              </div>
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--text)">${S.esc(user.name)}</div>
                <div class="text-muted" style="font-size:13px">${S.esc(user.email)}</div>
                <span class="role-pill ${user.role}" style="margin-top:6px;display:inline-block">${user.role.charAt(0).toUpperCase()+user.role.slice(1)}</span>
              </div>
            </div>
            <div class="card-title" style="margin-bottom:14px">Edit profile</div>
            <div class="form-stack">
              <div class="form-field"><label>Full name</label><input type="text" id="p-name" class="input" value="${S.esc(user.name)}"></div>
              <div class="form-field"><label>Phone</label><input type="tel" id="p-phone" class="input" value="${S.esc(user.phone||'')}"></div>
              <div class="form-field"><label>Department</label>
                <select id="p-dept" class="input">
                  <option value="">— None —</option>
                  ${depts.map(d=>`<option value="${d}" ${user.department===d?'selected':''}>${S.esc(d)}</option>`).join('')}
                </select>
              </div>
              <button class="btn btn-primary" onclick="NexCRM.Profile.saveProfile()">Save changes</button>
            </div>
          </div>

          <!-- Change password -->
          <div class="card">
            <div class="card-title" style="margin-bottom:16px">Change password</div>
            <div class="form-stack">
              <div class="form-field"><label>Current password</label><input type="password" id="p-cur-pwd" class="input" placeholder="Current password"></div>
              <div class="form-field">
                <label>New password</label>
                <input type="password" id="p-new-pwd" class="input" placeholder="New password" oninput="NexCRM.Profile.checkPwdStrength(this.value)">
                <div class="pwd-strength" id="pwd-strength-bar"></div>
                <div class="form-help" id="pwd-strength-label"></div>
              </div>
              <div class="form-field"><label>Confirm new password</label><input type="password" id="p-cfm-pwd" class="input" placeholder="Repeat new password"></div>
              <button class="btn btn-ghost" onclick="NexCRM.Profile.changePassword()">Update password</button>
            </div>
          </div>
        </div>

        <!-- Notification preferences -->
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Notification preferences</div>
          ${notifToggles}
        </div>

        ${isAdmin ? `
        <!-- Org Settings (Admin only) -->
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Organisation settings <span style="font-size:11px;color:var(--primary);margin-left:8px;font-weight:400">Admin only</span></div>
          <div class="form-grid">
            <div class="form-field"><label>Organisation name</label><input type="text" id="s-orgname" class="input" value="${S.esc(settings.orgName||'')}"></div>
            <div class="form-field"><label>Industry</label><input type="text" id="s-industry" class="input" value="${S.esc(settings.industry||'')}"></div>
            <div class="form-field"><label>Timezone</label><input type="text" id="s-tz" class="input" value="${S.esc(settings.timezone||'')}"></div>
            <div class="form-field"><label>Language</label><input type="text" id="s-lang" class="input" value="${S.esc(settings.language||'')}"></div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="NexCRM.Profile.saveOrgSettings()">Save org settings</button>
        </div>

        <div class="grid-2">
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
              <div class="card-title">Departments</div>
              <div style="display:flex;gap:7px">
                <input type="text" id="new-dept" class="input" placeholder="New department" style="width:170px">
                <button class="btn btn-primary btn-sm" onclick="NexCRM.Profile.addDept()">Add</button>
              </div>
            </div>
            <div id="dept-list">${_renderDepts()}</div>
          </div>
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
              <div class="card-title">Ticket categories</div>
              <div style="display:flex;gap:7px">
                <input type="text" id="new-cat" class="input" placeholder="New category" style="width:170px">
                <button class="btn btn-primary btn-sm" onclick="NexCRM.Profile.addCat()">Add</button>
              </div>
            </div>
            <div id="cat-list">${_renderCats()}</div>
          </div>
        </div>` : ''}
      </div>`;
  }

  function _renderDepts() {
    const depts = NexCRM.Store.Settings.get().departments || [];
    return depts.map(d => `
      <div class="settings-item">
        <span>${NexCRM.Utils.esc(d)}</span>
        <div class="item-actions"><button class="icon-btn danger" onclick="NexCRM.Profile.removeDept('${NexCRM.Utils.esc(d)}')">🗑️</button></div>
      </div>`).join('') || `<div class="empty-state-sm">No departments yet.</div>`;
  }
  function _renderCats() {
    const cats = NexCRM.Store.Settings.get().categories || [];
    return cats.map(c => `
      <div class="settings-item">
        <span>${NexCRM.Utils.esc(c)}</span>
        <div class="item-actions"><button class="icon-btn danger" onclick="NexCRM.Profile.removeCat('${NexCRM.Utils.esc(c)}')">🗑️</button></div>
      </div>`).join('') || `<div class="empty-state-sm">No categories yet.</div>`;
  }

  function saveProfile() {
    const user = NexCRM.Auth.getUser();
    const name  = document.getElementById('p-name')?.value.trim();
    const phone = document.getElementById('p-phone')?.value.trim() || '';
    const dept  = document.getElementById('p-dept')?.value || '';
    if (!name) { NexCRM.toast('Name cannot be empty', 'error'); return; }
    NexCRM.Store.Users.update(user.id, { name, phone, department: dept });
    NexCRM.toast('Profile saved', 'success');
    NexCRM.Layout.renderSidebar();
    NexCRM.Layout.renderTopbar('Profile & Settings');
  }

  function changePassword() {
    const user = NexCRM.Auth.getUser();
    const cur = document.getElementById('p-cur-pwd')?.value;
    const nw  = document.getElementById('p-new-pwd')?.value;
    const cfm = document.getElementById('p-cfm-pwd')?.value;
    if (!cur) { NexCRM.toast('Enter your current password', 'error'); return; }
    if (user.password !== cur) { NexCRM.toast('Current password is incorrect', 'error'); return; }
    if (!nw || nw.length < 6) { NexCRM.toast('New password must be at least 6 characters', 'error'); return; }
    if (nw !== cfm) { NexCRM.toast('Passwords do not match', 'error'); return; }
    NexCRM.Store.Users.update(user.id, { password: nw });
    document.getElementById('p-cur-pwd').value = '';
    document.getElementById('p-new-pwd').value = '';
    document.getElementById('p-cfm-pwd').value = '';
    NexCRM.toast('Password updated', 'success');
  }

  function checkPwdStrength(val) {
    const bar = document.getElementById('pwd-strength-bar');
    const lbl = document.getElementById('pwd-strength-label');
    if (!bar || !val) { if (bar) { bar.className = 'pwd-strength'; bar.style.width=''; } return; }
    const hasUpper = /[A-Z]/.test(val), hasNum = /\d/.test(val), hasSpecial = /[^a-zA-Z\d]/.test(val);
    const score = (val.length >= 8) + hasUpper + hasNum + hasSpecial;
    if (score <= 1) { bar.className = 'pwd-strength weak'; lbl.textContent = 'Weak'; lbl.style.color='var(--rose)'; }
    else if (score <= 2) { bar.className = 'pwd-strength fair'; lbl.textContent = 'Fair'; lbl.style.color='var(--amber)'; }
    else { bar.className = 'pwd-strength strong'; lbl.textContent = 'Strong'; lbl.style.color='var(--emerald)'; }
  }

  function toggleNotif(key) {
    const user = NexCRM.Auth.getUser();
    const np = { ...(user.notifPrefs||{}), [key]: !(user.notifPrefs||{})[key] };
    NexCRM.Store.Users.update(user.id, { notifPrefs: np });
    const btn = document.getElementById('tog-' + key);
    if (btn) { btn.classList.toggle('on', np[key]); }
    NexCRM.toast(`Notification ${np[key] ? 'enabled' : 'disabled'}`, 'success');
  }

  function saveOrgSettings() {
    NexCRM.Store.Settings.update({
      orgName:  document.getElementById('s-orgname')?.value.trim(),
      industry: document.getElementById('s-industry')?.value.trim(),
      timezone: document.getElementById('s-tz')?.value.trim(),
      language: document.getElementById('s-lang')?.value.trim(),
    });
    NexCRM.toast('Organisation settings saved', 'success');
  }

  function addDept() {
    const v = document.getElementById('new-dept')?.value.trim();
    if (!v) return;
    NexCRM.Store.Settings.addDept(v);
    document.getElementById('new-dept').value = '';
    document.getElementById('dept-list').innerHTML = _renderDepts();
    NexCRM.toast('Department added', 'success');
  }
  function removeDept(name) {
    NexCRM.Store.Settings.removeDept(name);
    document.getElementById('dept-list').innerHTML = _renderDepts();
    NexCRM.toast('Department removed', 'success');
  }
  function addCat() {
    const v = document.getElementById('new-cat')?.value.trim();
    if (!v) return;
    NexCRM.Store.Settings.addCat(v);
    document.getElementById('new-cat').value = '';
    document.getElementById('cat-list').innerHTML = _renderCats();
    NexCRM.toast('Category added', 'success');
  }
  function removeCat(name) {
    NexCRM.Store.Settings.removeCat(name);
    document.getElementById('cat-list').innerHTML = _renderCats();
    NexCRM.toast('Category removed', 'success');
  }

  window.NexCRM.Profile = { render, saveProfile, changePassword, checkPwdStrength, toggleNotif, saveOrgSettings, addDept, removeDept, addCat, removeCat };
})();
