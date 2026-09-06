window.NexCRM = window.NexCRM || {};

(function () {
  function render() {
    NexCRM.Layout.renderTopbar('Reports & Analytics');
    NexCRM.Layout.renderSidebar('reports');
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div><p class="text-muted" style="font-size:13px">All metrics calculated from live case data</p></div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="NexCRM.Reports.exportSummary()">${Ic('download',13)} Export report</button>
            <button class="btn btn-ghost btn-sm" onclick="NexCRM.Tickets.exportEventLog(null)">${Ic('file',13)} Export event log</button>
          </div>
        </div>

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

  window.NexCRM.Reports={render,exportSummary,exportAgents};
})();
