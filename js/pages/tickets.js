window.NexCRM = window.NexCRM || {};

(function () {
  let _q = '', _status = 'all', _priority = 'all', _customer = 'all';
  let _parsedCSV = [];

  // ── Helpers ──────────────────────────────────────────────────────────────
  const I = () => NexCRM.icon; // lazy ref

  function render(ticketNum) {
    NexCRM.Layout.renderSidebar();
    if (ticketNum) renderDetail(ticketNum);
    else renderList();
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  function renderList(queryOverride) {
    if (queryOverride !== undefined) _q = queryOverride;
    NexCRM.Layout.renderTopbar('Tickets');
    const S = NexCRM.Utils; const Ic = NexCRM.icon;
    const user = NexCRM.Auth.getUser();
    let tickets = NexCRM.Store.Tickets.getAll();
    if (user.role === 'analyst' || user.role === 'agent') tickets = tickets.filter(t => t.assignedToId === user.id);
    if (_q) { const q=_q.toLowerCase(); tickets=tickets.filter(t=>t.subject.toLowerCase().includes(q)||t.number.toLowerCase().includes(q)||S.customerName(t.customerId).toLowerCase().includes(q)); }
    if (_status !== 'all')   tickets = tickets.filter(t => t.status === _status);
    if (_priority !== 'all') tickets = tickets.filter(t => t.priority === _priority);
    if (_customer !== 'all') tickets = tickets.filter(t => t.customerId === _customer);

    const statusOpts = `<option value="all">All statuses</option>` + Object.entries(S.STATUS_CFG).map(([k,v])=>`<option value="${k}" ${_status===k?'selected':''}>${v.l}</option>`).join('');
    const prioOpts   = `<option value="all">All priorities</option>` + Object.entries(S.PRIORITY_CFG).map(([k,v])=>`<option value="${k}" ${_priority===k?'selected':''}>${v.l}</option>`).join('');
    const customers  = NexCRM.Store.Customers.getAll();
    const custOpts   = `<option value="all">All customers</option>` + customers.map(c=>`<option value="${c.id}" ${_customer===c.id?'selected':''}>${S.esc(c.name)}</option>`).join('');
    const canCreate  = NexCRM.Auth.isManager();

    const rows = tickets.map(t => `
      <tr class="table-row" onclick="location.hash='#tickets/${t.number}'">
        <td class="td-mono">${t.number}</td>
        <td><div class="cell-title">${S.esc(t.subject)}</div><div class="cell-sub">${S.esc(S.customerName(t.customerId))}</div></td>
        <td>${S.priorityBadge(t.priority)}</td>
        <td>${S.statusBadge(t.status)}</td>
        <td class="td-sm">${S.esc(S.userName(t.assignedToId))}</td>
        <td class="td-sm" style="color:${t.dueDate&&t.dueDate<new Date().toISOString().slice(0,10)&&!['resolved','closed'].includes(t.status)?'var(--rose)':'var(--text-3)'}">${t.dueDate||'—'}</td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          ${canCreate?`<button class="icon-btn" onclick="NexCRM.Tickets.openEditModal('${t.id}')" title="Edit" style="color:var(--s500)">${Ic('edit',14)}</button>`:''}
          ${NexCRM.Auth.isAdmin()?`<button class="icon-btn danger" onclick="NexCRM.Tickets.confirmDelete('${t.id}','${t.number}')" title="Delete">${Ic('trash',14)}</button>`:''}
        </td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="toolbar">
          <div class="search-inline">
            ${Ic('search',14)}
            <input type="text" placeholder="Search tickets…" value="${S.esc(_q)}"
              oninput="NexCRM.Tickets._setQ(this.value)" style="width:170px">
          </div>
          <select class="filter-select" onchange="NexCRM.Tickets._setSt(this.value)">${statusOpts}</select>
          <select class="filter-select" onchange="NexCRM.Tickets._setPr(this.value)">${prioOpts}</select>
          <select class="filter-select" onchange="NexCRM.Tickets._setCust(this.value)">${custOpts}</select>
          <div style="flex:1"></div>
          ${canCreate?`<button class="btn btn-primary" onclick="NexCRM.Tickets.openCreateModal()">${Ic('plus',15)} New ticket</button>`:''}
          <button class="btn btn-ghost" onclick="NexCRM.Tickets.openImportModal()">${Ic('upload',14)} Import CSV</button>
          <button class="btn btn-ghost" onclick="NexCRM.Tickets.exportData()">${Ic('download',14)} Export</button>
        </div>
        <div class="card-flush">
          ${tickets.length
            ? `<table class="data-table"><thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Due</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
            : `<div class="empty-state"><div style="color:var(--s300)">${Ic('tickets',40)}</div><div class="empty-state-title">No tickets found</div><div class="empty-state-body">Adjust filters or create a new ticket.</div>${canCreate?`<button class="btn btn-primary" onclick="NexCRM.Tickets.openCreateModal()">Create ticket</button>`:''}</div>`}
          <div class="table-footer">
            <span class="text-muted">${tickets.length} ticket${tickets.length!==1?'s':''}</span>
            <button class="btn btn-ghost btn-sm" onclick="NexCRM.Tickets._clearFilters()">Clear filters</button>
          </div>
        </div>
      </div>`;

    // Restore search value in global search box
    const gs = document.getElementById('global-search');
    if (gs && _q) gs.value = _q;
  }

  // ── DETAIL ───────────────────────────────────────────────────────────────
  function renderDetail(num) {
    const t = NexCRM.Store.Tickets.get(num);
    if (!t) { NexCRM.toast('Ticket not found', 'error'); location.hash = '#tickets'; return; }
    NexCRM.Layout.renderTopbar(t.number);
    const S = NexCRM.Utils; const Ic = NexCRM.icon;
    const user = NexCRM.Auth.getUser();
    const canEdit = NexCRM.Auth.isManager() || user.id === t.assignedToId;
    const customer = NexCRM.Store.Customers.get(t.customerId);
    const users = NexCRM.Store.Users.getAll().filter(u=>u.active);

    const statusOpts  = Object.entries(S.STATUS_CFG).map(([k,v])=>`<option value="${k}" ${t.status===k?'selected':''}>${v.l}</option>`).join('');
    const prioOpts    = Object.entries(S.PRIORITY_CFG).map(([k,v])=>`<option value="${k}" ${t.priority===k?'selected':''}>${v.l}</option>`).join('');
    const assignOpts  = `<option value="">Unassigned</option>` + users.map(u=>`<option value="${u.id}" ${t.assignedToId===u.id?'selected':''}>${S.esc(u.name)}</option>`).join('');

    const comments = (t.comments||[]).map(c => {
      const a = NexCRM.Store.Users.get(c.authorId);
      const cc=['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
      const ci=a?((a.name.charCodeAt(0)||0)+(a.name.charCodeAt(1)||0))%cc.length:0;
      const ini=a?a.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase():'??';
      return `<div class="comment-item">
        <div class="comment-avatar" style="background:${cc[ci]}22;border-color:${cc[ci]}44;color:${cc[ci]}">${ini}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600;color:var(--s800)">${a?S.esc(a.name):'Unknown'}</span>
            <span class="text-muted" style="font-size:11px">${S.fmtRelative(c.createdAt)}</span>
            ${c.internal?`<span class="internal-badge">Internal note</span>`:''}
          </div>
          <div class="comment-body">${S.esc(c.text)}</div>
        </div>
      </div>`;
    }).join('') || `<p class="text-muted" style="font-size:13px">No comments yet.</p>`;

    // Activity timeline
    const timelineItems = [
      { e:'Ticket created',  t:S.fmtDate(t.createdAt), c:'#6366f1' },
      t.assignedToId ? { e:`Assigned to ${S.userName(t.assignedToId)}`, t:S.fmtRelative(t.updatedAt), c:'#06b6d4' } : null,
      { e:`Status: ${S.STATUS_CFG[t.status]?.l||t.status}`, t:S.fmtRelative(t.updatedAt), c:'#8b5cf6' },
      (t.comments||[]).length ? { e:`${t.comments.length} comment${t.comments.length>1?'s':''}`, t:'', c:'#f59e0b' } : null,
    ].filter(Boolean);

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="detail-header">
          <a href="#tickets" class="btn btn-ghost btn-sm">${Ic('arrow_dn',13)} Back</a>
          <div style="flex:1;min-width:0">
            <div class="text-muted" style="font-size:11px;font-family:monospace">${t.number}</div>
            <div class="detail-title">${S.esc(t.subject)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
            ${S.statusBadge(t.status)} ${S.priorityBadge(t.priority)}
            ${canEdit?`<button class="btn btn-primary btn-sm" onclick="NexCRM.Tickets.openEditModal('${t.id}')">${Ic('edit',13)} Edit</button>`:''}
            ${NexCRM.Auth.isAdmin()?`<button class="btn btn-ghost btn-sm" style="color:var(--rose)" onclick="NexCRM.Tickets.confirmDelete('${t.id}','${t.number}')">${Ic('trash',13)}</button>`:''}
          </div>
        </div>

        <div class="detail-grid">
          <div style="display:flex;flex-direction:column;gap:16px">
            <!-- Case description -->
            <div class="card">
              <div class="card-title" style="margin-bottom:10px">Case description</div>
              ${t.description
                ? `<p class="text-body">${S.esc(t.description)}</p>`
                : `<p style="font-size:13px;color:var(--s400);font-style:italic">No description provided.</p>`}
            </div>
            <!-- Comments -->
            <div class="card">
              <div class="card-title" style="margin-bottom:14px">Comments (${(t.comments||[]).length})</div>
              <div id="comments-list">${comments}</div>
              <div class="comment-form" style="margin-top:16px;border-top:1px solid var(--s100);padding-top:16px">
                <textarea id="comment-text" placeholder="Add a comment…" rows="3"></textarea>
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                  <label class="checkbox-label"><input type="checkbox" id="comment-internal"> Mark as internal note</label>
                  <button class="btn btn-primary btn-sm" onclick="NexCRM.Tickets.addComment('${t.id}')">${Ic('plus',13)} Post comment</button>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-sidebar">
            <div class="card">
              <div class="card-title" style="margin-bottom:14px">Details</div>
              ${canEdit?`
                <div class="field-row"><label>Status</label><select class="input-sm" onchange="NexCRM.Tickets.patchField('${t.id}','status',this.value)">${statusOpts}</select></div>
                <div class="field-row"><label>Priority</label><select class="input-sm" onchange="NexCRM.Tickets.patchField('${t.id}','priority',this.value)">${prioOpts}</select></div>
                <div class="field-row"><label>Assigned to</label><select class="input-sm" onchange="NexCRM.Tickets.patchField('${t.id}','assignedToId',this.value)">${assignOpts}</select></div>
              `:`
                <div class="detail-field"><span>Status</span>${S.statusBadge(t.status)}</div>
                <div class="detail-field"><span>Priority</span>${S.priorityBadge(t.priority)}</div>
                <div class="detail-field"><span>Assigned</span><span>${S.esc(S.userName(t.assignedToId))}</span></div>
              `}
              <div class="detail-field"><span>Customer</span><span>${customer?S.esc(customer.name):'—'}</span></div>
              <div class="detail-field"><span>Company</span><span>${customer?S.esc(customer.company):'—'}</span></div>
              <div class="detail-field"><span>Due date</span><span>${t.dueDate||'—'}</span></div>
              <div class="detail-field"><span>Created</span><span>${S.fmtDate(t.createdAt)}</span></div>
              <div class="detail-field"><span>Updated</span><span>${S.fmtRelative(t.updatedAt)}</span></div>
            </div>

            <div class="card">
              <div class="card-title" style="margin-bottom:12px">Activity timeline</div>
              ${timelineItems.map((e,i)=>`
                <div class="activity-item" ${i===timelineItems.length-1?'style="border-left:none"':''}>
                  <div class="activity-dot" style="background:${e.c}"></div>
                  <div>
                    <div style="font-size:12px;color:var(--s700);font-weight:500">${e.e}</div>
                    ${e.t?`<div style="font-size:11px;color:var(--s400)">${e.t}</div>`:''}
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── TICKET FORM ───────────────────────────────────────────────────────────
  function _ticketForm(t) {
    const S = NexCRM.Utils;
    const custs = NexCRM.Store.Customers.getAll();
    const users  = NexCRM.Store.Users.getAll().filter(u=>u.active);
    const cOpts = custs.map(c=>`<option value="${c.id}" ${t&&t.customerId===c.id?'selected':''}>${S.esc(c.name)} — ${S.esc(c.company)}</option>`).join('');
    const sOpts = Object.entries(S.STATUS_CFG).map(([k,v])=>`<option value="${k}" ${t?t.status===k?'selected':'':k==='new'?'selected':''}>${v.l}</option>`).join('');
    const pOpts = Object.entries(S.PRIORITY_CFG).map(([k,v])=>`<option value="${k}" ${t?t.priority===k?'selected':'':k==='medium'?'selected':''}>${v.l}</option>`).join('');
    const aOpts = `<option value="">Unassigned</option>`+users.map(u=>`<option value="${u.id}" ${t&&t.assignedToId===u.id?'selected':''}>${S.esc(u.name)}</option>`).join('');
    return `<div class="form-grid">
      <div class="form-field full-width"><label>Subject <span class="required">*</span></label><input type="text" id="f-subject" class="input" value="${t?S.esc(t.subject):''}" placeholder="Brief description of the issue"></div>
      <div class="form-field"><label>Customer <span class="required">*</span></label><select id="f-customer" class="input"><option value="">Select customer…</option>${cOpts}</select></div>
      <div class="form-field"><label>Priority <span class="required">*</span></label><select id="f-priority" class="input">${pOpts}</select></div>
      <div class="form-field"><label>Status</label><select id="f-status" class="input">${sOpts}</select></div>
      <div class="form-field"><label>Assign to</label><select id="f-assigned" class="input">${aOpts}</select></div>
      <div class="form-field"><label>Due date</label><input type="date" id="f-due" class="input" value="${t&&t.dueDate?t.dueDate:''}"></div>
      <div class="form-field full-width"><label>Case description</label><textarea id="f-desc" class="input" rows="4" placeholder="Detailed description of the issue…">${t?S.esc(t.description):''}</textarea></div>
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
      NexCRM.Store.Notifications.add({ userId:d.assignedToId, type:'info', title:`${ticket.number} assigned to you`, body:d.subject, link:`#tickets/${ticket.number}`, read:false });
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
      NexCRM.Store.Notifications.add({ userId:value, type:'info', title:`${t.number} assigned to you`, body:t.subject, link:`#tickets/${t.number}`, read:false });
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
    NexCRM.Store.Tickets.addComment(ticketId, { authorId: NexCRM.Auth.getUser().id, text, internal });
    NexCRM.toast('Comment added', 'success');
    const t = NexCRM.Store.Tickets.get(ticketId);
    if (t) renderDetail(t.number);
  }

  // ── CSV IMPORT ────────────────────────────────────────────────────────────
  function openImportModal() {
    const S = NexCRM.Utils; const Ic = NexCRM.icon;
    _parsedCSV = [];
    S.openModal('Import tickets from CSV',
      `<div style="margin-bottom:14px">
        <p style="font-size:13px;color:var(--s600);line-height:1.6;margin-bottom:10px">Upload a CSV file to import tickets in bulk. Use the template below to get the correct column format.</p>
        <div style="background:var(--s50);border-radius:8px;padding:9px 12px;font-size:11px;font-family:monospace;color:var(--s700);overflow-x:auto">subject, description, status, priority, customer_email, assigned_email, due_date</div>
      </div>
      <div style="margin-bottom:16px">
        <button class="btn btn-ghost btn-sm" onclick="NexCRM.Tickets.downloadTemplate()">${Ic('download',13)} Download template</button>
      </div>
      <div class="form-field">
        <label>Select CSV file</label>
        <input type="file" id="csv-file" accept=".csv" class="input" onchange="NexCRM.Tickets.previewCSV(this)">
      </div>
      <div id="csv-preview" style="margin-top:14px"></div>`,
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="csv-import-btn" onclick="NexCRM.Tickets.importCSV()" disabled>${Ic('upload',13)} Import tickets</button>`,
      'lg');
  }

  function downloadTemplate() {
    const h = ['subject','description','status','priority','customer_email','assigned_email','due_date'];
    const ex = ['Login issue after password reset','User unable to login after reset email','new','high','client@example.com','agent@nexcrm.dev','2025-08-15'];
    const csv = [h.join(','), ex.map(v=>`"${v}"`).join(',')].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'nexcrm-import-template.csv';
    a.click();
  }

  function _parseCSVText(text) {
    const lines = text.trim().split('\n').filter(l=>l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/['"]/g,''));
    return lines.slice(1).map(line => {
      const vals=[]; let inQ=false, cur='';
      for (const ch of line) {
        if (ch==='"') { inQ=!inQ; }
        else if (ch===',' && !inQ) { vals.push(cur.trim()); cur=''; }
        else { cur+=ch; }
      }
      vals.push(cur.trim());
      const obj={};
      headers.forEach((h,i)=>{ obj[h]=(vals[i]||'').replace(/^"|"$/g,''); });
      return obj;
    }).filter(r=>r.subject&&r.subject.trim());
  }

  function previewCSV(input) {
    const file = input.files[0]; if (!file) return;
    const S = NexCRM.Utils;
    const reader = new FileReader();
    reader.onload = e => {
      const rows = _parseCSVText(e.target.result);
      _parsedCSV = rows;
      const preview = document.getElementById('csv-preview');
      const btn = document.getElementById('csv-import-btn');
      if (!rows.length) {
        preview.innerHTML = `<p style="color:var(--rose);font-size:13px">No valid rows found. Check that the file has a "subject" column.</p>`;
        btn.disabled = true; return;
      }
      btn.disabled = false;
      preview.innerHTML = `
        <div style="font-size:12px;color:var(--s600);margin-bottom:8px">${rows.length} ticket${rows.length!==1?'s':''} ready to import</div>
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:var(--s50)">${['Subject','Priority','Status','Customer email'].map(h=>`<th style="padding:7px 10px;text-align:left;color:var(--s500);font-weight:600">${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.slice(0,8).map(r=>`<tr style="border-top:1px solid var(--s100)">
              <td style="padding:7px 10px;color:var(--s800);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${S.esc(r.subject)}</td>
              <td style="padding:7px 10px">${S.priorityBadge(r.priority||'medium')}</td>
              <td style="padding:7px 10px">${S.statusBadge(r.status||'new')}</td>
              <td style="padding:7px 10px;color:var(--s600)">${S.esc(r.customer_email||'—')}</td>
            </tr>`).join('')}
            ${rows.length>8?`<tr><td colspan="4" style="padding:7px 10px;text-align:center;color:var(--s400)">+${rows.length-8} more rows…</td></tr>`:''}</tbody>
          </table>
        </div>`;
    };
    reader.readAsText(file);
  }

  function importCSV() {
    if (!_parsedCSV.length) return;
    const validSt = ['new','assigned','in_progress','pending','resolved','closed'];
    const validPr = ['low','medium','high','critical'];
    let imported = 0;
    for (const row of _parsedCSV) {
      if (!row.subject?.trim()) continue;
      let customerId = null;
      if (row.customer_email) {
        const c = NexCRM.Store.Customers.getAll().find(c=>c.email.toLowerCase()===row.customer_email.toLowerCase());
        if (c) customerId = c.id;
      }
      let assignedToId = null;
      if (row.assigned_email) {
        const u = NexCRM.Store.Users.getByEmail(row.assigned_email);
        if (u) assignedToId = u.id;
      }
      const status   = validSt.includes((row.status||'').toLowerCase()) ? row.status.toLowerCase() : 'new';
      const priority = validPr.includes((row.priority||'').toLowerCase()) ? row.priority.toLowerCase() : 'medium';
      NexCRM.Store.Tickets.create({ subject:row.subject.trim(), description:row.description||'', status, priority, customerId, assignedToId, dueDate:row.due_date||null });
      imported++;
    }
    _parsedCSV = [];
    NexCRM.Utils.closeModal();
    NexCRM.toast(`${imported} ticket${imported!==1?'s':''} imported`, 'success');
    renderList();
  }

  // ── EXPORT (extended columns) ─────────────────────────────────────────────
  function exportData() {
    const S = NexCRM.Utils;
    const rows = NexCRM.Store.Tickets.getAll().map(t => {
      const cDate = t.createdAt ? new Date(t.createdAt) : null;
      const uDate = t.updatedAt ? new Date(t.updatedAt) : null;
      return {
        'Ticket Number':  t.number,
        'Subject':        t.subject,
        'Case Description': t.description || '',
        'Status':         t.status,
        'Priority':       t.priority,
        'Customer':       S.customerName(t.customerId),
        'Assigned To':    S.userName(t.assignedToId),
        'Due Date':       t.dueDate || '',
        'Created Date':   cDate ? cDate.toLocaleDateString() : '',
        'Created Time':   cDate ? cDate.toLocaleTimeString() : '',
        'Updated Date':   uDate ? uDate.toLocaleDateString() : '',
        'Updated Time':   uDate ? uDate.toLocaleTimeString() : '',
        'Old Value':      '',
        'New Value':      '',
        'Edit Date':      '',
        'Edit Time':      '',
      };
    });
    S.exportCSV(rows, 'nexcrm-tickets.csv');
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  function _setQ(v)     { _q = v;        renderList(); }
  function _setSt(v)    { _status = v;   renderList(); }
  function _setPr(v)    { _priority = v; renderList(); }
  function _setCust(v)  { _customer = v; renderList(); }
  function _clearFilters() { _q=''; _status='all'; _priority='all'; _customer='all'; renderList(); }

  window.NexCRM.Tickets = { render, renderList, renderDetail, openCreateModal, openEditModal, create, update, patchField, confirmDelete, addComment, openImportModal, downloadTemplate, previewCSV, importCSV, exportData, _setQ, _setSt, _setPr, _setCust, _clearFilters };
})();
