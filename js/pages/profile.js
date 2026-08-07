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
    const depts=NexCRM.Store.Settings.get().departments||[];
    const np=user.notifPrefs||{};
    const isAdmin=NexCRM.Auth.isAdmin();
    const settings=NexCRM.Store.Settings.get();

    // Build current avatar display
    const av=user.avatar;
    let avatarDisplay='';
    if(av?.type==='image'&&av.data){
      avatarDisplay=`<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid var(--border)"><img src="${av.data}" style="width:100%;height:100%;object-fit:cover"></div>`;
    } else if(av?.type==='preset'){
      const ini=user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      avatarDisplay=`<div style="width:72px;height:72px;border-radius:50%;background:${av.bg};color:${av.color};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700">${ini}</div>`;
    } else {
      const cc=['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
      const ci=((user.name.charCodeAt(0)||0)+(user.name.charCodeAt(1)||0))%cc.length;
      const ini=user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      avatarDisplay=`<div style="width:72px;height:72px;border-radius:50%;background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700">${ini}</div>`;
    }

    const notifRows=[
      {key:'assigned',     label:'Ticket assigned to me',    icon:'tickets'},
      {key:'statusUpdates',label:'Ticket status changes',    icon:'alert_c'},
      {key:'newCustomer',  label:'New customer added',       icon:'customers'},
      {key:'mentions',     label:'Mentions in comments',     icon:'bell'},
      {key:'systemAlerts', label:'System alerts',            icon:'settings'},
      {key:'weeklyDigest', label:'Weekly digest email',      icon:'file'},
    ].map(n=>`<div class="notif-toggle-row">
        <div style="display:flex;align-items:center;gap:9px"><span style="color:var(--text-3)">${Ic(n.icon,15)}</span><span style="font-size:13px;color:var(--text)">${n.label}</span></div>
        <button class="toggle-switch${np[n.key]?' on':''}" id="tog-${n.key}" onclick="NexCRM.Profile.toggleNotif('${n.key}')"><div class="toggle-knob"></div></button>
      </div>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="grid-2">
          <!-- Profile card -->
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
                <div style="margin-top:6px"><a class="link" style="font-size:12px" onclick="NexCRM.Profile.openAvatarPicker()">${Ic('edit',12)} Change avatar</a></div>
              </div>
            </div>
            <div class="card-title" style="margin-bottom:14px">Edit profile</div>
            <div class="form-stack">
              <div class="form-field"><label>Full name</label><input type="text" id="p-name" class="input" value="${S.esc(user.name)}"></div>
              <div class="form-field"><label>Phone</label><input type="tel" id="p-phone" class="input" value="${S.esc(user.phone||'')}"></div>
              <div class="form-field"><label>Department</label><select id="p-dept" class="input"><option value="">— None —</option>${depts.map(d=>`<option value="${d}" ${user.department===d?'selected':''}>${S.esc(d)}</option>`).join('')}</select></div>
              <button class="btn btn-primary" onclick="NexCRM.Profile.saveProfile()">${Ic('check_c',14)} Save changes</button>
            </div>
          </div>

          <!-- Change password -->
          <div class="card">
            <div class="card-title" style="margin-bottom:4px">Change password</div>
            <div class="text-muted" style="font-size:12px;margin-bottom:16px">Minimum 8 characters with a mix of letters and numbers</div>
            <div class="form-stack">
              <div class="form-field"><label>Current password</label><input type="password" id="p-cur-pwd" class="input" placeholder="Current password"></div>
              <div class="form-field">
                <label>New password</label>
                <input type="password" id="p-new-pwd" class="input" placeholder="New password" oninput="NexCRM.Profile.checkStrength(this.value)">
                <div class="pwd-strength" id="pwd-bar"></div>
                <div class="form-help" id="pwd-lbl"></div>
              </div>
              <div class="form-field"><label>Confirm new password</label><input type="password" id="p-cfm-pwd" class="input" placeholder="Repeat new password"></div>
              <button class="btn btn-ghost" onclick="NexCRM.Profile.changePassword()">${Ic('file',14)} Update password</button>
            </div>
          </div>
        </div>

        <!-- Notification preferences -->
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Notification preferences</div>
          ${notifRows}
        </div>

        ${isAdmin?`
        <!-- Org settings -->
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
        <div class="grid-2">
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
              <div class="card-title">Departments</div>
              <div style="display:flex;gap:7px"><input type="text" id="new-dept" class="input" placeholder="New department" style="width:160px"><button class="btn btn-primary btn-sm" onclick="NexCRM.Profile.addDept()">${Ic('plus',13)}</button></div>
            </div>
            <div id="dept-list">${_renderDepts()}</div>
          </div>
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
              <div class="card-title">Ticket categories</div>
              <div style="display:flex;gap:7px"><input type="text" id="new-cat" class="input" placeholder="New category" style="width:160px"><button class="btn btn-primary btn-sm" onclick="NexCRM.Profile.addCat()">${Ic('plus',13)}</button></div>
            </div>
            <div id="cat-list">${_renderCats()}</div>
          </div>
        </div>`:''}`+`
      </div>`;
  }

  function _renderDepts(){const Ic=NexCRM.icon;const d=NexCRM.Store.Settings.get().departments||[];return d.map(x=>`<div class="settings-item"><span>${NexCRM.Utils.esc(x)}</span><div class="item-actions"><button class="icon-btn danger" onclick="NexCRM.Profile.removeDept('${NexCRM.Utils.esc(x)}')">${Ic('trash',13)}</button></div></div>`).join('')||`<div class="empty-state-sm">No departments yet.</div>`;}
  function _renderCats(){const Ic=NexCRM.icon;const c=NexCRM.Store.Settings.get().categories||[];return c.map(x=>`<div class="settings-item"><span>${NexCRM.Utils.esc(x)}</span><div class="item-actions"><button class="icon-btn danger" onclick="NexCRM.Profile.removeCat('${NexCRM.Utils.esc(x)}')">${Ic('trash',13)}</button></div></div>`).join('')||`<div class="empty-state-sm">No categories yet.</div>`;}

  // ── Avatar picker ──────────────────────────────────────────────────────────
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
          ${Ic('upload',15)} Choose image (JPG, PNG — will be resized to 80×80px)
          <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="NexCRM.Profile.handleAvatarUpload(this)">
        </label>
        <div id="avatar-preview" style="margin-top:10px"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="NexCRM.Profile.removeAvatar()">Remove avatar</button>
       <button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>`);
  }

  function setPresetAvatar(idx) {
    const p=PRESETS[idx];
    const user=NexCRM.Auth.getUser();
    NexCRM.Store.Users.update(user.id, { avatar: { type:'preset', bg:p.bg, color:p.color } });
    NexCRM.Utils.closeModal();
    NexCRM.toast('Avatar updated','success');
    render();
  }

  function handleAvatarUpload(input) {
    const file=input.files[0]; if(!file)return;
    const Ic=NexCRM.icon;
    const reader=new FileReader();
    reader.onload=e=>{
      // Resize via canvas to 80x80
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=80; canvas.height=80;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,80,80);
        const data=canvas.toDataURL('image/jpeg',0.85);
        const user=NexCRM.Auth.getUser();
        NexCRM.Store.Users.update(user.id,{avatar:{type:'image',data}});
        NexCRM.Utils.closeModal();
        NexCRM.toast('Profile photo updated','success');
        render();
      };
      img.src=e.target.result;
      // Show preview
      const pv=document.getElementById('avatar-preview');
      if(pv)pv.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><div style="width:48px;height:48px;border-radius:50%;overflow:hidden"><img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"></div><span style="font-size:12px;color:var(--text-2)">Uploading…</span></div>`;
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar(){const user=NexCRM.Auth.getUser();NexCRM.Store.Users.update(user.id,{avatar:null});NexCRM.Utils.closeModal();NexCRM.toast('Avatar removed','success');render();}

  // ── Profile edits ──────────────────────────────────────────────────────────
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
    if(!cur){NexCRM.toast('Enter your current password','error');return;}
    if(user.password!==cur){NexCRM.toast('Current password is incorrect','error');return;}
    if(!nw||nw.length<6){NexCRM.toast('New password must be at least 6 characters','error');return;}
    if(nw!==cfm){NexCRM.toast('Passwords do not match','error');return;}
    NexCRM.Store.Users.update(user.id,{password:nw});
    document.getElementById('p-cur-pwd').value=''; document.getElementById('p-new-pwd').value=''; document.getElementById('p-cfm-pwd').value='';
    NexCRM.toast('Password updated','success');
  }
  function checkStrength(val){
    const bar=document.getElementById('pwd-bar'),lbl=document.getElementById('pwd-lbl');
    if(!bar||!val){if(bar){bar.className='pwd-strength';bar.style.width='';}return;}
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
    NexCRM.Store.Settings.update({orgName:document.getElementById('s-org')?.value.trim(),industry:document.getElementById('s-ind')?.value.trim(),timezone:document.getElementById('s-tz')?.value.trim(),language:document.getElementById('s-lang')?.value.trim()});
    NexCRM.toast('Organisation settings saved','success');
  }
  function addDept(){const v=document.getElementById('new-dept')?.value.trim();if(!v)return;NexCRM.Store.Settings.addDept(v);document.getElementById('new-dept').value='';document.getElementById('dept-list').innerHTML=_renderDepts();NexCRM.toast('Department added','success');}
  function removeDept(name){NexCRM.Store.Settings.removeDept(name);document.getElementById('dept-list').innerHTML=_renderDepts();NexCRM.toast('Department removed','success');}
  function addCat(){const v=document.getElementById('new-cat')?.value.trim();if(!v)return;NexCRM.Store.Settings.addCat(v);document.getElementById('new-cat').value='';document.getElementById('cat-list').innerHTML=_renderCats();NexCRM.toast('Category added','success');}
  function removeCat(name){NexCRM.Store.Settings.removeCat(name);document.getElementById('cat-list').innerHTML=_renderCats();NexCRM.toast('Category removed','success');}

  window.NexCRM.Profile={render,openAvatarPicker,setPresetAvatar,handleAvatarUpload,removeAvatar,saveProfile,changePassword,checkStrength,toggleNotif,saveOrgSettings,addDept,removeDept,addCat,removeCat};
})();
