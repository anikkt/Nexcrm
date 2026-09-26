'use strict';
const records=[
{name:'Acme Corporation',contact:'John Smith',email:'john@acme.example',stage:'Proposal',value:120000,owner:'Ankit',initials:'AK',activity:'Today'},
{name:'Contoso Ltd.',contact:'Maya Chen',email:'maya@contoso.example',stage:'Qualified',value:80000,owner:'Sarah',initials:'SP',activity:'Yesterday'},
{name:'Fabrikam Inc.',contact:'Sam Rivera',email:'sam@fabrikam.example',stage:'Negotiation',value:220000,owner:'David',initials:'DO',activity:'2 days ago'},
{name:'Northwind Traders',contact:'Olivia Martin',email:'olivia@northwind.example',stage:'Won',value:150000,owner:'Ankit',initials:'AK',activity:'3 days ago'},
{name:'Globex Systems',contact:'Aarav Shah',email:'aarav@globex.example',stage:'New',value:45000,owner:'Sarah',initials:'SP',activity:'5 days ago'},
{name:'Adventure Works',contact:'Emma Wilson',email:'emma@adventure.example',stage:'Qualified',value:95000,owner:'David',initials:'DO',activity:'1 week ago'},
{name:'Tailspin Toys',contact:'Noah Brown',email:'noah@tailspin.example',stage:'Proposal',value:75000,owner:'Ankit',initials:'AK',activity:'1 week ago'},
{name:'Woodgrove Bank',contact:'Sophia Davis',email:'sophia@woodgrove.example',stage:'New',value:180000,owner:'Sarah',initials:'SP',activity:'2 weeks ago'},
{name:'Blue Yonder',contact:'Liam Jones',email:'liam@blueyonder.example',stage:'Negotiation',value:130000,owner:'David',initials:'DO',activity:'2 weeks ago'}
];
const viewConfig={
 customers:['Customers','Manage customer relationships in one place.','Add customer'],
 leads:['Leads','Qualify and prioritize new business opportunities.','Add lead'],
 deals:['Deals','Track opportunities from first contact to close.','Add deal'],
 activities:['Activities','Review calls, emails, meetings and notes.','Log activity'],
 tasks:['Tasks','Stay on top of follow-ups and commitments.','Add task'],
 reports:['Reports','Explore pipeline and activity performance.','Create report'],
 settings:['Settings','Configure your workspace and preferences.','Update settings']
};
let state={query:'',stage:'all',sort:'name',direction:1,page:1,pageSize:6,selected:new Set()};
const $=selector=>document.querySelector(selector);const $$=selector=>[...document.querySelectorAll(selector)];
const dashboardView=$('#dashboardView'),listView=$('#listView'),sidebar=$('#sidebar'),overlay=$('#overlay');
function goToView(view){
 $$('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view===view));
 if(view==='dashboard'){dashboardView.classList.add('active-view');listView.classList.remove('active-view');}
 else{dashboardView.classList.remove('active-view');listView.classList.add('active-view');const c=viewConfig[view]||viewConfig.customers;$('#listTitle').textContent=c[0];$('#listSubtitle').textContent=c[1];$('#addRecordButton').textContent='＋ '+c[2];renderTable();}
 closeSidebar();window.scrollTo({top:0,behavior:'smooth'});
}
$$('.nav-item').forEach(item=>item.addEventListener('click',()=>goToView(item.dataset.view)));
$$('[data-view-link]').forEach(item=>item.addEventListener('click',()=>goToView(item.dataset.viewLink)));
function openSidebar(){sidebar.classList.add('open');overlay.classList.add('visible')}
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('visible')}
$('#openSidebar').addEventListener('click',openSidebar);$('#closeSidebar').addEventListener('click',closeSidebar);overlay.addEventListener('click',closeSidebar);
function filteredRecords(){return records.filter(r=>(state.stage==='all'||r.stage===state.stage)&&(`${r.name} ${r.contact} ${r.email} ${r.owner}`.toLowerCase().includes(state.query.toLowerCase()))).sort((a,b)=>{let av=a[state.sort],bv=b[state.sort];if(typeof av==='string'){av=av.toLowerCase();bv=bv.toLowerCase()}return(av>bv?1:av<bv?-1:0)*state.direction})}
function currency(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v)}
function renderTable(){const all=filteredRecords(),pages=Math.max(1,Math.ceil(all.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize,pageRows=all.slice(start,start+state.pageSize);$('#recordsBody').innerHTML=pageRows.map((r,i)=>`<tr><td><input class="row-check" type="checkbox" data-id="${r.name}" aria-label="Select ${r.name}" ${state.selected.has(r.name)?'checked':''}></td><td><strong>${r.name}</strong><span>${r.email}</span></td><td>${r.contact}</td><td><span class="status ${r.stage.toLowerCase()}">${r.stage}</span></td><td>${currency(r.value)}</td><td><span class="person-chip"><i>${r.initials}</i>${r.owner}</span></td><td>${r.activity}</td><td><button class="row-actions" aria-label="More actions for ${r.name}">⋮</button></td></tr>`).join('');
 $('#resultsLabel').textContent=all.length?`Showing ${start+1}-${Math.min(start+state.pageSize,all.length)} of ${all.length} records`:'0 records';$('#pageLabel').textContent=`${state.page} / ${pages}`;$('#previousPage').disabled=state.page===1;$('#nextPage').disabled=state.page===pages;$('.records-panel').classList.toggle('empty',!all.length);$('#emptyState').classList.toggle('visible',!all.length);bindChecks();updateSelection();}
function bindChecks(){$$('.row-check').forEach(c=>c.addEventListener('change',()=>{c.checked?state.selected.add(c.dataset.id):state.selected.delete(c.dataset.id);updateSelection()}))}
function updateSelection(){$('#selectedCount').textContent=state.selected.size;$('#selectionBar').classList.toggle('visible',state.selected.size>0);const visible=$$('.row-check');$('#selectAll').checked=visible.length>0&&visible.every(c=>c.checked)}
$('#tableSearch').addEventListener('input',e=>{state.query=e.target.value;state.page=1;renderTable()});$('#stageFilter').addEventListener('change',e=>{state.stage=e.target.value;state.page=1;renderTable()});
function clearFilters(){state.query='';state.stage='all';state.page=1;$('#tableSearch').value='';$('#stageFilter').value='all';renderTable()}
$('#clearFilters').addEventListener('click',clearFilters);$('#emptyClear').addEventListener('click',clearFilters);$('#previousPage').addEventListener('click',()=>{state.page--;renderTable()});$('#nextPage').addEventListener('click',()=>{state.page++;renderTable()});
$$('.sort-button').forEach(b=>b.addEventListener('click',()=>{if(state.sort===b.dataset.sort)state.direction*=-1;else{state.sort=b.dataset.sort;state.direction=1}renderTable()}));
$('#selectAll').addEventListener('change',e=>{$$('.row-check').forEach(c=>{c.checked=e.target.checked;e.target.checked?state.selected.add(c.dataset.id):state.selected.delete(c.dataset.id)});updateSelection()});
const searchDialog=$('#searchDialog'),commandInput=$('#commandInput');
function openSearch(){searchDialog.showModal();commandInput.value='';renderCommandResults('');setTimeout(()=>commandInput.focus(),30)}
function renderCommandResults(q){const lowered=q.toLowerCase();const matches=records.filter(r=>`${r.name} ${r.contact} ${r.stage}`.toLowerCase().includes(lowered)).slice(0,6);$('#commandResults').innerHTML=(matches.length?matches.map(r=>`<button class="command-item" type="button" data-name="${r.name}"><span>◉</span><div><strong>${r.name}</strong><small>${r.contact} · ${r.stage} · ${currency(r.value)}</small></div></button>`).join(''):'<div class="empty-state visible"><p>No records match your search.</p></div>');$$('.command-item').forEach(b=>b.addEventListener('click',()=>{searchDialog.close();goToView('customers');state.query=b.dataset.name;$('#tableSearch').value=state.query;renderTable()}))}
$('#globalSearchButton').addEventListener('click',openSearch);commandInput.addEventListener('input',e=>renderCommandResults(e.target.value));document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
const newDialog=$('#newDialog');$('#newButton').addEventListener('click',()=>newDialog.showModal());$('#addRecordButton').addEventListener('click',()=>newDialog.showModal());newDialog.addEventListener('close',()=>{if(newDialog.returnValue&&newDialog.returnValue!=='cancel')showToast(`${newDialog.returnValue[0].toUpperCase()+newDialog.returnValue.slice(1)} form ready for backend integration.`)});
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),2600)}
$('#todayLabel').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long'}).format(new Date());renderTable();
