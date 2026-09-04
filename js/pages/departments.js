window.NexCRM = window.NexCRM || {};

(function () {
  const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#0369a1','#15803d','#b45309','#9f1239'];

  function render() {
    NexCRM.Layout.renderTopbar('Departments');
    NexCRM.Layout.renderSidebar('departments');
    const S = NexCRM.Utils, Ic = NexCRM.icon;
    const depts   = NexCRM.Store.Departments.getAll();
    const tickets = NexCRM.Store.Tickets.getAll();
    const isAdmin = NexCRM.Auth.isAdmin(), canEdit = NexCRM.Auth.isManager();

    const totalTickets = tickets.length;
    const unassigned   = tickets.filter(t => !t.departmentId).length;

    // ── Stats row
    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#6366f115;color:#6366f1">${Ic('layers',18)}</div></div><div><div class="kpi-value">${depts.length}</div><div class="kpi-label">Departments</div></div></div>
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#10b98115;color:#10b981">${Ic('tickets',18)}</div></div><div><div class="kpi-value">${totalTickets}</div><div class="kpi-label">Total tickets</div></div></div>
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#f59e0b15;color:#f59e0b">${Ic('alert_c',18)}</div></div><div><div class="kpi-value">${unassigned}</div><div class="kpi-label">Unassigned tickets</div></div></div>
      </div>`;

    // ── Department cards
    const cards = depts.map(dep => {
      const depTickets = tickets.filter(t => t.departmentId === dep.id);
      const open       = depTickets.filter(t => !['resolved','closed'].includes(t.status)).length;
      const resolved   = depTickets.filter(t => t.status === 'resolved').length;
      return `
        <div class="card" style="cursor:pointer;border-top:3px solid ${dep.color}" onclick="NexCRM.Departments.openDetail('${dep.id}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:42px;height:42px;border-radius:12px;background:${dep.color}18;display:flex;align-items:center;justify-content:center;color:${dep.color};">${Ic('layers',20)}</div>
              <div>
                <div style="font-size:15px;font-weight:700;color:var(--text)">${S.esc(dep.name)}</div>
                <div class="text-muted" style="font-size:12px;margin-top:2px">${S.esc(dep.description||'—')}</div>
              </div>
            </div>
            ${canEdit ? `<div onclick="event.stopPropagation()" style="display:flex;gap:4px">
              <button class="icon-btn" style="color:var(--s500)" onclick="NexCRM.Departments.openEditModal('${dep.id}')" title="Edit">${Ic('edit',14)}</button>
              ${isAdmin ? `<button class="icon-btn danger" onclick="NexCRM.Departments.confirmDelete('${dep.id}','${S.esc(dep.name)}')" title="Delete">${Ic('trash',14)}</button>` : ''}
            </div>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding-top:14px;border-top:1px solid var(--border)">
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--text)">${depTickets.length}</div><div style="font-size:11px;color:var(--text-3)">Total</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#f59e0b">${open}</div><div style="font-size:11px;color:var(--text-3)">Open</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#10b981">${resolved}</div><div style="font-size:11px;color:var(--text-3)">Resolved</div></div>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1">${Ic('layers',36)}<div class="empty-state-title">No departments yet</div><div class="empty-state-body">Create your first department to organise tickets.</div>${canEdit?`<button class="btn btn-primary" onclick="NexCRM.Departments.openCreateModal()">Create department</button>`:''}</div>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        ${statsHtml}
        <div class="toolbar">
          <div style="flex:1"><span class="card-title">All departments</span></div>
          ${canEdit ? `<button class="btn btn-primary" onclick="NexCRM.Departments.openCreateModal()">${Ic('plus',15)} New department</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">${cards}</div>
      </div>`;
  }

  function openDetail(id) {
    const dep = NexCRM.Store.Departments.get(id);
    if (!dep) return;
    const S = NexCRM.Utils, Ic = NexCRM.icon;
    const tickets  = NexCRM.Store.Tickets.getAll().filter(t => t.departmentId === id);
    const canEdit  = NexCRM.Auth.isManager();
    const isAdmin  = NexCRM.Auth.isAdmin();

    const ticketRows = tickets.map(t =>
      `<tr class="table-row" onclick="location.hash='#tickets/${t.number}'">
        <td class="td-mono">${t.number}</td>
        <td><div class="cell-title">${S.esc(t.subject)}</div><div class="cell-sub">${S.esc(S.customerName(t.customerId))}</div></td>
        <td>${S.priorityBadge(t.priority)}</td>
        <td>${S.statusBadge(t.status)}</td>
        <td class="td-sm">${t.dueDate||'—'}</td>
      </tr>`
    ).join('') || `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-3)">No tickets assigned to this department.</td></tr>`;

    NexCRM.Utils.openModal(dep.name,
      `<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="width:52px;height:52px;border-radius:14px;background:${dep.color}18;display:flex;align-items:center;justify-content:center;color:${dep.color};flex-shrink:0">${Ic('layers',24)}</div>
        <div><div style="font-size:16px;font-weight:700;color:var(--text)">${S.esc(dep.name)}</div><div class="text-muted" style="font-size:13px">${S.esc(dep.description||'No description')}</div><div class="text-muted" style="font-size:11px;margin-top:3px">Created ${S.fmtDate(dep.createdAt)}</div></div>
      </div>
      <div class="card-title" style="margin-bottom:10px">Tickets (${tickets.length})</div>
      <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <table class="data-table"><thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
        <tbody>${ticketRows}</tbody></table>
      </div>`,
      `${canEdit?`<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal();NexCRM.Departments.openEditModal('${id}')">Edit department</button>`:''}
       <button class="btn btn-primary" onclick="NexCRM.Utils.closeModal()">Close</button>`, 'lg');
  }

  function _form(dep) {
    const S = NexCRM.Utils;
    const colorPicker = COLORS.map(c =>
      `<div onclick="document.getElementById('dep-color-input').value='${c}';document.getElementById('dep-color-preview').style.background='${c}'"
        style="width:28px;height:28px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${dep&&dep.color===c?'#fff':'transparent'};transition:transform 0.15s"
        onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`
    ).join('');

    return `<div class="form-grid">
      <div class="form-field full-width"><label>Name <span class="required">*</span></label><input type="text" id="dep-name" class="input" value="${dep?S.esc(dep.name):''}" placeholder="e.g. Customer Support"></div>
      <div class="form-field full-width"><label>Description</label><textarea id="dep-desc" class="input" rows="2" placeholder="What does this department handle?">${dep?S.esc(dep.description||''):''}</textarea></div>
      <div class="form-field full-width">
        <label>Colour</label>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div id="dep-color-preview" style="width:36px;height:36px;border-radius:9px;background:${dep?dep.color:COLORS[0]};flex-shrink:0;border:2px solid rgba(255,255,255,0.1)"></div>
          <input type="text" id="dep-color-input" class="input" value="${dep?dep.color:COLORS[0]}" placeholder="#6366f1" style="width:120px"
            oninput="document.getElementById('dep-color-preview').style.background=this.value">
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:7px">${colorPicker}</div>
      </div>
    </div>`;
  }

  function openCreateModal() {
    NexCRM.Utils.openModal('New department', _form(null),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Departments.create()">Create</button>`);
  }
  function openEditModal(id) {
    const dep = NexCRM.Store.Departments.get(id); if (!dep) return;
    NexCRM.Utils.openModal(`Edit — ${dep.name}`, _form(dep),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Departments.update('${id}')">Save</button>`);
  }
  function _rf() {
    return {
      name:        document.getElementById('dep-name')?.value.trim(),
      description: document.getElementById('dep-desc')?.value.trim() || '',
      color:       document.getElementById('dep-color-input')?.value.trim() || COLORS[0],
    };
  }
  function create() {
    const d = _rf(); if (!d.name) { NexCRM.toast('Name is required','error'); return; }
    NexCRM.Store.Departments.create(d); NexCRM.Utils.closeModal(); NexCRM.toast('Department created','success'); render();
  }
  function update(id) {
    const d = _rf(); if (!d.name) { NexCRM.toast('Name is required','error'); return; }
    NexCRM.Store.Departments.update(id, d); NexCRM.Utils.closeModal(); NexCRM.toast('Department updated','success'); render();
  }
  function confirmDelete(id, name) {
    const count = NexCRM.Store.Tickets.getAll().filter(t=>t.departmentId===id).length;
    NexCRM.Utils.confirm(
      `Delete <strong>${name}</strong>?${count?` ${count} ticket${count!==1?'s':''} will lose their department assignment.`:''}`,
      () => { NexCRM.Store.Departments.delete(id); NexCRM.toast('Department deleted','success'); render(); },
      'Delete', 'danger'
    );
  }

  window.NexCRM.Departments = { render, openDetail, openCreateModal, openEditModal, create, update, confirmDelete };
})();
