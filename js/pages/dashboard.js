window.NexCRM = window.NexCRM || {};

(function () {
  // ── Smooth SVG line chart ──────────────────────────────────────────────────
  function lineChart(data) {
    const W=500, H=200, ml=30, mr=12, mt=10, mb=28;
    const iW=W-ml-mr, iH=H-mt-mb, maxV=26;
    const x=(i)=>ml+i/(data.length-1)*iW;
    const y=(v)=>mt+(1-v/maxV)*iH;
    function bez(vals){
      const pts=vals.map((v,i)=>[x(i),y(v)]);
      let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for(let i=1;i<pts.length;i++){const cx=(pts[i-1][0]+pts[i][0])/2;d+=` C${cx.toFixed(1)} ${pts[i-1][1].toFixed(1)},${cx.toFixed(1)} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;}
      return d;
    }
    function area(vals){
      const pts=vals.map((v,i)=>[x(i),y(v)]);const base=mt+iH;
      let d=`M${pts[0][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for(let i=1;i<pts.length;i++){const cx=(pts[i-1][0]+pts[i][0])/2;d+=` C${cx.toFixed(1)} ${pts[i-1][1].toFixed(1)},${cx.toFixed(1)} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;}
      d+=` L${pts[pts.length-1][0].toFixed(1)} ${base} Z`;
      return d;
    }
    const grids=[0,6,12,18,24].map(v=>{
      const yv=y(v).toFixed(1);
      return `<line x1="${ml}" y1="${yv}" x2="${W-mr}" y2="${yv}" stroke="#f1f5f9" stroke-width="1"/>
              <text x="${ml-4}" y="${(parseFloat(yv)+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;
    }).join('');
    const xlabels=data.map((d,i)=>`<text x="${x(i).toFixed(1)}" y="${H-5}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.d}</text>`).join('');
    const cV=data.map(d=>d.c), rV=data.map(d=>d.r);
    return `<svg width="100%" height="200" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lgc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.18"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/></linearGradient>
        <linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.01"/></linearGradient>
      </defs>
      ${grids}${xlabels}
      <path d="${area(cV)}" fill="url(#lgc)"/>
      <path d="${area(rV)}" fill="url(#lgr)"/>
      <path d="${bez(cV)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/>
      <path d="${bez(rV)}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  }

  function render() {
    NexCRM.Layout.renderTopbar('Dashboard');
    NexCRM.Layout.renderSidebar();
    const S = NexCRM.Utils;
    const I = NexCRM.icon;
    const tickets   = NexCRM.Store.Tickets.getAll();
    const customers = NexCRM.Store.Customers.getAll();

    const open     = tickets.filter(t => ['new','assigned','in_progress'].includes(t.status)).length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const critical = tickets.filter(t => t.priority === 'critical' && !['resolved','closed'].includes(t.status)).length;

    // ── KPI cards ──────────────────────────────────────────────────────────
    const kpis = [
      { label:'Total Tickets',   value: tickets.length, delta:'+12% this week',    up:true,  iname:'ticket_k', accent:'#6366f1' },
      { label:'Open Tickets',    value: open,           delta:'-3 from yesterday', up:true,  iname:'alert_c',  accent:'#f59e0b' },
      { label:'Resolved Today',  value: resolved,       delta:'+4 vs avg',         up:true,  iname:'check_c',  accent:'#10b981' },
      { label:'Critical',        value: critical,       delta:'+2 new',            up:false, iname:'alert_t',  accent:'#f43f5e' },
    ];
    const kpiHtml = kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-icon" style="background:${k.accent}15;color:${k.accent}">${I(k.iname,18)}</div>
          <span class="kpi-delta ${k.up?'up':'down'}">${k.up?I('arrow_up',12):I('arrow_dn',12)} ${k.delta}</span>
        </div>
        <div><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div>
      </div>`).join('');

    // ── Pipeline ────────────────────────────────────────────────────────────
    const pipeline = [
      { s:'New',         n: tickets.filter(t=>t.status==='new').length,        c:'#6366f1' },
      { s:'Assigned',    n: tickets.filter(t=>t.status==='assigned').length,    c:'#06b6d4' },
      { s:'In Progress', n: tickets.filter(t=>t.status==='in_progress').length, c:'#8b5cf6' },
      { s:'Pending',     n: tickets.filter(t=>t.status==='pending').length,     c:'#f59e0b' },
      { s:'Resolved',    n: tickets.filter(t=>t.status==='resolved').length,    c:'#10b981' },
      { s:'Closed',      n: tickets.filter(t=>t.status==='closed').length,      c:'#94a3b8' },
    ];
    const pTotal = Math.max(pipeline.reduce((a,p)=>a+p.n,0),1);
    pipeline.forEach(p=>p.w=Math.max(Math.round((p.n/pTotal)*100),p.n>0?1:0));
    const pBar = pipeline.map(p=>`<div title="${p.s}: ${p.n}" style="flex:${Math.max(p.w,p.n>0?1:0)};background:${p.c};display:flex;align-items:center;justify-content:center">${p.w>8?`<span style="font-size:11px;font-weight:700;color:#fff">${p.n}</span>`:''}</div>`).join('');
    const pLeg = pipeline.map(p=>`<div style="display:flex;align-items:center;gap:5px"><div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div><span style="font-size:12px;color:var(--s500)">${p.s}</span><span style="font-size:12px;font-weight:600;color:var(--s700)">${p.n}</span></div>`).join('');

    // ── Priority donut ──────────────────────────────────────────────────────
    const prioData=[
      {n:'Critical',v:tickets.filter(t=>t.priority==='critical').length||12,c:'#f43f5e'},
      {n:'High',    v:tickets.filter(t=>t.priority==='high').length||28,    c:'#f97316'},
      {n:'Medium',  v:tickets.filter(t=>t.priority==='medium').length||45,  c:'#f59e0b'},
      {n:'Low',     v:tickets.filter(t=>t.priority==='low').length||31,     c:'#10b981'},
    ];
    const prioTotal=Math.max(prioData.reduce((a,p)=>a+p.v,0),1);
    let offset=25; const circ=2*Math.PI*38;
    const donutSlices=prioData.map(p=>{
      const pct=p.v/prioTotal; const dash=pct*circ;
      const el=`<circle cx="50" cy="50" r="38" fill="none" stroke="${p.c}" stroke-width="14" stroke-dasharray="${dash.toFixed(1)} ${(circ-dash).toFixed(1)}" stroke-dashoffset="-${((offset/100)*circ).toFixed(1)}"/>`;
      offset+=pct*100; return el;
    }).join('');
    const prioLegend=prioData.map(p=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0"><div style="display:flex;align-items:center;gap:7px"><div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div><span style="font-size:12px;color:var(--s600)">${p.n}</span></div><span style="font-size:12px;font-weight:600;color:var(--s700)">${p.v}</span></div>`).join('');

    // ── Weekly data ──────────────────────────────────────────────────────────
    const weekly=[{d:'Mon',c:12,r:9},{d:'Tue',c:18,r:14},{d:'Wed',c:8,r:11},{d:'Thu',c:22,r:16},{d:'Fri',c:15,r:19},{d:'Sat',c:5,r:7},{d:'Sun',c:3,r:4}];

    // ── Recent tickets ───────────────────────────────────────────────────────
    const recentTickets = [...tickets].reverse().slice(0,4).map(t=>
      `<div class="recent-ticket-row" onclick="location.hash='#tickets/${t.number}'">
        <div style="flex:1;min-width:0">
          <div class="cell-title">${S.esc(t.subject)}</div>
          <div class="text-muted" style="font-size:11px;margin-top:1px">${t.number} · ${S.esc(S.customerName(t.customerId))}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${S.priorityBadge(t.priority)}${S.statusBadge(t.status)}</div>
      </div>`
    ).join('') || `<div class="empty-state-sm">No tickets yet. <a href="#tickets" class="link">Create one →</a></div>`;

    // ── Activity feed ────────────────────────────────────────────────────────
    const activities = [
      { text:'TK-007 escalated to Critical',    time:'2m ago',  c:'#f43f5e' },
      { text:'New customer: CloudPath added',   time:'18m ago', c:'#6366f1' },
      { text:'TK-005 resolved by Dev Team',     time:'1h ago',  c:'#10b981' },
      { text:'TK-004 assigned to Alex Chen',    time:'2h ago',  c:'#06b6d4' },
    ];
    const actHtml = activities.map(a=>`
      <div class="activity-item">
        <div class="activity-dot" style="background:${a.c}"></div>
        <div><div style="font-size:13px;color:var(--s700);font-weight:500">${S.esc(a.text)}</div><div style="font-size:11px;color:var(--s400);margin-top:2px">${a.time}</div></div>
      </div>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-body">
        <div class="kpi-grid">${kpiHtml}</div>

        <div class="card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
            <div><div class="card-title">Ticket pipeline</div><div class="text-muted" style="font-size:12px;margin-top:2px">Live distribution across lifecycle stages</div></div>
            <span class="text-muted" style="font-size:12px">${tickets.length} total</span>
          </div>
          <div style="display:flex;gap:3px;height:28px;border-radius:8px;overflow:hidden">${pBar}</div>
          <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">${pLeg}</div>
        </div>

        <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;width:100%">
          <div class="card">
            <div class="card-title" style="margin-bottom:3px">Weekly trend</div>
            <div class="text-muted" style="font-size:12px;margin-bottom:14px">Tickets created vs. resolved</div>
            ${lineChart(weekly)}
            <div style="display:flex;gap:16px;margin-top:10px">
              <div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#6366f1;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Created</span></div>
              <div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#10b981;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Resolved</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:3px">By priority</div>
            <div class="text-muted" style="font-size:12px;margin-bottom:10px">${prioTotal} open tickets</div>
            <div style="display:flex;justify-content:center;margin-bottom:12px">
              <svg width="100" height="100" viewBox="0 0 100 100">${donutSlices}
                <text x="50" y="46" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a">${prioTotal}</text>
                <text x="50" y="60" text-anchor="middle" font-size="10" fill="#94a3b8">tickets</text>
              </svg>
            </div>
            ${prioLegend}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%">
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <div class="card-title">Recent tickets</div>
              <a href="#tickets" class="link" style="font-size:12px;font-weight:500">View all →</a>
            </div>
            ${recentTickets}
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:16px">Activity feed</div>
            ${actHtml}
            <div style="border-top:1px solid var(--s100);padding-top:14px;margin-top:6px">
              <div style="font-size:14px;font-weight:700;color:var(--s800);margin-bottom:10px">Quick actions</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="quick-action-btn" style="--qa-color:#6366f1" onclick="NexCRM.Tickets.openCreateModal()">${I('plus',14)} New ticket</button>
                <button class="quick-action-btn" style="--qa-color:#06b6d4" onclick="NexCRM.Customers.openCreateModal()">${I('plus',14)} Customer</button>
                <a href="#tickets" class="quick-action-btn" style="--qa-color:#8b5cf6">${I('search',14)} Search</a>
                <a href="#customers" class="quick-action-btn" style="--qa-color:#10b981">${I('barchart',14)} Reports</a>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  window.NexCRM.Dashboard = { render };
})();
