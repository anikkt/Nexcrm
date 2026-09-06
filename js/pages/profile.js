window.NexCRM = window.NexCRM || {};

(function () {
  const PRESETS = [
    {bg:'#6366f1',color:'#eef2ff',name:'Indigo'},{bg:'#8b5cf6',color:'#f5f3ff',name:'Violet'},
    {bg:'#06b6d4',color:'#ecfeff',name:'Cyan'},  {bg:'#10b981',color:'#ecfdf5',name:'Emerald'},
    {bg:'#f59e0b',color:'#fffbeb',name:'Amber'}, {bg:'#f43f5e',color:'#fff1f2',name:'Rose'},
    {bg:'#0f172a',color:'#f8fafc',name:'Slate'},  {bg:'#7c3aed',color:'#ede9fe',name:'Purple'},
    {bg:'#0369a1',color:'#e0f2fe',name:'Blue'},  {bg:'#15803d',color:'#dcfce7',name:'Green'},
    {bg:'#b45309',color:'#fef3c7',name:'Yellow'},{bg:'#9f1239',color:'#ffe4e6',name:'Pink'},
  ];

  function render() {
    NexCRM.Layout.renderTopbar('Profile & Settings');
    NexCRM.Layout.renderSidebar('profile');
    const user=NexCRM.Auth.getUser(), S=NexCRM.Utils, Ic=NexCRM.icon;

    // Read departments from Store entities (not Settings string array)
    const depts = NexCRM.Store.Departments.getAll();
    const np=user.notifPrefs||{};
    const isAdmin=NexCRM.Auth.isAdmin();
    const settings=NexCRM.Store.Settings.get();

    const cc=['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci=((user.name.charCodeAt(0)||0)+(user.name.charCodeAt(1)||0))%cc.length;
    const ini=user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

    // Build avatar display
    const av=user.avatar;
    let avatarDisplay='';
    if(av?.type==='image'&&av.data){
      avatarDisplay=`<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid var(--border)"><img src="${av.data}" style="width:100%;height:100%;object-fit:cover"></div>`;
    } else if(av?.type==='preset'){
      avatarDisplay=`<div style="width:72px;height:72px;border-radius:50%;background:${av.bg};color:${av.color};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700">${ini}</div>`;
    } else {
      avatarDisplay=`<div style="width:72px;height:72px;border-radius:50%;background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700">${ini}</div>`;
    }

    const notifRows=[
      {key:'assigned',     label:'Ticket assigned to me', icon:'tickets'},
      {key:'statusUpdates',label:'Ticket status changes', icon:'alert_c'},
      {key:'newCustomer',  label:'New customer added',    icon:'customers'},
      {key:'mentions',     label:'Mentions in comments',  icon:'bell'},
      {key:'systemAlerts', label:'System alerts',         icon:'settings'},
      {key:'weeklyDigest', label:'Weekly digest email',   icon:'file'},
    ].map(n=>`<div class="notif-toggle-row">
        <div style="display:flex;align-items:center;gap:9px"><span style="color:var(--text-3)">${Ic(n.icon,15)}</span><span style="font-size:13px;color:var(--text)">${n.label}</span></div>
        <button class="toggle-switch${np[n.key]?' on':''}" id="tog-${n.key}" onclick="NexCRM.Profile.toggleNotif('${n.key}')"><div class="toggle-knob"></div></button>
      </div>`).join('');

    // Department options come from Store.Departments (same source as ticket form)
    const deptOptions=depts.map(d=>`<option value="${d.name}" ${user.department===d.name?'selected':''}>${S.esc(d.name)}</option>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="grid-2">
          <div class="card">
            <div class="profile-header">
              <div class="profile-avatar-wrap" style="cursor:pointer" onclick="NexCRM.Profile.openAvatarPicker()" title="Change avatar">
                ${avatarDisplay}
                <div class="avatar-edit-btn">${Ic('edit',10)}</div>
              </div>
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--text)">${S.esc(user.name)}</div>
                <div class="text-muted" style="font-size:13px">${S.esc(user.email)}</div>
                <span class="role-pill ${user.role}" style="margin-top:6px;display:inline-block">${user.role.charAt(0).toUpperCase()+user.role.slice(1)}</span>
                <div style="margin-top:6px"><a class="link" style="font-size:12px;cursor:pointer" onclick="NexCRM.Profile.openAvatarPicker()">${Ic('edit',12)} Change avatar</a></div>
              </div>
            </div>
            <div class="card-title" style="margin-bottom:14px">Edit profile</div>
            <div class="form-stack">
              <div class="form-field"><label>Full name</label><input type="text" id="p-name" class="input" value="${S.esc(user.name)}"></div>
              <div class="form-field"><label>Phone</label><input type="tel" id="p-phone" class="input" value="${S.esc(user.phone||'')}"></div>
              <div class="form-field">
                <label>Department</label>
                <select id="p-dept" class="input">
                  <option value="">— None —</option>
                  ${deptOptions}
                </select>
                ${!depts.length?`<div class="form-help">No departments yet. <a href="#departments" class="link">Create one →</a></div>`:''}
              </div>
              <button class="btn btn-primary" onclick="NexCRM.Profile.saveProfile()">${Ic('check_c',14)} Save changes</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title" style="margin-bottom:4px">Change password</div>
            <div class="text-muted" style="font-size:12px;margin-bottom:16px">Minimum 6 characters</div>
            <div class="form-stack">
              <div class="form-field"><label>Current password</label><input type="password" id="p-cur-pwd" class="input" placeholder="Current password"></div>
              <div class="form-field">
                <label>New password</label>
                <input type="password" id="p-new-pwd" class="input" placeholder="New password" oninput="NexCRM.Profile.checkStrength(this.value)">
                <div class="pwd-strength" id="pwd-bar"></div>
                <div class="form-help" id="pwd-lbl"></div>
              </div>
              <div class="form-field"><label>Confirm password</label><input type="password" id="p-cfm-pwd" class="input" placeholder="Repeat new password"></div>
              <button class="btn btn-ghost" onclick="NexCRM.Profile.changePassword()">${Ic('file',14)} Update password</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Notification preferences</div>
          ${notifRows}
        </div>

        ${isAdmin?`
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Organisation settings <span style="font-size:11px;color:var(--primary);margin-left:8px;font-weight:400">Admin only</span></div>
          <div class="form-grid">
            <div class="form-field"><label>Organisation name</label><input type="text" id="s-org" class="input" value="${S.esc(settings.orgName||'')}"></div>
            <div class="form-field"><label>Industry</label><input type="text" id="s-ind" class="input" value="${S.esc(settings.industry||'')}"></div>
            <div class="form-field"><label>Timezone</label><input type="text" id="s-tz" class="input" value="${S.esc(settings.timezone||'')}"></div>
            <div class="form-field"><label>Language</label><input type="text" id="s-lang" class="input" value="${S.esc(settings.language||'')}"></div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="NexCRM.Profile.saveOrgSettings()">${Ic('check_c',13)} Save org settings</button>
        </div>

        <!-- Departments & Categories now managed via dedicated pages -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="card" style="border-style:dashed">
            <div class="card-title" style="margin-bottom:8px">Departments</div>
            <p class="text-muted" style="font-size:13px;margin-bottom:14px">Manage departments from the dedicated page — create, edit, assign colours and view ticket counts.</p>
            <a href="#departments" class="btn btn-ghost btn-sm">${Ic('layers',13)} Manage Departments →</a>
          </div>
          <div class="card" style="border-style:dashed">
            <div class="card-title" style="margin-bottom:8px">Ticket Categories</div>
            <p class="text-muted" style="font-size:13px;margin-bottom:14px">Manage ticket categories from the dedicated page — create, edit, assign colours and view ticket counts.</p>
            <a href="#categories" class="btn btn-ghost btn-sm">${Ic('barchart',13)} Manage Categories →</a>
          </div>
        </div>`:''}
      </div>`;
  }

  function openAvatarPicker() {
    const S=NexCRM.Utils, Ic=NexCRM.icon;
    const user=NexCRM.Auth.getUser();
    const ini=user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const current=user.avatar;
    const presetGrid=PRESETS.map((p,i)=>`
      <div class="avatar-preset${current?.type==='preset'&&current.bg===p.bg?' selected':''}"
        style="background:${p.bg};color:${p.color}" title="${p.name}"
        onclick="NexCRM.Profile.setPresetAvatar(${i})">
        ${ini}
      </div>`).join('');

    S.openModal('Change avatar',
      `<div style="margin-bottom:18px">
        <div class="card-title" style="font-size:13px;margin-bottom:10px">Preset colours</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">${presetGrid}</div>
      </div>
      <div>
        <div class="card-title" style="font-size:13px;margin-bottom:10px">Upload photo</div>
        <label class="avatar-upload-label">
          ${Ic('upload',15)} Choose image (JPG, PNG)
          <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="NexCRM.Profile.handleAvatarUpload(this)">
        </label>
      </div>`,
      `<button class="btn btn-ghost" onclick="NexCRM.Profile.removeAvatar()">Remove avatar</button>
       <button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>`);
  }

  function setPresetAvatar(idx) {
    const p=PRESETS[idx];
    NexCRM.Store.Users.update(NexCRM.Auth.getUser().id,{avatar:{type:'preset',bg:p.bg,color:p.color}});
    NexCRM.Utils.closeModal(); NexCRM.toast('Avatar updated','success'); render();
  }
  function handleAvatarUpload(input) {
    const file=input.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=80;canvas.height=80;
        canvas.getContext('2d').drawImage(img,0,0,80,80);
        const data=canvas.toDataURL('image/jpeg',0.85);
        NexCRM.Store.Users.update(NexCRM.Auth.getUser().id,{avatar:{type:'image',data}});
        NexCRM.Utils.closeModal(); NexCRM.toast('Photo updated','success'); render();
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function removeAvatar(){NexCRM.Store.Users.update(NexCRM.Auth.getUser().id,{avatar:null});NexCRM.Utils.closeModal();NexCRM.toast('Avatar removed','success');render();}

  function saveProfile(){
    const user=NexCRM.Auth.getUser();
    const name=document.getElementById('p-name')?.value.trim();
    const phone=document.getElementById('p-phone')?.value.trim()||'';
    const dept=document.getElementById('p-dept')?.value||'';
    if(!name){NexCRM.toast('Name cannot be empty','error');return;}
    NexCRM.Store.Users.update(user.id,{name,phone,department:dept});
    NexCRM.toast('Profile saved','success');
    NexCRM.Layout.renderSidebar('profile'); NexCRM.Layout.renderTopbar('Profile & Settings');
  }
  function changePassword(){
    const user=NexCRM.Auth.getUser();
    const cur=document.getElementById('p-cur-pwd')?.value;
    const nw=document.getElementById('p-new-pwd')?.value;
    const cfm=document.getElementById('p-cfm-pwd')?.value;
    if(!cur){NexCRM.toast('Enter current password','error');return;}
    if(user.password!==cur){NexCRM.toast('Current password incorrect','error');return;}
    if(!nw||nw.length<6){NexCRM.toast('New password must be ≥ 6 characters','error');return;}
    if(nw!==cfm){NexCRM.toast('Passwords do not match','error');return;}
    NexCRM.Store.Users.update(user.id,{password:nw});
    ['p-cur-pwd','p-new-pwd','p-cfm-pwd'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    NexCRM.toast('Password updated','success');
  }
  function checkStrength(val){
    const bar=document.getElementById('pwd-bar'),lbl=document.getElementById('pwd-lbl');
    if(!bar||!val){if(bar){bar.className='pwd-strength';}return;}
    const s=(val.length>=8)+((/[A-Z]/).test(val))+((/\d/).test(val))+((/[^a-zA-Z\d]/).test(val));
    if(s<=1){bar.className='pwd-strength weak';lbl.textContent='Weak';lbl.style.color='var(--rose)';}
    else if(s<=2){bar.className='pwd-strength fair';lbl.textContent='Fair';lbl.style.color='var(--amber)';}
    else{bar.className='pwd-strength strong';lbl.textContent='Strong';lbl.style.color='var(--emerald)';}
  }
  function toggleNotif(key){
    const user=NexCRM.Auth.getUser();
    const np={...(user.notifPrefs||{}),[key]:!(user.notifPrefs||{})[key]};
    NexCRM.Store.Users.update(user.id,{notifPrefs:np});
    const btn=document.getElementById('tog-'+key);if(btn)btn.classList.toggle('on',np[key]);
    NexCRM.toast(`Notification ${np[key]?'enabled':'disabled'}`,'success');
  }
  function saveOrgSettings(){
    NexCRM.Store.Settings.update({
      orgName:document.getElementById('s-org')?.value.trim(),
      industry:document.getElementById('s-ind')?.value.trim(),
      timezone:document.getElementById('s-tz')?.value.trim(),
      language:document.getElementById('s-lang')?.value.trim(),
    });
    NexCRM.toast('Organisation settings saved','success');
  }

  window.NexCRM.Profile={render,openAvatarPicker,setPresetAvatar,handleAvatarUpload,removeAvatar,saveProfile,changePassword,checkStrength,toggleNotif,saveOrgSettings};
})();
