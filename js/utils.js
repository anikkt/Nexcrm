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

  window.NexCRM.Utils = { toast, openModal, closeModal, handleBackdropClick, confirm, _doConfirm, avatar, statusBadge, priorityBadge, fmtDate, fmtRelative, userName, customerName, exportCSV, esc, STATUS_CFG, PRIORITY_CFG };
  window.NexCRM.toast = toast;
})();
