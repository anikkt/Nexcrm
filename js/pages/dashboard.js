window.NexCRM = window.NexCRM || {};

(function () {
  // ── Widget layout stored in localStorage ─────────────────────────────────
  const ALL_WIDGETS = {
    kpis:         { title:'KPI Cards',          desc:'Total, Open, Resolved, Critical' },
    pipeline:     { title:'Ticket Pipeline',    desc:'Live lifecycle distribution bar' },
    weekly_trend: { title:'Weekly Trend Chart', desc:'Created vs resolved line chart' },
    priority:     { title:'By Priority',        desc:'Priority breakdown donut chart' },
    recent:       { title:'Recent Tickets',     desc:'Latest 4 tickets' },
    activity:     { title:'Activity Feed',      desc:'Recent system activity' },
    avg_time:     { title:'Avg Resolution Time',desc:'Average case resolution time' },
  };
  const DEFAULT_LAYOUT = ['kpis','pipeline','weekly_trend+priority','recent+activity'];

  function getLayout()     { try { return JSON.parse(localStorage.getItem('ncm_dash_layout'))||[...DEFAULT_LAYOUT]; } catch { return [...DEFAULT_LAYOUT]; } }
  function saveLayout(l)   { localStorage.setItem('ncm_dash_layout', JSON.stringify(l)); }
  function getHidden()     { try { return JSON.parse(localStorage.getItem('ncm_dash_hidden'))||[]; } catch { return []; } }
  function saveHidden(h)   { localStorage.setItem('ncm_dash_hidden', JSON.stringify(h)); }

  let _editMode = false;
  let _dragItem  = null;

  // ── Interactive SVG line chart ────────────────────────────────────────────
  function lineChart(data) {
    const W=500,H=190,ml=30,mr=10,mt=10,mb=25;
    const iW=W-ml-mr,iH=H-mt-mb,maxV=26;
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
      d+=` L${pts[pts.length-1][0].toFixed(1)} ${base} Z`;return d;
    }
    const grids=[0,6,12,18,24].map(v=>{
      const yv=y(v).toFixed(1);
      return `<line x1="${ml}" y1="${yv}" x2="${W-mr}" y2="${yv}" stroke="#e2e8f0" stroke-width="1"/>
              <text x="${ml-4}" y="${(parseFloat(yv)+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;
    }).join('');
    const xlabels=data.map((d,i)=>`<text x="${x(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.d}</text>`).join('');
    // Hover rects — emit events to tooltip
    const step=iW/(data.length-1);
    const hoverRects=data.map((d,i)=>{
      const bx=Math.max(ml, x(i)-step/2);
      const bw=Math.min(step, W-mr-bx);
      return `<rect x="${bx.toFixed(1)}" y="${mt}" width="${bw.toFixed(1)}" height="${iH}" fill="transparent" style="cursor:crosshair"
        onmouseover="NexCRM.Dashboard._showTip(event,'${d.d}',${d.c},${d.r})"
        onmousemove="NexCRM.Dashboard._moveTip(event)"
        onmouseout="NexCRM.Dashboard._hideTip()"/>`;
    }).join('');
    // Vertical hover line
    const cV=data.map(d=>d.c),rV=data.map(d=>d.r);
    return `<div id="chart-wrap" style="position:relative">
      <svg id="weekly-chart" width="100%" height="190" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lgc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.18"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/></linearGradient>
          <linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.01"/></linearGradient>
        </defs>
        ${grids}${xlabels}
        <path d="${area(cV)}" fill="url(#lgc)"/>
        <path d="${area(rV)}" fill="url(#lgr)"/>
        <path d="${bez(cV)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/>
        <path d="${bez(rV)}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        ${hoverRects}
      </svg>
      <div id="chart-tooltip" class="chart-tooltip"></div>
    </div>`;
  }

  function _showTip(e,day,created,resolved) {
    const tip=document.getElementById('chart-tooltip');
    if(!tip)return;
    tip.innerHTML=`<div style="font-weight:700;color:var(--text);font-size:12px;margin-bottom:6px">${day}</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6366f1;margin-bottom:3px"><div style="width:8px;height:8px;border-radius:50%;background:#6366f1"></div>Created: <strong>${created}</strong></div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#10b981"><div style="width:8px;height:8px;border-radius:50%;background:#10b981"></div>Resolved: <strong>${resolved}</strong></div>`;
    tip.style.display='block';
    _moveTip(e);
  }
  function _moveTip(e) {
    const tip=document.getElementById('chart-tooltip');const wrap=document.getElementById('chart-wrap');
    if(!tip||!wrap)return;
    const r=wrap.getBoundingClientRect();
    let left=e.clientX-r.left+12, top=e.clientY-r.top-70;
    if(left+150>wrap.offsetWidth)left=left-165;
    if(top<0)top=5;
    tip.style.left=left+'px'; tip.style.top=top+'px';
  }
  function _hideTip() { const tip=document.getElementById('chart-tooltip'); if(tip)tip.style.display='none'; }

  // ── Avg resolution time ───────────────────────────────────────────────────
  function avgResTime(tickets) {
    const r=tickets.filter(t=>t.status==='resolved'&&t.createdAt&&t.updatedAt);
    if(!r.length) return { val:'—', sub:'No resolved tickets yet' };
    const ms=r.reduce((s,t)=>s+new Date(t.updatedAt)-new Date(t.createdAt),0)/r.length;
    const h=ms/3600000;
    const val=h<1?`${Math.round(h*60)}m`:h<24?`${h.toFixed(1)}h`:`${(h/24).toFixed(1)}d`;
    return { val, sub:`Avg across ${r.length} resolved case${r.length!==1?'s':''}` };
  }

  // ── Widget renderers ──────────────────────────────────────────────────────
  function _renderKpis(tickets, I) {
    const open=tickets.filter(t=>['new','assigned','in_progress'].includes(t.status)).length;
    const resolved=tickets.filter(t=>t.status==='resolved').length;
    const critical=tickets.filter(t=>t.priority==='critical'&&!['resolved','closed'].includes(t.status)).length;
    const kpis=[
      {label:'Total Tickets',  value:tickets.length, delta:'+12% this week',    up:true,  icon:'ticket_k',accent:'#6366f1'},
      {label:'Open Tickets',   value:open,           delta:'-3 from yesterday', up:true,  icon:'alert_c', accent:'#f59e0b'},
      {label:'Resolved Today', value:resolved,       delta:'+4 vs avg',         up:true,  icon:'check_c', accent:'#10b981'},
      {label:'Critical',       value:critical,       delta:'+2 new',            up:false, icon:'alert_t', accent:'#f43f5e'},
    ];
    return `<div class="kpi-grid">${kpis.map(k=>`<div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:${k.accent}15;color:${k.accent}">${I(k.icon,18)}</div><span class="kpi-delta ${k.up?'up':'down'}">${k.up?I('arrow_up',12):I('arrow_dn',12)} ${k.delta}</span></div><div><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div></div>`).join('')}</div>`;
  }

  function _renderPipeline(tickets) {
    const pipeline=[
      {s:'New',        n:tickets.filter(t=>t.status==='new').length,        c:'#6366f1'},
      {s:'Assigned',   n:tickets.filter(t=>t.status==='assigned').length,   c:'#06b6d4'},
      {s:'In Progress',n:tickets.filter(t=>t.status==='in_progress').length,c:'#8b5cf6'},
      {s:'Pending',    n:tickets.filter(t=>t.status==='pending').length,    c:'#f59e0b'},
      {s:'Resolved',   n:tickets.filter(t=>t.status==='resolved').length,   c:'#10b981'},
      {s:'Closed',     n:tickets.filter(t=>t.status==='closed').length,     c:'#94a3b8'},
    ];
    const pT=Math.max(pipeline.reduce((a,p)=>a+p.n,0),1);
    pipeline.forEach(p=>p.w=Math.max(Math.round((p.n/pT)*100),p.n>0?1:0));
    const bar=pipeline.map(p=>`<div title="${p.s}: ${p.n}" style="flex:${Math.max(p.w,p.n>0?1:0)};background:${p.c};display:flex;align-items:center;justify-content:center">${p.w>8?`<span style="font-size:11px;font-weight:700;color:#fff">${p.n}</span>`:''}</div>`).join('');
    const leg=pipeline.map(p=>`<div style="display:flex;align-items:center;gap:5px"><div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div><span style="font-size:12px;color:var(--s500)">${p.s}</span><span style="font-size:12px;font-weight:600;color:var(--s700)">${p.n}</span></div>`).join('');
    return `<div class="card"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px"><div><div class="card-title">Ticket pipeline</div><div class="text-muted" style="font-size:12px;margin-top:2px">Live distribution across lifecycle stages</div></div><span class="text-muted" style="font-size:12px">${tickets.length} total</span></div><div style="display:flex;gap:3px;height:28px;border-radius:8px;overflow:hidden">${bar}</div><div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">${leg}</div></div>`;
  }

  function _renderWeeklyTrend() {
    const w=[{d:'Mon',c:12,r:9},{d:'Tue',c:18,r:14},{d:'Wed',c:8,r:11},{d:'Thu',c:22,r:16},{d:'Fri',c:15,r:19},{d:'Sat',c:5,r:7},{d:'Sun',c:3,r:4}];
    return `<div class="card"><div class="card-title" style="margin-bottom:3px">Weekly trend</div><div class="text-muted" style="font-size:12px;margin-bottom:14px">Tickets created vs. resolved</div>${lineChart(w)}<div style="display:flex;gap:16px;margin-top:10px"><div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#6366f1;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Created</span></div><div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#10b981;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Resolved</span></div></div></div>`;
  }

  function _renderPriority(tickets) {
    const pd=[{n:'Critical',v:tickets.filter(t=>t.priority==='critical').length||12,c:'#f43f5e'},{n:'High',v:tickets.filter(t=>t.priority==='high').length||28,c:'#f97316'},{n:'Medium',v:tickets.filter(t=>t.priority==='medium').length||45,c:'#f59e0b'},{n:'Low',v:tickets.filter(t=>t.priority==='low').length||31,c:'#10b981'}];
    const pT=Math.max(pd.reduce((a,p)=>a+p.v,0),1);
    let off=25;const ci=2*Math.PI*38;
    const slices=pd.map(p=>{const pct=p.v/pT;const d=pct*ci;const el=`<circle cx="50" cy="50" r="38" fill="none" stroke="${p.c}" stroke-width="14" stroke-dasharray="${d.toFixed(1)} ${(ci-d).toFixed(1)}" stroke-dashoffset="-${((off/100)*ci).toFixed(1)}"/>`;off+=pct*100;return el;}).join('');
    const leg=pd.map(p=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0"><div style="display:flex;align-items:center;gap:7px"><div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div><span style="font-size:12px;color:var(--s600)">${p.n}</span></div><span style="font-size:12px;font-weight:600;color:var(--s700)">${p.v}</span></div>`).join('');
    return `<div class="card"><div class="card-title" style="margin-bottom:3px">By priority</div><div class="text-muted" style="font-size:12px;margin-bottom:10px">${pT} open tickets</div><div style="display:flex;justify-content:center;margin-bottom:12px"><svg width="100" height="100" viewBox="0 0 100 100">${slices}<text x="50" y="46" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${pT}</text><text x="50" y="60" text-anchor="middle" font-size="10" fill="#94a3b8">tickets</text></svg></div>${leg}</div>`;
  }

  function _renderRecent(tickets, S) {
    const rows=[...tickets].reverse().slice(0,4).map(t=>`<div class="recent-ticket-row" onclick="location.hash='#tickets/${t.number}'"><div style="flex:1;min-width:0"><div class="cell-title">${S.esc(t.subject)}</div><div class="text-muted" style="font-size:11px;margin-top:1px">${t.number} · ${S.esc(S.customerName(t.customerId))}</div></div><div style="display:flex;gap:6px;flex-shrink:0">${S.priorityBadge(t.priority)}${S.statusBadge(t.status)}</div></div>`).join('')||`<div class="empty-state-sm">No tickets yet. <a href="#tickets" class="link">Create one →</a></div>`;
    return `<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div class="card-title">Recent tickets</div><a href="#tickets" class="link" style="font-size:12px;font-weight:500">View all →</a></div>${rows}</div>`;
  }

  function _renderActivity(I) {
    const acts=[
      {text:'TK-007 escalated to Critical',  time:'2m ago',  c:'#f43f5e'},
      {text:'New customer: CloudPath added',  time:'18m ago', c:'#6366f1'},
      {text:'TK-005 resolved by Dev Team',    time:'1h ago',  c:'#10b981'},
      {text:'TK-004 assigned to Alex Chen',   time:'2h ago',  c:'#06b6d4'},
    ];
    const actHtml=acts.map(a=>`<div class="activity-item"><div class="activity-dot" style="background:${a.c}"></div><div><div style="font-size:13px;color:var(--s700);font-weight:500">${a.text}</div><div style="font-size:11px;color:var(--s400);margin-top:2px">${a.time}</div></div></div>`).join('');
    return `<div class="card"><div class="card-title" style="margin-bottom:16px">Activity feed</div>${actHtml}<div style="border-top:1px solid var(--s100);padding-top:14px;margin-top:6px"><div style="font-size:14px;font-weight:700;color:var(--s800);margin-bottom:10px">Quick actions</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="quick-action-btn" style="--qa-color:#6366f1" onclick="NexCRM.Tickets.openCreateModal()">${I('plus',14)} New ticket</button><button class="quick-action-btn" style="--qa-color:#06b6d4" onclick="NexCRM.Customers.openCreateModal()">${I('plus',14)} Customer</button><a href="#tickets" class="quick-action-btn" style="--qa-color:#8b5cf6">${I('search',14)} Search</a><a href="#customers" class="quick-action-btn" style="--qa-color:#10b981">${I('barchart',14)} Reports</a></div></div></div>`;
  }

  function _renderAvgTime(tickets, I) {
    const {val,sub} = avgResTime(tickets);
    return `<div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" style="background:#8b5cf615;color:#8b5cf6">${I('trending',18)}</div></div><div><div class="kpi-value">${val}</div><div class="kpi-label">Avg Resolution Time</div><div style="font-size:11px;color:var(--text-3);margin-top:3px">${sub}</div></div></div>`;
  }

  // ── Wrap widget with edit controls ────────────────────────────────────────
  function _editWrap(id, html, title, I) {
    return `<div class="widget-wrap" id="w-${id}" draggable="true"
        ondragstart="NexCRM.Dashboard._dragStart('${id}')"
        ondragover="event.preventDefault();document.getElementById('w-${id}').classList.add('drag-over')"
        ondragleave="document.getElementById('w-${id}').classList.remove('drag-over')"
        ondrop="NexCRM.Dashboard._drop('${id}')">
      <div class="widget-edit-bar">
        <span>${I('menu',13)} ${title}</span>
        <div style="display:flex;gap:4px">
          <span class="widget-drag-handle" title="Drag to reorder">${I('more',13)}</span>
          <button class="widget-remove-btn" onclick="NexCRM.Dashboard._removeWidget('${id}')" title="Remove widget">${I('x',13)}</button>
        </div>
      </div>
      ${html}
    </div>`;
  }

  // ── Admin drag-and-drop ───────────────────────────────────────────────────
  let _dragId = null;
  function _dragStart(id) { _dragId = id; }
  function _drop(targetId) {
    document.querySelectorAll('.widget-wrap').forEach(w=>w.classList.remove('drag-over'));
    if (!_dragId || _dragId === targetId) return;
    const hidden = getHidden();
    const layout = getLayout();
    // Find and swap rows
    const fi = layout.findIndex(r=>r===_dragId||r.includes(_dragId));
    const ti = layout.findIndex(r=>r===targetId||r.includes(targetId));
    if (fi>=0 && ti>=0) { [layout[fi],layout[ti]] = [layout[ti],layout[fi]]; saveLayout(layout); }
    _dragId = null;
    render();
  }
  function _removeWidget(id) {
    const hidden = getHidden();
    if (!hidden.includes(id)) { hidden.push(id); saveHidden(hidden); }
    render();
  }
  function openWidgetPicker() {
    const S = NexCRM.Utils; const I = NexCRM.icon;
    const hidden = getHidden();
    const body = `<p style="font-size:12px;color:var(--s500);margin-bottom:14px">Toggle widgets on or off. Reorder by dragging in edit mode.</p>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${Object.entries(ALL_WIDGETS).map(([id,meta])=>{
          const isHidden = hidden.includes(id);
          return `<div class="col-item">
            <div><div class="col-item-label">${meta.title}</div><div style="font-size:11px;color:var(--text-3)">${meta.desc}</div></div>
            <button class="toggle-switch${isHidden?'':' on'}" id="wtog-${id}" onclick="NexCRM.Dashboard._toggleWidget('${id}')">
              <div class="toggle-knob"></div>
            </button>
          </div>`;
        }).join('')}
      </div>`;
    S.openModal('Manage dashboard widgets', body,
      `<button class="btn btn-ghost" onclick="NexCRM.Dashboard._resetWidgets()">Reset defaults</button>
       <button class="btn btn-primary" onclick="NexCRM.Utils.closeModal()">Done</button>`);
  }
  function _toggleWidget(id) {
    const hidden = getHidden();
    const newH = hidden.includes(id) ? hidden.filter(h=>h!==id) : [...hidden,id];
    saveHidden(newH);
    const btn = document.getElementById('wtog-'+id);
    if (btn) btn.classList.toggle('on', !newH.includes(id));
    render(); // re-render dashboard in background
  }
  function _resetWidgets() { saveHidden([]); saveLayout([...DEFAULT_LAYOUT]); NexCRM.Utils.closeModal(); render(); }

  // ── Main render ───────────────────────────────────────────────────────────
  function render() {
    NexCRM.Layout.renderTopbar('Dashboard');
    NexCRM.Layout.renderSidebar('dashboard');
    const S = NexCRM.Utils; const I = NexCRM.icon;
    const tickets   = NexCRM.Store.Tickets.getAll();
    const customers = NexCRM.Store.Customers.getAll();
    const isAdmin   = NexCRM.Auth.isAdmin();
    const hidden    = getHidden();

    function w(id, html, title) {
      if (hidden.includes(id)) return '';
      return _editMode && isAdmin ? _editWrap(id, html, title, I) : `<div class="widget-wrap" id="w-${id}">${html}</div>`;
    }

    const avgW = w('avg_time', `<div class="kpi-grid">${_renderAvgTime(tickets,I)}</div>`, 'Avg Resolution Time');

    const sections = [
      w('kpis',         _renderKpis(tickets,I),   'KPI Cards'),
      w('pipeline',     _renderPipeline(tickets),  'Ticket Pipeline'),
      `<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;width:100%">
        ${w('weekly_trend', _renderWeeklyTrend(), 'Weekly Trend')}
        ${w('priority',     _renderPriority(tickets), 'By Priority')}
      </div>`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%">
        ${w('recent',   _renderRecent(tickets,S), 'Recent Tickets')}
        ${w('activity', _renderActivity(I),       'Activity Feed')}
      </div>`,
      avgW,
      _editMode && isAdmin ? `<div class="add-widget-btn" onclick="NexCRM.Dashboard.openWidgetPicker()">${I('plus',16)} Add / manage widgets</div>` : '',
    ].filter(Boolean);

    const editBar = isAdmin ? `
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px">
        ${_editMode
          ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Dashboard._saveEdit()">${I('check_c',13)} Done editing</button>`
          : `<button class="btn btn-ghost btn-sm" onclick="NexCRM.Dashboard._startEdit()">${I('edit',13)} Customize</button>`}
      </div>` : '';

    document.getElementById('page-content').innerHTML = `<div class="page-body">${editBar}${sections.join('')}</div>`;
  }

  function _startEdit() { _editMode = true;  render(); }
  function _saveEdit()  { _editMode = false; render(); }

  window.NexCRM.Dashboard = { render, openWidgetPicker, _toggleWidget, _resetWidgets, _dragStart, _drop, _removeWidget, _startEdit, _saveEdit, _showTip, _moveTip, _hideTip };
})();
