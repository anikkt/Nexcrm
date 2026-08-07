window.NexCRM = window.NexCRM || {};

(function () {
  let _q = '';

  function render(customerId) {
    NexCRM.Layout.renderSidebar();
    if (customerId) renderDetail(customerId);
    else renderList();
  }

  function renderList() {
    NexCRM.Layout.renderTopbar('Customers');
    const S = NexCRM.Utils;
    let customers = NexCRM.Store.Customers.getAll();
    if (_q) { const q = _q.toLowerCase(); customers = customers.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)); }
    const canEdit = NexCRM.Auth.isManager();

    const cards = customers.map(c => {
      const tickets = NexCRM.Store.Tickets.getAll().filter(t => t.customerId === c.id);
      const open = tickets.filter(t => !['resolved','closed'].includes(t.status)).length;
      return `
        <div class="customer-card" onclick="location.hash='#customers/${c.id}'">
          <div class="customer-card-head">
            ${S.avatar(c.name, 40)}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${S.esc(c.name)}</div>
              <div class="text-muted" style="font-size:12px">${S.esc(c.company)}</div>
            </div>
            <span class="badge" style="background:${c.status==='active'?'#ecfdf5':'#f1f5f9'};color:${c.status==='active'?'#065f46':'#475569'};flex-shrink:0">${c.status}</span>
          </div>
          <div class="customer-detail-field">📧 <span>${S.esc(c.email)}</span></div>
          ${c.phone ? `<div class="customer-detail-field">📞 <span>${S.esc(c.phone)}</span></div>` : ''}
          <div class="customer-detail-field">🏢 <span>${S.esc(c.industry||'—')}</span></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--s100)">
            <span class="text-muted" style="font-size:12px">${tickets.length} ticket${tickets.length!==1?'s':''} · ${open} open</span>
            <div onclick="event.stopPropagation()" style="display:flex;gap:4px">
              ${canEdit ? `<button class="icon-btn" onclick="NexCRM.Customers.openEditModal('${c.id}')" title="Edit">✏️</button>` : ''}
              ${NexCRM.Auth.isAdmin() ? `<button class="icon-btn danger" onclick="NexCRM.Customers.confirmDelete('${c.id}','${S.esc(c.name)}')" title="Delete">🗑️</button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1"><div style="font-size:32px">👥</div><div class="empty-state-title">No customers found</div><div class="empty-state-body">Adjust filters or add a new customer.</div>${canEdit?`<button class="btn btn-primary" onclick="NexCRM.Customers.openCreateModal()">Add customer</button>`:''}</div>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="toolbar">
          <div class="search-inline">
            <span>🔍</span>
            <input type="text" placeholder="Search customers…" value="${S.esc(_q)}" oninput="NexCRM.Customers._setQ(this.value)" style="width:200px">
          </div>
          <div style="flex:1"></div>
          ${canEdit ? `<button class="btn btn-primary" onclick="NexCRM.Customers.openCreateModal()">+ Add customer</button>` : ''}
          <button class="btn btn-ghost" onclick="NexCRM.Customers.exportData()">↓ CSV</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px">${cards}</div>
        <div class="text-muted" style="font-size:12px;text-align:right">${customers.length} customer${customers.length!==1?'s':''}</div>
      </div>`;
  }

  function renderDetail(customerId) {
    const c = NexCRM.Store.Customers.get(customerId);
    if (!c) { NexCRM.toast('Customer not found', 'error'); location.hash = '#customers'; return; }
    NexCRM.Layout.renderTopbar(c.name);
    const S = NexCRM.Utils;
    const tickets = NexCRM.Store.Tickets.getAll().filter(t => t.customerId === c.id);
    const canEdit = NexCRM.Auth.isManager();

    const ticketRows = tickets.map(t => `
      <tr class="table-row" onclick="location.hash='#tickets/${t.number}'">
        <td class="td-mono">${t.number}</td>
        <td><div class="cell-title">${S.esc(t.subject)}</div></td>
        <td>${S.priorityBadge(t.priority)}</td>
        <td>${S.statusBadge(t.status)}</td>
        <td class="td-sm">${t.dueDate || '—'}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="empty-state-sm" style="padding:20px;text-align:center">No tickets for this customer.</td></tr>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="detail-header">
          <a href="#customers" class="btn btn-ghost btn-sm">← Back</a>
          <div style="flex:1;display:flex;align-items:center;gap:14px">
            ${S.avatar(c.name, 44)}
            <div>
              <div class="detail-title">${S.esc(c.name)}</div>
              <div class="text-muted" style="font-size:13px">${S.esc(c.company)} · ${S.esc(c.industry||'')}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="badge" style="background:${c.status==='active'?'#ecfdf5':'#f1f5f9'};color:${c.status==='active'?'#065f46':'#475569'}">${c.status}</span>
            ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Customers.openEditModal('${c.id}')">Edit</button>` : ''}
            ${NexCRM.Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="color:var(--rose)" onclick="NexCRM.Customers.confirmDelete('${c.id}','${S.esc(c.name)}')">Delete</button>` : ''}
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-title" style="margin-bottom:14px">Contact info</div>
            <div class="detail-field"><span>Email</span><a href="mailto:${c.email}" class="link" style="font-size:12px">${S.esc(c.email)}</a></div>
            <div class="detail-field"><span>Phone</span><span>${S.esc(c.phone||'—')}</span></div>
            <div class="detail-field"><span>Company</span><span>${S.esc(c.company)}</span></div>
            <div class="detail-field"><span>Industry</span><span>${S.esc(c.industry||'—')}</span></div>
            <div class="detail-field"><span>Status</span><span class="badge" style="background:${c.status==='active'?'#ecfdf5':'#f1f5f9'};color:${c.status==='active'?'#065f46':'#475569'}">${c.status}</span></div>
            <div class="detail-field"><span>Customer since</span><span>${S.fmtDate(c.createdAt)}</span></div>
            ${c.notes ? `<div style="margin-top:14px"><div class="text-muted" style="font-size:12px;margin-bottom:5px">Notes</div><p class="text-body">${S.esc(c.notes)}</p></div>` : ''}
          </div>
          <div class="card card-flush" style="padding:0">
            <div style="padding:18px 20px;border-bottom:1px solid var(--s100);display:flex;align-items:center;justify-content:space-between">
              <span class="card-title">Tickets (${tickets.length})</span>
              ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Tickets.openCreateModal()">+ New ticket</button>` : ''}
            </div>
            <table class="data-table"><thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${ticketRows}</tbody></table>
          </div>
        </div>
      </div>`;
  }

  function _customerForm(c) {
    const S = NexCRM.Utils;
    const industries = ['Technology','Finance','Retail','Healthcare','Manufacturing','Education','Other'];
    const indOpts = industries.map(i => `<option value="${i}" ${c&&c.industry===i?'selected':''}>${i}</option>`).join('');
    return `<div class="form-grid">
      <div class="form-field"><label>Full name <span class="required">*</span></label><input type="text" id="fc-name" class="input" value="${c?S.esc(c.name):''}" placeholder="Contact name"></div>
      <div class="form-field"><label>Company <span class="required">*</span></label><input type="text" id="fc-company" class="input" value="${c?S.esc(c.company):''}" placeholder="Company name"></div>
      <div class="form-field"><label>Email <span class="required">*</span></label><input type="email" id="fc-email" class="input" value="${c?S.esc(c.email):''}" placeholder="email@company.com"></div>
      <div class="form-field"><label>Phone</label><input type="tel" id="fc-phone" class="input" value="${c?S.esc(c.phone||''):''}" placeholder="+1 555 000 0000"></div>
      <div class="form-field"><label>Industry</label><select id="fc-industry" class="input"><option value="">Select…</option>${indOpts}</select></div>
      <div class="form-field"><label>Status</label><select id="fc-status" class="input"><option value="active" ${c&&c.status==='active'?'selected':''}>Active</option><option value="inactive" ${c&&c.status==='inactive'?'selected':''}>Inactive</option></select></div>
      <div class="form-field full-width"><label>Notes</label><textarea id="fc-notes" class="input" rows="3" placeholder="Any additional notes…">${c?S.esc(c.notes||''):''}</textarea></div>
    </div>`;
  }

  function openCreateModal() {
    NexCRM.Utils.openModal('Add customer', _customerForm(null),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Customers.create()">Add customer</button>`, 'lg');
  }
  function openEditModal(id) {
    const c = NexCRM.Store.Customers.get(id);
    if (!c) return;
    NexCRM.Utils.openModal('Edit customer', _customerForm(c),
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Customers.update('${id}')">Save changes</button>`, 'lg');
  }

  function _readForm() {
    return {
      name:     document.getElementById('fc-name')?.value.trim(),
      company:  document.getElementById('fc-company')?.value.trim(),
      email:    document.getElementById('fc-email')?.value.trim(),
      phone:    document.getElementById('fc-phone')?.value.trim() || '',
      industry: document.getElementById('fc-industry')?.value || '',
      status:   document.getElementById('fc-status')?.value || 'active',
      notes:    document.getElementById('fc-notes')?.value.trim() || '',
    };
  }

  function create() {
    const d = _readForm();
    if (!d.name)    { NexCRM.toast('Name is required', 'error'); return; }
    if (!d.company) { NexCRM.toast('Company is required', 'error'); return; }
    if (!d.email)   { NexCRM.toast('Email is required', 'error'); return; }
    NexCRM.Store.Customers.create(d);
    NexCRM.Utils.closeModal();
    NexCRM.toast('Customer added', 'success');
    renderList();
  }
  function update(id) {
    const d = _readForm();
    if (!d.name || !d.email) { NexCRM.toast('Name and email are required', 'error'); return; }
    NexCRM.Store.Customers.update(id, d);
    NexCRM.Utils.closeModal();
    NexCRM.toast('Customer updated', 'success');
    renderDetail(id);
  }
  function confirmDelete(id, name) {
    NexCRM.Utils.confirm(`Delete customer <strong>${name}</strong>? Associated tickets will not be deleted.`, () => {
      NexCRM.Store.Customers.delete(id);
      NexCRM.toast('Customer deleted', 'success');
      location.hash = '#customers';
    }, 'Delete', 'danger');
  }
  function exportData() {
    const rows = NexCRM.Store.Customers.getAll().map(c => ({ Name:c.name, Company:c.company, Email:c.email, Phone:c.phone||'', Industry:c.industry||'', Status:c.status, Since: NexCRM.Utils.fmtDate(c.createdAt) }));
    NexCRM.Utils.exportCSV(rows, 'nexcrm-customers.csv');
  }
  function _setQ(v) { _q = v; renderList(); }

  window.NexCRM.Customers = { render, renderList, renderDetail, openCreateModal, openEditModal, create, update, confirmDelete, exportData, _setQ };
})();
