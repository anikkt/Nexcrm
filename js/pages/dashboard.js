window.NexCRM = window.NexCRM || {};

(function () {

  // ── Built-in widget registry ────────────────────────────────────────────────
  const WIDGETS = {
    kpis:        { title:'KPI Cards',          icon:'barchart',  desc:'Total, Open, Resolved, Critical, Avg Time', size:'full' },
    pipeline:    { title:'Ticket Pipeline',    icon:'tickets',   desc:'Live lifecycle distribution bar',            size:'full' },
    trend:       { title:'Weekly Trend',       icon:'trending',  desc:'Created vs resolved — line chart',           size:'half' },
    priority:    { title:'By Priority',        icon:'alert_t',   desc:'Priority breakdown donut chart',             size:'half' },
    by_category: { title:'By Category',        icon:'barchart',  desc:'Ticket count per category',                  size:'half' },
    by_dept:     { title:'By Department',      icon:'layers',    desc:'Ticket count per department',                size:'half' },
    recent:      { title:'Recent Tickets',     icon:'tickets',   desc:'Latest 4 tickets',                           size:'half' },
    activity:    { title:'Activity Feed',      icon:'bell',      desc:'Real events from tickets & customers',       size:'half' },
    agent_perf:  { title:'Agent Performance',  icon:'users',     desc:'Tickets handled per agent',                  size:'full' },
    sla_snap:    { title:'SLA Snapshot',       icon:'check_c',   desc:'Open ticket SLA compliance',                 size:'half' },
  };
  const DEFAULT_LAYOUT = ['kpis','pipeline','trend+priority','by_category+by_dept','recent+activity'];
  const getLayout  = () => {try{return JSON.parse(localStorage.getItem('ncm_dash_l'))||[...DEFAULT_LAYOUT];}catch{return[...DEFAULT_LAYOUT];}};
  const saveLayout = l => localStorage.setItem('ncm_dash_l',JSON.stringify(l));
  const getHidden  = () => {try{return JSON.parse(localStorage.getItem('ncm_dash_h'))||[];}catch{return[];}};
  const saveHidden = h => localStorage.setItem('ncm_dash_h',JSON.stringify(h));

  // ── Custom widget storage ───────────────────────────────────────────────────
  const getCustomWidgets  = () => {try{return JSON.parse(localStorage.getItem('ncm_custom_widgets'))||[];}catch{return[];}};
  const saveCustomWidgets = arr => localStorage.setItem('ncm_custom_widgets',JSON.stringify(arr));

  let _edit=false, _drag=null;

  // ── Palettes ───────────────────────────────────────────────────────────────
  const STATUS_COLORS  ={new:'#6366f1',assigned:'#06b6d4',in_progress:'#8b5cf6',pending:'#f59e0b',resolved:'#10b981',closed:'#94a3b8'};
  const PRIORITY_COLORS={low:'#10b981',medium:'#f59e0b',high:'#f97316',critical:'#f43f5e'};
  const CYCLE_PALETTE=['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#0369a1','#15803d'];

  // ── SVG line chart with hover tooltips ──────────────────────────────────────
  function lineChart(data) {
    const W=500,H=185,ml=32,mr=10,mt=8,mb=26,iW=W-ml-mr,iH=H-mt-mb;
    const maxRaw=Math.max(...data.flatMap(d=>[d.c,d.r]),1);
    const maxV=Math.ceil(maxRaw*1.3)||5;
    const x=i=>ml+i/(data.length-1)*iW, y=v=>mt+(1-v/maxV)*iH;
    function bez(vals){const pts=vals.map((v,i)=>[x(i),y(v)]);let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;for(let i=1;i<pts.length;i++){const cx=(pts[i-1][0]+pts[i][0])/2;d+=` C${cx.toFixed(1)} ${pts[i-1][1].toFixed(1)},${cx.toFixed(1)} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;}return d;}
    function area(vals){const pts=vals.map((v,i)=>[x(i),y(v)]);const base=mt+iH;let d=`M${pts[0][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;for(let i=1;i<pts.length;i++){const cx=(pts[i-1][0]+pts[i][0])/2;d+=` C${cx.toFixed(1)} ${pts[i-1][1].toFixed(1)},${cx.toFixed(1)} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;}d+=` L${pts[pts.length-1][0].toFixed(1)} ${base} Z`;return d;}
    const ticks=[0,Math.round(maxV*.33),Math.round(maxV*.67),maxV];
    const grids=ticks.map(v=>{const yv=y(v).toFixed(1);return`<line x1="${ml}" y1="${yv}" x2="${W-mr}" y2="${yv}" stroke="#e2e8f0" stroke-width="1"/><text x="${ml-4}" y="${(parseFloat(yv)+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;}).join('');
    const xlabels=data.map((d,i)=>`<text x="${x(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.d}</text>`).join('');
    const step=iW/(data.length-1);
    const hover=data.map((d,i)=>{const bx=Math.max(ml,x(i)-step/2),bw=Math.min(step,W-mr-bx);return`<rect x="${bx.toFixed(1)}" y="${mt}" width="${bw.toFixed(1)}" height="${iH}" fill="transparent" style="cursor:crosshair" onmouseover="NexCRM.Dashboard._tip(event,'${d.d}',${d.c},${d.r})" onmousemove="NexCRM.Dashboard._tipM(event)" onmouseout="NexCRM.Dashboard._tipH()"/>`;}).join('');
    const cV=data.map(d=>d.c),rV=data.map(d=>d.r);
    return`<div id="cwrap" style="position:relative"><svg width="100%" height="185" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="lgc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.18"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/></linearGradient><linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.01"/></linearGradient></defs>${grids}${xlabels}<path d="${area(cV)}" fill="url(#lgc)"/><path d="${area(rV)}" fill="url(#lgr)"/><path d="${bez(cV)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/><path d="${bez(rV)}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>${hover}</svg><div id="ctip" class="chart-tooltip"></div></div>`;
  }
  function _tip(e,d,c,r){const t=document.getElementById('ctip');if(!t)return;t.innerHTML=`<div style="font-weight:700;color:var(--text);font-size:12px;margin-bottom:6px">${d}</div><div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#6366f1;margin-bottom:3px"><div style="width:7px;height:7px;border-radius:50%;background:#6366f1"></div>Created: <strong>${c}</strong></div><div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#10b981"><div style="width:7px;height:7px;border-radius:50%;background:#10b981"></div>Resolved: <strong>${r}</strong></div>`;t.style.display='block';_tipM(e);}
  function _tipM(e){const t=document.getElementById('ctip'),w=document.getElementById('cwrap');if(!t||!w)return;const r=w.getBoundingClientRect();let left=e.clientX-r.left+12,top=e.clientY-r.top-72;if(left+155>w.offsetWidth)left-=170;if(top<0)top=5;t.style.left=left+'px';t.style.top=top+'px';}
  function _tipH(){const t=document.getElementById('ctip');if(t)t.style.display='none';}

  // ── Data helpers ───────────────────────────────────────────────────────────
  function weeklyData(tickets){
    if(!tickets.length)return Array(7).fill(0).map((_,i)=>({d:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],c:0,r:0}));
    const dates=tickets.flatMap(t=>[t.createdAt,t.updatedAt]).filter(Boolean).sort();
    const anchor=new Date(dates[dates.length-1]);
    return Array.from({length:7},(_,i)=>{const d=new Date(anchor);d.setDate(d.getDate()-(6-i));const ds=d.toISOString().slice(0,10);return{d:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],c:tickets.filter(t=>(t.createdAt||'').slice(0,10)===ds).length,r:tickets.filter(t=>['resolved','closed'].includes(t.status)&&(t.updatedAt||'').slice(0,10)===ds).length};});
  }

  // FIXED: defends against NaN — validates both dates parse to finite numbers
  // and that updatedAt is not before createdAt, before including in the average.
  function avgResTime(tickets){
    const r = tickets.filter(t => {
      if (t.status !== 'resolved') return false;
      const c = new Date(t.createdAt).getTime();
      const u = new Date(t.updatedAt).getTime();
      return Number.isFinite(c) && Number.isFinite(u) && u >= c;
    });
    if(!r.length) return { val:'—', sub:'No resolved tickets yet' };
    const ms = r.reduce((s,t) => s + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) / r.length;
    const h = ms / 3600000;
    const val = h < 1 ? `${Math.round(h*60)}m` : h < 24 ? `${h.toFixed(1)}h` : `${(h/24).toFixed(1)}d`;
    return { val, sub:`Avg across ${r.length} resolved case${r.length!==1?'s':''}` };
  }

  function kpiDelta(tickets){
    const dates=tickets.map(t=>t.createdAt).filter(Boolean).sort();
    if(!dates.length)return{val:'No data yet',up:true};
    const anchor=new Date(dates[dates.length-1]);
    const wkAgo=new Date(anchor);wkAgo.setDate(wkAgo.getDate()-7);
    const twkAgo=new Date(anchor);twkAgo.setDate(twkAgo.getDate()-14);
    const thisWk=tickets.filter(t=>new Date(t.createdAt)>=wkAgo).length;
    const lastWk=tickets.filter(t=>new Date(t.createdAt)>=twkAgo&&new Date(t.createdAt)<wkAgo).length;
    if(!lastWk&&!thisWk)return{val:'No activity',up:true};
    if(!lastWk)return{val:`+${thisWk} this week`,up:true};
    const pct=Math.round(((thisWk-lastWk)/lastWk)*100);
    return{val:`${pct>=0?'+':''}${pct}% vs last week`,up:pct>=0};
  }

  function buildActivity(tickets,customers,S){
    const events=[];
    const byRecent=[...tickets].sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
    for(const t of byRecent.slice(0,10)){
      const lc=(t.comments||[])[t.comments.length-1];
      if(lc&&lc.createdAt>(t.createdAt||''))events.push({text:`${S.userName(lc.authorId)} commented on ${t.number}`,date:lc.createdAt,c:'#8b5cf6'});
      else if(t.status==='resolved')events.push({text:`${t.number} resolved — ${t.subject.slice(0,35)}`,date:t.updatedAt,c:'#10b981'});
      else if(t.priority==='critical'&&!['resolved','closed'].includes(t.status))events.push({text:`${t.number} escalated to Critical`,date:t.updatedAt||t.createdAt,c:'#f43f5e'});
      else if(t.assignedToId)events.push({text:`${t.number} assigned to ${S.userName(t.assignedToId)}`,date:t.updatedAt||t.createdAt,c:'#06b6d4'});
      else events.push({text:`${t.number} created — ${t.subject.slice(0,35)}`,date:t.createdAt,c:'#6366f1'});
    }
    for(const c of [...customers].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,2))
      events.push({text:`New customer: ${c.name} (${c.company})`,date:c.createdAt,c:'#f59e0b'});
    return events.filter(e=>e.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  }

  // ── Built-in widget renderers ────────────────────────────────────────────────
  function rKpis(t,I){
    const open=t.filter(x=>['new','assigned','in_progress'].includes(x.status)).length;
    const resolved=t.filter(x=>x.status==='resolved').length;
    const critical=t.filter(x=>x.priority==='critical'&&!['resolved','closed'].includes(x.status)).length;
    const delta=kpiDelta(t), avg=avgResTime(t);
    const cards=[
      {label:'Total Tickets',  value:t.length,  delta:delta.val,      up:delta.up,      icon:'ticket_k',accent:'#6366f1'},
      {label:'Open Tickets',   value:open,       delta:`${open} active`,up:true,          icon:'alert_c', accent:'#f59e0b'},
      {label:'Resolved',       value:resolved,   delta:`${t.filter(x=>x.status==='closed').length} closed`,up:true,icon:'check_c',accent:'#10b981'},
      {label:'Critical',       value:critical,   delta:critical===0?'All clear':'Needs attention',up:critical===0,icon:'alert_t',accent:'#f43f5e'},
      {label:'Avg Resolution', value:avg.val,    delta:avg.sub,        up:true,           icon:'trending',accent:'#8b5cf6'},
    ];
    return`<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;width:100%">
      ${cards.map(k=>`<div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:${k.accent}15;color:${k.accent}">${I(k.icon,18)}</div><span class="kpi-delta ${k.up?'up':'down'}" style="font-size:11px">${k.up?I('arrow_up',11):I('arrow_dn',11)} ${k.delta}</span></div><div><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div></div>`).join('')}
    </div>`;
  }

  function rPipeline(t){
    const stages=[{s:'New',n:t.filter(x=>x.status==='new').length,c:'#6366f1'},{s:'Assigned',n:t.filter(x=>x.status==='assigned').length,c:'#06b6d4'},{s:'In Progress',n:t.filter(x=>x.status==='in_progress').length,c:'#8b5cf6'},{s:'Pending',n:t.filter(x=>x.status==='pending').length,c:'#f59e0b'},{s:'Resolved',n:t.filter(x=>x.status==='resolved').length,c:'#10b981'},{s:'Closed',n:t.filter(x=>x.status==='closed').length,c:'#94a3b8'}];
    const total=Math.max(stages.reduce((a,p)=>a+p.n,0),1);stages.forEach(p=>p.w=Math.max(Math.round((p.n/total)*100),p.n>0?1:0));
    const bar=stages.map(p=>`<div title="${p.s}: ${p.n}" style="flex:${Math.max(p.w,p.n>0?1:0)};background:${p.c};display:flex;align-items:center;justify-content:center">${p.w>8?`<span style="font-size:11px;font-weight:700;color:#fff">${p.n}</span>`:''}</div>`).join('');
    const leg=stages.map(p=>`<div style="display:flex;align-items:center;gap:5px"><div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div><span style="font-size:12px;color:var(--s500)">${p.s}</span><span style="font-size:12px;font-weight:600;color:var(--s700)">${p.n}</span></div>`).join('');
    return`<div class="card"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px"><div><div class="card-title">Ticket pipeline</div><div class="text-muted" style="font-size:12px;margin-top:2px">Live distribution across all stages</div></div><span class="text-muted" style="font-size:12px">${t.length} total</span></div><div style="display:flex;gap:3px;height:28px;border-radius:8px;overflow:hidden">${bar}</div><div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">${leg}</div></div>`;
  }

  function rTrend(t){
    const w=weeklyData(t),total=w.reduce((s,d)=>s+d.c+d.r,0);
    return`<div class="card"><div class="card-title" style="margin-bottom:3px">Weekly trend</div><div class="text-muted" style="font-size:12px;margin-bottom:12px">Created vs resolved · ${total} events in last 7 days</div>${lineChart(w)}<div style="display:flex;gap:16px;margin-top:10px"><div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#6366f1;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Created</span></div><div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#10b981;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Resolved</span></div></div></div>`;
  }

  function rPriority(t){
    const pd=[{n:'Critical',v:t.filter(x=>x.priority==='critical').length,c:'#f43f5e'},{n:'High',v:t.filter(x=>x.priority==='high').length,c:'#f97316'},{n:'Medium',v:t.filter(x=>x.priority==='medium').length,c:'#f59e0b'},{n:'Low',v:t.filter(x=>x.priority==='low').length,c:'#10b981'}];
    const pT=Math.max(pd.reduce((a,p)=>a+p.v,0),1);let off=25;const circ=2*Math.PI*38;
    const slices=pd.map(p=>{const pct=p.v/pT,d=pct*circ,el=`<circle cx="50" cy="50" r="38" fill="none" stroke="${p.c}" stroke-width="14" stroke-dasharray="${d.toFixed(1)} ${(circ-d).toFixed(1)}" stroke-dashoffset="-${((off/100)*circ).toFixed(1)}"/>`;off+=pct*100;return el;}).join('');
    const leg=pd.map(p=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0"><div style="display:flex;align-items:center;gap:7px"><div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div><span style="font-size:12px;color:var(--s600)">${p.n}</span></div><span style="font-size:12px;font-weight:600;color:var(--s700)">${p.v}</span></div>`).join('');
    return`<div class="card"><div class="card-title" style="margin-bottom:3px">By priority</div><div class="text-muted" style="font-size:12px;margin-bottom:10px">${t.length} total tickets</div><div style="display:flex;justify-content:center;margin-bottom:12px"><svg width="100" height="100" viewBox="0 0 100 100">${t.length?slices:`<circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" stroke-width="14"/>`}<text x="50" y="46" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${t.length}</text><text x="50" y="60" text-anchor="middle" font-size="10" fill="#94a3b8">tickets</text></svg></div>${leg}</div>`;
  }

  function rByCategory(t,S){
    const cats=NexCRM.Store.TicketCategories.getAll();
    const data=cats.map(c=>({name:c.name,color:c.color,count:t.filter(x=>x.categoryId===c.id).length})).sort((a,b)=>b.count-a.count);
    const maxC=Math.max(...data.map(d=>d.count),1);
    const bars=data.map(d=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:110px;font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0">${S.esc(d.name)}</div><div style="flex:1;height:18px;background:var(--s100);border-radius:4px;overflow:hidden;position:relative"><div style="height:100%;background:${d.color};border-radius:4px;width:${Math.round((d.count/maxC)*100)}%;transition:width .3s"></div></div><span style="font-size:12px;font-weight:600;color:var(--text);min-width:24px;text-align:right">${d.count}</span></div>`).join('');
    return`<div class="card"><div class="card-title" style="margin-bottom:3px">By category</div><div class="text-muted" style="font-size:12px;margin-bottom:14px">Ticket volume per ticket category</div>${bars||`<div class="empty-state-sm">No categories. <a href="#categories" class="link">Create one →</a></div>`}</div>`;
  }

  function rByDept(t,S){
    const depts=NexCRM.Store.Departments.getAll();
    const data=depts.map(d=>({name:d.name,color:d.color,count:t.filter(x=>x.departmentId===d.id).length})).sort((a,b)=>b.count-a.count);
    const maxC=Math.max(...data.map(d=>d.count),1);
    const bars=data.map(d=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:110px;font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0">${S.esc(d.name)}</div><div style="flex:1;height:18px;background:var(--s100);border-radius:4px;overflow:hidden"><div style="height:100%;background:${d.color};border-radius:4px;width:${Math.round((d.count/maxC)*100)}%"></div></div><span style="font-size:12px;font-weight:600;color:var(--text);min-width:24px;text-align:right">${d.count}</span></div>`).join('');
    return`<div class="card"><div class="card-title" style="margin-bottom:3px">By department</div><div class="text-muted" style="font-size:12px;margin-bottom:14px">Ticket volume per department</div>${bars||`<div class="empty-state-sm">No departments. <a href="#departments" class="link">Create one →</a></div>`}</div>`;
  }

  function rRecent(t,S){
    const rows=[...t].reverse().slice(0,4).map(x=>`<div class="recent-ticket-row" onclick="location.hash='#tickets/${x.number}'"><div style="flex:1;min-width:0"><div class="cell-title">${S.esc(x.subject)}</div><div class="text-muted" style="font-size:11px;margin-top:1px">${x.number} · ${S.esc(S.customerName(x.customerId))}</div></div><div style="display:flex;gap:6px;flex-shrink:0">${S.priorityBadge(x.priority)}${S.statusBadge(x.status)}</div></div>`).join('')||`<div class="empty-state-sm">No tickets yet. <a href="#tickets" class="link">Create one →</a></div>`;
    return`<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div class="card-title">Recent tickets</div><a href="#tickets" class="link" style="font-size:12px;font-weight:500">View all →</a></div>${rows}</div>`;
  }

  function rActivity(t,customers,S,I){
    const events=buildActivity(t,customers,S);
    const html=events.length?events.map(a=>`<div class="activity-item"><div class="activity-dot" style="background:${a.c}"></div><div><div style="font-size:13px;color:var(--s700);font-weight:500">${S.esc(a.text)}</div><div style="font-size:11px;color:var(--s400);margin-top:2px">${S.fmtRelative(a.date)}</div></div></div>`).join(''):`<div class="empty-state-sm">No activity yet.</div>`;
    return`<div class="card"><div class="card-title" style="margin-bottom:16px">Activity feed</div>${html}<div style="border-top:1px solid var(--s100);padding-top:14px;margin-top:6px"><div style="font-size:13px;font-weight:700;color:var(--s800);margin-bottom:10px">Quick actions</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="quick-action-btn" style="--qa-color:#6366f1" onclick="NexCRM.Tickets.openCreateModal()">${I('plus',14)} New ticket</button><button class="quick-action-btn" style="--qa-color:#06b6d4" onclick="NexCRM.Customers.openCreateModal()">${I('plus',14)} Customer</button><a href="#tickets" class="quick-action-btn" style="--qa-color:#8b5cf6">${I('search',14)} Search</a><a href="#reports" class="quick-action-btn" style="--qa-color:#10b981">${I('barchart',14)} Reports</a></div></div></div>`;
  }

  function rAgentPerf(tickets,S){
    const users=NexCRM.Store.Users.getAll().filter(u=>u.active&&u.role!=='admin');
    const rows=users.map(u=>{
      const assigned=tickets.filter(t=>t.assignedToId===u.id).length;
      const resolved=tickets.filter(t=>t.assignedToId===u.id&&t.status==='resolved').length;
      const open=tickets.filter(t=>t.assignedToId===u.id&&['new','assigned','in_progress'].includes(t.status)).length;
      const rtAvg=avgResTime(tickets.filter(t=>t.assignedToId===u.id));
      return`<tr><td><div style="font-size:13px;font-weight:600;color:var(--text)">${S.esc(u.name)}</div><div class="text-muted" style="font-size:11px">${u.role}</div></td><td style="text-align:center;font-size:13px;font-weight:600">${assigned}</td><td style="text-align:center;font-size:13px;font-weight:600;color:#10b981">${resolved}</td><td style="text-align:center;font-size:13px;font-weight:600;color:#f59e0b">${open}</td><td style="text-align:center;font-size:13px">${rtAvg.val}</td></tr>`;
    }).join('')||`<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--text-3)">No agents found.</td></tr>`;
    return`<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div class="card-title">Agent performance</div><a href="#reports" class="link" style="font-size:12px">Full report →</a></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Agent</th><th style="text-align:center">Assigned</th><th style="text-align:center">Resolved</th><th style="text-align:center">Open</th><th style="text-align:center">Avg Time</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function rSLASnap(tickets){
    function slaStatus(t){
      if(['resolved','closed'].includes(t.status))return{label:'Met'};
      if(!t.dueDate)return{label:'No SLA'};
      const h=(new Date(t.dueDate)-Date.now())/3600000;
      if(h<0)return{label:'Breached'};
      if(h<4)return{label:'At Risk'};
      return{label:'On Time'};
    }
    const open=tickets.filter(t=>!['resolved','closed'].includes(t.status));
    const counts={on_time:0,at_risk:0,breached:0};
    open.forEach(t=>{const s=slaStatus(t);if(s.label==='On Time')counts.on_time++;else if(s.label==='At Risk')counts.at_risk++;else if(s.label==='Breached')counts.breached++;});
    const total=open.length||1,compPct=Math.round((counts.on_time/total)*100);
    return`<div class="card"><div class="card-title" style="margin-bottom:3px">SLA snapshot</div><div class="text-muted" style="font-size:12px;margin-bottom:14px">${open.length} open tickets · ${compPct}% on track</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:#ecfdf5;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#10b981">${counts.on_time}</div><div style="font-size:11px;color:#065f46">On Time</div></div>
        <div style="background:#fffbeb;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#f59e0b">${counts.at_risk}</div><div style="font-size:11px;color:#b45309">At Risk</div></div>
        <div style="background:#fff1f2;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#f43f5e">${counts.breached}</div><div style="font-size:11px;color:#be123c">Breached</div></div>
        <div style="background:var(--s50);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--text)">${open.length}</div><div style="font-size:11px;color:var(--text-3)">Total Open</div></div>
      </div>
      <a href="#sla" class="link" style="font-size:12px">Manage SLA rules →</a>
    </div>`;
  }

  function renderWidget(id,t,customers,S,I){
    switch(id){
      case 'kpis':       return rKpis(t,I);
      case 'pipeline':   return rPipeline(t);
      case 'trend':      return rTrend(t);
      case 'priority':   return rPriority(t);
      case 'by_category':return rByCategory(t,S);
      case 'by_dept':    return rByDept(t,S);
      case 'recent':     return rRecent(t,S);
      case 'activity':   return rActivity(t,customers,S,I);
      case 'agent_perf': return rAgentPerf(t,S);
      case 'sla_snap':   return rSLASnap(t);
      default:           return '';
    }
  }

  // ── CUSTOM WIDGET SYSTEM ─────────────────────────────────────────────────────

  function filterTickets(cfg) {
    let arr = NexCRM.Store.Tickets.getAll();
    const f = cfg.filters || {};
    if (f.status       && f.status       !== 'any') arr = arr.filter(t => t.status === f.status);
    if (f.priority      && f.priority     !== 'any') arr = arr.filter(t => t.priority === f.priority);
    if (f.departmentId  && f.departmentId !== 'any') arr = arr.filter(t => t.departmentId === f.departmentId);
    if (f.categoryId    && f.categoryId   !== 'any') arr = arr.filter(t => t.categoryId === f.categoryId);
    if (f.assignedToId  && f.assignedToId !== 'any') arr = arr.filter(t => t.assignedToId === f.assignedToId);
    if (f.dateFrom) arr = arr.filter(t => t.createdAt && t.createdAt.slice(0,10) >= f.dateFrom);
    if (f.dateTo)   arr = arr.filter(t => t.createdAt && t.createdAt.slice(0,10) <= f.dateTo);
    return arr;
  }

  function renderCustomKPI(cfg, tickets, S, I) {
    let value, sub;
    if (cfg.metric === 'avg_resolution') {
      const avg = avgResTime(tickets);
      value = avg.val; sub = avg.sub;
    } else {
      value = tickets.length; sub = `${tickets.length} matching ticket${tickets.length!==1?'s':''}`;
    }
    const color = cfg.color || '#6366f1';
    return `<div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:${color}15;color:${color}">${I('barchart',18)}</div></div><div><div class="kpi-value">${value}</div><div class="kpi-label">${S.esc(cfg.title)}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${S.esc(sub)}</div></div></div>`;
  }

  function ticketGroupLabelColor(t, groupBy, S) {
    switch(groupBy) {
      case 'status':     return { label:S.STATUS_CFG[t.status]?.l||t.status, color:STATUS_COLORS[t.status]||'#94a3b8' };
      case 'priority':   return { label:S.PRIORITY_CFG[t.priority]?.l||t.priority, color:PRIORITY_COLORS[t.priority]||'#94a3b8' };
      case 'category':   return { label:S.categoryName(t.categoryId), color:S.categoryColor(t.categoryId) };
      case 'department': { const d=NexCRM.Store.Departments.get(t.departmentId); return { label:d?d.name:'—', color:d?d.color:'#94a3b8' }; }
      case 'assignedTo': return { label:S.userName(t.assignedToId), color:'#6366f1' };
      default:           return { label:'—', color:'#94a3b8' };
    }
  }

  function renderCustomBarTickets(cfg, tickets, S) {
    const groups = {};
    tickets.forEach(t => {
      const { label, color } = ticketGroupLabelColor(t, cfg.groupBy, S);
      if (!groups[label]) groups[label] = { count:0, color };
      groups[label].count++;
    });
    const arr = Object.entries(groups).map(([label,g]) => ({ label, value:g.count, color:g.color })).sort((a,b)=>b.value-a.value);
    const max = Math.max(...arr.map(a=>a.value), 1);
    const bars = arr.map(d => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px"><div style="width:120px;font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">${S.esc(d.label)}</div><div style="flex:1;height:18px;background:var(--s100);border-radius:4px;overflow:hidden"><div style="height:100%;background:${d.color};border-radius:4px;width:${Math.round((d.value/max)*100)}%"></div></div><span style="font-size:12px;font-weight:600;color:var(--text);min-width:24px;text-align:right">${d.value}</span></div>`).join('');
    return `<div class="card"><div class="card-title" style="margin-bottom:3px">${S.esc(cfg.title)}</div><div class="text-muted" style="font-size:12px;margin-bottom:14px">${tickets.length} matching tickets</div>${bars||'<div class="empty-state-sm">No data for this filter.</div>'}</div>`;
  }

  function renderCustomTableTickets(cfg, tickets, S) {
    const rows = tickets.slice(0,20).map(t => `<tr class="table-row" onclick="location.hash='#tickets/${t.number}'"><td class="td-mono">${t.number}</td><td>${S.esc(t.subject)}</td><td>${S.statusBadge(t.status)}</td><td>${S.priorityBadge(t.priority)}</td><td class="td-sm">${S.esc(S.customerName(t.customerId))}</td></tr>`).join('') || `<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--text-3)">No matching tickets.</td></tr>`;
    return `<div class="card card-flush"><div style="padding:14px 18px;border-bottom:1px solid var(--border)"><span class="card-title">${S.esc(cfg.title)}</span> <span class="text-muted" style="font-size:12px">(${tickets.length} tickets, showing up to 20)</span></div><table class="data-table"><thead><tr><th>ID</th><th>Subject</th><th>Status</th><th>Priority</th><th>Customer</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderCustomBarChangelog(cfg, tickets, S) {
    const groups = {};
    tickets.forEach(t => (t.changeLog||[]).forEach(cl => {
      let label;
      if (cfg.groupBy === 'editedBy') { const u = NexCRM.Store.Users.get(cl.editedById); label = u?u.name:'Unknown'; }
      else label = cl.field;
      groups[label] = (groups[label]||0) + 1;
    }));
    const arr = Object.entries(groups).map(([label,count],i) => ({ label, value:count, color:CYCLE_PALETTE[i%CYCLE_PALETTE.length] })).sort((a,b)=>b.value-a.value);
    const max = Math.max(...arr.map(a=>a.value), 1);
    const bars = arr.map(d => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px"><div style="width:120px;font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">${S.esc(d.label)}</div><div style="flex:1;height:18px;background:var(--s100);border-radius:4px;overflow:hidden"><div style="height:100%;background:${d.color};border-radius:4px;width:${Math.round((d.value/max)*100)}%"></div></div><span style="font-size:12px;font-weight:600;color:var(--text);min-width:24px;text-align:right">${d.value}</span></div>`).join('');
    return `<div class="card"><div class="card-title" style="margin-bottom:3px">${S.esc(cfg.title)}</div><div class="text-muted" style="font-size:12px;margin-bottom:14px">Change log events across ${tickets.length} tickets</div>${bars||'<div class="empty-state-sm">No change log events for this filter.</div>'}</div>`;
  }

  function renderCustomTableChangelog(cfg, tickets, S) {
    const entries = [];
    tickets.forEach(t => (t.changeLog||[]).forEach(cl => entries.push({ ...cl, ticketNumber:t.number })));
    entries.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const rows = entries.slice(0,25).map(cl => {
      const editor = NexCRM.Store.Users.get(cl.editedById);
      const dt = new Date(cl.timestamp);
      const dtStr = `${S.fmtDate(cl.timestamp)} ${dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
      return `<tr><td class="td-mono">${cl.ticketNumber}</td><td class="td-sm">${dtStr}</td><td><span class="badge" style="background:#6366f118;color:#6366f1;font-size:11px">${S.esc(cl.field)}</span></td><td class="td-sm">${cl.oldValue?S.esc(cl.oldValue):'—'}</td><td class="td-sm">${cl.newValue?S.esc(cl.newValue):'—'}</td><td class="td-sm">${editor?S.esc(editor.name):'—'}</td></tr>`;
    }).join('') || `<tr><td colspan="6" style="padding:16px;text-align:center;color:var(--text-3)">No change log events for this filter.</td></tr>`;
    return `<div class="card card-flush"><div style="padding:14px 18px;border-bottom:1px solid var(--border)"><span class="card-title">${S.esc(cfg.title)}</span> <span class="text-muted" style="font-size:12px">(showing up to 25 most recent events)</span></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Ticket</th><th>Date/Time</th><th>Field/Event</th><th>Old Value</th><th>New Value</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function renderCustomWidget(cfg, S, I) {
    const tickets = filterTickets(cfg);
    if (cfg.source === 'tickets') {
      if (cfg.displayAs === 'kpi')   return renderCustomKPI(cfg, tickets, S, I);
      if (cfg.displayAs === 'bar')   return renderCustomBarTickets(cfg, tickets, S);
      return renderCustomTableTickets(cfg, tickets, S);
    } else {
      if (cfg.displayAs === 'bar')   return renderCustomBarChangelog(cfg, tickets, S);
      return renderCustomTableChangelog(cfg, tickets, S);
    }
  }

  // ── Custom widget builder modal ──────────────────────────────────────────────
  function openCustomWidgetBuilder(existingId) {
    const S = NexCRM.Utils;
    const existing = existingId ? getCustomWidgets().find(w => w.id === existingId) : null;
    const depts = NexCRM.Store.Departments.getAll();
    const cats  = NexCRM.Store.TicketCategories.getAll();
    const users = NexCRM.Store.Users.getAll().filter(u => u.active);
    const f = existing?.filters || {};

    const statusOpts = `<option value="any">Any</option>` + Object.entries(S.STATUS_CFG).map(([k,v]) => `<option value="${k}" ${f.status===k?'selected':''}>${v.l}</option>`).join('');
    const prioOpts    = `<option value="any">Any</option>` + Object.entries(S.PRIORITY_CFG).map(([k,v]) => `<option value="${k}" ${f.priority===k?'selected':''}>${v.l}</option>`).join('');
    const deptOpts     = `<option value="any">Any</option>` + depts.map(d => `<option value="${d.id}" ${f.departmentId===d.id?'selected':''}>${S.esc(d.name)}</option>`).join('');
    const catOpts       = `<option value="any">Any</option>` + cats.map(c => `<option value="${c.id}" ${f.categoryId===c.id?'selected':''}>${S.esc(c.name)}</option>`).join('');
    const userOpts     = `<option value="any">Any</option>` + users.map(u => `<option value="${u.id}" ${f.assignedToId===u.id?'selected':''}>${S.esc(u.name)}</option>`).join('');

    const body = `
      <div class="form-grid">
        <div class="form-field full-width"><label>Widget title <span class="required">*</span></label>
          <input type="text" id="cw-title" class="input" value="${existing?S.esc(existing.title):''}" placeholder="e.g. Critical bugs opened this month"></div>

        <div class="form-field"><label>Data source</label>
          <select id="cw-source" class="input" onchange="NexCRM.Dashboard._refreshCWOptions()">
            <option value="tickets"   ${!existing||existing.source==='tickets'  ?'selected':''}>Tickets</option>
            <option value="changelog" ${existing?.source==='changelog'          ?'selected':''}>Change / Event Log</option>
          </select>
        </div>
        <div class="form-field"><label>Display as</label>
          <select id="cw-display" class="input" onchange="NexCRM.Dashboard._refreshCWOptions()">
            <option value="kpi"   ${!existing||existing.displayAs==='kpi'  ?'selected':''}>KPI number</option>
            <option value="bar"   ${existing?.displayAs==='bar'           ?'selected':''}>Bar chart</option>
            <option value="table" ${existing?.displayAs==='table'         ?'selected':''}>Table</option>
          </select>
        </div>

        <div class="form-field full-width" id="cw-metric-wrap">
          <label id="cw-metric-label">Metric</label>
          <select id="cw-metric" class="input"></select>
        </div>

        <div class="form-field full-width"><div class="sec-lbl" style="margin:6px 0 2px">Filters (optional — narrows what the widget counts)</div></div>
        <div class="form-field"><label>Status</label><select id="cw-f-status" class="input">${statusOpts}</select></div>
        <div class="form-field"><label>Priority</label><select id="cw-f-priority" class="input">${prioOpts}</select></div>
        <div class="form-field"><label>Department</label><select id="cw-f-dept" class="input">${deptOpts}</select></div>
        <div class="form-field"><label>Category</label><select id="cw-f-cat" class="input">${catOpts}</select></div>
        <div class="form-field"><label>Assigned to</label><select id="cw-f-assigned" class="input">${userOpts}</select></div>
        <div class="form-field"><label>Accent colour</label><input type="text" id="cw-color" class="input" value="${existing?.color||'#6366f1'}" placeholder="#6366f1"></div>
        <div class="form-field"><label>Created after</label><input type="date" id="cw-f-from" class="input" value="${f.dateFrom||''}"></div>
        <div class="form-field"><label>Created before</label><input type="date" id="cw-f-to" class="input" value="${f.dateTo||''}"></div>
      </div>`;

    const footer = `
      ${existing?`<button class="btn btn-ghost" style="color:var(--rose)" onclick="NexCRM.Dashboard.deleteCustomWidget('${existing.id}')">Delete</button>`:''}
      <button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="NexCRM.Dashboard.saveCustomWidget('${existing?existing.id:''}')">${existing?'Save changes':'Add widget'}</button>`;

    NexCRM.Utils.openModal(existing?'Edit custom widget':'New custom widget', body, footer, 'lg');
    _refreshCWOptions(existing);
  }

  function _refreshCWOptions(existing) {
    const source  = document.getElementById('cw-source')?.value  || 'tickets';
    const display = document.getElementById('cw-display')?.value || 'kpi';
    const metricSel = document.getElementById('cw-metric');
    const label     = document.getElementById('cw-metric-label');
    const wrap      = document.getElementById('cw-metric-wrap');
    if (!metricSel) return;

    let opts = [];
    if (source === 'tickets') {
      if (display === 'kpi')      { label.textContent='Metric';    opts=[['count','Count of matching tickets'],['avg_resolution','Average resolution time']]; }
      else if (display === 'bar') { label.textContent='Group by';  opts=[['status','Status'],['priority','Priority'],['category','Category'],['department','Department'],['assignedTo','Assigned to']]; }
      else { wrap.style.display='none'; metricSel.innerHTML=''; return; }
    } else {
      if (display === 'bar') { label.textContent='Group by'; opts=[['field','Field / Event type'],['editedBy','Changed by (agent)']]; }
      else { wrap.style.display='none'; metricSel.innerHTML=''; return; }
    }
    wrap.style.display = '';
    const currentVal = existing ? (existing.metric || existing.groupBy) : null;
    metricSel.innerHTML = opts.map(([v,l]) => `<option value="${v}" ${currentVal===v?'selected':''}>${l}</option>`).join('');
  }

  function saveCustomWidget(existingId) {
    const title = document.getElementById('cw-title')?.value.trim();
    if (!title) { NexCRM.toast('Title is required', 'error'); return; }
    const source    = document.getElementById('cw-source')?.value;
    const displayAs = document.getElementById('cw-display')?.value;
    const metricVal = document.getElementById('cw-metric')?.value || '';
    const color     = document.getElementById('cw-color')?.value.trim() || '#6366f1';
    const filters = {
      status:       document.getElementById('cw-f-status')?.value || 'any',
      priority:     document.getElementById('cw-f-priority')?.value || 'any',
      departmentId: document.getElementById('cw-f-dept')?.value || 'any',
      categoryId:   document.getElementById('cw-f-cat')?.value || 'any',
      assignedToId: document.getElementById('cw-f-assigned')?.value || 'any',
      dateFrom:     document.getElementById('cw-f-from')?.value || '',
      dateTo:       document.getElementById('cw-f-to')?.value || '',
    };
    const cfg = {
      id: existingId || ('cw_' + NexCRM._uid()),
      title, source, displayAs, color,
      metric:  displayAs==='kpi' ? metricVal : undefined,
      groupBy: displayAs==='bar' ? metricVal : undefined,
      filters,
    };
    const list = getCustomWidgets();
    const idx = list.findIndex(w => w.id === cfg.id);
    if (idx >= 0) list[idx] = cfg; else list.push(cfg);
    saveCustomWidgets(list);
    NexCRM.Utils.closeModal();
    NexCRM.toast(existingId ? 'Widget updated' : 'Widget added', 'success');
    render();
  }

  function deleteCustomWidget(id) {
    NexCRM.Utils.confirm('Delete this custom widget? This cannot be undone.', () => {
      saveCustomWidgets(getCustomWidgets().filter(w => w.id !== id));
      NexCRM.Utils.closeModal();
      render();
    }, 'Delete', 'danger');
  }

  // ── Edit-mode drag/drop for built-in widgets ─────────────────────────────────
  function _wrap(id, html, I) {
    const m = WIDGETS[id]; if (!m) return html;
    return`<div class="widget-wrap" id="w-${id}" draggable="true"
        ondragstart="NexCRM.Dashboard._ds('${id}')"
        ondragover="event.preventDefault();document.getElementById('w-${id}')?.classList.add('drag-over')"
        ondragleave="document.getElementById('w-${id}')?.classList.remove('drag-over')"
        ondrop="NexCRM.Dashboard._dp('${id}')">
      <div class="widget-edit-bar"><span>${I('menu',13)} ${m.title}</span>
        <div style="display:flex;gap:4px"><span class="widget-drag-handle">${I('more',13)}</span>
          <button class="widget-remove-btn" onclick="NexCRM.Dashboard._rm('${id}')">${I('x',13)}</button>
        </div>
      </div>${html}</div>`;
  }
  function _ds(id){_drag=id;}
  function _dp(tid){
    document.querySelectorAll('.widget-wrap').forEach(w=>w.classList.remove('drag-over'));
    if(!_drag||_drag===tid)return;
    const layout=getLayout();
    const fi=layout.findIndex(r=>r===_drag||r.includes(_drag));
    const ti=layout.findIndex(r=>r===tid||r.includes(tid));
    if(fi>=0&&ti>=0){[layout[fi],layout[ti]]=[layout[ti],layout[fi]];saveLayout(layout);}
    _drag=null;render();
  }
  function _rm(id){const h=getHidden();if(!h.includes(id)){h.push(id);saveHidden(h);}render();}
  function _startEdit(){_edit=true;render();}
  function _saveEdit(){_edit=false;render();}

  function openWidgetPicker() {
    const S=NexCRM.Utils; const hidden=getHidden();
    const body=`<p style="font-size:12px;color:var(--s500);margin-bottom:14px">Toggle built-in widgets on/off. Drag to reorder in Customise mode.</p>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${Object.entries(WIDGETS).map(([id,m])=>`<div class="col-item">
          <div><div class="col-item-label">${m.title}</div><div style="font-size:11px;color:var(--text-3)">${m.desc}</div></div>
          <button class="toggle-switch${hidden.includes(id)?'':' on'}" id="wtog-${id}" onclick="NexCRM.Dashboard._tog('${id}')"><div class="toggle-knob"></div></button>
        </div>`).join('')}
      </div>`;
    S.openModal('Built-in dashboard widgets', body,
      `<button class="btn btn-ghost" onclick="NexCRM.Dashboard._reset()">Reset defaults</button>
       <button class="btn btn-primary" onclick="NexCRM.Utils.closeModal()">Done</button>`);
  }
  function _tog(id){const h=getHidden();const nh=h.includes(id)?h.filter(x=>x!==id):[...h,id];saveHidden(nh);const btn=document.getElementById('wtog-'+id);if(btn)btn.classList.toggle('on',!nh.includes(id));render();}
  function _reset(){saveHidden([]);saveLayout([...DEFAULT_LAYOUT]);NexCRM.Utils.closeModal();render();}

  // ── Main render ────────────────────────────────────────────────────────────
  function render() {
    NexCRM.Layout.renderTopbar('Dashboard');
    NexCRM.Layout.renderSidebar('dashboard');
    const S=NexCRM.Utils, I=NexCRM.icon;
    const tickets=NexCRM.Store.Tickets.getAll(), customers=NexCRM.Store.Customers.getAll();
    const isAdmin=NexCRM.Auth.isAdmin(), hidden=getHidden();

    function w(id, html) { if(hidden.includes(id)) return ''; return _edit&&isAdmin ? _wrap(id,html,I) : `<div class="widget-wrap" id="w-${id}">${html}</div>`; }
    function half2(id1,id2){ const h1=w(id1,renderWidget(id1,tickets,customers,S,I)),h2=w(id2,renderWidget(id2,tickets,customers,S,I)); if(!h1&&!h2)return''; if(!h1)return h2; if(!h2)return h1; return`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%">${h1}${h2}</div>`; }

    const layout=getLayout();
    const sections = layout.map(row => {
      if (row.includes('+')) { const [id1,id2]=row.split('+'); return half2(id1,id2); }
      const html = renderWidget(row,tickets,customers,S,I);
      return html ? w(row,html) : '';
    }).filter(Boolean);

    // ── Append custom widgets (each its own full-width row) ────────────────────
    const customWidgets = getCustomWidgets();
    const customHidden  = hidden; // reuse same hidden-id list; custom ids are unique already
    customWidgets.filter(cfg => !customHidden.includes(cfg.id)).forEach(cfg => {
      const html = renderCustomWidget(cfg, S, I);
      if (_edit && isAdmin) {
        sections.push(`<div class="widget-wrap" id="w-${cfg.id}">
          <div class="widget-edit-bar"><span>${I('menu',13)} ${S.esc(cfg.title)} <span style="opacity:.6">· custom</span></span>
            <div style="display:flex;gap:4px">
              <button class="widget-remove-btn" onclick="NexCRM.Dashboard.openCustomWidgetBuilder('${cfg.id}')" title="Edit">${I('edit',13)}</button>
              <button class="widget-remove-btn" onclick="NexCRM.Dashboard.deleteCustomWidget('${cfg.id}')" title="Delete">${I('x',13)}</button>
            </div>
          </div>${html}</div>`);
      } else {
        sections.push(`<div class="widget-wrap" id="w-${cfg.id}">${html}</div>`);
      }
    });

    if (_edit && isAdmin) {
      sections.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="add-widget-btn" onclick="NexCRM.Dashboard.openWidgetPicker()">${I('plus',16)} Manage built-in widgets</div>
        <div class="add-widget-btn" onclick="NexCRM.Dashboard.openCustomWidgetBuilder(null)">${I('plus',16)} Add custom KPI / graph / table</div>
      </div>`);
    }

    const editBar = isAdmin ? `<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px">
      ${_edit
        ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Dashboard._saveEdit()">${I('check_c',13)} Done</button>`
        : `<button class="btn btn-ghost btn-sm" onclick="NexCRM.Dashboard.openCustomWidgetBuilder(null)">${I('plus',13)} Custom widget</button>
           <button class="btn btn-ghost btn-sm" onclick="NexCRM.Dashboard._startEdit()">${I('edit',13)} Customise</button>`}
    </div>` : '';

    document.getElementById('page-content').innerHTML = `<div class="page-body">${editBar}${sections.join('')}</div>`;
  }

  window.NexCRM.Dashboard = {
    render, openWidgetPicker, _tog, _reset, _ds, _dp, _rm, _startEdit, _saveEdit,
    _tip, _tipM, _tipH,
    openCustomWidgetBuilder, _refreshCWOptions, saveCustomWidget, deleteCustomWidget,
  };
})();
