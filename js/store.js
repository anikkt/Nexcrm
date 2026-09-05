window.NexCRM = window.NexCRM || {};

(function () {
  // ═══════════════════════════════════════════════════════════════════════════
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCP72XrSAWIyBl6x-FEVovG9B6QplGg9Ls",
    authDomain:        "nexcrm-36647.firebaseapp.com",
    projectId:         "nexcrm-36647",
    storageBucket:     "nexcrm-36647.firebasestorage.app",
    messagingSenderId: "1021268709360",
    appId:             "1:1021268709360:web:9e53a3efc1a51c6d37d735"
  };
  // ═══════════════════════════════════════════════════════════════════════════

  const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const now  = () => new Date().toISOString();
  const load = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const lset = (k,v) => localStorage.setItem(k, JSON.stringify(v));

  const C = {
    users:[], tickets:[], customers:[], notifications:[], settings:{},
    departments:[], categories:[],
    tSeq:0, cSeq:0, depSeq:0, catSeq:0,
  };

  let _resolve;
  const _ready = new Promise(r => { _resolve = r; });
  let _save = () => {};

  const K = {
    U:'ncm_users', T:'ncm_tickets', C:'ncm_customers',
    N:'ncm_notifs', S:'ncm_settings',
    TS:'ncm_tseq', CS:'ncm_cseq',
    DEP:'ncm_departments', DS:'ncm_dseq',
    CAT:'ncm_categories',  CATS:'ncm_catseq',
  };

  function _lsSave(doc, data) {
    switch(doc) {
      case 'users':         lset(K.U,   data.items); break;
      case 'tickets':       lset(K.T,   data.items); lset(K.TS,   data.seq); break;
      case 'customers':     lset(K.C,   data.items); lset(K.CS,   data.seq); break;
      case 'notifications': lset(K.N,   data.items); break;
      case 'settings':      lset(K.S,   data); break;
      case 'departments':   lset(K.DEP, data.items); lset(K.DS,   data.seq); break;
      case 'ticket_cats':   lset(K.CAT, data.items); lset(K.CATS, data.seq); break;
    }
  }

  // ── Change log helpers ────────────────────────────────────────────────────
  const SL  = {new:'New',assigned:'Assigned',in_progress:'In Progress',pending:'Pending',waiting_customer:'Waiting',resolved:'Resolved',closed:'Closed'};
  const PL  = {low:'Low',medium:'Medium',high:'High',critical:'Critical'};
  const FL  = {status:'Status',priority:'Priority',assignedToId:'Assigned to',departmentId:'Department',categoryId:'Category',customerId:'Customer',dueDate:'Due Date',subject:'Subject'};
  const CL_TRACKED = ['status','priority','assignedToId','departmentId','categoryId','customerId','dueDate','subject'];

  function _label(field, raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    switch(field) {
      case 'status':       return SL[raw] || raw;
      case 'priority':     return PL[raw] || raw;
      case 'assignedToId': return C.users.find(u=>u.id===raw)?.name || raw;
      case 'departmentId': return C.departments.find(d=>d.id===raw)?.name || raw;
      case 'categoryId':   return C.categories.find(c=>c.id===raw)?.name || raw;
      case 'customerId':   return C.customers.find(c=>c.id===raw)?.name || raw;
      default:             return String(raw);
    }
  }
  // Get current session user (for auto-stamping changes)
  function _sessionUser() {
    try { return JSON.parse(localStorage.getItem('ncm_session'))?.userId||null; } catch { return null; }
  }
  // Build initial change log for a new ticket
  function _initialCL(data, userId) {
    const ts0 = data.createdAt || now();
    const entries = [];
    const offset  = (n) => new Date(new Date(ts0).getTime() + n*500).toISOString();
    entries.push({id:uid(),timestamp:ts0,      editedById:userId,field:'Created',   oldValue:'',newValue:'',oldRaw:null,newRaw:null});
    if (data.customerId)   entries.push({id:uid(),timestamp:offset(1),editedById:userId,field:'Customer',   oldValue:'',newValue:_label('customerId',  data.customerId),  oldRaw:null,newRaw:data.customerId});
    if (data.departmentId) entries.push({id:uid(),timestamp:offset(2),editedById:userId,field:'Department', oldValue:'',newValue:_label('departmentId',data.departmentId),oldRaw:null,newRaw:data.departmentId});
    if (data.categoryId)   entries.push({id:uid(),timestamp:offset(3),editedById:userId,field:'Category',   oldValue:'',newValue:_label('categoryId',  data.categoryId),  oldRaw:null,newRaw:data.categoryId});
    if (data.priority)     entries.push({id:uid(),timestamp:offset(4),editedById:userId,field:'Priority',   oldValue:'',newValue:_label('priority',    data.priority),    oldRaw:null,newRaw:data.priority});
    if (data.status)       entries.push({id:uid(),timestamp:offset(5),editedById:userId,field:'Status',     oldValue:'',newValue:_label('status',      data.status),      oldRaw:null,newRaw:data.status});
    if (data.assignedToId) entries.push({id:uid(),timestamp:offset(6),editedById:userId,field:'Assigned to',oldValue:'',newValue:_label('assignedToId',data.assignedToId),oldRaw:null,newRaw:data.assignedToId});
    return entries;
  }

  // ── Seed data ──────────────────────────────────────────────────────────────
  function _getSeed() {
    const np = { assigned:true, statusUpdates:true, newCustomer:false, mentions:true, systemAlerts:true, weeklyDigest:false };
    const departments = [
      { id:'dep1', name:'Support',            description:'Customer support and helpdesk operations',   color:'#6366f1', createdAt:'2024-01-01T00:00:00Z' },
      { id:'dep2', name:'Finance',            description:'Financial operations and billing',            color:'#f59e0b', createdAt:'2024-01-01T00:00:00Z' },
      { id:'dep3', name:'Engineering',        description:'Product engineering and development',         color:'#10b981', createdAt:'2024-01-01T00:00:00Z' },
      { id:'dep4', name:'Operations',         description:'Business operations and logistics',           color:'#8b5cf6', createdAt:'2024-01-01T00:00:00Z' },
      { id:'dep5', name:'Account Management', description:'Client relationship and account ownership',   color:'#f43f5e', createdAt:'2024-01-01T00:00:00Z' },
    ];
    const categories = [
      { id:'cg1', name:'Bug Report',      description:'Software defects and unexpected behavior',    color:'#f43f5e', createdAt:'2024-01-01T00:00:00Z' },
      { id:'cg2', name:'Feature Request', description:'New functionality or enhancement requests',   color:'#6366f1', createdAt:'2024-01-01T00:00:00Z' },
      { id:'cg3', name:'Billing',         description:'Invoice, payment and billing issues',         color:'#f59e0b', createdAt:'2024-01-01T00:00:00Z' },
      { id:'cg4', name:'Access & Auth',   description:'Login, permissions and authentication',       color:'#8b5cf6', createdAt:'2024-01-01T00:00:00Z' },
      { id:'cg5', name:'Performance',     description:'Speed, reliability and scalability issues',   color:'#06b6d4', createdAt:'2024-01-01T00:00:00Z' },
      { id:'cg6', name:'General Enquiry', description:'General questions and miscellaneous requests',color:'#10b981', createdAt:'2024-01-01T00:00:00Z' },
    ];

    // Seed ticket change logs — one row per event (matches the Excel format)
    return {
      users: [
        { id:'u1', name:'Ankit Singh',  email:'admin@nexcrm.dev',   password:'Admin@1234',   role:'admin',   department:'Operations', phone:'+91 98765 00000', active:true, createdAt:'2024-01-01T00:00:00Z', notifPrefs:np },
        { id:'u2', name:'Alex Chen',    email:'manager@nexcrm.dev', password:'Manager@1234', role:'manager', department:'Support',    phone:'+1 415 555 0102',  active:true, createdAt:'2024-01-15T00:00:00Z', notifPrefs:np },
        { id:'u3', name:'Maya Patel',   email:'agent@nexcrm.dev',   password:'Agent@1234',   role:'analyst', department:'Support',    phone:'+91 87654 32100',  active:true, createdAt:'2024-02-01T00:00:00Z', notifPrefs:np },
      ],
      tickets: [
        { id:'t1', number:'TK-001', subject:'Unable to login after password reset',   description:'Customer reports reset link expires immediately.', status:'in_progress', priority:'high',     customerId:'c1', assignedToId:'u2', departmentId:'dep1', categoryId:'cg4', dueDate:'2025-08-02', createdAt:'2025-07-28T09:14:00Z', updatedAt:'2025-07-28T11:00:00Z',
          comments:[{id:'cm1',authorId:'u2',text:'Reproduced in staging. JWT TTL is 5 min but email delivery has ~8 min latency.',internal:false,createdAt:'2025-07-28T11:00:00Z'}],
          changeLog:[
            {id:'c1a',timestamp:'2025-07-28T09:14:00Z',editedById:'u1',field:'Created',     oldValue:'',              newValue:'',                 oldRaw:null,   newRaw:null},
            {id:'c1b',timestamp:'2025-07-28T09:14:05Z',editedById:'u1',field:'Customer',    oldValue:'',              newValue:'Sarah Mitchell',    oldRaw:null,   newRaw:'c1'},
            {id:'c1c',timestamp:'2025-07-28T09:14:10Z',editedById:'u1',field:'Department',  oldValue:'',              newValue:'Support',           oldRaw:null,   newRaw:'dep1'},
            {id:'c1d',timestamp:'2025-07-28T09:14:15Z',editedById:'u1',field:'Category',    oldValue:'',              newValue:'Access & Auth',     oldRaw:null,   newRaw:'cg4'},
            {id:'c1e',timestamp:'2025-07-28T09:14:20Z',editedById:'u1',field:'Priority',    oldValue:'',              newValue:'High',              oldRaw:null,   newRaw:'high'},
            {id:'c1f',timestamp:'2025-07-28T09:14:25Z',editedById:'u1',field:'Status',      oldValue:'',              newValue:'In Progress',       oldRaw:null,   newRaw:'in_progress'},
            {id:'c1g',timestamp:'2025-07-28T09:14:30Z',editedById:'u2',field:'Assigned to', oldValue:'',              newValue:'Alex Chen',         oldRaw:null,   newRaw:'u2'},
            {id:'c1h',timestamp:'2025-07-28T11:00:00Z',editedById:'u2',field:'Comment Added',oldValue:'',             newValue:'Reproduced in staging. JWT TTL is 5 min...',oldRaw:null,newRaw:null},
          ]
        },
        { id:'t2', number:'TK-002', subject:'Invoice not generated for July billing',  description:'Monthly invoice automation failed.', status:'new', priority:'critical', customerId:'c2', assignedToId:null, departmentId:'dep2', categoryId:'cg3', dueDate:'2025-08-01', createdAt:'2025-07-30T08:00:00Z', updatedAt:'2025-07-30T08:00:00Z',
          comments:[],
          changeLog:[
            {id:'c2a',timestamp:'2025-07-30T08:00:00Z',editedById:'u1',field:'Created',    oldValue:'',newValue:'',                  oldRaw:null,newRaw:null},
            {id:'c2b',timestamp:'2025-07-30T08:00:05Z',editedById:'u1',field:'Customer',   oldValue:'',newValue:'James Okonkwo',      oldRaw:null,newRaw:'c2'},
            {id:'c2c',timestamp:'2025-07-30T08:00:10Z',editedById:'u1',field:'Department', oldValue:'',newValue:'Finance',            oldRaw:null,newRaw:'dep2'},
            {id:'c2d',timestamp:'2025-07-30T08:00:15Z',editedById:'u1',field:'Category',   oldValue:'',newValue:'Billing',            oldRaw:null,newRaw:'cg3'},
            {id:'c2e',timestamp:'2025-07-30T08:00:20Z',editedById:'u1',field:'Priority',   oldValue:'',newValue:'Critical',           oldRaw:null,newRaw:'critical'},
            {id:'c2f',timestamp:'2025-07-30T08:00:25Z',editedById:'u1',field:'Status',     oldValue:'',newValue:'New',                oldRaw:null,newRaw:'new'},
          ]
        },
        { id:'t3', number:'TK-003', subject:'Feature request: bulk CSV export',        description:'Customer wants to export all ticket history as CSV.', status:'pending', priority:'low', customerId:'c3', assignedToId:'u3', departmentId:'dep1', categoryId:'cg2', dueDate:'2025-08-10', createdAt:'2025-07-25T14:00:00Z', updatedAt:'2025-07-25T15:00:00Z',
          comments:[{id:'cm2',authorId:'u3',text:'Added to backlog. Will implement in next sprint.',internal:true,createdAt:'2025-07-25T15:00:00Z'}],
          changeLog:[
            {id:'c3a',timestamp:'2025-07-25T14:00:00Z',editedById:'u1',field:'Created',     oldValue:'',      newValue:'',               oldRaw:null,  newRaw:null},
            {id:'c3b',timestamp:'2025-07-25T14:00:05Z',editedById:'u1',field:'Customer',    oldValue:'',      newValue:'Priya Sharma',    oldRaw:null,  newRaw:'c3'},
            {id:'c3c',timestamp:'2025-07-25T14:00:10Z',editedById:'u1',field:'Department',  oldValue:'',      newValue:'Support',         oldRaw:null,  newRaw:'dep1'},
            {id:'c3d',timestamp:'2025-07-25T14:00:15Z',editedById:'u1',field:'Category',    oldValue:'',      newValue:'Feature Request', oldRaw:null,  newRaw:'cg2'},
            {id:'c3e',timestamp:'2025-07-25T14:00:20Z',editedById:'u1',field:'Priority',    oldValue:'',      newValue:'Low',             oldRaw:null,  newRaw:'low'},
            {id:'c3f',timestamp:'2025-07-25T14:00:25Z',editedById:'u1',field:'Status',      oldValue:'',      newValue:'New',             oldRaw:null,  newRaw:'new'},
            {id:'c3g',timestamp:'2025-07-25T14:00:30Z',editedById:'u3',field:'Assigned to', oldValue:'',      newValue:'Maya Patel',      oldRaw:null,  newRaw:'u3'},
            {id:'c3h',timestamp:'2025-07-25T14:05:00Z',editedById:'u3',field:'Status',      oldValue:'New',   newValue:'Pending',         oldRaw:'new', newRaw:'pending'},
            {id:'c3i',timestamp:'2025-07-25T15:00:00Z',editedById:'u3',field:'Comment Added',oldValue:'',     newValue:'[Internal] Added to backlog.',oldRaw:null,newRaw:null},
          ]
        },
        { id:'t4', number:'TK-004', subject:'Dashboard charts not loading on Safari',  description:'Safari 17.x users see blank chart area.', status:'assigned', priority:'medium', customerId:'c4', assignedToId:'u2', departmentId:'dep3', categoryId:'cg1', dueDate:'2025-08-05', createdAt:'2025-07-29T10:00:00Z', updatedAt:'2025-07-29T10:00:00Z',
          comments:[],
          changeLog:[
            {id:'c4a',timestamp:'2025-07-29T10:00:00Z',editedById:'u1',field:'Created',     oldValue:'',newValue:'',                  oldRaw:null,   newRaw:null},
            {id:'c4b',timestamp:'2025-07-29T10:00:05Z',editedById:'u1',field:'Customer',    oldValue:'',newValue:'Tom Beaumont',       oldRaw:null,   newRaw:'c4'},
            {id:'c4c',timestamp:'2025-07-29T10:00:10Z',editedById:'u1',field:'Department',  oldValue:'',newValue:'Engineering',        oldRaw:null,   newRaw:'dep3'},
            {id:'c4d',timestamp:'2025-07-29T10:00:15Z',editedById:'u1',field:'Category',    oldValue:'',newValue:'Bug Report',         oldRaw:null,   newRaw:'cg1'},
            {id:'c4e',timestamp:'2025-07-29T10:00:20Z',editedById:'u1',field:'Priority',    oldValue:'',newValue:'Medium',             oldRaw:null,   newRaw:'medium'},
            {id:'c4f',timestamp:'2025-07-29T10:00:25Z',editedById:'u1',field:'Status',      oldValue:'',newValue:'Assigned',           oldRaw:null,   newRaw:'assigned'},
            {id:'c4g',timestamp:'2025-07-29T10:00:30Z',editedById:'u2',field:'Assigned to', oldValue:'',newValue:'Alex Chen',          oldRaw:null,   newRaw:'u2'},
          ]
        },
        { id:'t5', number:'TK-005', subject:'API rate limit exceeded during sync',     description:'Integration hitting 429 errors during peak hours.', status:'resolved', priority:'high', customerId:'c2', assignedToId:'u2', departmentId:'dep1', categoryId:'cg5', dueDate:'2025-07-28', createdAt:'2025-07-22T09:00:00Z', updatedAt:'2025-07-28T16:00:00Z',
          comments:[{id:'cm3',authorId:'u2',text:'Implemented exponential backoff with 3 retries. Rate limit errors dropped to zero.',internal:false,createdAt:'2025-07-28T16:00:00Z'}],
          changeLog:[
            {id:'c5a',timestamp:'2025-07-22T09:00:00Z',editedById:'u1',field:'Created',      oldValue:'',            newValue:'',                   oldRaw:null,         newRaw:null},
            {id:'c5b',timestamp:'2025-07-22T09:00:05Z',editedById:'u1',field:'Customer',     oldValue:'',            newValue:'James Okonkwo',       oldRaw:null,         newRaw:'c2'},
            {id:'c5c',timestamp:'2025-07-22T09:00:10Z',editedById:'u1',field:'Department',   oldValue:'',            newValue:'Support',             oldRaw:null,         newRaw:'dep1'},
            {id:'c5d',timestamp:'2025-07-22T09:00:15Z',editedById:'u1',field:'Category',     oldValue:'',            newValue:'Performance',         oldRaw:null,         newRaw:'cg5'},
            {id:'c5e',timestamp:'2025-07-22T09:00:20Z',editedById:'u1',field:'Priority',     oldValue:'',            newValue:'High',                oldRaw:null,         newRaw:'high'},
            {id:'c5f',timestamp:'2025-07-22T09:00:25Z',editedById:'u1',field:'Status',       oldValue:'',            newValue:'New',                 oldRaw:null,         newRaw:'new'},
            {id:'c5g',timestamp:'2025-07-22T09:00:30Z',editedById:'u2',field:'Assigned to',  oldValue:'',            newValue:'Alex Chen',           oldRaw:null,         newRaw:'u2'},
            {id:'c5h',timestamp:'2025-07-24T10:00:00Z',editedById:'u2',field:'Status',       oldValue:'New',         newValue:'In Progress',         oldRaw:'new',        newRaw:'in_progress'},
            {id:'c5i',timestamp:'2025-07-28T16:00:00Z',editedById:'u2',field:'Status',       oldValue:'In Progress', newValue:'Resolved',            oldRaw:'in_progress',newRaw:'resolved'},
            {id:'c5j',timestamp:'2025-07-28T16:00:00Z',editedById:'u2',field:'Comment Added',oldValue:'',            newValue:'Implemented exponential backoff...',oldRaw:null,newRaw:null},
          ]
        },
      ],
      customers: [
        { id:'c1', name:'Sarah Mitchell', company:'Acme Corp',        email:'s.mitchell@acme.com',  phone:'+1 415 555 0101', industry:'Technology', status:'active',   notes:'Key enterprise account.', createdAt:'2024-03-12T00:00:00Z' },
        { id:'c2', name:'James Okonkwo',  company:'Vertex Solutions', email:'j.okonkwo@vertex.io',  phone:'+44 20 7946 0132',industry:'Finance',    status:'active',   notes:'', createdAt:'2023-11-05T00:00:00Z' },
        { id:'c3', name:'Priya Sharma',   company:'TechNova',         email:'priya@technova.dev',   phone:'+91 98765 43210', industry:'Technology', status:'active',   notes:'Feature-request heavy.', createdAt:'2025-01-20T00:00:00Z' },
        { id:'c4', name:'Tom Beaumont',   company:'Globex Inc',       email:'t.beaumont@globex.com',phone:'+1 646 555 0189', industry:'Retail',     status:'inactive', notes:'', createdAt:'2024-07-08T00:00:00Z' },
      ],
      notifications: [
        { id:'n1', userId:'u1', type:'danger', title:'TK-002 requires attention', body:'Invoice not generated — no assignee.',    read:false, createdAt:'2025-07-30T08:00:00Z', link:'#tickets/TK-002' },
        { id:'n2', userId:'u2', type:'info',   title:'TK-004 assigned to you',    body:'Dashboard charts not loading on Safari.', read:false, createdAt:'2025-07-29T10:00:00Z', link:'#tickets/TK-004' },
      ],
      settings: {
        orgName:'NexCRM Organisation', industry:'Technology', timezone:'IST (UTC+5:30)', language:'English (US)',
        departments:['Support','Finance','Engineering','Operations','Account Management'],
        categories:['Bug Report','Feature Request','Billing','Access & Auth','Performance','General Enquiry'],
      },
      departments, categories,
      tSeq:5, cSeq:4, depSeq:5, catSeq:6,
    };
  }

  // ── localStorage backend ───────────────────────────────────────────────────
  function _initLS() {
    const isNew = load(K.U, null) === null;
    if (isNew) {
      const s = _getSeed();
      Object.assign(C, { users:s.users, tickets:s.tickets, customers:s.customers,
        notifications:s.notifications, settings:s.settings,
        departments:s.departments, categories:s.categories,
        tSeq:s.tSeq, cSeq:s.cSeq, depSeq:s.depSeq, catSeq:s.catSeq });
    } else {
      C.users         = load(K.U,   []);
      C.tickets       = load(K.T,   []); C.tSeq   = load(K.TS,   0);
      C.customers     = load(K.C,   []); C.cSeq   = load(K.CS,   0);
      C.notifications = load(K.N,   []);
      C.settings      = load(K.S,   {});
      C.departments   = load(K.DEP, []); C.depSeq = load(K.DS,   0);
      C.categories    = load(K.CAT, []); C.catSeq = load(K.CATS, 0);
      if (!C.departments.length) { const s=_getSeed(); C.departments=s.departments; C.depSeq=s.depSeq; }
      if (!C.categories.length)  { const s=_getSeed(); C.categories=s.categories;  C.catSeq=s.catSeq; }
      // Migrate old tickets: add empty changeLog if missing
      C.tickets = C.tickets.map(t => t.changeLog ? t : { ...t, changeLog:[] });
    }
    _save = _lsSave;
    ['users','tickets','customers','notifications','settings','departments','ticket_cats'].forEach(doc => {
      const d={users:{items:C.users},tickets:{items:C.tickets,seq:C.tSeq},customers:{items:C.customers,seq:C.cSeq},notifications:{items:C.notifications},settings:C.settings,departments:{items:C.departments,seq:C.depSeq},ticket_cats:{items:C.categories,seq:C.catSeq}}[doc];
      if(d) _lsSave(doc,d);
    });
    _resolve();
    console.log('[NexCRM] Using localStorage.');
  }

  // ── Firebase backend ───────────────────────────────────────────────────────
  async function _initFirebase() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const db=firebase.firestore(), COL=db.collection('nexcrm');
    _save=(doc,data)=>COL.doc(doc).set(data).catch(e=>console.warn('[Firestore]',doc,e));

    const check = await COL.doc('users').get();
    if (!check.exists) {
      const s=_getSeed();
      Object.assign(C,{users:s.users,tickets:s.tickets,customers:s.customers,notifications:s.notifications,settings:s.settings,departments:s.departments,categories:s.categories,tSeq:s.tSeq,cSeq:s.cSeq,depSeq:s.depSeq,catSeq:s.catSeq});
      await Promise.all([COL.doc('users').set({items:C.users}),COL.doc('tickets').set({items:C.tickets,seq:C.tSeq}),COL.doc('customers').set({items:C.customers,seq:C.cSeq}),COL.doc('notifications').set({items:C.notifications}),COL.doc('settings').set(C.settings),COL.doc('departments').set({items:C.departments,seq:C.depSeq}),COL.doc('ticket_cats').set({items:C.categories,seq:C.catSeq})]);
    } else {
      const [u,t,cu,n,se,dep,cat]=await Promise.all(['users','tickets','customers','notifications','settings','departments','ticket_cats'].map(d=>COL.doc(d).get()));
      C.users=u.data()?.items||[]; C.tickets=t.data()?.items||[]; C.tSeq=t.data()?.seq||0;
      C.customers=cu.data()?.items||[]; C.cSeq=cu.data()?.seq||0;
      C.notifications=n.data()?.items||[]; C.settings=se.data()||{};
      C.departments=dep.data()?.items||[]; C.depSeq=dep.data()?.seq||0;
      C.categories=cat.data()?.items||[]; C.catSeq=cat.data()?.seq||0;
      if(!C.departments.length){const s=_getSeed();C.departments=s.departments;C.depSeq=s.depSeq;await COL.doc('departments').set({items:C.departments,seq:C.depSeq});}
      if(!C.categories.length) {const s=_getSeed();C.categories=s.categories; C.catSeq=s.catSeq; await COL.doc('ticket_cats').set({items:C.categories,seq:C.catSeq});}
      // Migrate old tickets without changeLog
      let migrated=false;
      C.tickets=C.tickets.map(t=>{if(!t.changeLog){migrated=true;return{...t,changeLog:[]};}return t;});
      if(migrated) _save('tickets',{items:C.tickets,seq:C.tSeq});
    }
    _resolve();
    console.log('[NexCRM] Connected to Firebase.');
    COL.doc('tickets').onSnapshot(d=>{if(!d.exists)return;C.tickets=d.data().items||[];C.tSeq=d.data().seq||0;NexCRM._onDataUpdate?.();});
    COL.doc('customers').onSnapshot(d=>{if(!d.exists)return;C.customers=d.data().items||[];C.cSeq=d.data().seq||0;NexCRM._onDataUpdate?.();});
    COL.doc('users').onSnapshot(d=>{if(!d.exists)return;C.users=d.data().items||[];NexCRM._onDataUpdate?.();});
    COL.doc('notifications').onSnapshot(d=>{if(!d.exists)return;C.notifications=d.data().items||[];NexCRM._onDataUpdate?.();});
    COL.doc('departments').onSnapshot(d=>{if(!d.exists)return;C.departments=d.data().items||[];C.depSeq=d.data().seq||0;NexCRM._onDataUpdate?.();});
    COL.doc('ticket_cats').onSnapshot(d=>{if(!d.exists)return;C.categories=d.data().items||[];C.catSeq=d.data().seq||0;NexCRM._onDataUpdate?.();});
  }

  // ── CRUD modules ───────────────────────────────────────────────────────────
  const Users = {
    getAll()       {return[...C.users];},
    get(id)        {return C.users.find(u=>u.id===id)||null;},
    getByEmail(em) {return C.users.find(u=>u.email?.toLowerCase()===em?.toLowerCase())||null;},
    create(data)   {const u={...data,id:uid(),createdAt:now(),active:true,notifPrefs:{assigned:true,statusUpdates:true,newCustomer:false,mentions:true,systemAlerts:true,weeklyDigest:false}};C.users.push(u);_save('users',{items:C.users});return u;},
    update(id,data){const i=C.users.findIndex(u=>u.id===id);if(i<0)return null;C.users[i]={...C.users[i],...data};_save('users',{items:C.users});return C.users[i];},
    delete(id)     {C.users=C.users.filter(u=>u.id!==id);_save('users',{items:C.users});},
  };

  const Tickets = {
    getAll()       {return[...C.tickets];},
    get(id)        {return C.tickets.find(t=>t.id===id||t.number===id)||null;},

    create(data) {
      C.tSeq++;
      const userId = data._editedBy || _sessionUser();
      const ts = now();
      const t = {
        ...data, _editedBy:undefined,
        id:uid(), number:`TK-${String(C.tSeq).padStart(3,'0')}`,
        createdAt:ts, updatedAt:ts, comments:[],
        changeLog: _initialCL({...data, createdAt:ts}, userId),
      };
      C.tickets.push(t);
      _save('tickets',{items:C.tickets,seq:C.tSeq});
      return t;
    },

    update(id, data, editedBy) {
      const i=C.tickets.findIndex(t=>t.id===id||t.number===id);
      if(i<0) return null;
      const old=C.tickets[i];
      const editorId=editedBy||data._editedBy||_sessionUser();
      const ts=now();

      // Diff and build change entries
      const changes=[];
      for(const field of CL_TRACKED) {
        if(data[field]!==undefined && String(data[field]||'')!==String(old[field]||'')) {
          changes.push({
            id:uid(), timestamp:ts, editedById:editorId,
            field:FL[field]||field,
            oldValue:_label(field,old[field]), newValue:_label(field,data[field]),
            oldRaw:old[field]||null, newRaw:data[field]||null,
          });
        }
      }

      C.tickets[i]={...old,...data,_editedBy:undefined,updatedAt:ts,changeLog:[...(old.changeLog||[]),...changes]};
      _save('tickets',{items:C.tickets,seq:C.tSeq});
      return C.tickets[i];
    },

    addComment(id, comment) {
      const i=C.tickets.findIndex(t=>t.id===id||t.number===id);
      if(i<0) return null;
      const cm={...comment,id:uid(),createdAt:now()};
      (C.tickets[i].comments=C.tickets[i].comments||[]).push(cm);
      C.tickets[i].updatedAt=now();
      // Log comment event
      const preview=comment.internal?`[Internal note] ${comment.text.slice(0,80)}`:`${comment.text.slice(0,80)}`;
      C.tickets[i].changeLog=[...(C.tickets[i].changeLog||[]),{id:uid(),timestamp:cm.createdAt,editedById:comment.authorId,field:'Comment Added',oldValue:'',newValue:preview,oldRaw:null,newRaw:null}];
      _save('tickets',{items:C.tickets,seq:C.tSeq});
      return cm;
    },

    delete(id) {C.tickets=C.tickets.filter(t=>t.id!==id&&t.number!==id);_save('tickets',{items:C.tickets,seq:C.tSeq});},
  };

  const Customers = {
    getAll()       {return[...C.customers];},
    get(id)        {return C.customers.find(c=>c.id===id)||null;},
    create(data)   {C.cSeq++;const c={...data,id:uid(),custNumber:`C-${String(C.cSeq).padStart(3,'0')}`,createdAt:now()};C.customers.push(c);_save('customers',{items:C.customers,seq:C.cSeq});return c;},
    update(id,data){const i=C.customers.findIndex(c=>c.id===id);if(i<0)return null;C.customers[i]={...C.customers[i],...data};_save('customers',{items:C.customers,seq:C.cSeq});return C.customers[i];},
    delete(id)     {C.customers=C.customers.filter(c=>c.id!==id);_save('customers',{items:C.customers,seq:C.cSeq});},
  };

  const Notifications = {
    getAll(uid_)     {return uid_?C.notifications.filter(n=>n.userId===uid_):[...C.notifications];},
    add(n)           {const r={...n,id:uid(),createdAt:now()};C.notifications.unshift(r);if(C.notifications.length>100)C.notifications=C.notifications.slice(0,100);_save('notifications',{items:C.notifications});return r;},
    markRead(id)     {C.notifications=C.notifications.map(n=>n.id===id?{...n,read:true}:n);_save('notifications',{items:C.notifications});},
    markAllRead(uid_){C.notifications=C.notifications.map(n=>n.userId===uid_?{...n,read:true}:n);_save('notifications',{items:C.notifications});},
    delete(id)       {C.notifications=C.notifications.filter(n=>n.id!==id);_save('notifications',{items:C.notifications});},
    unreadCount(uid_){return C.notifications.filter(n=>n.userId===uid_&&!n.read).length;},
  };

  const Settings = {
    get()            {return{...C.settings};},
    update(data)     {C.settings={...C.settings,...data};_save('settings',C.settings);},
    addDept(name)    {C.settings.departments=[...(C.settings.departments||[]),name];_save('settings',C.settings);},
    removeDept(name) {C.settings.departments=(C.settings.departments||[]).filter(d=>d!==name);_save('settings',C.settings);},
    addCat(name)     {C.settings.categories=[...(C.settings.categories||[]),name];_save('settings',C.settings);},
    removeCat(name)  {C.settings.categories=(C.settings.categories||[]).filter(c=>c!==name);_save('settings',C.settings);},
  };

  const Departments = {
    getAll()       {return[...C.departments];},
    get(id)        {return C.departments.find(d=>d.id===id)||null;},
    create(data)   {C.depSeq++;const d={...data,id:uid(),createdAt:now()};C.departments.push(d);_save('departments',{items:C.departments,seq:C.depSeq});return d;},
    update(id,data){const i=C.departments.findIndex(d=>d.id===id);if(i<0)return null;C.departments[i]={...C.departments[i],...data};_save('departments',{items:C.departments,seq:C.depSeq});return C.departments[i];},
    delete(id)     {C.departments=C.departments.filter(d=>d.id!==id);_save('departments',{items:C.departments,seq:C.depSeq});},
  };

  const TicketCategories = {
    getAll()       {return[...C.categories];},
    get(id)        {return C.categories.find(c=>c.id===id)||null;},
    create(data)   {C.catSeq++;const c={...data,id:uid(),createdAt:now()};C.categories.push(c);_save('ticket_cats',{items:C.categories,seq:C.catSeq});return c;},
    update(id,data){const i=C.categories.findIndex(c=>c.id===id);if(i<0)return null;C.categories[i]={...C.categories[i],...data};_save('ticket_cats',{items:C.categories,seq:C.catSeq});return C.categories[i];},
    delete(id)     {C.categories=C.categories.filter(c=>c.id!==id);_save('ticket_cats',{items:C.categories,seq:C.catSeq});},
  };

  // ── Choose backend ─────────────────────────────────────────────────────────
  const FIREBASE_OK = !FIREBASE_CONFIG.apiKey.startsWith('PASTE_');
  if (!FIREBASE_OK) {
    _initLS();
  } else {
    let resolved=false;
    const fallback=setTimeout(()=>{if(!resolved){resolved=true;console.warn('[NexCRM] Firebase timeout → localStorage');_initLS();}},7000);
    _initFirebase()
      .then(()=>{resolved=true;clearTimeout(fallback);})
      .catch(e=>{if(!resolved){resolved=true;clearTimeout(fallback);console.warn('[NexCRM] Firebase error → localStorage',e.message);_initLS();}});
  }

  window.NexCRM.Store={Users,Tickets,Customers,Notifications,Settings,Departments,TicketCategories};
  window.NexCRM._ready=_ready;
  window.NexCRM._uid=uid;
  window.NexCRM._now=now;
})();
