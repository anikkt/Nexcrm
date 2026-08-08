window.NexCRM = window.NexCRM || {};

(function () {
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Paste your Firebase config here
  // Get it from: Firebase Console → Project Settings → Your apps → SDK setup
  // ═══════════════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCP72XrSAWIyBl6x-FEVovG9B6QplGg9Ls",
  authDomain: "nexcrm-36647.firebaseapp.com",
  projectId: "nexcrm-36647",
  storageBucket: "nexcrm-36647.firebasestorage.app",
  messagingSenderId: "1021268709360",
  appId: "1:1021268709360:web:9e53a3efc1a51c6d37d735",
  measurementId: "G-8Z683WS198"
};
  // ═══════════════════════════════════════════════════════════════════════════

  // Initialize Firebase (guard against double-init)
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  const db  = firebase.firestore();
  const COL = db.collection('nexcrm');

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const now = () => new Date().toISOString();

  // In-memory cache — all reads are instant (sync), writes go to Firestore
  const C = { users:[], tickets:[], customers:[], notifications:[], settings:{}, tSeq:0, cSeq:0 };

  // Promise that resolves when initial data is loaded
  let _resolve;
  const _ready = new Promise(r => { _resolve = r; });

  // ── Seed data (only written to Firestore on first run) ────────────────────
  function _seed() {
    const np = { assigned:true, statusUpdates:true, newCustomer:false, mentions:true, systemAlerts:true, weeklyDigest:false };
    return {
      users: { items:[
        { id:'u1', name:'Ankit Singh',  email:'admin@nexcrm.dev',   password:'Admin@1234',   role:'admin',   department:'Operations', phone:'+91 98765 00000', active:true, createdAt:'2024-01-01T00:00:00Z', notifPrefs:np },
        { id:'u2', name:'Alex Chen',    email:'manager@nexcrm.dev', password:'Manager@1234', role:'manager', department:'Support',    phone:'+1 415 555 0102',  active:true, createdAt:'2024-01-15T00:00:00Z', notifPrefs:np },
        { id:'u3', name:'Maya Patel',   email:'agent@nexcrm.dev',   password:'Agent@1234',   role:'analyst', department:'Support',    phone:'+91 87654 32100',  active:true, createdAt:'2024-02-01T00:00:00Z', notifPrefs:np },
      ]},
      tickets: { seq:5, items:[
        { id:'t1', number:'TK-001', subject:'Unable to login after password reset',     description:'Customer reports reset link expires immediately.', status:'in_progress', priority:'high',     customerId:'c1', assignedToId:'u2', dueDate:'2025-08-02', createdAt:'2025-07-28T09:14:00Z', updatedAt:'2025-07-28T11:30:00Z', comments:[] },
        { id:'t2', number:'TK-002', subject:'Invoice not generated for July billing',   description:'Monthly invoice automation failed.', status:'new', priority:'critical', customerId:'c2', assignedToId:null, dueDate:'2025-08-01', createdAt:'2025-07-30T08:00:00Z', updatedAt:'2025-07-30T08:00:00Z', comments:[] },
        { id:'t3', number:'TK-003', subject:'Feature request: bulk CSV export',         description:'Customer wants to export ticket history.', status:'pending', priority:'low', customerId:'c3', assignedToId:'u3', dueDate:'2025-08-10', createdAt:'2025-07-25T14:00:00Z', updatedAt:'2025-07-25T14:00:00Z', comments:[] },
        { id:'t4', number:'TK-004', subject:'Dashboard charts not loading on Safari',   description:'Safari 17.x users see blank chart area.', status:'assigned', priority:'medium', customerId:'c4', assignedToId:'u2', dueDate:'2025-08-05', createdAt:'2025-07-29T10:00:00Z', updatedAt:'2025-07-29T10:00:00Z', comments:[] },
        { id:'t5', number:'TK-005', subject:'API rate limit exceeded during sync',      description:'Integration hitting 429 errors during peak hours.', status:'resolved', priority:'high', customerId:'c2', assignedToId:'u2', dueDate:'2025-07-28', createdAt:'2025-07-22T09:00:00Z', updatedAt:'2025-07-28T16:00:00Z', comments:[] },
      ]},
      customers: { seq:4, items:[
        { id:'c1', name:'Sarah Mitchell', company:'Acme Corp',        email:'s.mitchell@acme.com',  phone:'+1 415 555 0101', industry:'Technology', status:'active',   notes:'Key enterprise account.', createdAt:'2024-03-12T00:00:00Z' },
        { id:'c2', name:'James Okonkwo',  company:'Vertex Solutions', email:'j.okonkwo@vertex.io',  phone:'+44 20 7946 0132',industry:'Finance',    status:'active',   notes:'', createdAt:'2023-11-05T00:00:00Z' },
        { id:'c3', name:'Priya Sharma',   company:'TechNova',         email:'priya@technova.dev',   phone:'+91 98765 43210', industry:'Technology', status:'active',   notes:'Feature-request heavy.', createdAt:'2025-01-20T00:00:00Z' },
        { id:'c4', name:'Tom Beaumont',   company:'Globex Inc',       email:'t.beaumont@globex.com',phone:'+1 646 555 0189', industry:'Retail',     status:'inactive', notes:'', createdAt:'2024-07-08T00:00:00Z' },
      ]},
      notifications: { items:[
        { id:'n1', userId:'u1', type:'danger',  title:'TK-002 requires attention', body:'Invoice not generated — no assignee.', read:false, createdAt:'2025-07-30T08:00:00Z', link:'#tickets/TK-002' },
        { id:'n2', userId:'u2', type:'info',    title:'TK-004 assigned to you',    body:'Dashboard charts not loading on Safari.', read:false, createdAt:'2025-07-29T10:00:00Z', link:'#tickets/TK-004' },
      ]},
      settings: { orgName:'NexCRM Organisation', industry:'Technology', timezone:'IST (UTC+5:30)', language:'English (US)', departments:['Support','Finance','Engineering','Operations','Account Management'], categories:['Bug Report','Feature Request','Billing','Access & Auth','Performance','General Enquiry'] }
    };
  }

  // ── Write helpers (fire-and-forget — cache updates are instant) ───────────
  const _save = (doc, data) => COL.doc(doc).set(data).catch(e => console.warn('Firestore write error', doc, e));

  // ── Real-time listener → update cache → optionally re-render page ─────────
  function _listen(doc, onData) {
    COL.doc(doc).onSnapshot(
      snap => { if (snap.exists) { onData(snap.data()); NexCRM._onDataUpdate?.(doc); } },
      err  => console.warn('Firestore listener error', doc, err)
    );
  }

  // ── Bootstrap: load all data, then set up real-time listeners ─────────────
  async function _init() {
    try {
      const check = await COL.doc('users').get();

      if (!check.exists) {
        // First run — write seed data
        const s = _seed();
        await Promise.all(Object.entries(s).map(([k,v]) => COL.doc(k).set(v)));
        C.users         = s.users.items;
        C.tickets       = s.tickets.items;   C.tSeq = s.tickets.seq;
        C.customers     = s.customers.items; C.cSeq = s.customers.seq;
        C.notifications = s.notifications.items;
        C.settings      = s.settings;
      } else {
        const [u,t,cu,n,se] = await Promise.all(['users','tickets','customers','notifications','settings'].map(d => COL.doc(d).get()));
        C.users         = u.data()?.items  || [];
        C.tickets       = t.data()?.items  || [];   C.tSeq  = t.data()?.seq  || 0;
        C.customers     = cu.data()?.items || [];   C.cSeq  = cu.data()?.seq || 0;
        C.notifications = n.data()?.items  || [];
        C.settings      = se.data()        || {};
      }
    } catch (e) {
      console.error('NexCRM Firebase init failed:', e);
      // App still usable with empty state
    }

    _resolve(); // unblock main.js

    // Set up real-time listeners (after initial load so they don't fire immediately)
    _listen('tickets',       d => { C.tickets    = d.items||[]; C.tSeq = d.seq||0; });
    _listen('customers',     d => { C.customers  = d.items||[]; C.cSeq = d.seq||0; });
    _listen('users',         d => { C.users      = d.items||[]; });
    _listen('notifications', d => { C.notifications = d.items||[]; });
    _listen('settings',      d => { C.settings   = d; });
  }

  // ── Store modules (sync API — all reads from cache) ───────────────────────
  const Users = {
    getAll()       { return [...C.users]; },
    get(id)        { return C.users.find(u => u.id === id) || null; },
    getByEmail(em) { return C.users.find(u => u.email?.toLowerCase() === em?.toLowerCase()) || null; },
    create(data) {
      const u = { ...data, id:uid(), createdAt:now(), active:true, notifPrefs:{ assigned:true, statusUpdates:true, newCustomer:false, mentions:true, systemAlerts:true, weeklyDigest:false } };
      C.users.push(u);
      _save('users', { items:C.users });
      return u;
    },
    update(id, data) {
      const i = C.users.findIndex(u => u.id === id);
      if (i < 0) return null;
      C.users[i] = { ...C.users[i], ...data };
      _save('users', { items:C.users });
      return C.users[i];
    },
    delete(id) { C.users = C.users.filter(u => u.id !== id); _save('users', { items:C.users }); },
  };

  const Tickets = {
    getAll()       { return [...C.tickets]; },
    get(id)        { return C.tickets.find(t => t.id === id || t.number === id) || null; },
    create(data) {
      C.tSeq++;
      const t = { ...data, id:uid(), number:`TK-${String(C.tSeq).padStart(3,'0')}`, createdAt:now(), updatedAt:now(), comments:[] };
      C.tickets.push(t);
      _save('tickets', { items:C.tickets, seq:C.tSeq });
      return t;
    },
    update(id, data) {
      const i = C.tickets.findIndex(t => t.id === id || t.number === id);
      if (i < 0) return null;
      C.tickets[i] = { ...C.tickets[i], ...data, updatedAt:now() };
      _save('tickets', { items:C.tickets, seq:C.tSeq });
      return C.tickets[i];
    },
    addComment(id, comment) {
      const i = C.tickets.findIndex(t => t.id === id || t.number === id);
      if (i < 0) return null;
      const c = { ...comment, id:uid(), createdAt:now() };
      (C.tickets[i].comments = C.tickets[i].comments || []).push(c);
      C.tickets[i].updatedAt = now();
      _save('tickets', { items:C.tickets, seq:C.tSeq });
      return c;
    },
    delete(id) { C.tickets = C.tickets.filter(t => t.id !== id && t.number !== id); _save('tickets', { items:C.tickets, seq:C.tSeq }); },
  };

  const Customers = {
    getAll()       { return [...C.customers]; },
    get(id)        { return C.customers.find(c => c.id === id) || null; },
    create(data) {
      C.cSeq++;
      const c = { ...data, id:uid(), custNumber:`C-${String(C.cSeq).padStart(3,'0')}`, createdAt:now() };
      C.customers.push(c);
      _save('customers', { items:C.customers, seq:C.cSeq });
      return c;
    },
    update(id, data) {
      const i = C.customers.findIndex(c => c.id === id);
      if (i < 0) return null;
      C.customers[i] = { ...C.customers[i], ...data };
      _save('customers', { items:C.customers, seq:C.cSeq });
      return C.customers[i];
    },
    delete(id) { C.customers = C.customers.filter(c => c.id !== id); _save('customers', { items:C.customers, seq:C.cSeq }); },
  };

  const Notifications = {
    getAll(uid_)     { return uid_ ? C.notifications.filter(n => n.userId === uid_) : [...C.notifications]; },
    add(n) {
      const notif = { ...n, id:uid(), createdAt:now() };
      C.notifications.unshift(notif);
      if (C.notifications.length > 100) C.notifications = C.notifications.slice(0,100);
      _save('notifications', { items:C.notifications });
      return notif;
    },
    markRead(id)     { C.notifications = C.notifications.map(n => n.id===id ? {...n,read:true} : n); _save('notifications', { items:C.notifications }); },
    markAllRead(uid_){ C.notifications = C.notifications.map(n => n.userId===uid_ ? {...n,read:true} : n); _save('notifications', { items:C.notifications }); },
    delete(id)       { C.notifications = C.notifications.filter(n => n.id !== id); _save('notifications', { items:C.notifications }); },
    unreadCount(uid_){ return C.notifications.filter(n => n.userId===uid_ && !n.read).length; },
  };

  const Settings = {
    get()            { return { ...C.settings }; },
    update(data)     { C.settings = { ...C.settings, ...data }; _save('settings', C.settings); },
    addDept(name)    { C.settings.departments = [...(C.settings.departments||[]), name]; _save('settings', C.settings); },
    removeDept(name) { C.settings.departments = (C.settings.departments||[]).filter(d=>d!==name); _save('settings', C.settings); },
    addCat(name)     { C.settings.categories  = [...(C.settings.categories||[]),  name]; _save('settings', C.settings); },
    removeCat(name)  { C.settings.categories  = (C.settings.categories||[]).filter(c=>c!==name); _save('settings', C.settings); },
  };

  _init();

  window.NexCRM.Store  = { Users, Tickets, Customers, Notifications, Settings };
  window.NexCRM._ready = _ready; // main.js waits on this
  window.NexCRM._uid   = uid;
  window.NexCRM._now   = now;
})();
