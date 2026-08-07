window.NexCRM = window.NexCRM || {};

(function () {
  const K = { USERS:'ncm_users', TICKETS:'ncm_tickets', CUSTOMERS:'ncm_customers', NOTIFICATIONS:'ncm_notifs', SETTINGS:'ncm_settings', T_SEQ:'ncm_tseq', C_SEQ:'ncm_cseq' };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => new Date().toISOString();

  function seedIfEmpty() {
    if (load(K.USERS, null) !== null) return;
    const np = { assigned:true, statusUpdates:true, newCustomer:false, mentions:true, systemAlerts:true, weeklyDigest:false };
    save(K.USERS, [
      { id:'u1', name:'Ankit Singh',  email:'admin@nexcrm.dev',   password:'Admin@1234',   role:'admin',   department:'Operations', phone:'+91 98765 00000', active:true, createdAt:'2024-01-01T00:00:00Z', notifPrefs: np },
      { id:'u2', name:'Alex Chen',    email:'manager@nexcrm.dev', password:'Manager@1234', role:'manager', department:'Support',    phone:'+1 415 555 0102',  active:true, createdAt:'2024-01-15T00:00:00Z', notifPrefs: np },
      { id:'u3', name:'Maya Patel',   email:'agent@nexcrm.dev',   password:'Agent@1234',   role:'analyst', department:'Support',    phone:'+91 87654 32100',  active:true, createdAt:'2024-02-01T00:00:00Z', notifPrefs: np },
    ]);
    save(K.CUSTOMERS, [
      { id:'c1', name:'Sarah Mitchell', company:'Acme Corp',        email:'s.mitchell@acme.com',  phone:'+1 415 555 0101', industry:'Technology', status:'active',   notes:'Key enterprise account.', createdAt:'2024-03-12T00:00:00Z' },
      { id:'c2', name:'James Okonkwo',  company:'Vertex Solutions', email:'j.okonkwo@vertex.io',  phone:'+44 20 7946 0132',industry:'Finance',    status:'active',   notes:'',  createdAt:'2023-11-05T00:00:00Z' },
      { id:'c3', name:'Priya Sharma',   company:'TechNova',         email:'priya@technova.dev',   phone:'+91 98765 43210', industry:'Technology', status:'active',   notes:'Feature-request heavy account.', createdAt:'2025-01-20T00:00:00Z' },
      { id:'c4', name:'Tom Beaumont',   company:'Globex Inc',       email:'t.beaumont@globex.com',phone:'+1 646 555 0189', industry:'Retail',     status:'inactive', notes:'',  createdAt:'2024-07-08T00:00:00Z' },
    ]);
    save(K.C_SEQ, 4);
    save(K.TICKETS, [
      { id:'t1', number:'TK-001', subject:'Unable to login after password reset', description:'Customer reports the reset link expires immediately, causing a redirect to an error page after the password reset email is received.', status:'in_progress', priority:'high',     customerId:'c1', assignedToId:'u2', dueDate:'2025-08-02', createdAt:'2025-07-28T09:14:00Z', updatedAt:'2025-07-28T11:30:00Z', comments:[{ id:'cm1', authorId:'u2', text:'Reproduced in staging. JWT token TTL is 5 min but email delivery has ~8 min latency. Proposing TTL extension to 30 min.', internal:false, createdAt:'2025-07-28T11:00:00Z' }] },
      { id:'t2', number:'TK-002', subject:'Invoice not generated for July billing cycle', description:'Monthly invoice automation failed for this customer. Manual invoice was sent as a workaround. Root cause unknown.', status:'new',         priority:'critical', customerId:'c2', assignedToId:null,dueDate:'2025-08-01', createdAt:'2025-07-30T08:00:00Z', updatedAt:'2025-07-30T08:00:00Z', comments:[] },
      { id:'t3', number:'TK-003', subject:'Feature request: bulk CSV export',            description:'Customer wants to export their full ticket history as CSV for internal reporting dashboards.', status:'pending',     priority:'low',      customerId:'c3', assignedToId:'u3', dueDate:'2025-08-10', createdAt:'2025-07-25T14:00:00Z', updatedAt:'2025-07-25T14:00:00Z', comments:[{ id:'cm2', authorId:'u3', text:'Added to backlog. Will implement in next sprint.', internal:true, createdAt:'2025-07-25T15:00:00Z' }] },
      { id:'t4', number:'TK-004', subject:'Dashboard charts not loading on Safari',       description:'Safari 17.x users see blank chart area on the analytics dashboard. Charts load fine on Chrome and Firefox.', status:'assigned',    priority:'medium',   customerId:'c4', assignedToId:'u2', dueDate:'2025-08-05', createdAt:'2025-07-29T10:00:00Z', updatedAt:'2025-07-29T10:00:00Z', comments:[] },
      { id:'t5', number:'TK-005', subject:'API rate limit exceeded during sync',          description:'Integration sync hitting 429 errors during peak hours. Need rate limit increase or exponential backoff implementation.', status:'resolved',    priority:'high',     customerId:'c2', assignedToId:'u2', dueDate:'2025-07-28', createdAt:'2025-07-22T09:00:00Z', updatedAt:'2025-07-28T16:00:00Z', comments:[{ id:'cm3', authorId:'u2', text:'Implemented exponential backoff with 3 retries. Rate limit errors dropped to zero.', internal:false, createdAt:'2025-07-28T16:00:00Z' }] },
    ]);
    save(K.T_SEQ, 5);
    save(K.NOTIFICATIONS, [
      { id:'n1', userId:'u1', type:'danger',  title:'TK-002 requires attention', body:'Invoice not generated for July billing — no assignee yet.', read:false, createdAt:'2025-07-30T08:00:00Z', link:'#tickets/TK-002' },
      { id:'n2', userId:'u2', type:'info',    title:'TK-004 assigned to you',    body:'Dashboard charts not loading on Safari.', read:false, createdAt:'2025-07-29T10:00:00Z', link:'#tickets/TK-004' },
      { id:'n3', userId:'u1', type:'success', title:'TK-005 resolved',           body:'API rate limit issue resolved by Alex Chen.', read:true,  createdAt:'2025-07-28T16:00:00Z', link:'#tickets/TK-005' },
      { id:'n4', userId:'u2', type:'warning', title:'Scheduled maintenance',     body:'Planned downtime on 2025-08-10 from 02:00–04:00 IST.', read:false, createdAt:'2025-07-27T00:00:00Z', link:'#' },
    ]);
    save(K.SETTINGS, { orgName:'NexCRM Organisation', industry:'Technology', timezone:'IST (UTC+5:30)', language:'English (US)', departments:['Support','Finance','Engineering','Operations','Account Management'], categories:['Bug Report','Feature Request','Billing','Access & Auth','Performance','General Enquiry'] });
  }

  const Users = {
    getAll()         { return load(K.USERS, []); },
    get(id)          { return this.getAll().find(u => u.id === id) || null; },
    getByEmail(em)   { return this.getAll().find(u => u.email.toLowerCase() === em.toLowerCase()) || null; },
    create(data)     { const users = this.getAll(); const u = { ...data, id: uid(), createdAt: now(), active: true, notifPrefs:{ assigned:true,statusUpdates:true,newCustomer:false,mentions:true,systemAlerts:true,weeklyDigest:false } }; users.push(u); save(K.USERS, users); return u; },
    update(id, data) { const arr = this.getAll(); const i = arr.findIndex(u => u.id === id); if (i < 0) return null; arr[i] = { ...arr[i], ...data }; save(K.USERS, arr); return arr[i]; },
    delete(id)       { save(K.USERS, this.getAll().filter(u => u.id !== id)); },
  };

  const Tickets = {
    getAll()           { return load(K.TICKETS, []); },
    get(id)            { return this.getAll().find(t => t.id === id || t.number === id) || null; },
    create(data)       { const seq = load(K.T_SEQ, 0) + 1; save(K.T_SEQ, seq); const t = { ...data, id: uid(), number:`TK-${String(seq).padStart(3,'0')}`, createdAt: now(), updatedAt: now(), comments: [] }; const arr = this.getAll(); arr.push(t); save(K.TICKETS, arr); return t; },
    update(id, data)   { const arr = this.getAll(); const i = arr.findIndex(t => t.id === id || t.number === id); if (i < 0) return null; arr[i] = { ...arr[i], ...data, updatedAt: now() }; save(K.TICKETS, arr); return arr[i]; },
    addComment(id, c)  { const arr = this.getAll(); const i = arr.findIndex(t => t.id === id || t.number === id); if (i < 0) return null; const cm = { ...c, id: uid(), createdAt: now() }; (arr[i].comments = arr[i].comments || []).push(cm); arr[i].updatedAt = now(); save(K.TICKETS, arr); return cm; },
    delete(id)         { save(K.TICKETS, this.getAll().filter(t => t.id !== id && t.number !== id)); },
  };

  const Customers = {
    getAll()         { return load(K.CUSTOMERS, []); },
    get(id)          { return this.getAll().find(c => c.id === id) || null; },
    create(data)     { const seq = load(K.C_SEQ, 0) + 1; save(K.C_SEQ, seq); const c = { ...data, id: uid(), custNumber:`C-${String(seq).padStart(3,'0')}`, createdAt: now() }; const arr = this.getAll(); arr.push(c); save(K.CUSTOMERS, arr); return c; },
    update(id, data) { const arr = this.getAll(); const i = arr.findIndex(c => c.id === id); if (i < 0) return null; arr[i] = { ...arr[i], ...data }; save(K.CUSTOMERS, arr); return arr[i]; },
    delete(id)       { save(K.CUSTOMERS, this.getAll().filter(c => c.id !== id)); },
  };

  const Notifications = {
    getAll(uid)        { const all = load(K.NOTIFICATIONS, []); return uid ? all.filter(n => n.userId === uid) : all; },
    add(n)             { const all = load(K.NOTIFICATIONS, []); const r = { ...n, id: uid(), createdAt: now() }; all.unshift(r); save(K.NOTIFICATIONS, all.slice(0, 100)); return r; },
    markRead(id)       { const all = load(K.NOTIFICATIONS, []).map(n => n.id === id ? { ...n, read:true } : n); save(K.NOTIFICATIONS, all); },
    markAllRead(uid)   { const all = load(K.NOTIFICATIONS, []).map(n => n.userId === uid ? { ...n, read:true } : n); save(K.NOTIFICATIONS, all); },
    delete(id)         { save(K.NOTIFICATIONS, load(K.NOTIFICATIONS, []).filter(n => n.id !== id)); },
    unreadCount(uid)   { return this.getAll(uid).filter(n => !n.read).length; },
  };

  const Settings = {
    get()             { return load(K.SETTINGS, {}); },
    update(data)      { save(K.SETTINGS, { ...this.get(), ...data }); },
    addDept(name)     { const s = this.get(); s.departments = [...(s.departments||[]), name]; save(K.SETTINGS, s); },
    removeDept(name)  { const s = this.get(); s.departments = (s.departments||[]).filter(d => d !== name); save(K.SETTINGS, s); },
    addCat(name)      { const s = this.get(); s.categories = [...(s.categories||[]), name]; save(K.SETTINGS, s); },
    removeCat(name)   { const s = this.get(); s.categories = (s.categories||[]).filter(c => c !== name); save(K.SETTINGS, s); },
  };

  seedIfEmpty();
  window.NexCRM.Store = { Users, Tickets, Customers, Notifications, Settings };
  window.NexCRM._uid = uid;
  window.NexCRM._now = now;
})();
