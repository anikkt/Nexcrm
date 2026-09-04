window.NexCRM = window.NexCRM || {};

(function () {

  // ── Live data helpers ──────────────────────────────────────────────────────

  /** Last 7 days anchored to the most recent ticket date.
   *  This way demo data (July 2025) always shows instead of flat zeros. */
  function weeklyData(tickets) {
    const empty = [
      {d:'Mon',c:0,r:0},{d:'Tue',c:0,r:0},{d:'Wed',c:0,r:0},{d:'Thu',c:0,r:0},
      {d:'Fri',c:0,r:0},{d:'Sat',c:0,r:0},{d:'Sun',c:0,r:0},
    ];
    if (!tickets.length) return empty;

    // Anchor to latest known date across all tickets
    const allDates = tickets.flatMap(t => [t.createdAt, t.updatedAt]).filter(Boolean).sort();
    const anchor   = new Date(allDates[allDates.length - 1]);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().slice(0, 10);
      return {
        d: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
        c: tickets.filter(t => (t.createdAt||'').slice(0,10) === ds).length,
        r: tickets.filter(t => ['resolved','closed'].includes(t.status) && (t.updatedAt||'').slice(0,10) === ds).length,
      };
    });
  }

  /** KPI delta: compare this-week vs last-week ticket count, anchored to data. */
  function kpiDelta(tickets) {
    const dates = tickets.map(t => t.createdAt).filter(Boolean).sort();
    if (!dates.length) return { val:'No data yet', up:true };
    const anchor    = new Date(dates[dates.length - 1]);
    const weekAgo   = new Date(anchor); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWksAgo = new Date(anchor); twoWksAgo.setDate(twoWksAgo.getDate() - 14);
    const thisWk = tickets.filter(t => new Date(t.createdAt) >= weekAgo).length;
    const lastWk = tickets.filter(t => new Date(t.createdAt) >= twoWksAgo && new Date(t.createdAt) < weekAgo).length;
    if (!lastWk && !thisWk) return { val:'No activity', up:true };
    if (!lastWk) return { val:`+${thisWk} this week`, up:true };
    const pct = Math.round(((thisWk - lastWk) / lastWk) * 100);
    return { val:`${pct >= 0 ? '+' : ''}${pct}% vs last week`, up: pct >= 0 };
  }

  /** Open delta: how many open tickets vs last week. */
  function openDelta(tickets) {
    const now  = tickets.filter(t => ['new','assigned','in_progress'].includes(t.status)).length;
    const dates = tickets.map(t=>t.createdAt).filter(Boolean).sort();
    if (!dates.length) return { val:'–', up:true };
    const anchor  = new Date(dates[dates.length-1]);
    const weekAgo = new Date(anchor); weekAgo.setDate(weekAgo.getDate()-7);
    const prev = tickets.filter(t => ['new','assigned','in_progress'].includes(t.status) && new Date(t.createdAt) < weekAgo).length;
    const diff = now - prev;
    if (diff === 0) return { val:'No change', up:true };
    return { val:`${diff>0?'+':''}${diff} vs last week`, up: diff < 0 };
  }

  /** Avg resolution time from actual resolved tickets. */
  function avgResTime(tickets) {
    const r = tickets.filter(t => t.status==='resolved' && t.createdAt && t.updatedAt);
    if (!r.length) return { val:'—', sub:'No resolved tickets yet' };
    const ms  = r.reduce((s,t) => s + new Date(t.updatedAt) - new Date(t.createdAt), 0) / r.length;
    const h   = ms / 3600000;
    const val = h < 1 ? `${Math.round(h*60)}m` : h < 24 ? `${h.toFixed(1)}h` : `${(h/24).toFixed(1)}d`;
    return { val, sub:`Avg across ${r.length} resolved case${r.length!==1?'s':''}` };
  }

  /** Live activity feed — derived from actual ticket & customer events. */
  function buildActivity(tickets, customers, S) {
    const events = [];

    // One event per ticket, picking the most notable status/event
    const byRecent = [...tickets].sort((a,b) => new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
    for (const t of byRecent.slice(0, 10)) {
      const lastComment = (t.comments||[])[t.comments.length-1];
      if (lastComment && lastComment.createdAt > (t.createdAt||'')) {
        const author = S.userName(lastComment.authorId);
        events.push({ text:`${author} commented on ${t.number}`, date:lastComment.createdAt, c:'#8b5cf6' });
      } else if (t.status === 'resolved') {
        events.push({ text:`${t.number} resolved — ${t.subject.slice(0,38)}`, date:t.updatedAt, c:'#10b981' });
      } else if (t.priority === 'critical' && !['resolved','closed'].includes(t.status)) {
        events.push({ text:`${t.number} escalated to Critical`, date:t.updatedAt||t.createdAt, c:'#f43f5e' });
      } else if (t.assignedToId) {
        events.push({ text:`${t.number} assigned to ${S.userName(t.assignedToId)}`, date:t.updatedAt||t.createdAt, c:'#06b6d4' });
      } else {
        events.push({ text:`${t.number} created — ${t.subject.slice(0,38)}`, date:t.createdAt, c:'#6366f1' });
      }
    }

    // Recent customers
    const recentCusts = [...customers].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0,3);
    for (const c of recentCusts) {
      events.push({ text:`New customer: ${c.name} (${c.company})`, date:c.createdAt, c:'#f59e0b' });
    }

    return events
      .filter(e => e.date)
      .sort((a,b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }

  // ── Smooth SVG line chart with hover tooltips ──────────────────────────────
  function lineChart(data) {
    const W=500, H=190, ml=32, mr=10, mt=10, mb=26;
    const iW=W-ml-mr, iH=H-mt-mb;
    const maxRaw = Math.max(...data.flatMap(d=>[d.c,d.r]), 1);
    const maxV   = Math.ceil(maxRaw * 1.25) || 5;   // 25% headroom, min 5

    const x = i  => ml + i / (data.length-1) * iW;
    const y = v  => mt + (1 - v/maxV) * iH;

    function bez(vals) {
      const pts = vals.map((v,i) => [x(i), y(v)]);
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i=1;i<pts.length;i++) {
        const cx = (pts[i-1][0]+pts[i][0])/2;
        d += ` C${cx.toFixed(1)} ${pts[i-1][1].toFixed(1)},${cx.toFixed(1)} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
      }
      return d;
    }
    function area(vals) {
      const pts  = vals.map((v,i) => [x(i), y(v)]);
      const base = mt + iH;
      let d = `M${pts[0][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i=1;i<pts.length;i++) {
        const cx=(pts[i-1][0]+pts[i][0])/2;
        d += ` C${cx.toFixed(1)} ${pts[i-1][1].toFixed(1)},${cx.toFixed(1)} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
      }
      d += ` L${pts[pts.length-1][0].toFixed(1)} ${base} Z`;
      return d;
    }

    // Y-axis labels: 0, ¼, ½, ¾, max
    const yTicks = [0, Math.round(maxV*0.25), Math.round(maxV*0.5), Math.round(maxV*0.75), maxV];
    const grids = yTicks.map(v => {
      const yv = y(v).toFixed(1);
      return `<line x1="${ml}" y1="${yv}" x2="${W-mr}" y2="${yv}" stroke="#e2e8f0" stroke-width="1"/>
              <text x="${ml-4}" y="${(parseFloat(yv)+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;
    }).join('');

    const xlabels = data.map((d,i) =>
      `<text x="${x(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.d}</text>`
    ).join('');

    const step = iW / (data.length - 1);
    const hoverRects = data.map((d,i) => {
      const bx = Math.max(ml, x(i) - step/2);
      const bw = Math.min(step, W-mr-bx);
      return `<rect x="${bx.toFixed(1)}" y="${mt}" width="${bw.toFixed(1)}" height="${iH}"
        fill="transparent" style="cursor:crosshair"
        onmouseover="NexCRM.Dashboard._showTip(event,'${d.d}',${d.c},${d.r})"
        onmousemove="NexCRM.Dashboard._moveTip(event)"
        onmouseout="NexCRM.Dashboard._hideTip()"/>`;
    }).join('');

    const cV = data.map(d=>d.c), rV = data.map(d=>d.r);

    return `<div id="chart-wrap" style="position:relative">
      <svg id="weekly-chart" width="100%" height="190" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lgc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/>
          </linearGradient>
          <linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.01"/>
          </linearGradient>
        </defs>
        ${grids}${xlabels}
        <path d="${area(cV)}" fill="url(#lgc)"/>
        <path d="${area(rV)}" fill="url(#lgr)"/>
        <path d="${bez(cV)}"  fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/>
        <path d="${bez(rV)}"  fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        ${hoverRects}
      </svg>
      <div id="chart-tooltip" class="chart-tooltip"></div>
    </div>`;
  }

  function _showTip(e, day, created, resolved) {
    const tip = document.getElementById('chart-tooltip');
    if (!tip) return;
    tip.innerHTML = `
      <div style="font-weight:700;color:var(--text);font-size:12px;margin-bottom:6px">${day}</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6366f1;margin-bottom:3px">
        <div style="width:8px;height:8px;border-radius:50%;background:#6366f1"></div>Created: <strong>${created}</strong>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#10b981">
        <div style="width:8px;height:8px;border-radius:50%;background:#10b981"></div>Resolved: <strong>${resolved}</strong>
      </div>`;
    tip.style.display = 'block';
    _moveTip(e);
  }
  function _moveTip(e) {
    const tip  = document.getElementById('chart-tooltip');
    const wrap = document.getElementById('chart-wrap');
    if (!tip || !wrap) return;
    const r = wrap.getBoundingClientRect();
    let left = e.clientX - r.left + 12;
    let top  = e.clientY - r.top  - 72;
    if (left + 160 > wrap.offsetWidth) left = left - 175;
    if (top < 0) top = 5;
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }
  function _hideTip() {
    const tip = document.getElementById('chart-tooltip');
    if (tip) tip.style.display = 'none';
  }

  // ── Widget edit infrastructure ─────────────────────────────────────────────
  const ALL_WIDGETS = {
    kpis:         { title:'KPI Cards',           desc:'Total, Open, Resolved, Critical + Avg Time' },
    pipeline:     { title:'Ticket Pipeline',     desc:'Live lifecycle distribution bar' },
    weekly_trend: { title:'Weekly Trend Chart',  desc:'Created vs resolved (last 7 days)' },
    priority:     { title:'By Priority',         desc:'Priority breakdown donut (live counts)' },
    recent:       { title:'Recent Tickets',      desc:'Latest 4 tickets from store' },
    activity:     { title:'Activity Feed',       desc:'Real events from tickets & customers' },
  };
  const DEFAULT_LAYOUT = ['kpis','pipeline','weekly_trend+priority','recent+activity'];

  function getLayout() { try{return JSON.parse(localStorage.getItem('ncm_dash_layout'))||[...DEFAULT_LAYOUT];}catch{return[...DEFAULT_LAYOUT];} }
  function saveLayout(l){ localStorage.setItem('ncm_dash_layout',JSON.stringify(l)); }
  function getHidden()   { try{return JSON.parse(localStorage.getItem('ncm_dash_hidden'))||[];}catch{return[];} }
  function saveHidden(h) { localStorage.setItem('ncm_dash_hidden',JSON.stringify(h)); }

  let _editMode = false;
  let _dragId   = null;

  function _editWrap(id, html, title, I) {
    return `<div class="widget-wrap" id="w-${id}" draggable="true"
        ondragstart="NexCRM.Dashboard._dragStart('${id}')"
        ondragover="event.preventDefault();document.getElementById('w-${id}')?.classList.add('drag-over')"
        ondragleave="document.getElementById('w-${id}')?.classList.remove('drag-over')"
        ondrop="NexCRM.Dashboard._drop('${id}')">
      <div class="widget-edit-bar">
        <span>${I('menu',13)} ${title}</span>
        <div style="display:flex;gap:4px">
          <span class="widget-drag-handle">${I('more',13)}</span>
          <button class="widget-remove-btn" onclick="NexCRM.Dashboard._removeWidget('${id}')">${I('x',13)}</button>
        </div>
      </div>
      ${html}
    </div>`;
  }

  function _dragStart(id) { _dragId = id; }
  function _drop(targetId) {
    document.querySelectorAll('.widget-wrap').forEach(w=>w.classList.remove('drag-over'));
    if (!_dragId || _dragId === targetId) return;
    const layout = getLayout();
    const fi = layout.findIndex(r=>r===_dragId||r.includes(_dragId));
    const ti = layout.findIndex(r=>r===targetId||r.includes(targetId));
    if (fi>=0&&ti>=0) { [layout[fi],layout[ti]]=[layout[ti],layout[fi]]; saveLayout(layout); }
    _dragId = null; render();
  }
  function _removeWidget(id) {
    const h = getHidden(); if (!h.includes(id)){h.push(id);saveHidden(h);} render();
  }
  function _startEdit() { _editMode=true;  render(); }
  function _saveEdit()  { _editMode=false; render(); }

  function openWidgetPicker() {
    const S=NexCRM.Utils, I=NexCRM.icon;
    const hidden=getHidden();
    const body=`<p style="font-size:12px;color:var(--s500);margin-bottom:14px">Toggle widgets. All data is live from your cases.</p>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${Object.entries(ALL_WIDGETS).map(([id,m])=>`
          <div class="col-item">
            <div><div class="col-item-label">${m.title}</div><div style="font-size:11px;color:var(--text-3)">${m.desc}</div></div>
            <button class="toggle-switch${hidden.includes(id)?'':' on'}" id="wtog-${id}" onclick="NexCRM.Dashboard._toggleWidget('${id}')"><div class="toggle-knob"></div></button>
          </div>`).join('')}
      </div>`;
    S.openModal('Dashboard widgets', body,
      `<button class="btn btn-ghost" onclick="NexCRM.Dashboard._resetWidgets()">Reset defaults</button>
       <button class="btn btn-primary" onclick="NexCRM.Utils.closeModal()">Done</button>`);
  }
  function _toggleWidget(id) {
    const h=getHidden();
    const nh=h.includes(id)?h.filter(x=>x!==id):[...h,id];
    saveHidden(nh);
    const btn=document.getElementById('wtog-'+id);
    if(btn) btn.classList.toggle('on',!nh.includes(id));
    render();
  }
  function _resetWidgets(){ saveHidden([]); saveLayout([...DEFAULT_LAYOUT]); NexCRM.Utils.closeModal(); render(); }

  // ── Widget renderers (all data from store) ─────────────────────────────────

  function _renderKpis(tickets, I) {
    const open     = tickets.filter(t=>['new','assigned','in_progress'].includes(t.status)).length;
    const resolved = tickets.filter(t=>t.status==='resolved').length;
    const critical = tickets.filter(t=>t.priority==='critical'&&!['resolved','closed'].includes(t.status)).length;
    const delta    = kpiDelta(tickets);
    const oDelta   = openDelta(tickets);
    const resThisWeek = (() => {
      const dates = tickets.map(t=>t.updatedAt).filter(Boolean).sort();
      if (!dates.length) return {val:'No data',up:true};
      const anchor=new Date(dates[dates.length-1]);
      const wkAgo=new Date(anchor); wkAgo.setDate(wkAgo.getDate()-7);
      const n=tickets.filter(t=>t.status==='resolved'&&new Date(t.updatedAt)>=wkAgo).length;
      return {val:`${n} in last 7 days`,up:n>0};
    })();
    const avg = avgResTime(tickets);

    const kpis = [
      { label:'Total Tickets',   value:tickets.length, delta:delta.val,       up:delta.up,       icon:'ticket_k', accent:'#6366f1' },
      { label:'Open Tickets',    value:open,           delta:oDelta.val,      up:oDelta.up,      icon:'alert_c',  accent:'#f59e0b' },
      { label:'Resolved',        value:resolved,       delta:resThisWeek.val, up:resThisWeek.up, icon:'check_c',  accent:'#10b981' },
      { label:'Critical',        value:critical,       delta:critical===0?'All clear':'Needs attention', up:critical===0, icon:'alert_t', accent:'#f43f5e' },
    ];

    return `<div class="kpi-grid">
      ${kpis.map(k=>`
        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-icon" style="background:${k.accent}15;color:${k.accent}">${I(k.iname||k.icon,18)}</div>
            <span class="kpi-delta ${k.up?'up':'down'}">${k.up?I('arrow_up',12):I('arrow_dn',12)} ${k.delta}</span>
          </div>
          <div><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div>
        </div>`).join('')}
      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-icon" style="background:#8b5cf615;color:#8b5cf6">${I('trending',18)}</div>
        </div>
        <div><div class="kpi-value">${avg.val}</div><div class="kpi-label">Avg Resolution</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${avg.sub}</div></div>
      </div>
    </div>`;
  }

  function _renderPipeline(tickets) {
    const stages = [
      {s:'New',        n:tickets.filter(t=>t.status==='new').length,        c:'#6366f1'},
      {s:'Assigned',   n:tickets.filter(t=>t.status==='assigned').length,   c:'#06b6d4'},
      {s:'In Progress',n:tickets.filter(t=>t.status==='in_progress').length,c:'#8b5cf6'},
      {s:'Pending',    n:tickets.filter(t=>t.status==='pending').length,    c:'#f59e0b'},
      {s:'Resolved',   n:tickets.filter(t=>t.status==='resolved').length,   c:'#10b981'},
      {s:'Closed',     n:tickets.filter(t=>t.status==='closed').length,     c:'#94a3b8'},
    ];
    const total = Math.max(stages.reduce((a,p)=>a+p.n,0),1);
    stages.forEach(p => p.w = Math.max(Math.round((p.n/total)*100), p.n>0?1:0));

    const bar = stages.map(p=>
      `<div title="${p.s}: ${p.n}" style="flex:${Math.max(p.w,p.n>0?1:0)};background:${p.c};display:flex;align-items:center;justify-content:center">
        ${p.w>8?`<span style="font-size:11px;font-weight:700;color:#fff">${p.n}</span>`:''}
      </div>`
    ).join('');
    const leg = stages.map(p=>
      `<div style="display:flex;align-items:center;gap:5px">
        <div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div>
        <span style="font-size:12px;color:var(--s500)">${p.s}</span>
        <span style="font-size:12px;font-weight:600;color:var(--s700)">${p.n}</span>
      </div>`
    ).join('');

    return `<div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
        <div><div class="card-title">Ticket pipeline</div><div class="text-muted" style="font-size:12px;margin-top:2px">Live distribution across all lifecycle stages</div></div>
        <span class="text-muted" style="font-size:12px">${tickets.length} total</span>
      </div>
      <div style="display:flex;gap:3px;height:28px;border-radius:8px;overflow:hidden">${bar}</div>
      <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">${leg}</div>
    </div>`;
  }

  function _renderWeeklyTrend(tickets) {
    const data  = weeklyData(tickets);
    const total = data.reduce((s,d)=>s+d.c+d.r,0);
    return `<div class="card">
      <div class="card-title" style="margin-bottom:3px">Weekly trend</div>
      <div class="text-muted" style="font-size:12px;margin-bottom:14px">
        Tickets created vs. resolved · last 7 days · ${total} total events
      </div>
      ${lineChart(data)}
      <div style="display:flex;gap:16px;margin-top:10px">
        <div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#6366f1;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Created</span></div>
        <div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:3px;background:#10b981;border-radius:2px"></div><span style="font-size:11px;color:var(--s500)">Resolved</span></div>
      </div>
    </div>`;
  }

  function _renderPriority(tickets) {
    // Live counts — no fallback dummy values
    const pd = [
      {n:'Critical', v:tickets.filter(t=>t.priority==='critical').length, c:'#f43f5e'},
      {n:'High',     v:tickets.filter(t=>t.priority==='high').length,     c:'#f97316'},
      {n:'Medium',   v:tickets.filter(t=>t.priority==='medium').length,   c:'#f59e0b'},
      {n:'Low',      v:tickets.filter(t=>t.priority==='low').length,      c:'#10b981'},
    ];
    const total = Math.max(pd.reduce((a,p)=>a+p.v,0), 1);

    let off = 25;
    const circ = 2 * Math.PI * 38;
    const slices = pd.map(p => {
      const pct = p.v / total;
      const d   = pct * circ;
      const el  = `<circle cx="50" cy="50" r="38" fill="none" stroke="${p.c}" stroke-width="14"
        stroke-dasharray="${d.toFixed(1)} ${(circ-d).toFixed(1)}"
        stroke-dashoffset="-${((off/100)*circ).toFixed(1)}"/>`;
      off += pct * 100;
      return el;
    }).join('');

    const legend = pd.map(p =>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0">
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:8px;height:8px;border-radius:50%;background:${p.c}"></div>
          <span style="font-size:12px;color:var(--s600)">${p.n}</span>
        </div>
        <span style="font-size:12px;font-weight:600;color:var(--s700)">${p.v}</span>
      </div>`
    ).join('');

    return `<div class="card">
      <div class="card-title" style="margin-bottom:3px">By priority</div>
      <div class="text-muted" style="font-size:12px;margin-bottom:10px">${tickets.length} total tickets</div>
      <div style="display:flex;justify-content:center;margin-bottom:12px">
        <svg width="100" height="100" viewBox="0 0 100 100">
          ${tickets.length ? slices : `<circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" stroke-width="14"/>`}
          <text x="50" y="46" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${tickets.length}</text>
          <text x="50" y="60" text-anchor="middle" font-size="10" fill="#94a3b8">tickets</text>
        </svg>
      </div>
      ${legend}
    </div>`;
  }

  function _renderRecent(tickets, S) {
    const rows = [...tickets].reverse().slice(0,4).map(t =>
      `<div class="recent-ticket-row" onclick="location.hash='#tickets/${t.number}'">
        <div style="flex:1;min-width:0">
          <div class="cell-title">${S.esc(t.subject)}</div>
          <div class="text-muted" style="font-size:11px;margin-top:1px">${t.number} · ${S.esc(S.customerName(t.customerId))}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${S.priorityBadge(t.priority)}${S.statusBadge(t.status)}</div>
      </div>`
    ).join('') || `<div class="empty-state-sm">No tickets yet. <a href="#tickets" class="link">Create one →</a></div>`;

    return `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title">Recent tickets</div>
        <a href="#tickets" class="link" style="font-size:12px;font-weight:500">View all →</a>
      </div>
      ${rows}
    </div>`;
  }

  function _renderActivity(tickets, customers, S, I) {
    const events = buildActivity(tickets, customers, S);
    const actHtml = events.length
      ? events.map(a => `
          <div class="activity-item">
            <div class="activity-dot" style="background:${a.c}"></div>
            <div>
              <div style="font-size:13px;color:var(--s700);font-weight:500">${S.esc(a.text)}</div>
              <div style="font-size:11px;color:var(--s400);margin-top:2px">${S.fmtRelative(a.date)}</div>
            </div>
          </div>`)
        .join('')
      : `<div class="empty-state-sm">No activity yet.</div>`;

    return `<div class="card">
      <div class="card-title" style="margin-bottom:16px">Activity feed</div>
      ${actHtml}
      <div style="border-top:1px solid var(--s100);padding-top:14px;margin-top:6px">
        <div style="font-size:14px;font-weight:700;color:var(--s800);margin-bottom:10px">Quick actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="quick-action-btn" style="--qa-color:#6366f1" onclick="NexCRM.Tickets.openCreateModal()">${I('plus',14)} New ticket</button>
          <button class="quick-action-btn" style="--qa-color:#06b6d4" onclick="NexCRM.Customers.openCreateModal()">${I('plus',14)} Customer</button>
          <a href="#tickets"   class="quick-action-btn" style="--qa-color:#8b5cf6">${I('search',14)} Search tickets</a>
          <a href="#customers" class="quick-action-btn" style="--qa-color:#10b981">${I('customers',14)} All customers</a>
        </div>
      </div>
    </div>`;
  }

  // ── Main render ────────────────────────────────────────────────────────────
  function render() {
    NexCRM.Layout.renderTopbar('Dashboard');
    NexCRM.Layout.renderSidebar('dashboard');
    const S       = NexCRM.Utils;
    const I       = NexCRM.icon;
    const tickets   = NexCRM.Store.Tickets.getAll();
    const customers = NexCRM.Store.Customers.getAll();
    const isAdmin   = NexCRM.Auth.isAdmin();
    const hidden    = getHidden();

    function w(id, html, title) {
      if (hidden.includes(id)) return '';
      return _editMode && isAdmin ? _editWrap(id, html, title, I) : `<div class="widget-wrap" id="w-${id}">${html}</div>`;
    }

    const sections = [
      w('kpis',         _renderKpis(tickets, I),                'KPI Cards'),
      w('pipeline',     _renderPipeline(tickets),               'Ticket Pipeline'),
      `<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;width:100%">
        ${w('weekly_trend', _renderWeeklyTrend(tickets),         'Weekly Trend')}
        ${w('priority',     _renderPriority(tickets),            'By Priority')}
      </div>`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%">
        ${w('recent',   _renderRecent(tickets, S),               'Recent Tickets')}
        ${w('activity', _renderActivity(tickets, customers, S, I),'Activity Feed')}
      </div>`,
      _editMode && isAdmin
        ? `<div class="add-widget-btn" onclick="NexCRM.Dashboard.openWidgetPicker()">${I('plus',16)} Add / manage widgets</div>`
        : '',
    ].filter(Boolean);

    const editBar = isAdmin
      ? `<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px">
          ${_editMode
            ? `<button class="btn btn-primary btn-sm" onclick="NexCRM.Dashboard._saveEdit()">${I('check_c',13)} Done</button>`
            : `<button class="btn btn-ghost btn-sm"  onclick="NexCRM.Dashboard._startEdit()">${I('edit',13)} Customise</button>`
          }
        </div>`
      : '';

    document.getElementById('page-content').innerHTML =
      `<div class="page-body">${editBar}${sections.join('')}</div>`;
  }

  window.NexCRM.Dashboard = {
    render, openWidgetPicker,
    _toggleWidget, _resetWidgets, _dragStart, _drop, _removeWidget,
    _startEdit, _saveEdit, _showTip, _moveTip, _hideTip,
  };
})();
