window.NexCRM = window.NexCRM || {};

(function () {
  let _tab = 'compliance';  // 'compliance' | 'rules'

  // ── SLA status calculator ──────────────────────────────────────────────────
  function slaStatus(ticket) {
    if (['resolved','closed'].includes(ticket.status)) {
      const closedAt = [...(ticket.changeLog||[])].reverse().find(cl=>['resolved','closed'].includes(cl.newRaw))?.timestamp;
      if (!ticket.dueDate || !closedAt) return { label:'Met', badge:'#ecfdf5', color:'#065f46', sort:0 };
      return new Date(closedAt) <= new Date(ticket.dueDate)
        ? { label:'Met on time', badge:'#ecfdf5', color:'#065f46', sort:0 }
        : { label:'Resolved late', badge:'#fffbeb', color:'#b45309', sort:2 };
    }
    if (!ticket.dueDate) return { label:'No SLA', badge:'#f1f5f9', color:'#475569', sort:5 };
    const h = (new Date(ticket.dueDate) - Date.now()) / 3600000;
    if (h < 0)  return { label:'Breached',  badge:'#fff1f2', color:'#be123c', sort:4, timeStr:`Overdue ${Math.abs(h).toFixed(1)}h` };
    if (h < 4)  return { label:'At Risk',   badge:'#fff7ed', color:'#c2410c', sort:3, timeStr:`${h.toFixed(1)}h left` };
    if (h < 24) return { label:'On Time',   badge:'#ecfdf5', color:'#065f46', sort:1, timeStr:`${h.toFixed(1)}h left` };
    return               { label:'On Time',   badge:'#ecfdf5', color:'#065f46', sort:1, timeStr:`${(h/24).toFixed(1)}d left` };
  }

  function render() {
    NexCRM.Layout.renderTopbar('SLA Management');
    NexCRM.Layout.renderSidebar('sla');
    const S=NexCRM.Utils, Ic=NexCRM.icon;
    const isAdmin=NexCRM.Auth.isAdmin(), isManager=NexCRM.Auth.isManager();
    const tickets=NexCRM.Store.Tickets.getAll();
    const settings=NexCRM.Store.Settings.get();
    const rules=settings.slaRules||{critical:{firstResponse:1,resolution:4},high:{firstResponse:4,resolution:8},medium:{firstResponse:8,resolution:24},low:{firstResponse:24,resolution:72}};

    // Summary
    const open=tickets.filter(t=>!['resolved','closed'].includes(t.status));
    const smap={met:0,on_time:0,at_risk:0,breached:0,no_sla:0};
    const allWithSLA=tickets.filter(t=>t.dueDate||['resolved','closed'].includes(t.status));
    allWithSLA.forEach(t=>{const s=slaStatus(t);if(s.label.startsWith('Met')||s.label==='On Time')smap.on_time++;else if(s.label==='At Risk')smap.at_risk++;else if(s.label==='Breached'||s.label==='Resolved late')smap.breached++;else smap.no_sla++;});
    const compPct=allWithSLA.length?Math.round((smap.on_time/allWithSLA.length)*100):100;

    // Tab headers
    const tabs=`<div style="display:flex;gap:2px;background:var(--s100);border-radius:10px;padding:3px;width:fit-content">
      <button onclick="NexCRM.SLA._tab('compliance')" id="tab-comp" class="btn btn-sm" style="${_tab==='compliance'?'background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,0.08)':'color:var(--text-2);background:transparent'}">SLA Compliance</button>
      <button onclick="NexCRM.SLA._tab('rules')" id="tab-rules" class="btn btn-sm" style="${_tab==='rules'?'background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,0.08)':'color:var(--text-2);background:transparent'}">SLA Rules</button>
    </div>`;

    // Summary row
    const summary=`<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px">
      <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#10b98115;color:#10b981">${Ic('check_c',18)}</div></div><div><div class="kpi-value">${compPct}%</div><div class="kpi-label">SLA Compliance</div></div></div>
      <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#10b98115;color:#10b981">${Ic('check_c',18)}</div></div><div><div class="kpi-value">${smap.on_time}</div><div class="kpi-label">On Time / Met</div></div></div>
      <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#f59e0b15;color:#f59e0b">${Ic('alert_c',18)}</div></div><div><div class="kpi-value">${smap.at_risk}</div><div class="kpi-label">At Risk</div></div></div>
      <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#f43f5e15;color:#f43f5e">${Ic('alert_t',18)}</div></div><div><div class="kpi-value">${smap.breached}</div><div class="kpi-label">Breached</div></div></div>
      <div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#94a3b815;color:#94a3b8">${Ic('tickets',18)}</div></div><div><div class="kpi-value">${open.length}</div><div class="kpi-label">Open tickets</div></div></div>
    </div>`;

    let content='';
    if(_tab==='compliance'){
      // All tickets with SLA status
      const sorted=[...tickets].map(t=>({t,s:slaStatus(t)})).sort((a,b)=>b.s.sort-a.s.sort);
      const rows=sorted.map(({t,s})=>{
        const dep=NexCRM.Store.Departments.get(t.departmentId);
        const cat=NexCRM.Store.TicketCategories.get(t.categoryId);
        return`<tr class="table-row" onclick="location.hash='#tickets/${t.number}'">
          <td class="td-mono">${t.number}</td>
          <td><div class="cell-title">${S.esc(t.subject)}</div><div class="cell-sub">${S.esc(S.customerName(t.customerId))}</div></td>
          <td>${S.priorityBadge(t.priority)}</td>
          <td>${S.statusBadge(t.status)}</td>
          <td>${cat?`<span class="badge" style="background:${cat.color}18;color:${cat.color}">${S.esc(cat.name)}</span>`:'—'}</td>
          <td>${dep?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px"><div style="width:7px;height:7px;border-radius:50%;background:${dep.color}"></div>${S.esc(dep.name)}</span>`:'—'}</td>
          <td class="td-sm">${t.dueDate||'—'}</td>
          <td><span class="badge" style="background:${s.badge};color:${s.color}">${s.label}</span></td>
          <td class="td-sm">${s.timeStr||''}</td>
        </tr>`;
      }).join('');
      content=`<div class="card-flush">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span class="card-title">All tickets — SLA status</span>
          <button class="btn btn-ghost btn-sm" onclick="NexCRM.SLA.exportSLA()">${Ic('download',13)} Export SLA report</button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Category</th><th>Department</th><th>Due Date</th><th>SLA Status</th><th>Time</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    } else {
      // Rules configuration
      const prioColors={critical:'#f43f5e',high:'#f97316',medium:'#f59e0b',low:'#10b981'};
      const rulesHtml=Object.entries(rules).map(([priority,r])=>`
        <tr>
          <td>${S.priorityBadge(priority)}</td>
          <td>
            ${(isAdmin||isManager)?`<div style="display:flex;align-items:center;gap:6px"><input type="number" id="sla-fr-${priority}" class="input-sm" value="${r.firstResponse}" min="1" style="width:60px"> <span class="text-muted">hours</span></div>`:`<span class="td-sm">${r.firstResponse}h</span>`}
          </td>
          <td>
            ${(isAdmin||isManager)?`<div style="display:flex;align-items:center;gap:6px"><input type="number" id="sla-res-${priority}" class="input-sm" value="${r.resolution}" min="1" style="width:60px"> <span class="text-muted">hours</span></div>`:`<span class="td-sm">${r.resolution}h</span>`}
          </td>
          <td class="td-sm">${r.firstResponse < 1?`${r.firstResponse*60}m`:r.firstResponse+'h'}</td>
          <td class="td-sm">${r.resolution < 24?r.resolution+'h':(r.resolution/24).toFixed(1)+'d'}</td>
        </tr>`).join('');

      content=`<div class="card-flush">
        <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div><div class="card-title">SLA Rules</div><div class="text-muted" style="font-size:12px;margin-top:2px">Define first response and resolution targets per priority level</div></div>
          ${(isAdmin||isManager)?`<button class="btn btn-primary btn-sm" onclick="NexCRM.SLA.saveRules()">${Ic('check_c',13)} Save rules</button>`:''}
        </div>
        <table class="data-table">
          <thead><tr><th>Priority</th><th>First Response Target</th><th>Resolution Target</th><th>Response (display)</th><th>Resolution (display)</th></tr></thead>
          <tbody>${rulesHtml}</tbody>
        </table>
        <div style="padding:14px 22px;border-top:1px solid var(--border);font-size:12px;color:var(--text-3)">
          ${Ic('alert_c',13)} SLA breach is determined by the ticket <strong>Due Date</strong>. Set the due date when creating a ticket to track SLA compliance.
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:12px">How SLA tracking works</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">Status definitions</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;gap:8px"><span class="badge" style="background:#ecfdf5;color:#065f46">On Time</span><span class="text-muted" style="font-size:12px">More than 4h remaining before due date</span></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="badge" style="background:#fff7ed;color:#c2410c">At Risk</span><span class="text-muted" style="font-size:12px">Less than 4h remaining</span></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="badge" style="background:#fff1f2;color:#be123c">Breached</span><span class="text-muted" style="font-size:12px">Past the due date and still open</span></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="badge" style="background:#ecfdf5;color:#065f46">Met</span><span class="text-muted" style="font-size:12px">Resolved before due date</span></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="badge" style="background:#fffbeb;color:#b45309">Resolved late</span><span class="text-muted" style="font-size:12px">Resolved but after due date</span></div>
            </div>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">Best practices</div>
            <ul style="font-size:12px;color:var(--text-2);line-height:1.8;padding-left:16px">
              <li>Set the Due Date on every ticket at creation time</li>
              <li>Use the Priority to indicate urgency — Critical issues need a short due date</li>
              <li>Check the SLA Compliance tab daily for breached or at-risk tickets</li>
              <li>Export the SLA report weekly for stakeholder updates</li>
            </ul>
          </div>
        </div>
      </div>`;
    }

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        ${tabs}
        ${summary}
        ${content}
      </div>`;
  }

  function _tab(t){ _tab=t; render(); }

  function saveRules() {
    const priorities=['critical','high','medium','low'];
    const slaRules={};
    for(const p of priorities){
      const fr=parseInt(document.getElementById(`sla-fr-${p}`)?.value)||1;
      const res=parseInt(document.getElementById(`sla-res-${p}`)?.value)||4;
      slaRules[p]={firstResponse:fr,resolution:res};
    }
    NexCRM.Store.Settings.update({slaRules});
    NexCRM.toast('SLA rules saved','success');
    render();
  }

  function exportSLA() {
    const S=NexCRM.Utils;
    const tickets=NexCRM.Store.Tickets.getAll();
    const rows=tickets.map(t=>{
      const s=slaStatus(t);
      const dep=NexCRM.Store.Departments.get(t.departmentId);
      const cat=NexCRM.Store.TicketCategories.get(t.categoryId);
      return{
        'Ticket Number':t.number,'Subject':t.subject,'Priority':S.PRIORITY_CFG[t.priority]?.l||t.priority,
        'Status':S.STATUS_CFG[t.status]?.l||t.status,'Customer':S.customerName(t.customerId),
        'Department':dep?.name||'','Category':cat?.name||'',
        'Assigned To':S.userName(t.assignedToId),'Created Date':S.fmtDate(t.createdAt),
        'Due Date':t.dueDate||'','SLA Status':s.label,'Time Remaining':s.timeStr||'',
      };
    });
    S.exportCSV(rows,'nexcrm-sla-report.csv');
    NexCRM.toast('SLA report exported','success');
  }

  window.NexCRM.SLA={render,_tab,saveRules,exportSLA};
})();
