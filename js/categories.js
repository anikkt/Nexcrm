window.NexCRM = window.NexCRM || {};

(function () {
  const COLORS = ['#f43f5e','#6366f1','#f59e0b','#8b5cf6','#06b6d4','#10b981','#f97316','#0369a1','#15803d','#b45309'];

  function render() {
    NexCRM.Layout.renderTopbar('Ticket Categories');
    NexCRM.Layout.renderSidebar('categories');
    const S = NexCRM.Utils, Ic = NexCRM.icon;
    const cats    = NexCRM.Store.TicketCategories.getAll();
    const tickets = NexCRM.Store.Tickets.getAll();
    const isAdmin = NexCRM.Auth.isAdmin(), canEdit = NexCRM.Auth.isManager();

    const uncategorised = tickets.filter(t => !t.categoryId).length;

    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#6366f115;color:#6366f1">${Ic('barchart',18)}</div></div><div><div class="kpi-value">${cats.length}</div><div class="kpi-label">Categories</div></div></div>
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#10b98115;color:#10b981">${Ic('tickets',18)}</div></div><div><div class="kpi-value">${tickets.length}</div><div class="kpi-label">Total tickets</div></div></div>
        <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#f59e0b15;color:#f59e0b">${Ic('alert_c',18)}</div></div><div><div class="kpi-value">${uncategorised}</div><div class="kpi-label">Uncategorised</div></div></div>
      </div>`;

    // Table view
    const rows = cats.map(cat => {
      const catTickets = tickets.filter(t => t.categoryId === cat.id);
      const open       = catTickets.filter(t => !['resolved','closed'].includes(t.status)).length;
      return `
        <tr class="table-row" onclick="NexCRM.Categories.openDetail('${cat.id}')">
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:12px;height:12px;border-radius:50%;background:${cat.color};flex-shrink:0"></div>
              <span style="font-size:13px;font-weight:600;color:var(--text)">${S.esc(cat.name)}</span>
            </div>
          </td>
          <td class="td-sm">${S.esc(cat.description||'—')}</td>
          <td style="text-align:center"><span style="font-size:14px;font-weight:700;color:var(--text)">${catTickets.length}</span></td>
          <td style="text-align:center"><span style="font-size:13px;font-weight:600;color:#f59e0b">${open}</span></td>
          <td style="text-align:center"><span style="font-size:13px;font-weight:600;color:#10b981">${catTickets.length - open}</span></td>
          <td style="white-space:nowrap" onclick="event.stopPropagation()">
            ${canEdit ? `<button class="icon-btn" style="color:var(--s500)" onclick="NexCRM.Categories.openEditModal('${cat.id}')" title="Edit">${Ic('edit',14)}</button>` : ''}
            ${isAdmin ? `<button class="icon-btn danger" onclick="NexCRM.Categories.confirmDelete('${cat.id}','${S.esc(cat.name)}')" title="Delete">${Ic('trash',14)}</button>` : ''}
          </td>
        </tr>`;
    }).join('') || `<tr><td colspan="6"><div class="empty-state">${Ic('barchart',32)}<div class="empty-state-title">No categories yet</div>${canEdit?`<button class="btn btn-primary" onclick="NexCRM.Categories.openCreateModal()">Create category</button>`:''}</div></td></tr>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        ${statsHtml}
        <div class="toolbar">
          <div style="flex:1"><span class="card-title">All ticket categories</span></div>
          ${canEdit ? `<button class="btn btn-primary" onclick="NexCRM.Categories.openCreateModal()">${Ic('plus',15)} New category</button>` : ''}
        </div>
        <div class="card-flush">
          <table class="data-table">
            <thead><tr><th>Category</th><th>Description</th><th style="text-align:center">Total</th><th style="text-align:center">Open</th><th style="text-align:center">Resolved</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="table-footer"><span class="text-muted">${cats.length} categor${cats.length!==1?'ies':'y'}</span></div>
        </div>
      </div>`;
  }

  function openDetail(id) {
    const cat = NexCRM.Store.TicketCategories.get(id); if (!cat) return;
    const S = NexCRM.Utils, Ic = NexCRM.icon;
    const tickets = NexCRM.Store.Tickets.getAll().filter(t => t.categoryId === id);
    const canEdit = NexCRM.Auth.isManager();

    const ticketRows = tickets.map(t =>
      `<tr class="table-row" onclick="NexCRM.Utils.closeModal();location.hash='#tickets/${t.number}'">
        <td class="td-mono">${t.number}</td>
        <td><div class="cell-title">${S.esc(t.subject)}</div><div class="cell-sub">${S.esc(S.customerName(t.customerId))}</div></td>
        <td>${S.priorityBadge(t.priority)}</td>
        <td>${S.statusBadge(t.status)}</td>
        <td class="td-sm">${t.dueDate||'—'}</td>
      </tr>`
    ).join('') || `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-3)">No tickets in this category.</td></tr>`;

    NexCRM.Utils.openModal(cat.name,
      `<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div style="width:14px;height:14px;border-radius:50%;background:${cat.color};flex-shrink:0"></div>
        <div><div style="font-size:15px;font-weight:700;color:var(--text)">${S.esc(cat.name)}</div>
        <div class="text-muted" style="font-size:12px">${S.esc(cat.description||'No description')}</div></div>
      </div>
      <div class="card-title" style="margin-bottom:10px">Tickets in this category (${tickets.length})</div>
      <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <table class="data-table"><thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
        <tbody>${ticketRows}</tbody></table>
      </div>`,
      `${canEdit?`<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal();NexCRM.Categories.openEditModal('${id}')">Edit category</button>`:''}
       <button class="btn btn-primary" onclick="NexCRM.Utils.closeModal()">Close</button>`, 'lg');
  }

  function _form(cat) {
    const S = NexCRM.Utils;
    const colorPicker = COLORS.map(c =>
      `<div onclick="document.getElementById('cat-color-input').value='${c}';document.getElementById('cat-color-prev').style.background='${c}'"
        style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${cat&&cat.color===c?'#fff':'transparent'};transition:transform 0.15s"
        onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`
    ).join('');

    return `<div class="form-grid">
      <div class="form-field full-width"><label>Name <span class="required">*</span></label><input type="text" id="cat-name" class="input" value="${cat?S.esc(cat.name):''}" placeholder="e.g. Bug Report"></div>
      <div class="form-field full-width"><label>Description</label><textarea id="cat-desc" class="input" rows="2" placeholder="When should agents use this category?">${cat?S.esc(cat.description||''):''}</textarea></div>
      <div class="form-field full-width">
        <label>Colour</label>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div id="cat-color-prev" style="width:36px;height:36px;border-radius:50%;background:${cat?cat.color:COLORS[0]};flex-shrink:0;border:2px solid rgba(255,255,255,0.1)"></div>
          <input type="text" id="cat-color-input" class="input" value="${cat?cat.color:COLORS[0]}" style="width:120px"
            oninput="document.getElementById('cat-color-prev').style.background=this.value">
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${colorPicker}</div>
      </div>
    </div>`;
  }

  function openCreateModal() {
    NexCRM.Utils.openModal('New category', _form(null),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Categories.create()">Create</button>`);
  }
  function openEditModal(id) {
    const cat = NexCRM.Store.TicketCategories.get(id); if (!cat) return;
    NexCRM.Utils.openModal(`Edit — ${cat.name}`, _form(cat),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Categories.update('${id}')">Save</button>`);
  }
  function _rf() {
    return {
      name:        document.getElementById('cat-name')?.value.trim(),
      description: document.getElementById('cat-desc')?.value.trim() || '',
      color:       document.getElementById('cat-color-input')?.value.trim() || COLORS[0],
    };
  }
  function create() {
    const d=_rf(); if(!d.name){NexCRM.toast('Name is required','error');return;}
    NexCRM.Store.TicketCategories.create(d); NexCRM.Utils.closeModal(); NexCRM.toast('Category created','success'); render();
  }
  function update(id) {
    const d=_rf(); if(!d.name){NexCRM.toast('Name is required','error');return;}
    NexCRM.Store.TicketCategories.update(id,d); NexCRM.Utils.closeModal(); NexCRM.toast('Category updated','success'); render();
  }
  function confirmDelete(id, name) {
    const count = NexCRM.Store.Tickets.getAll().filter(t=>t.categoryId===id).length;
    NexCRM.Utils.confirm(
      `Delete <strong>${name}</strong>?${count?` ${count} ticket${count!==1?'s':''} will lose their category.`:''}`,
      () => { NexCRM.Store.TicketCategories.delete(id); NexCRM.toast('Category deleted','success'); render(); },
      'Delete','danger'
    );
  }

  window.NexCRM.Categories = { render, openDetail, openCreateModal, openEditModal, create, update, confirmDelete };
})();
