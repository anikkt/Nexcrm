window.NexCRM = window.NexCRM || {};

(function () {
  let _q = '', _status = 'all', _priority = 'all';

  function render(ticketNum) {
    NexCRM.Layout.renderSidebar();
    if (ticketNum) renderDetail(ticketNum);
    else renderList();
  }

  /* ---- LIST ---- */
  function renderList(queryOverride) {
    if (queryOverride !== undefined) _q = queryOverride;
    NexCRM.Layout.renderTopbar('Tickets');
    const S = NexCRM.Utils;
    const user = NexCRM.Auth.getUser();
    let tickets = NexCRM.Store.Tickets.getAll();
    if (user.role === 'analyst' || user.role === 'agent') tickets = tickets.filter(t => t.assignedToId === user.id);
    if (_q) { const q = _q.toLowerCase(); tickets = tickets.filter(t => t.subject.toLowerCase().includes(q) || t.number.toLowerCase().includes(q) || S.customerName(t.customerId).toLowerCase().includes(q)); }
    if (_status !== 'all')   tickets = tickets.filter(t => t.status === _status);
    if (_priority !== 'all') tickets = tickets.filter(t => t.priority === _priority);

    const statusOpts = `<option value="all">All statuses</option>` + Object.entries(S.STATUS_CFG).map(([k,v]) => `<option value="${k}" ${_status===k?'selected':''}>${v.l}</option>`).join('');
    const prioOpts   = `<option value="all">All priorities</option>` + Object.entries(S.PRIORITY_CFG).map(([k,v]) => `<option value="${k}" ${_priority===k?'selected':''}>${v.l}</option>`).join('');
    const canCreate  = NexCRM.Auth.isManager();

    const rows = tickets.map(t => `
      <tr class="table-row" onclick="location.hash='#tickets/${t.number}'">
        <td class="td-mono">${t.number}</td>
        <td><div class="cell-title">${S.esc(t.subject)}</div><div class="cell-sub">${S.esc(S.customerName(t.customerId))}</div></td>
        <td>${S.priorityBadge(t.priority)}</td>
        <td>${S.statusBadge(t.status)}</td>
        <td class="td-sm">${S.esc(S.userName(t.assignedToId))}</td>
        <td class="td-sm" style="color:${t.dueDate && t.dueDate < new Date().toISOString().slice(0,10) && !['resolved','closed'].includes(t.status) ? 'var(--rose)' : 'var(--text-3)'}">${t.dueDate || '—'}</td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          ${canCreate ? `<button class="icon-btn" onclick="NexCRM.Tickets.openEditModal('${t.id}')" title="Edit">✏️</button>` : ''}
          ${NexCRM.Auth.isAdmin() ? `<button class="icon-btn danger" onclick="NexCRM.Tickets.confirmDelete('${t.id}','${t.number}')" title="Delete">🗑️</button>` : ''}
        </td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="toolbar">
          <div class="search-inline">
            <span>🔍</span>
            <input type="text" placeholder="Search tickets…" value="${S.esc(_q)}" oninput="NexCRM.Tickets._setQ(this.value)" style="width:180px">
          </div>
          <select class="filter-select" onchange="NexCRM.Tickets._setSt(this.value)">${statusOpts}</select>
          <select class="filter-select" onchange="NexCRM.Tickets._setPr(this.value)">${prioOpts}</select>
          <div style="flex:1"></div>
          ${canCreate ? `<button class="btn btn-primary" onclick="NexCRM.Tickets.openCreateModal()">+ New ticket</button>` : ''}
          <button class="btn btn-ghost" onclick="NexCRM.Tickets.exportData()">↓ CSV</button>
        </div>
        <div class="card-flush">
          ${tickets.length
            ? `<table class="data-table"><thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Due</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
            : `<div class="empty-state"><div style="font-size:32px">🎫</div><div class="empty-state-title">No tickets found</div><div class="empty-state-body">Adjust filters or create a new ticket.</div>${canCreate?`<button class="btn btn-primary" onclick="NexCRM.Tickets.openCreateModal()">Create ticket</button>`:''}</div>`}
          <div class="table-footer">
            <span class="text-muted">${tickets.length} ticket${tickets.length!==1?'s':''}</span>
            <button class="btn btn-ghost btn-sm" onclick="NexCRM.Tickets._clearFilters()">Clear filters</button>
          </div>
        </div>
      </div>`;
  }

  /* ---- DETAIL ---- */
  function renderDetail(num) {
    const t = NexCRM.Store.Tickets.get(num);
    if (!t) { NexCRM.toast('Ticket not found', 'error'); location.hash = '#tickets'; return; }
    NexCRM.Layout.renderTopbar(t.number);
    const S = NexCRM.Utils;
    const user = NexCRM.Auth.getUser();
    const canEdit = NexCRM.Auth.isManager() || user.id === t.assignedToId;
    const customer = NexCRM.Store.Customers.get(t.customerId);
    const users = NexCRM.Store.Users.getAll().filter(u => u.active);

    const statusOpts  = Object.entries(S.STATUS_CFG).map(([k,v]) => `<option value="${k}" ${t.status===k?'selected':''}>${v.l}</option>`).join('');
    const prioOpts    = Object.entries(S.PRIORITY_CFG).map(([k,v]) => `<option value="${k}" ${t.priority===k?'selected':''}>${v.l}</option>`).join('');
    const assignOpts  = `<option value="">Unassigned</option>` + users.map(u => `<option value="${u.id}" ${t.assignedToId===u.id?'selected':''}>${S.esc(u.name)}</option>`).join('');

    const comments = (t.comments||[]).map(c => {
      const a = NexCRM.Store.Users.get(c.authorId);
      const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
      const ci = a ? ((a.name.charCodeAt(0)||0)+(a.name.charCodeAt(1)||0))%cc.length : 0;
      const ini = a ? a.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '??';
      return `<div class="comment-item">
        <div class="comment-avatar" style="background:${cc[ci]}22;border-color:${cc[ci]}44;color:${cc[ci]}">${ini}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600;color:var(--s800)">${a ? S.esc(a.name) : 'Unknown'}</span>
            <span class="text-muted" style="font-size:11px">${S.fmtRelative(c.createdAt)}</span>
            ${c.internal ? `<span class="internal-badge">Internal note</span>` : ''}
          </div>
          <div class="comment-body">${S.esc(c.text)}</div>
        </div>
      </div>`;
    }).join('') || `<p class="text-muted" style="font-size:13px">No comments yet.</p>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="detail-header">
          <a href="#tickets" class="btn btn-ghost btn-sm">← Back</a>
          <div style="flex:1;min-width:0">
            <div class="text-muted" style="font-size:11px;font-family:monospace">${t.number}</div>
            <div class="detail-title">${S.esc(t.subject)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
            ${S.statusBadge(t.status)} ${S.priorityBadge(t.priority)}
            ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Tickets.openEditModal('${t.id}')">Edit</button>` : ''}
            ${NexCRM.Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="color:var(--rose)" onclick="NexCRM.Tickets.confirmDelete('${t.id}','${t.number}')">Delete</button>` : ''}
          </div>
        </div>

        <div class="detail-grid">
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="card">
              <div class="card-title" style="margin-bottom:10px">Description</div>
              <p class="text-body">${t.description ? S.esc(t.description) : '<em style="color:var(--s400)">No description provided.</em>'}</p>
            </div>
            <div class="card">
              <div class="card-title" style="margin-bottom:14px">Comments (${(t.comments||[]).length})</div>
              <div id="comments-list">${comments}</div>
              <div class="comment-form" style="margin-top:16px;border-top:1px solid var(--s100);padding-top:16px">
                <textarea id="comment-text" placeholder="Add a comment…" rows="3"></textarea>
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                  <label class="checkbox-label"><input type="checkbox" id="comment-internal"> Mark as internal note</label>
                  <button class="btn btn-primary btn-sm" onclick="NexCRM.Tickets.addComment('${t.id}')">Post comment</button>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-sidebar">
            <div class="card">
              <div class="card-title" style="margin-bottom:14px">Details</div>
              ${canEdit ? `
                <div class="field-row"><label>Status</label><select class="input-sm" onchange="NexCRM.Tickets.patchField('${t.id}','status',this.value)">${statusOpts}</select></div>
                <div class="field-row"><label>Priority</label><select class="input-sm" onchange="NexCRM.Tickets.patchField('${t.id}','priority',this.value)">${prioOpts}</select></div>
                <div class="field-row"><label>Assigned to</label><select class="input-sm" onchange="NexCRM.Tickets.patchField('${t.id}','assignedToId',this.value)">${assignOpts}</select></div>
              ` : `
                <div class="detail-field"><span>Status</span>${S.statusBadge(t.status)}</div>
                <div class="detail-field"><span>Priority</span>${S.priorityBadge(t.priority)}</div>
                <div class="detail-field"><span>Assigned</span><span>${S.esc(S.userName(t.assignedToId))}</span></div>
              `}
              <div class="detail-field"><span>Customer</span><span>${customer ? S.esc(customer.name) : '—'}</span></div>
              <div class="detail-field"><span>Company</span><span>${customer ? S.esc(customer.company) : '—'}</span></div>
              <div class="detail-field"><span>Due date</span><span>${t.dueDate || '—'}</span></div>
              <div class="detail-field"><span>Created</span><span>${S.fmtDate(t.createdAt)}</span></div>
              <div class="detail-field"><span>Updated</span><span>${S.fmtRelative(t.updatedAt)}</span></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ---- FORM ---- */
  function _ticketForm(t) {
    const S = NexCRM.Utils;
    const custs = NexCRM.Store.Customers.getAll();
    const users = NexCRM.Store.Users.getAll().filter(u=>u.active);
    const cOpts = custs.map(c=>`<option value="${c.id}" ${t&&t.customerId===c.id?'selected':''}>${S.esc(c.name)} — ${S.esc(c.company)}</option>`).join('');
    const sOpts = Object.entries(S.STATUS_CFG).map(([k,v])=>`<option value="${k}" ${t?t.status===k?'selected':'':k==='new'?'selected':''}>${v.l}</option>`).join('');
    const pOpts = Object.entries(S.PRIORITY_CFG).map(([k,v])=>`<option value="${k}" ${t?t.priority===k?'selected':'':k==='medium'?'selected':''}>${v.l}</option>`).join('');
    const aOpts = `<option value="">Unassigned</option>` + users.map(u=>`<option value="${u.id}" ${t&&t.assignedToId===u.id?'selected':''}>${S.esc(u.name)}</option>`).join('');
    return `<div class="form-grid">
      <div class="form-field full-width"><label>Subject <span class="required">*</span></label><input type="text" id="f-subject" class="input" value="${t?S.esc(t.subject):''}" placeholder="Brief description of the issue"></div>
      <div class="form-field"><label>Customer <span class="required">*</span></label><select id="f-customer" class="input"><option value="">Select customer…</option>${cOpts}</select></div>
      <div class="form-field"><label>Priority <span class="required">*</span></label><select id="f-priority" class="input">${pOpts}</select></div>
      <div class="form-field"><label>Status</label><select id="f-status" class="input">${sOpts}</select></div>
      <div class="form-field"><label>Assign to</label><select id="f-assigned" class="input">${aOpts}</select></div>
      <div class="form-field"><label>Due date</label><input type="date" id="f-due" class="input" value="${t&&t.dueDate?t.dueDate:''}"></div>
      <div class="form-field full-width"><label>Description</label><textarea id="f-desc" class="input" rows="4" placeholder="Detailed description…">${t?S.esc(t.description):''}</textarea></div>
    </div>`;
  }

  function openCreateModal() {
    NexCRM.Utils.openModal('Create ticket', _ticketForm(null),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Tickets.create()">Create ticket</button>`, 'lg');
  }

  function openEditModal(id) {
    const t = NexCRM.Store.Tickets.get(id);
    if (!t) return;
    NexCRM.Utils.openModal(`Edit ${t.number}`, _ticketForm(t),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Tickets.update('${id}')">Save changes</button>`, 'lg');
  }

  function _readForm() {
    return {
      subject:      document.getElementById('f-subject')?.value.trim(),
      customerId:   document.getElementById('f-customer')?.value,
      priority:     document.getElementById('f-priority')?.value,
      status:       document.getElementById('f-status')?.value,
      assignedToId: document.getElementById('f-assigned')?.value || null,
      dueDate:      document.getElementById('f-due')?.value || null,
      description:  document.getElementById('f-desc')?.value.trim() || '',
    };
  }

  function create() {
    const d = _readForm();
    if (!d.subject)    { NexCRM.toast('Subject is required', 'error'); return; }
    if (!d.customerId) { NexCRM.toast('Customer is required', 'error'); return; }
    const ticket = NexCRM.Store.Tickets.create(d);
    if (d.assignedToId) {
      NexCRM.Store.Notifications.add({ userId: d.assignedToId, type:'info', title:`${ticket.number} assigned to you`, body: d.subject, link:`#tickets/${ticket.number}`, read: false });
    }
    NexCRM.Utils.closeModal();
    NexCRM.toast(`${ticket.number} created`, 'success');
    renderList();
  }

  function update(id) {
    const d = _readForm();
    if (!d.subject)    { NexCRM.toast('Subject is required', 'error'); return; }
    if (!d.customerId) { NexCRM.toast('Customer is required', 'error'); return; }
    const t = NexCRM.Store.Tickets.update(id, d);
    NexCRM.Utils.closeModal();
    NexCRM.toast('Ticket updated', 'success');
    if (t) renderDetail(t.number);
  }

  function patchField(id, field, value) {
    NexCRM.Store.Tickets.update(id, { [field]: value || null });
    NexCRM.toast('Saved', 'success');
    if (field === 'assignedToId' && value) {
      const t = NexCRM.Store.Tickets.get(id);
      NexCRM.Store.Notifications.add({ userId: value, type:'info', title:`${t.number} assigned to you`, body: t.subject, link:`#tickets/${t.number}`, read: false });
      NexCRM.Layout.renderTopbar(t.number);
    }
  }

  function confirmDelete(id, num) {
    NexCRM.Utils.confirm(`Delete <strong>${num}</strong>? This cannot be undone.`, () => {
      NexCRM.Store.Tickets.delete(id);
      NexCRM.toast(`${num} deleted`, 'success');
      location.hash = '#tickets';
    }, 'Delete', 'danger');
  }

  function addComment(ticketId) {
    const text = document.getElementById('comment-text')?.value.trim();
    const internal = document.getElementById('comment-internal')?.checked || false;
    if (!text) { NexCRM.toast('Comment cannot be empty', 'error'); return; }
    const user = NexCRM.Auth.getUser();
    NexCRM.Store.Tickets.addComment(ticketId, { authorId: user.id, text, internal });
    NexCRM.toast('Comment added', 'success');
    const t = NexCRM.Store.Tickets.get(ticketId);
    if (t) renderDetail(t.number);
  }

  function exportData() {
    const S = NexCRM.Utils;
    const rows = NexCRM.Store.Tickets.getAll().map(t => ({
      Number: t.number, Subject: t.subject, Customer: S.customerName(t.customerId),
      Status: t.status, Priority: t.priority, Assigned: S.userName(t.assignedToId),
      Created: S.fmtDate(t.createdAt), Due: t.dueDate || '',
    }));
    S.exportCSV(rows, 'nexcrm-tickets.csv');
  }

  function _setQ(v)  { _q = v;        renderList(); }
  function _setSt(v) { _status = v;   renderList(); }
  function _setPr(v) { _priority = v; renderList(); }
  function _clearFilters() { _q = ''; _status = 'all'; _priority = 'all'; renderList(); }

  window.NexCRM.Tickets = { render, renderList, renderDetail, openCreateModal, openEditModal, create, update, patchField, confirmDelete, addComment, exportData, _setQ, _setSt, _setPr, _clearFilters };
})();
