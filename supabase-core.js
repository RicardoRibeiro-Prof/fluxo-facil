(() => {
  "use strict";
  const URL = "https://uiofuqnekscbtgblaewi.supabase.co";
  const KEY = "sb_publishable_aZFAQMu_A7kHUZWS2OYvng_JCNnvurv";
  const SESSION_KEY = "fluxoFacil.supabase.session.v1";
  const FF = window.FF = {
    session: null,
    transactions: [],
    categories: [],
    editingId: null,
    deferredPrompt: null,
    $: (s, r = document) => r.querySelector(s),
    $$: (s, r = document) => [...r.querySelectorAll(s)]
  };

  FF.defaults = [
    ["Salário", "receita", "#20a765"], ["Serviços", "receita", "#0f6db5"],
    ["Moradia", "despesa", "#ef3d52"], ["Alimentação", "despesa", "#ff7a18"],
    ["Saúde", "despesa", "#e04aa1"], ["Transporte", "despesa", "#e9a800"],
    ["Educação", "despesa", "#7b52e8"], ["Lazer", "despesa", "#11a9c8"],
    ["Assinaturas", "despesa", "#5c6ee6"], ["Outros", "ambos", "#7f8b98"]
  ];

  FF.brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  FF.esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  FF.monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  FF.isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  FF.dateBR = value => { const [y,m,d] = value.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("pt-BR"); };
  FF.monthLabel = key => { const [y,m] = key.split("-").map(Number); return new Date(y,m-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".",""); };

  FF.toast = (message, actionLabel = "", action = null, duration = 3500) => {
    const toast = FF.$("#toast"); if (!toast) return;
    FF.$("#toastMessage").textContent = message;
    const btn = FF.$("#toastAction");
    if (actionLabel && action) { btn.textContent = actionLabel; btn.classList.remove("hidden"); btn.onclick = action; }
    else { btn.classList.add("hidden"); btn.onclick = null; }
    toast.classList.remove("hidden"); clearTimeout(FF.toast.timer);
    if (duration) FF.toast.timer = setTimeout(() => toast.classList.add("hidden"), duration);
  };

  const headers = extra => ({ apikey: KEY, Authorization: `Bearer ${FF.session?.access_token || KEY}`, "Content-Type": "application/json", ...(extra || {}) });
  FF.api = async (path, options = {}) => {
    const response = await fetch(URL + path, { ...options, headers: headers(options.headers) });
    const text = await response.text(); let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || `Erro ${response.status}`);
    return data;
  };
  FF.saveSession = session => { FF.session = session; session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY); };
  FF.restoreSession = () => { try { FF.session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { FF.session = null; } return FF.session; };
  FF.ensureSession = async () => {
    if (!FF.session) return false;
    const expires = Number(FF.session.expires_at || 0) * 1000;
    if (!expires || Date.now() < expires - 60000) return true;
    try {
      const session = await FF.api("/auth/v1/token?grant_type=refresh_token", { method:"POST", body:JSON.stringify({ refresh_token:FF.session.refresh_token }) });
      FF.saveSession(session); return true;
    } catch { FF.saveSession(null); return false; }
  };
  FF.login = async (email, password) => {
    const session = await FF.api("/auth/v1/token?grant_type=password", { method:"POST", body:JSON.stringify({email,password}) });
    FF.saveSession(session); return session;
  };
  FF.signup = async (email, password) => {
    const result = await FF.api("/auth/v1/signup", { method:"POST", body:JSON.stringify({email,password}) });
    if (result.access_token) FF.saveSession(result); return result;
  };
  FF.logout = async () => { try { await FF.api("/auth/v1/logout", {method:"POST"}); } catch {} FF.saveSession(null); };

  FF.select = (table, query = "") => FF.api(`/rest/v1/${table}?${query}`, { headers:{Prefer:"return=representation"} });
  FF.insert = async (table, row) => (await FF.api(`/rest/v1/${table}`, { method:"POST", headers:{Prefer:"return=representation"}, body:JSON.stringify(row) }))?.[0];
  FF.update = async (table, id, row) => (await FF.api(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", headers:{Prefer:"return=representation"}, body:JSON.stringify(row) }))?.[0];
  FF.remove = (table, id) => FF.api(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method:"DELETE", headers:{Prefer:"return=minimal"} });

  FF.loadData = async () => {
    await FF.ensureSession();
    const [categories, transactions] = await Promise.all([
      FF.select("categories", "select=*&order=name.asc"),
      FF.select("transactions", "select=*&order=date.desc,created_at.desc")
    ]);
    FF.categories = categories || [];
    FF.transactions = (transactions || []).map(t => ({ id:t.id, description:t.description, value:Number(t.amount), type:t.type === "receita" ? "income" : "expense", categoryId:t.category_id, date:t.date, status:t.status === "pago" ? "paid" : "pending", note:t.notes || "" }));
    if (!FF.categories.length) {
      for (const [name,type,color] of FF.defaults) await FF.insert("categories", { user_id:FF.session.user.id, name, type, color });
      FF.categories = await FF.select("categories", "select=*&order=name.asc");
    }
  };
})();
