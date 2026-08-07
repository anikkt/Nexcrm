window.NexCRM = window.NexCRM || {};

(function () {
  function render() {
    NexCRM.Layout.renderTopbar('Dashboard');
    NexCRM.Layout.renderSidebar();
    const S = NexCRM.Utils;
    const tickets   = NexCRM.Store.Tickets.getAll();
    const customers = NexCRM.Store.Customers.getAll();

    const open     = tickets.filter(t => ['new','assigned','in_progress'].includes(t.status)).length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const critical = tickets.filter(t => t.priority === 'critical' && !['resolved','closed'].includes(t.status)).length;

    const pipeline = [
      { s:'New',         n: tickets.filter(t=>t.status==='new').length,         c:'#6366f1' },
      { s:'Assigned',    n: tickets.filter(t=>t.status==='assigned').length,     c:'#06b6d4' },
      { s:'In Progress', n: tickets.filter(t=>t.status==='in_progress').length,  c:'#8b5cf6' },
      { s:'Pending',     n: tickets.filter(t=>t.status==='pending').length,      c:'#f59e0b' },
      { s:'Resolved',    n: tickets.filter(t=>t.status==='resolved').length,     c:'#10b981' },
      { s:'Closed',      n: tickets.filter(t=>t.status==='closed').length,       c:'#94a3b8' },
    ];
    const pTotal = Math.max(pipeline.reduce((a,p)=>a+p.n,0), 1);
    pipeline.forEach(p => p.w = Math.max(Math.round((p.n/pTotal)*100), p.n > 0 ? 1 : 0));

    const pipelineBar = pipeline.map(p =>
      `<div title="${p.s}: ${p.n}" style="flex:${Math.max(p.w,p.n>0?1:0)};background:${p.c};display:flex;align-items:center;justify-content:center;min-width:${p.n>0?'2%':'0'}">
        ${p.w > 8 ? `<span style="font-size:10px;font-weight:700;color:#fff">${p.n}</span>` : ''}
      </div>`
    ).join('');

    const pipelineLegend = pipeline.map(p =>
      `<div style="display:flex;align-items:center;gap:4px">
        <div style="width:7px;height:7px;border-radius:50%;background:${p.c}"></div>
        <span class="text-muted" style="font-size:11px">${p.s}</span>
        <span style="font-size:11px;font-weight:600;color:var(--s700)">${p.n}</span>
      </div>`
    ).join('');

    const prioData = [
      { n:'Critical', v:tickets.filter(t=>t.priority==='critical').length, c:'#f43f5e' },
      { n:'High',     v:tickets.filter(t=>t.priority==='high').length,     c:'#f97316' },
      { n:'Medium',   v:tickets.filter(t=>t.priority==='medium').length,   c:'#f59e0b' },
      { n:'Low',      v:tickets.filter(t=>t.priority==='low').length,      c:'#10b981' },
    ];
    const prioTotal = Math.max(prioData.reduce((a,p)=>a+p.v,0),1);
    const prioItems = prioData.map(p =>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0">
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div>
          <span class="text-muted" style="font-size:12px">${p.n}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:60px;height:4px;background:var(--s100);border-radius:3px;overflow:hidden">
            <div style="height:100%;background:${p.c};border-radius:3px;width:${Math.round((p.v/prioTotal)*100)}%"></div>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--s700);width:22px;text-align:right">${p.v}</span>
        </div>
      </div>`
    ).join('');

    const recentTickets = [...tickets].reverse().slice(0, 5).map(t =>
      `<div class="recent-ticket-row" onclick="location.hash='#tickets/${t.number}'">
        <div style="flex:1;min-width:0">
          <div class="cell-title">${S.esc(t.subject)}</div>
          <div class="text-muted" style="font-size:11px;margin-top:1px">${t.number} · ${S.esc(S.customerName(t.customerId))}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">${S.priorityBadge(t.priority)}${S.statusBadge(t.status)}</div>
      </div>`
    ).join('') || `<div class="empty-state-sm">No tickets yet. <a href="#tickets" class="link">Create one →</a></div>`;

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-icon" style="background:#6366f118">🎫</div><div class="kpi-value">${tickets.length}</div><div class="kpi-label">Total tickets</div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:#f59e0b18">⚠️</div><div class="kpi-value">${open}</div><div class="kpi-label">Open</div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:#10b98118">✅</div><div class="kpi-value">${resolved}</div><div class="kpi-label">Resolved</div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:#f43f5e18">🚨</div><div class="kpi-value">${critical}</div><div class="kpi-label">Critical</div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:#06b6d418">👥</div><div class="kpi-value">${customers.length}</div><div class="kpi-label">Customers</div></div>
        </div>

        <div class="card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
            <div><div class="card-title">Ticket pipeline</div><div class="text-muted" style="font-size:11px;margin-top:2px">Live distribution across lifecycle stages</div></div>
            <span class="text-muted" style="font-size:12px">${tickets.length} total</span>
          </div>
          <div style="display:flex;gap:2px;height:26px;border-radius:8px;overflow:hidden">${pipelineBar}</div>
          <div style="display:flex;gap:14px;margin-top:10px;flex-wrap:wrap">${pipelineLegend}</div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title" style="margin-bottom:14px">Recent tickets</div>
            ${recentTickets}
            <a href="#tickets" class="link" style="font-size:12px;margin-top:10px;display:block">View all →</a>
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:12px">By priority</div>
            ${prioItems}
            <div style="border-top:1px solid var(--s100);padding-top:14px;margin-top:12px">
              <div class="card-title" style="font-size:13px;margin-bottom:8px">Quick actions</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                <button class="quick-action-btn" style="--qa-color:#6366f1" onclick="NexCRM.Tickets.openCreateModal()">+ New ticket</button>
                <button class="quick-action-btn" style="--qa-color:#06b6d4" onclick="NexCRM.Customers.openCreateModal()">+ Customer</button>
                <a href="#tickets"   class="quick-action-btn" style="--qa-color:#8b5cf6">🎫 All tickets</a>
                <a href="#customers" class="quick-action-btn" style="--qa-color:#10b981">👥 Customers</a>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  window.NexCRM.Dashboard = { render };
})();
