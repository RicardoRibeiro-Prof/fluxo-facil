(() => {
  "use strict";
  const F = window.FF, $ = F.$, $$ = F.$$;
  const category = id => F.categories.find(c => c.id === id) || {name:"Sem categoria",color:"#7f8b98",type:"ambos"};
  const realized = t => t.status === "paid";

  function injectAuth() {
    const style = document.createElement("style");
    style.textContent = `.auth-screen{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:20px;background:linear-gradient(145deg,#eef7ff,#dceeff)}.auth-card{width:min(420px,100%);padding:26px;border-radius:20px;background:#fff;box-shadow:0 22px 70px rgba(15,70,115,.2)}.auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:20px}.auth-brand img{width:54px;height:54px;border-radius:15px}.auth-brand h1{margin:0;font-size:22px}.auth-brand p{margin:3px 0 0;color:#6f7b8c;font-size:12px}.auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:11px;background:#f1f5f8;margin-bottom:16px}.auth-tab{border:0;border-radius:8px;padding:9px;background:transparent;font-weight:700}.auth-tab.active{background:#fff;color:#0f6db5;box-shadow:0 1px 5px rgba(0,0,0,.08)}.auth-form{display:grid;gap:13px}.auth-form label{display:grid;gap:6px;font-size:12px;font-weight:700;color:#405066}.auth-form input{min-height:44px;padding:10px 12px;border:1px solid #dce5ec;border-radius:10px}.auth-submit{min-height:44px;border:0;border-radius:10px;color:#fff;background:#0f6db5;font-weight:800}.auth-message{min-height:18px;color:#b21e31;font-size:12px}.user-box{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #dce5ec;border-radius:10px;background:#fff}.user-box span{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#526074}.logout-btn{border:0;background:transparent;color:#b21e31;font-weight:700;font-size:11px}`;
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.id = "authScreen"; el.className = "auth-screen hidden";
    el.innerHTML = `<section class="auth-card"><div class="auth-brand"><img src="icons/icon-192.png" alt=""><div><h1>Fluxo Fácil</h1><p>Seus dados seguros e sincronizados</p></div></div><div class="auth-tabs"><button class="auth-tab active" data-auth="login">Entrar</button><button class="auth-tab" data-auth="signup">Criar conta</button></div><form id="authForm" class="auth-form"><label>E-mail<input id="authEmail" type="email" required placeholder="seu@email.com"></label><label>Senha<input id="authPassword" type="password" minlength="6" required placeholder="Mínimo de 6 caracteres"></label><label id="confirmWrap" class="hidden">Confirmar senha<input id="authConfirm" type="password" minlength="6"></label><div id="authMessage" class="auth-message"></div><button id="authSubmit" class="auth-submit">Entrar</button></form></section>`;
    document.body.appendChild(el);
    let mode = "login";
    $$('[data-auth]').forEach(btn => btn.onclick = () => {
      mode = btn.dataset.auth; $$('[data-auth]').forEach(x => x.classList.toggle("active", x === btn));
      $("#confirmWrap").classList.toggle("hidden", mode !== "signup"); $("#authConfirm").required = mode === "signup";
      $("#authSubmit").textContent = mode === "signup" ? "Criar conta" : "Entrar"; $("#authMessage").textContent = "";
    });
    $("#authForm").onsubmit = async e => {
      e.preventDefault(); const email = $("#authEmail").value.trim(), password = $("#authPassword").value, confirm = $("#authConfirm").value;
      const msg = $("#authMessage"), btn = $("#authSubmit"); msg.textContent = "";
      if (mode === "signup" && password !== confirm) return msg.textContent = "As senhas não coincidem.";
      btn.disabled = true; btn.textContent = "Aguarde...";
      try {
        if (mode === "signup") {
          const result = await F.signup(email,password);
          if (result.access_token) await enterApp();
          else { msg.style.color="#11754a"; msg.textContent="Conta criada. Confirme pelo e-mail e depois entre."; }
        } else { await F.login(email,password); await enterApp(); }
      } catch(err) { msg.style.color="#b21e31"; msg.textContent = err.message; }
      finally { btn.disabled=false; btn.textContent = mode === "signup" ? "Criar conta" : "Entrar"; }
    };
  }

  function showAuth() { $("#authScreen").classList.remove("hidden"); document.querySelector(".app-shell").style.display="none"; $("#splash")?.classList.add("hide"); }
  function hideAuth() { $("#authScreen").classList.add("hidden"); document.querySelector(".app-shell").style.display="flex"; }
  function userBox() {
    document.querySelector(".user-box")?.remove(); const footer=document.querySelector(".sidebar-footer"); if(!footer||!F.session)return;
    const box=document.createElement("div"); box.className="user-box"; box.innerHTML=`<span>${F.esc(F.session.user?.email||"Usuário")}</span><button class="logout-btn">Sair</button>`;
    box.querySelector("button").onclick=async()=>{await F.logout();F.transactions=[];F.categories=[];showAuth();}; footer.prepend(box);
  }

  function setView(view) {
    $$(".view").forEach(x=>x.classList.remove("active")); $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
    const t={dashboard:["Dashboard","Visão geral das suas finanças"],transactions:["Lançamentos","Cadastre e acompanhe receitas e despesas"],categories:["Categorias","Organize seus lançamentos financeiros"]};
    $(`#${view}View`).classList.add("active"); $("#pageTitle").textContent=t[view][0]; $("#pageSubtitle").textContent=t[view][1];
    $("#sidebar").classList.remove("open"); $("#overlay").classList.add("hidden"); renderAll();
  }

  function dashboard() {
    const month=$("#dashboardMonth").value||F.monthKey(), paid=F.transactions.filter(realized), list=paid.filter(t=>t.date.startsWith(month));
    const income=list.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0), expense=list.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
    const balance=paid.reduce((s,t)=>s+(t.type==="income"?t.value:-t.value),0);
    $("#currentBalance").textContent=F.brl(balance); $("#monthIncome").textContent=F.brl(income); $("#monthExpense").textContent=F.brl(expense); $("#monthResult").textContent=F.brl(income-expense); $("#monthResult").style.color=income-expense>=0?"var(--income)":"var(--expense)";
    chart(month); donut(list); recent();
  }

  function chart(selected) {
    const [y,m]=selected.split("-").map(Number), months=[]; for(let i=5;i>=0;i--)months.push(F.monthKey(new Date(y,m-1-i,1)));
    const data=months.map(key=>{const l=F.transactions.filter(t=>realized(t)&&t.date.startsWith(key));return{key,income:l.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0),expense:l.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0)}});
    const max=Math.max(1,...data.flatMap(d=>[d.income,d.expense]));
    $("#monthlyChart").innerHTML=data.map(d=>`<div class="bar-group"><div class="bar income" style="height:${Math.max(2,d.income/max*100)}%"></div><div class="bar expense" style="height:${Math.max(2,d.expense/max*100)}%"></div><span class="bar-label">${F.monthLabel(d.key)}</span></div>`).join("");
  }

  function donut(items) {
    const map=new Map();items.filter(t=>t.type==="expense").forEach(t=>map.set(t.categoryId,(map.get(t.categoryId)||0)+t.value));
    const groups=[...map].map(([id,value])=>({cat:category(id),value})).sort((a,b)=>b.value-a.value), total=groups.reduce((s,g)=>s+g.value,0); $("#donutTotal").textContent=F.brl(total);
    if(!total){$("#categoryDonut").style.background="conic-gradient(#dfe8ef 0 100%)";$("#categoryLegend").innerHTML='<div class="empty-state"><strong>Sem despesas</strong>Nenhuma despesa realizada neste mês.</div>';return;}
    let pos=0;$("#categoryDonut").style.background=`conic-gradient(${groups.map(g=>{const a=pos;pos+=g.value/total*100;return`${g.cat.color} ${a}% ${pos}%`}).join(",")})`;
    $("#categoryLegend").innerHTML=groups.slice(0,8).map(g=>`<div class="legend-row"><i class="legend-swatch" style="background:${g.cat.color}"></i><span>${F.esc(g.cat.name)}</span><strong>${Math.round(g.value/total*100)}%</strong></div>`).join("");
  }

  function recent() {
    const list=[...F.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
    $("#recentTransactions").innerHTML=list.length?list.map(t=>{const c=category(t.categoryId);return`<div class="transaction-row"><i class="transaction-color" style="background:${c.color}"></i><div class="transaction-main"><strong>${F.esc(t.description)}</strong><span>${F.dateBR(t.date)} · ${F.esc(c.name)}${t.status==="pending"?" · Pendente":""}</span></div><div class="transaction-value ${t.type}">${t.type==="income"?"+":"−"} ${F.brl(t.value)}</div></div>`}).join(""):'<div class="empty-state"><strong>Nenhuma movimentação</strong>Use “Novo lançamento” para começar.</div>';
  }

  function filtered() {
    const q=$("#filterSearch").value.trim().toLowerCase(),m=$("#filterMonth").value,t=$("#filterType").value,c=$("#filterCategory").value,s=$("#filterStatus").value;
    return [...F.transactions].filter(x=>!q||`${x.description} ${x.note}`.toLowerCase().includes(q)).filter(x=>!m||x.date.startsWith(m)).filter(x=>!t||x.type===t).filter(x=>!c||x.categoryId===c).filter(x=>!s||x.status===s).sort((a,b)=>b.date.localeCompare(a.date));
  }

  function actions(t){return`<span class="actions"><button class="action-btn" data-edit="${t.id}">✎</button><button class="action-btn" data-delete="${t.id}">🗑</button></span>`}
  function status(t){return`<span class="status-pill ${t.status}">${t.status==="paid"?(t.type==="income"?"Recebido":"Pago"):"Pendente"}</span>`}
  function tableRow(t){const c=category(t.categoryId);return`<tr><td>${F.dateBR(t.date)}</td><td><strong>${F.esc(t.description)}</strong>${t.note?`<br><small>${F.esc(t.note)}</small>`:""}</td><td><span style="color:${c.color}">●</span> ${F.esc(c.name)}</td><td>${status(t)}</td><td class="align-right table-value ${t.type}">${t.type==="income"?"+":"−"} ${F.brl(t.value)}</td><td class="align-right">${actions(t)}</td></tr>`}
  function card(t){const c=category(t.categoryId);return`<article class="mobile-card"><div class="mobile-card-top"><div><h3>${F.esc(t.description)}</h3><p>${F.dateBR(t.date)} · <span style="color:${c.color}">●</span> ${F.esc(c.name)}</p></div><strong class="table-value ${t.type}">${t.type==="income"?"+":"−"} ${F.brl(t.value)}</strong></div>${t.note?`<p>${F.esc(t.note)}</p>`:""}<div class="mobile-card-bottom">${status(t)}${actions(t)}</div></article>`}

  function transactions() {
    const list=filtered();$("#transactionCount").textContent=`${list.length} ${list.length===1?"registro":"registros"}`;
    $("#transactionsTable").innerHTML=list.length?list.map(tableRow).join(""):'<tr><td colspan="6"><div class="empty-state"><strong>Nenhum lançamento encontrado</strong>Cadastre seu primeiro lançamento.</div></td></tr>';
    $("#transactionsMobile").innerHTML=list.length?list.map(card).join(""):'<div class="empty-state"><strong>Nenhum lançamento encontrado</strong>Cadastre seu primeiro lançamento.</div>';
  }

  function categories() {
    $("#categoriesList").innerHTML=F.categories.map(c=>{const n=F.transactions.filter(t=>t.categoryId===c.id).length,type=c.type==="receita"?"Receita":c.type==="despesa"?"Despesa":"Receita e despesa";return`<div class="category-item"><i class="color" style="background:${c.color}"></i><div><strong>${F.esc(c.name)}</strong><div class="category-type">${type}</div></div><span class="category-count">${n} lançamento${n===1?"":"s"}</span><button class="action-btn" data-delete-category="${c.id}" ${n?"disabled":""}>🗑</button></div>`}).join("");
  }

  function populate() {
    const filter=$("#filterCategory"),old=filter.value;filter.innerHTML='<option value="">Todas</option>'+F.categories.map(c=>`<option value="${c.id}">${F.esc(c.name)}</option>`).join("");filter.value=old;transactionCategories();
  }
  function transactionCategories() {
    const select=$("#transactionCategory"),old=select.value,dbType=$("#transactionType").value==="income"?"receita":"despesa",list=F.categories.filter(c=>c.type===dbType||c.type==="ambos");
    select.innerHTML=list.map(c=>`<option value="${c.id}">${F.esc(c.name)}</option>`).join("");if(list.some(c=>c.id===old))select.value=old;
  }
  function renderAll(){populate();dashboard();transactions();categories();}

  function openTx(id=null) {
    F.editingId=id;$("#transactionForm").reset();$("#transactionDate").value=F.isoDate();$("#transactionStatus").value="paid";
    if(id){const t=F.transactions.find(x=>x.id===id);if(!t)return;$("#transactionModalTitle").textContent="Editar lançamento";$("#transactionType").value=t.type;transactionCategories();$("#transactionDate").value=t.date;$("#transactionDescription").value=t.description;$("#transactionCategory").value=t.categoryId||"";$("#transactionValue").value=t.value;$("#transactionStatus").value=t.status;$("#transactionNote").value=t.note;}else{$("#transactionModalTitle").textContent="Novo lançamento";$("#transactionType").value="expense";transactionCategories();}
    $("#transactionModal").showModal();
  }

  async function saveTx(e) {
    e.preventDefault();const type=$("#transactionType").value,row={user_id:F.session.user.id,description:$("#transactionDescription").value.trim(),amount:Number($("#transactionValue").value),type:type==="income"?"receita":"despesa",category_id:$("#transactionCategory").value||null,date:$("#transactionDate").value,status:$("#transactionStatus").value==="paid"?"pago":"pendente",notes:$("#transactionNote").value.trim()||null};
    try{F.editingId?await F.update("transactions",F.editingId,row):await F.insert("transactions",row);$("#transactionModal").close();await F.loadData();renderAll();F.toast(F.editingId?"Lançamento atualizado.":"Lançamento adicionado.");F.editingId=null;}catch(err){F.toast(err.message)}
  }
  async function deleteTx(id){const t=F.transactions.find(x=>x.id===id);if(!t||!confirm(`Excluir “${t.description}”?`))return;try{await F.remove("transactions",id);await F.loadData();renderAll();F.toast("Lançamento excluído.")}catch(err){F.toast(err.message)}}
  async function addCategory(e){e.preventDefault();const map={income:"receita",expense:"despesa",both:"ambos"};try{await F.insert("categories",{user_id:F.session.user.id,name:$("#categoryName").value.trim(),type:map[$("#categoryType").value],color:$("#categoryColor").value});e.target.reset();$("#categoryColor").value="#0f6db5";await F.loadData();renderAll();F.toast("Categoria adicionada.")}catch(err){F.toast(err.message.includes("duplicate")?"Já existe uma categoria com esse nome.":err.message)}}
  async function deleteCategory(id){if(F.transactions.some(t=>t.categoryId===id))return F.toast("Esta categoria possui lançamentos.");const c=category(id);if(!confirm(`Excluir a categoria “${c.name}”?`))return;try{await F.remove("categories",id);await F.loadData();renderAll();F.toast("Categoria excluída.")}catch(err){F.toast(err.message)}}

  function events() {
    $$(".nav-item").forEach(b=>b.onclick=()=>setView(b.dataset.view));$$('[data-view-link]').forEach(b=>b.onclick=()=>setView(b.dataset.viewLink));
    $("#menuBtn").onclick=()=>{$("#sidebar").classList.add("open");$("#overlay").classList.remove("hidden")};$("#overlay").onclick=()=>{$("#sidebar").classList.remove("open");$("#overlay").classList.add("hidden")};
    $("#newTransactionBtn").onclick=()=>openTx();$("#transactionType").onchange=transactionCategories;$("#transactionForm").onsubmit=saveTx;$("#categoryForm").onsubmit=addCategory;
    $$('[data-close-modal]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.closeModal)?.close());
    document.addEventListener("click",e=>{const a=e.target.closest("[data-edit]"),b=e.target.closest("[data-delete]"),c=e.target.closest("[data-delete-category]");if(a)openTx(a.dataset.edit);if(b)deleteTx(b.dataset.delete);if(c)deleteCategory(c.dataset.deleteCategory)});
    ["filterSearch","filterMonth","filterType","filterCategory","filterStatus"].forEach(id=>$("#"+id).addEventListener(id==="filterSearch"?"input":"change",transactions));
    $("#clearFilters").onclick=()=>{["filterSearch","filterMonth","filterType","filterCategory","filterStatus"].forEach(id=>$("#"+id).value="");transactions()};
    $("#dashboardMonth").onchange=dashboard;$("#goCurrentMonth").onclick=()=>{$("#dashboardMonth").value=F.monthKey();dashboard()};
  }

  function install() {
    const btn=$("#installBtn"),ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true,refresh=()=>btn.classList.toggle("hidden",standalone()||(!F.deferredPrompt&&!ios()));
    addEventListener("beforeinstallprompt",e=>{e.preventDefault();F.deferredPrompt=e;refresh()});addEventListener("appinstalled",()=>{F.deferredPrompt=null;refresh();F.toast("Aplicativo instalado.")});btn.onclick=async()=>{if(ios())return$("#iosInstallModal").showModal();if(!F.deferredPrompt)return F.toast("Abra o menu do navegador e escolha Instalar aplicativo.");F.deferredPrompt.prompt();await F.deferredPrompt.userChoice;F.deferredPrompt=null;refresh()};refresh();
  }

  async function serviceWorker(){if(!("serviceWorker"in navigator))return;try{const r=await navigator.serviceWorker.register("./sw.js"),show=w=>F.toast("Nova versão disponível.","Atualizar",()=>w.postMessage({type:"SKIP_WAITING"}),0);if(r.waiting)show(r.waiting);r.addEventListener("updatefound",()=>r.installing?.addEventListener("statechange",()=>{if(r.installing?.state==="installed"&&navigator.serviceWorker.controller)show(r.installing)}));let reload=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!reload){reload=true;location.reload()}})}catch(e){console.warn(e)}}

  async function enterApp(){hideAuth();userBox();try{await F.loadData();renderAll();$("#splash")?.classList.add("hide")}catch(err){if(/JWT|token|401/i.test(err.message)){F.saveSession(null);showAuth()}else F.toast(err.message)}}
  async function init(){injectAuth();events();install();serviceWorker();$("#dashboardMonth").value=F.monthKey();F.restoreSession();if(F.session&&await F.ensureSession())await enterApp();else showAuth()}
  init();
})();
