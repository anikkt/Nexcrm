window.NexCRM = window.NexCRM || {};

(function () {
  let _repTab = 'analytics';   // 'analytics' | 'history'
  let _parsedImport = [];
  let _hq='', _hTicket='all', _hField='all', _hFrom='', _hTo='';

  // Expected columns (case-insensitive, flexible on exact naming)
  const COL_MAP = {
    'ticket number':'ticketNumber', 'case owner':'caseOwner', 'field / event':'field',
    'field/event':'field', 'old value':'oldValue', 'new value':'newValue',
    'edited by':'editedBy', 'edit date':'editDate', 'created_date':'createdDate',
    'closed_date':'closedDate', 'due_date':'dueDate', 'department':'department',
    'customer':'customer', 'company':'company', 'category':'category',
    'priority':'priority', 'status':'status',
  };

  function render() {
    NexCRM.Layout.renderTopbar('Reports & Analytics');
    NexCRM.Layout.renderSidebar('reports');
    if (_repTab === 'history') { renderHistory(); return; }
    renderAnalytics();
  }

  function _tabBar() {
    const Ic = NexCRM.icon;
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="display:flex;gap:2px;background:var(--s100);border-radius:10px;padding:3px;width:fit-content">
        <button onclick="NexCRM.Reports._setTab('analytics')" class="btn btn-sm" style="${_repTab==='analytics'?'background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,0.08)':'color:var(--text-2);background:transparent'}">Analytics</button>
        <button onclick="NexCRM.Reports._setTab('history')" class="btn btn-sm" style="${_repTab==='history'?'background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,0.08)':'color:var(--text-2);background:transparent'}">Case History ${NexCRM.Store.ImportedEvents.getAll().length?`<span class="nav-badge" style="margin-left:5px">${NexCRM.Store.ImportedEvents.getAll().length}</span>`:''}</button>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="NexCRM.Reports.exportSummary()">${Ic('download',13)} Export report</button>
        <button class="btn btn-ghost btn-sm" onclick="NexCRM.Tickets.exportEventLog(null)">${Ic('file',13)} Export event log</button>
      </div>
    </div>`;
  }
  function _setTab(t){ _repTab=t; render(); }

  function renderAnalytics() {
    const S=NexCRM.Utils, Ic=NexCRM.icon;
    const tickets=NexCRM.Store.Tickets.getAll();
    const customers=NexCRM.Store.Customers.getAll();
    const depts=NexCRM.Store.Departments.getAll();
    const cats=NexCRM.Store.TicketCategories.getAll();
    const users=NexCRM.Store.Users.getAll().filter(u=>u.active);

    // ── Summary KPIs
    const resolved=tickets.filter(t=>t.status==='resolved');
    const closed=tickets.filter(t=>t.status==='closed');
    const open=tickets.filter(t=>['new','assigned','in_progress'].includes(t.status));
    const avgMs=resolved.length?resolved.reduce((s,t)=>s+(new Date(t.updatedAt)-new Date(t.createdAt)),0)/resolved.length:0;
    const avgH=avgMs/3600000;
    const avgStr=avgH<1?`${Math.round(avgH*60)}m`:avgH<24?`${avgH.toFixed(1)}h`:`${(avgH/24).toFixed(1)}d`;

    const kpis=[
      {label:'Total Tickets',   value:tickets.length,    color:'#6366f1'},
      {label:'Open',            value:open.length,       color:'#f59e0b'},
      {label:'Resolved',        value:resolved.length,   color:'#10b981'},
      {label:'Closed',          value:closed.length,     color:'#94a3b8'},
      {label:'Avg Resolution',  value:avgStr,            color:'#8b5cf6'},
      {label:'Customers',       value:customers.length,  color:'#06b6d4'},
    ];
    const kpiHtml=kpis.map(k=>`<div class="kpi-card"><div style="width:8px;height:8px;border-radius:50%;background:${k.color};margin-bottom:12px"></div><div class="kpi-value" style="font-size:24px">${k.value}</div><div class="kpi-label">${k.label}</div></div>`).join('');

    // ── Horizontal bar chart helper
    function hBar(data,maxV){
      return data.map(d=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <div style="width:120px;font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">${S.esc(d.label)}</div>
        <div style="flex:1;height:20px;background:var(--s100);border-radius:5px;overflow:hidden;position:relative">
          <div style="height:100%;background:${d.color||'#6366f1'};border-radius:5px;width:${maxV>0?Math.round((d.value/maxV)*100):0}%;transition:width .4s"></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:var(--text);min-width:28px;text-align:right">${d.value}</span>
        <span style="font-size:11px;color:var(--text-3);min-width:32px">${maxV>0?Math.round((d.value/maxV)*100):'0'}%</span>
      </div>`).join('');
    }

    // ── Tickets by category
    const catData=cats.map(c=>({label:c.name,value:tickets.filter(t=>t.categoryId===c.id).length,color:c.color})).sort((a,b)=>b.value-a.value);
    const catMax=Math.max(...catData.map(d=>d.value),1);

    // ── Tickets by department
    const deptData=depts.map(d=>({label:d.name,value:tickets.filter(t=>t.departmentId===d.id).length,color:d.color})).sort((a,b)=>b.value-a.value);
    const deptMax=Math.max(...deptData.map(d=>d.value),1);

    // ── Tickets by status
    const statusData=[
      {label:'New',         value:tickets.filter(t=>t.status==='new').length,         color:'#6366f1'},
      {label:'Assigned',    value:tickets.filter(t=>t.status==='assigned').length,    color:'#06b6d4'},
      {label:'In Progress', value:tickets.filter(t=>t.status==='in_progress').length, color:'#8b5cf6'},
      {label:'Pending',     value:tickets.filter(t=>t.status==='pending').length,     color:'#f59e0b'},
      {label:'Resolved',    value:tickets.filter(t=>t.status==='resolved').length,    color:'#10b981'},
      {label:'Closed',      value:tickets.filter(t=>t.status==='closed').length,      color:'#94a3b8'},
    ].filter(d=>d.value>0);
    const stMax=Math.max(...statusData.map(d=>d.value),1);

    // ── Agent performance table
    const agentRows=users.map(u=>{
      const ta=tickets.filter(t=>t.assignedToId===u.id);
      const res=ta.filter(t=>t.status==='resolved');
      const op=ta.filter(t=>['new','assigned','in_progress'].includes(t.status)).length;
      const aMs=res.length?res.reduce((s,t)=>s+(new Date(t.updatedAt)-new Date(t.createdAt)),0)/res.length:null;
      const aStr=aMs===null?'—':aMs/3600000<1?`${Math.round(aMs/60000)}m`:aMs/3600000<24?`${(aMs/3600000).toFixed(1)}h`:`${(aMs/86400000).toFixed(1)}d`;
      const rate=ta.length?Math.round((res.length/ta.length)*100):0;
      const cc=['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
      const ci=((u.name.charCodeAt(0)||0)+(u.name.charCodeAt(1)||0))%cc.length;
      const ini=u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      return`<tr><td><div style="display:flex;align-items:center;gap:10px"><div style="width:30px;height:30px;border-radius:50%;background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${ini}</div><div><div style="font-size:13px;font-weight:600;color:var(--text)">${S.esc(u.name)}</div><div class="text-muted" style="font-size:11px">${u.role}</div></div></div></td>
        <td style="text-align:center;font-size:13px;font-weight:600">${ta.length}</td>
        <td style="text-align:center;font-size:13px;font-weight:600;color:#10b981">${res.length}</td>
        <td style="text-align:center;font-size:13px;font-weight:600;color:#f59e0b">${op}</td>
        <td style="text-align:center"><div style="display:inline-flex;align-items:center;gap:6px"><div style="width:40px;height:4px;background:var(--s100);border-radius:2px;overflow:hidden"><div style="height:100%;background:#10b981;width:${rate}%"></div></div><span style="font-size:12px;color:var(--text-2)">${rate}%</span></div></td>
        <td style="text-align:center;font-size:13px">${aStr}</td>
      </tr>`;
    }).join('');

    // ── Customer ranking by ticket count
    const custRank=customers.map(c=>({name:c.name,company:c.company,total:tickets.filter(t=>t.customerId===c.id).length,open:tickets.filter(t=>t.customerId===c.id&&['new','assigned','in_progress'].includes(t.status)).length})).sort((a,b)=>b.total-a.total).slice(0,5);
    const custRows=custRank.map(c=>`<tr><td><div style="font-size:13px;font-weight:600;color:var(--text)">${S.esc(c.name)}</div><div class="text-muted" style="font-size:11px">${S.esc(c.company)}</div></td><td style="text-align:center;font-size:13px;font-weight:600">${c.total}</td><td style="text-align:center;font-size:13px;color:#f59e0b;font-weight:600">${c.open}</td></tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        ${_tabBar()}
        <p class="text-muted" style="font-size:13px;margin-top:-8px">All metrics calculated from live case data</p>

        <!-- Summary KPIs -->
        <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px">${kpiHtml}</div>

        <!-- Category + Status -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card">
            <div class="card-title" style="margin-bottom:4px">Tickets by category</div>
            <div class="text-muted" style="font-size:12px;margin-bottom:14px">${cats.length} categories tracked</div>
            ${catData.length?hBar(catData,catMax):`<div class="empty-state-sm">No categories. <a href="#categories" class="link">Create one →</a></div>`}
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:4px">Tickets by status</div>
            <div class="text-muted" style="font-size:12px;margin-bottom:14px">Current ticket lifecycle distribution</div>
            ${hBar(statusData,stMax)}
          </div>
        </div>

        <!-- Department bar -->
        <div class="card">
          <div class="card-title" style="margin-bottom:4px">Tickets by department</div>
          <div class="text-muted" style="font-size:12px;margin-bottom:14px">${depts.length} departments · ${tickets.filter(t=>!t.departmentId).length} unassigned</div>
          ${deptData.length?hBar(deptData,deptMax):`<div class="empty-state-sm">No departments. <a href="#departments" class="link">Create one →</a></div>`}
        </div>

        <!-- Agent performance -->
        <div class="card card-flush">
          <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <div><div class="card-title">Agent performance</div><div class="text-muted" style="font-size:12px;margin-top:2px">Tickets assigned, resolved, open and resolution rate per agent</div></div>
            <button class="btn btn-ghost btn-sm" onclick="NexCRM.Reports.exportAgents()">${Ic('download',13)} Export</button>
          </div>
          <table class="data-table">
            <thead><tr><th>Agent</th><th style="text-align:center">Total</th><th style="text-align:center">Resolved</th><th style="text-align:center">Open</th><th style="text-align:center">Resolution rate</th><th style="text-align:center">Avg time</th></tr></thead>
            <tbody>${agentRows||`<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-3)">No agents with assigned tickets.</td></tr>`}</tbody>
          </table>
        </div>

        <!-- Top customers -->
        <div class="card card-flush" style="max-width:560px">
          <div style="padding:18px 22px;border-bottom:1px solid var(--border)"><div class="card-title">Top customers by ticket volume</div></div>
          <table class="data-table">
            <thead><tr><th>Customer</th><th style="text-align:center">Total</th><th style="text-align:center">Open</th></tr></thead>
            <tbody>${custRows||`<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--text-3)">No customers yet.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CASE HISTORY — imported event log browser
  // ══════════════════════════════════════════════════════════════════════════

  function renderHistory() {
    const S = NexCRM.Utils, Ic = NexCRM.icon;
    const isManager = NexCRM.Auth.isManager();
    let rows = NexCRM.Store.ImportedEvents.getAll();

    // Build filter option lists from the imported data itself
    const ticketNums = [...new Set(rows.map(r=>r.ticketNumber).filter(Boolean))].sort();
    const fields     = [...new Set(rows.map(r=>r.field).filter(Boolean))].sort();

    // Apply filters
    let filtered = rows;
    if (_hq) {
      const q=_hq.toLowerCase();
      filtered = filtered.filter(r =>
        (r.ticketNumber||'').toLowerCase().includes(q) ||
        (r.caseOwner||'').toLowerCase().includes(q) ||
        (r.customer||'').toLowerCase().includes(q) ||
        (r.company||'').toLowerCase().includes(q) ||
        (r.oldValue||'').toLowerCase().includes(q) ||
        (r.newValue||'').toLowerCase().includes(q));
    }
    if (_hTicket!=='all') filtered = filtered.filter(r=>r.ticketNumber===_hTicket);
    if (_hField!=='all')  filtered = filtered.filter(r=>r.field===_hField);
    if (_hFrom) filtered = filtered.filter(r=>r.editDate && r.editDate.slice(0,10) >= _hFrom);
    if (_hTo)   filtered = filtered.filter(r=>r.editDate && r.editDate.slice(0,10) <= _hTo);

    const tOpts=`<option value="all">All tickets</option>`+ticketNums.map(n=>`<option value="${n}" ${_hTicket===n?'selected':''}>${n}</option>`).join('');
    const fOpts=`<option value="all">All fields/events</option>`+fields.map(f=>`<option value="${S.esc(f)}" ${_hField===f?'selected':''}>${S.esc(f)}</option>`).join('');

    const bodyRows = filtered.slice(0,500).map(r => `
      <tr>
        <td class="td-mono">${S.esc(r.ticketNumber||'—')}</td>
        <td class="td-sm">${S.esc(r.editDate||'—')}</td>
        <td><span class="badge" style="background:#6366f118;color:#6366f1;font-size:11px">${S.esc(r.field||'—')}</span></td>
        <td class="td-sm" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.oldValue?S.esc(r.oldValue):'—'}</td>
        <td class="td-sm" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.newValue?S.esc(r.newValue):'—'}</td>
        <td class="td-sm">${S.esc(r.editedBy||'—')}</td>
        <td class="td-sm">${S.esc(r.caseOwner||'—')}</td>
        <td class="td-sm">${S.esc(r.department||'—')}</td>
        <td class="td-sm">${S.esc(r.category||'—')}</td>
        <td class="td-sm">${S.esc(r.customer||'—')}</td>
        <td class="td-sm">${r.priority?S.priorityBadge((r.priority||'').toLowerCase()):'—'}</td>
        <td class="td-sm">${r.status?S.statusBadge((r.status||'').toLowerCase().replace(/\s+/g,'_')):S.esc(r.status||'—')}</td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        ${_tabBar()}

        ${!rows.length ? `
          <div class="upload-zone-like card" style="text-align:center;padding:48px 24px;border:2px dashed var(--border)">
            <div style="color:var(--s300);margin-bottom:14px">${Ic('file',40)}</div>
            <div class="card-title" style="margin-bottom:6px">No case history imported yet</div>
            <p class="text-muted" style="font-size:13px;margin-bottom:20px;max-width:420px;margin-left:auto;margin-right:auto">
              Upload a CSV export of your ticket change history — from your old CRM, a spreadsheet, or a previous NexCRM event-log export — to browse it here without needing the original tickets to exist in this system.
            </p>
            <button class="btn btn-primary" onclick="NexCRM.Reports.openImportModal()">${Ic('upload',15)} Import event log CSV</button>
          </div>
        ` : `
          <div class="toolbar" style="flex-wrap:wrap;gap:8px">
            <div class="search-inline">${Ic('search',14)}<input type="text" id="hist-search" placeholder="Search history…" value="${S.esc(_hq)}" oninput="NexCRM.Reports._setHQ(this.value)" style="width:170px"></div>
            <select class="filter-select" onchange="NexCRM.Reports._setHTicket(this.value)">${tOpts}</select>
            <select class="filter-select" onchange="NexCRM.Reports._setHField(this.value)">${fOpts}</select>
            <input type="date" class="filter-select" value="${_hFrom}" onchange="NexCRM.Reports._setHFrom(this.value)" title="From date">
            <input type="date" class="filter-select" value="${_hTo}" onchange="NexCRM.Reports._setHTo(this.value)" title="To date">
            <div style="flex:1"></div>
            ${isManager?`<button class="btn btn-primary" onclick="NexCRM.Reports.openImportModal()">${Ic('upload',14)} Import more</button>`:''}
            ${isManager?`<button class="btn btn-ghost" onclick="NexCRM.Reports.openGenerateModal()">${Ic('tickets',14)} Generate tickets</button>`:''}
            <button class="btn btn-ghost" onclick="NexCRM.Reports.exportHistory()">${Ic('download',14)} Export filtered</button>
            ${isManager?`<button class="btn btn-ghost" style="color:var(--rose)" onclick="NexCRM.Reports.confirmClearHistory()">${Ic('trash',14)}</button>`:''}
          </div>

          <div class="card-flush">
            <div style="overflow-x:auto">
              <table class="data-table">
                <thead><tr>
                  <th>Ticket</th><th>Edit Date</th><th>Field / Event</th><th>Old Value</th><th>New Value</th>
                  <th>Edited By</th><th>Case Owner</th><th>Department</th><th>Category</th><th>Customer</th><th>Priority</th><th>Status</th>
                </tr></thead>
                <tbody>${bodyRows || `<tr><td colspan="12" style="padding:20px;text-align:center;color:var(--text-3)">No events match the current filters.</td></tr>`}</tbody>
              </table>
            </div>
            <div class="table-footer">
              <span class="text-muted">${filtered.length} event${filtered.length!==1?'s':''}${filtered.length>500?' (showing first 500)':''} · ${rows.length} total imported</span>
              <button class="btn btn-ghost btn-sm" onclick="NexCRM.Reports._clearHistoryFilters()">Clear filters</button>
            </div>
          </div>
        `}
      </div>`;

    const si=document.getElementById('hist-search');
    if(si&&_hq){const l=_hq.length;si.focus();try{si.setSelectionRange(l,l);}catch(e){}}
  }

  function _setHQ(v){_hq=v;renderHistory();}
  function _setHTicket(v){_hTicket=v;renderHistory();}
  function _setHField(v){_hField=v;renderHistory();}
  function _setHFrom(v){_hFrom=v;renderHistory();}
  function _setHTo(v){_hTo=v;renderHistory();}
  function _clearHistoryFilters(){_hq='';_hTicket='all';_hField='all';_hFrom='';_hTo='';renderHistory();}

  // ── Import modal ─────────────────────────────────────────────────────────
  function openImportModal() {
    const S=NexCRM.Utils, Ic=NexCRM.icon;
    _parsedImport=[];
    S.openModal('Import event log / case history',
      `<div style="margin-bottom:14px">
        <p style="font-size:13px;color:var(--s600);line-height:1.6;margin-bottom:10px">
          Upload a CSV export of your ticket change history. This is stored separately from your live tickets — it's for browsing historical case data, and does not modify or create any tickets in NexCRM.
        </p>
        <div style="background:var(--s50);border-radius:8px;padding:10px 12px;font-size:11px;font-family:monospace;color:var(--s700);overflow-x:auto;line-height:1.6">
          Ticket Number, Case Owner, Field / Event, Old Value, New Value, Edited By,<br>Edit Date, Created_Date, Closed_Date, Due_Date, Department, Customer,<br>Company, Category, Priority, Status
        </div>
      </div>
      <div class="form-field"><label>Select CSV file</label><input type="file" id="hist-csv-file" accept=".csv" class="input" onchange="NexCRM.Reports.previewImport(this)"></div>
      <div id="hist-csv-preview" style="margin-top:14px"></div>
      <div id="hist-import-mode" style="margin-top:14px;display:none">
        <label class="checkbox-label"><input type="checkbox" id="hist-append-mode" checked> Add to existing history (uncheck to replace all imported history)</label>
      </div>`,
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="hist-import-btn" onclick="NexCRM.Reports.importHistory()" disabled>${Ic('upload',13)} Import rows</button>`,'lg');
  }

  // Robust CSV parser — handles quoted fields containing commas
  function _parseCSVRaw(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    function splitLine(line) {
      const vals=[]; let inQ=false, cur='';
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur=''; }
        else cur += ch;
      }
      vals.push(cur.trim());
      return vals.map(v => v.replace(/^"|"$/g,''));
    }
    const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = splitLine(line);
      const obj = {};
      headers.forEach((h,i) => {
        const key = COL_MAP[h] || h.replace(/[^a-z0-9]/g,'');
        obj[key] = vals[i] || '';
      });
      return obj;
    }).filter(r => r.ticketNumber);
  }

  function previewImport(input) {
    const file = input.files[0]; if (!file) return;
    const S = NexCRM.Utils;
    const reader = new FileReader();
    reader.onload = e => {
      const rows = _parseCSVRaw(e.target.result);
      _parsedImport = rows;
      const preview = document.getElementById('hist-csv-preview');
      const btn = document.getElementById('hist-import-btn');
      const modeDiv = document.getElementById('hist-import-mode');
      if (!rows.length) {
        preview.innerHTML = `<p style="color:var(--rose);font-size:13px">No valid rows found. Check the file has a "Ticket Number" column.</p>`;
        btn.disabled = true; modeDiv.style.display='none'; return;
      }
      btn.disabled = false;
      modeDiv.style.display = NexCRM.Store.ImportedEvents.getAll().length ? 'block' : 'none';
      preview.innerHTML = `
        <div style="font-size:12px;color:var(--s600);margin-bottom:8px">${rows.length} event${rows.length!==1?'s':''} ready to import</div>
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:var(--s50)">${['Ticket','Field/Event','Old','New','Edited By'].map(h=>`<th style="padding:6px 9px;text-align:left;color:var(--s500);font-weight:600">${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.slice(0,8).map(r=>`<tr style="border-top:1px solid var(--s100)">
              <td style="padding:6px 9px;font-family:monospace;color:var(--primary)">${S.esc(r.ticketNumber)}</td>
              <td style="padding:6px 9px">${S.esc(r.field||'—')}</td>
              <td style="padding:6px 9px;color:var(--s600);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${S.esc(r.oldValue||'—')}</td>
              <td style="padding:6px 9px;color:var(--s600);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${S.esc(r.newValue||'—')}</td>
              <td style="padding:6px 9px;color:var(--s600)">${S.esc(r.editedBy||'—')}</td>
            </tr>`).join('')}
            ${rows.length>8?`<tr><td colspan="5" style="padding:6px 9px;text-align:center;color:var(--s400)">+${rows.length-8} more rows…</td></tr>`:''}</tbody>
          </table>
        </div>`;
    };
    reader.readAsText(file);
  }

  function importHistory() {
    if (!_parsedImport.length) return;
    const appendMode = document.getElementById('hist-append-mode')?.checked !== false;
    if (appendMode) NexCRM.Store.ImportedEvents.append(_parsedImport);
    else NexCRM.Store.ImportedEvents.replace(_parsedImport);
    const n = _parsedImport.length;
    _parsedImport = [];
    NexCRM.Utils.closeModal();
    NexCRM.toast(`${n} event${n!==1?'s':''} imported`, 'success');
    _repTab = 'history';
    render();
  }

  function confirmClearHistory() {
    NexCRM.Utils.confirm('Clear all imported case history? This only removes the imported event log — your live tickets are not affected.', () => {
      NexCRM.Store.ImportedEvents.clear();
      NexCRM.toast('Case history cleared', 'success');
      render();
    }, 'Clear history', 'danger');
  }

  function exportHistory() {
    const S = NexCRM.Utils;
    let rows = NexCRM.Store.ImportedEvents.getAll();
    if (_hq) { const q=_hq.toLowerCase(); rows = rows.filter(r => (r.ticketNumber||'').toLowerCase().includes(q) || (r.caseOwner||'').toLowerCase().includes(q) || (r.customer||'').toLowerCase().includes(q)); }
    if (_hTicket!=='all') rows = rows.filter(r=>r.ticketNumber===_hTicket);
    if (_hField!=='all')  rows = rows.filter(r=>r.field===_hField);
    if (_hFrom) rows = rows.filter(r=>r.editDate && r.editDate.slice(0,10) >= _hFrom);
    if (_hTo)   rows = rows.filter(r=>r.editDate && r.editDate.slice(0,10) <= _hTo);

    const out = rows.map(r => ({
      'Ticket Number':r.ticketNumber||'', 'Case Owner':r.caseOwner||'', 'Field / Event':r.field||'',
      'Old Value':r.oldValue||'', 'New Value':r.newValue||'', 'Edited By':r.editedBy||'',
      'Edit Date':r.editDate||'', 'Created_Date':r.createdDate||'', 'Closed_Date':r.closedDate||'',
      'Due_Date':r.dueDate||'', 'Department':r.department||'', 'Customer':r.customer||'',
      'Company':r.company||'', 'Category':r.category||'', 'Priority':r.priority||'', 'Status':r.status||'',
    }));
    S.exportCSV(out, 'nexcrm-case-history-export.csv');
    NexCRM.toast(`${out.length} events exported`, 'success');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATE TICKETS FROM IMPORTED EVENT LOG
  // ══════════════════════════════════════════════════════════════════════════

  function _tryParseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function _reverseLabel(cfgMap, label) {
    if (!label) return null;
    const target = label.trim().toLowerCase();
    const hit = Object.entries(cfgMap).find(([,v]) => v.l.toLowerCase() === target);
    return hit ? hit[0] : null;
  }

  // Groups imported rows by ticket number and works out, for each group,
  // what a reconstructed ticket + full change log would look like — without
  // writing anything yet. Used both for the preview and the real run.
  function _planGeneration() {
    const S = NexCRM.Utils;
    const rows = NexCRM.Store.ImportedEvents.getAll();
    const byTicket = {};
    rows.forEach(r => { (byTicket[r.ticketNumber] = byTicket[r.ticketNumber] || []).push(r); });

    const plan = {
      toCreate: [],       // [{number, ...resolved fields, changeLog}]
      skipExisting: [],   // ticket numbers already present as real tickets
      newCustomers: [],   // [{name, company}] to be auto-created
      unmatchedDepts: new Set(),
      unmatchedCats: new Set(),
      unmatchedAgents: new Set(),
    };

    for (const [number, group] of Object.entries(byTicket)) {
      if (NexCRM.Store.Tickets.get(number)) { plan.skipExisting.push(number); continue; }

      const sorted = [...group].sort((a,b) => (_tryParseDate(a.editDate)||0) - (_tryParseDate(b.editDate)||0));
      const latest = sorted[sorted.length - 1];
      const earliest = sorted[0];

      // Resolve department / category by name (case-insensitive)
      let departmentId = null;
      if (latest.department) {
        const d = NexCRM.Store.Departments.getAll().find(d => d.name.toLowerCase() === latest.department.trim().toLowerCase());
        if (d) departmentId = d.id; else plan.unmatchedDepts.add(latest.department.trim());
      }
      let categoryId = null;
      if (latest.category) {
        const c = NexCRM.Store.TicketCategories.getAll().find(c => c.name.toLowerCase() === latest.category.trim().toLowerCase());
        if (c) categoryId = c.id; else plan.unmatchedCats.add(latest.category.trim());
      }

      // Resolve or plan-create customer
      let customerId = null;
      if (latest.customer) {
        const existing = NexCRM.Store.Customers.getAll().find(c => c.name.toLowerCase() === latest.customer.trim().toLowerCase());
        if (existing) customerId = existing.id;
        else if (!plan.newCustomers.find(c => c.name.toLowerCase() === latest.customer.trim().toLowerCase()))
          plan.newCustomers.push({ name: latest.customer.trim(), company: latest.company||'' });
      }

      // Resolve assigned agent by name (Case Owner)
      let assignedToId = null;
      if (latest.caseOwner) {
        const u = NexCRM.Store.Users.getAll().find(u => u.name.toLowerCase() === latest.caseOwner.trim().toLowerCase());
        if (u) assignedToId = u.id; else plan.unmatchedAgents.add(latest.caseOwner.trim());
      }

      const status   = _reverseLabel(S.STATUS_CFG, latest.status) || 'new';
      const priority = _reverseLabel(S.PRIORITY_CFG, latest.priority) || 'medium';

      const createdAt = _tryParseDate(latest.createdDate) || _tryParseDate(earliest.editDate) || new Date();
      const closedAt  = _tryParseDate(latest.closedDate);
      const updatedAt = closedAt || _tryParseDate(latest.editDate) || createdAt;
      const dueDate    = _tryParseDate(latest.dueDate);

      const catName  = latest.category ? latest.category.trim() : '';
      const custName = latest.customer ? latest.customer.trim() : '';
      const subject  = catName && custName ? `${catName} — ${custName}`
                      : custName ? `Case for ${custName}`
                      : `Imported case ${number}`;
      const description = `Reconstructed from an imported event log on ${new Date().toLocaleDateString()}. Original ticket number: ${number}. ${group.length} historical event${group.length!==1?'s':''} imported.`;

      const changeLog = sorted.map(r => {
        const editor = NexCRM.Store.Users.getAll().find(u => u.name.toLowerCase() === (r.editedBy||'').trim().toLowerCase());
        return {
          id: NexCRM._uid(),
          timestamp: (_tryParseDate(r.editDate) || createdAt).toISOString(),
          editedById: editor ? editor.id : null,
          editedByName: !editor && r.editedBy ? r.editedBy.trim() : undefined,
          field: r.field || 'Update',
          oldValue: r.oldValue || '',
          newValue: r.newValue || '',
          oldRaw: null, newRaw: null,
        };
      });

      plan.toCreate.push({
        number, subject, description, status, priority,
        customerId, departmentId, categoryId, assignedToId,
        dueDate: dueDate ? dueDate.toISOString().slice(0,10) : null,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        changeLog,
        _pendingCustomerName: customerId ? null : custName,  // resolved at execute time if newly created
      });
    }

    return plan;
  }

  function openGenerateModal() {
    const S = NexCRM.Utils, Ic = NexCRM.icon;
    const plan = _planGeneration();

    if (!plan.toCreate.length && !plan.skipExisting.length) {
      S.openModal('Generate tickets', `<p style="font-size:13px;color:var(--text-2)">No imported event log found. Import a CSV first from the Case History tab.</p>`,
        `<button class="btn btn-primary" onclick="NexCRM.Utils.closeModal()">Close</button>`);
      return;
    }

    const warn = (label, set) => set.size ? `<div style="margin-top:8px"><span style="font-size:12px;font-weight:600;color:var(--amber)">${label}:</span> <span style="font-size:12px;color:var(--text-2)">${[...set].map(S.esc).join(', ')}</span></div>` : '';

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="stat-chip" style="background:var(--s50);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--primary)">${plan.toCreate.length}</div>
          <div style="font-size:11px;color:var(--text-3)">New tickets to create</div>
        </div>
        <div class="stat-chip" style="background:var(--s50);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--text-3)">${plan.skipExisting.length}</div>
          <div style="font-size:11px;color:var(--text-3)">Already exist — will skip</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--s600);line-height:1.6;margin-bottom:8px">
        Each ticket is rebuilt from its full event history: subject/description are inferred (log has no original subject field), current status/priority/category/department come from the most recent event, and the complete Change History table is reconstructed from every row.
      </p>
      ${plan.newCustomers.length ? `<div style="margin-top:10px"><span style="font-size:12px;font-weight:600;color:var(--primary)">${plan.newCustomers.length} new customer${plan.newCustomers.length!==1?'s':''} will be auto-created:</span> <span style="font-size:12px;color:var(--text-2)">${plan.newCustomers.map(c=>S.esc(c.name)).join(', ')}</span></div>` : ''}
      ${warn('Departments not found (left unassigned)', plan.unmatchedDepts)}
      ${warn('Categories not found (left unassigned)', plan.unmatchedCats)}
      ${warn('Agents not found (left unassigned)', plan.unmatchedAgents)}
    `;

    S.openModal('Generate tickets from event log', body,
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="NexCRM.Reports.runGeneration()" ${!plan.toCreate.length?'disabled':''}>${Ic('check_c',13)} Create ${plan.toCreate.length} ticket${plan.toCreate.length!==1?'s':''}</button>`, 'lg');
  }

  function runGeneration() {
    const plan = _planGeneration();
    let createdCustomers = 0, createdTickets = 0;

    // Create any missing customers first, so tickets can reference them
    const nameToId = {};
    for (const c of plan.newCustomers) {
      const created = NexCRM.Store.Customers.create({ name:c.name, company:c.company, email:'', phone:'', industry:'', status:'active', notes:'Auto-created while generating tickets from an imported event log.' });
      nameToId[c.name.toLowerCase()] = created.id;
      createdCustomers++;
    }

    for (const t of plan.toCreate) {
      let customerId = t.customerId;
      if (!customerId && t._pendingCustomerName) customerId = nameToId[t._pendingCustomerName.toLowerCase()] || null;
      const { _pendingCustomerName, ...ticketData } = t;
      const result = NexCRM.Store.Tickets.createFromImport({ ...ticketData, customerId, comments: [] });
      if (result) createdTickets++;
    }

    NexCRM.Utils.closeModal();
    NexCRM.toast(`${createdTickets} ticket${createdTickets!==1?'s':''} created${createdCustomers?`, ${createdCustomers} new customer${createdCustomers!==1?'s':''}`:''}`, 'success');
    location.hash = '#tickets';
  }

  function exportSummary() {
    const S=NexCRM.Utils;
    const tickets=NexCRM.Store.Tickets.getAll();
    const rows=tickets.map(t=>({
      'Ticket Number':t.number,'Subject':t.subject,'Status':S.STATUS_CFG[t.status]?.l||t.status,
      'Priority':S.PRIORITY_CFG[t.priority]?.l||t.priority,'Customer':S.customerName(t.customerId),
      'Department':S.departmentName(t.departmentId),'Category':S.categoryName(t.categoryId),
      'Assigned To':S.userName(t.assignedToId),'Created':S.fmtDate(t.createdAt),'Due':t.dueDate||'',
    }));
    S.exportCSV(rows,'nexcrm-tickets-report.csv');
    NexCRM.toast('Report exported','success');
  }

  function exportAgents() {
    const S=NexCRM.Utils;
    const tickets=NexCRM.Store.Tickets.getAll();
    const users=NexCRM.Store.Users.getAll().filter(u=>u.active);
    const rows=users.map(u=>{
      const ta=tickets.filter(t=>t.assignedToId===u.id);
      const res=ta.filter(t=>t.status==='resolved');
      const aMs=res.length?res.reduce((s,t)=>s+(new Date(t.updatedAt)-new Date(t.createdAt)),0)/res.length:null;
      const avgH=aMs?aMs/3600000:null;
      return{'Agent':u.name,'Role':u.role,'Total Assigned':ta.length,'Resolved':res.length,'Open':ta.filter(t=>['new','assigned','in_progress'].includes(t.status)).length,'Resolution Rate %':ta.length?Math.round((res.length/ta.length)*100):0,'Avg Resolution Hours':avgH?avgH.toFixed(1):'—'};
    });
    S.exportCSV(rows,'nexcrm-agent-performance.csv');
    NexCRM.toast('Agent report exported','success');
  }

  window.NexCRM.Reports={
    render, exportSummary, exportAgents,
    _setTab, renderAnalytics, renderHistory,
    _setHQ, _setHTicket, _setHField, _setHFrom, _setHTo, _clearHistoryFilters,
    openImportModal, previewImport, importHistory, confirmClearHistory, exportHistory,
    openGenerateModal, runGeneration,
  };
})();
