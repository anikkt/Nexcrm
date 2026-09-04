window.NexCRM = window.NexCRM || {};

(function () {
  let _confirmCb = null;

  const STATUS_CFG = {
    new:             { l:'New',             bg:'#eef2ff', tx:'#4338ca' },
    assigned:        { l:'Assigned',        bg:'#ecfeff', tx:'#0e7490' },
    in_progress:     { l:'In Progress',     bg:'#f5f3ff', tx:'#6d28d9' },
    pending:         { l:'Pending',         bg:'#fffbeb', tx:'#b45309' },
    waiting_customer:{ l:'Waiting',         bg:'#fff7ed', tx:'#c2410c' },
    resolved:        { l:'Resolved',        bg:'#ecfdf5', tx:'#065f46' },
    closed:          { l:'Closed',          bg:'#f1f5f9', tx:'#475569' },
  };
  const PRIORITY_CFG = {
    low:      { l:'Low',      bg:'#ecfdf5', tx:'#065f46' },
    medium:   { l:'Medium',   bg:'#fffbeb', tx:'#b45309' },
    high:     { l:'High',     bg:'#fff7ed', tx:'#c2410c' },
    critical: { l:'Critical', bg:'#fff1f2', tx:'#be123c' },
  };

  function toast(msg, type = 'success', duration = 3500) {
    const ct = document.getElementById('toast-container');
    if (!ct) return;
    const id = 't' + Date.now();
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const d = document.createElement('div');
    d.id = id; d.className = `toast toast-${type}`;
    d.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-message">${esc(msg)}</span><button class="toast-close" onclick="document.getElementById('${id}')?.remove()">×</button>`;
    ct.appendChild(d);
    setTimeout(() => { const el = document.getElementById(id); if(el){el.classList.add('toast-fade'); setTimeout(()=>el.remove(), 300);} }, duration);
  }

  function openModal(title, bodyHtml, footerHtml = '', size = 'md') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml;
    document.getElementById('modal-box').className = `modal-box modal-${size}`;
    const bd = document.getElementById('modal-backdrop');
    bd.classList.remove('hidden');
    setTimeout(() => bd.classList.add('modal-show'), 10);
  }

  function closeModal() {
    const bd = document.getElementById('modal-backdrop');
    bd.classList.remove('modal-show');
    setTimeout(() => bd.classList.add('hidden'), 200);
  }

  function handleBackdropClick(e) { if (e.target === document.getElementById('modal-backdrop')) closeModal(); }

  function confirm(msg, cb, label = 'Delete', type = 'danger') {
    _confirmCb = cb;
    openModal('Confirm action',
      `<p style="font-size:14px;color:var(--s600);line-height:1.7">${msg}</p>`,
      `<button class="btn btn-ghost" onclick="NexCRM.Utils.closeModal()">Cancel</button>
       <button class="btn btn-${type}" onclick="NexCRM.Utils._doConfirm()">${label}</button>`
    );
  }
  function _doConfirm() { if (_confirmCb) { _confirmCb(); _confirmCb = null; } closeModal(); }

  function avatar(name, size = 32) {
    if (!name) return '';
    const ini = name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const cc = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e'];
    const ci = ((name.charCodeAt(0)||0) + (name.charCodeAt(1)||0)) % cc.length;
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px;background:${cc[ci]}22;border:1.5px solid ${cc[ci]}44;color:${cc[ci]}">${ini}</div>`;
  }

  function statusBadge(s) {
    const c = STATUS_CFG[s] || { l: s, bg:'#f1f5f9', tx:'#475569' };
    return `<span class="badge" style="background:${c.bg};color:${c.tx}">${c.l}</span>`;
  }
  function priorityBadge(p) {
    const c = PRIORITY_CFG[p] || { l: p, bg:'#f1f5f9', tx:'#475569' };
    return `<span class="badge" style="background:${c.bg};color:${c.tx}">${c.l}</span>`;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return iso; }
  }
  function fmtRelative(iso) {
    if (!iso) return '';
    const d = Date.now() - new Date(iso).getTime();
    if (d < 60000)   return 'just now';
    if (d < 3600000) return Math.floor(d/60000) + 'm ago';
    if (d < 86400000)return Math.floor(d/3600000) + 'h ago';
    return Math.floor(d/86400000) + 'd ago';
  }

  function userName(id) { if (!id) return '—'; const u = NexCRM.Store.Users.get(id); return u ? u.name : '—'; }
  function customerName(id) { if (!id) return '—'; const c = NexCRM.Store.Customers.get(id); return c ? c.name : '—'; }
  function departmentName(id) { if (!id) return '—'; const d = NexCRM.Store.Departments?.get(id); return d ? d.name : '—'; }
  function categoryName(id)   { if (!id) return '—'; const c = NexCRM.Store.TicketCategories?.get(id); return c ? c.name : '—'; }
  function categoryColor(id)  { if (!id) return '#94a3b8'; const c = NexCRM.Store.TicketCategories?.get(id); return c ? c.color : '#94a3b8'; }

  function exportCSV(rows, filename) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = filename; a.click();
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── SVG icon library ──────────────────────────────────────────────────────
  const _IP = {
    dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    tickets:   '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/>',
    customers: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    profile:   '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    bell:      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    settings:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    users:     '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    trending:  '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    book:      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    barchart:  '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    zap:       '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    layers:    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    logout:    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    search:    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu:      '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    moon:      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun:       '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    plus:      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    download:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    edit:      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash:     '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    more:      '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    alert_c:   '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    check_c:   '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    alert_t:   '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    ticket_k:  '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>',
    file:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    arrow_up:  '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    arrow_dn:  '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    x:         '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  };
  function icon(name, size) {
    const s = size || 17;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0">${_IP[name]||''}</svg>`;
  }

  window.NexCRM.Utils = { toast, openModal, closeModal, handleBackdropClick, confirm, _doConfirm, avatar, statusBadge, priorityBadge, fmtDate, fmtRelative, userName, customerName, departmentName, categoryName, categoryColor, exportCSV, esc, STATUS_CFG, PRIORITY_CFG, icon };
  window.NexCRM.toast = toast;
  window.NexCRM.icon = icon;
})();
