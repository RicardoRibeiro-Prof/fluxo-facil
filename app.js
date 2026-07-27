(() => {
  "use strict";

  const STORAGE_KEYS = {
    transactions: "fluxoFacil.transactions.v2",
    categories: "fluxoFacil.categories.v2"
  };

  const DEFAULT_CATEGORIES = [
    { id: crypto.randomUUID(), name: "Salário", type: "income", color: "#20a765" },
    { id: crypto.randomUUID(), name: "Serviços", type: "income", color: "#0f6db5" },
    { id: crypto.randomUUID(), name: "Moradia", type: "expense", color: "#ef3d52" },
    { id: crypto.randomUUID(), name: "Alimentação", type: "expense", color: "#ff7a18" },
    { id: crypto.randomUUID(), name: "Saúde", type: "expense", color: "#e04aa1" },
    { id: crypto.randomUUID(), name: "Transporte", type: "expense", color: "#e9a800" },
    { id: crypto.randomUUID(), name: "Educação", type: "expense", color: "#7b52e8" },
    { id: crypto.randomUUID(), name: "Lazer", type: "expense", color: "#11a9c8" },
    { id: crypto.randomUUID(), name: "Assinaturas", type: "expense", color: "#5c6ee6" },
    { id: crypto.randomUUID(), name: "Outros", type: "both", color: "#7f8b98" }
  ];

  const state = {
    transactions: [],
    categories: [],
    deferredPrompt: null,
    currentView: "dashboard",
    editingId: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function brl(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function parseLocalDate(value) {
    if (!value) return new Date();
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function dateBR(value) {
    return parseLocalDate(value).toLocaleDateString("pt-BR");
  }

  function isoDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function monthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthLabel(key) {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, 1)
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "");
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(state.categories));
  }

  function loadState() {
    try {
      const storedCategories = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || "null");
      const storedTransactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions) || "null");

      state.categories = Array.isArray(storedCategories) && storedCategories.length
        ? storedCategories
        : DEFAULT_CATEGORIES;
      state.transactions = Array.isArray(storedTransactions)
        ? storedTransactions
        : [];
    } catch {
      state.categories = DEFAULT_CATEGORIES;
      state.transactions = [];
    }

    saveState();
  }

  function getCategory(id) {
    return state.categories.find(category => category.id === id) || {
      id: "",
      name: "Sem categoria",
      color: "#7f8b98",
      type: "both"
    };
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function showToast(message, actionLabel = "", action = null, duration = 3500) {
    const toast = $("#toast");
    const messageEl = $("#toastMessage");
    const actionEl = $("#toastAction");
    messageEl.textContent = message;

    if (actionLabel && action) {
      actionEl.textContent = actionLabel;
      actionEl.classList.remove("hidden");
      actionEl.onclick = action;
    } else {
      actionEl.classList.add("hidden");
      actionEl.onclick = null;
    }

    toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    if (duration) {
      showToast.timer = setTimeout(() => toast.classList.add("hidden"), duration);
    }
  }

  function setView(view) {
    state.currentView = view;
    $$(".view").forEach(el => el.classList.remove("active"));
    $$(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));

    const titles = {
      dashboard: ["Dashboard", "Visão geral das suas finanças"],
      transactions: ["Lançamentos", "Cadastre e acompanhe receitas e despesas"],
      categories: ["Categorias", "Organize seus lançamentos financeiros"]
    };

    $(`#${view}View`).classList.add("active");
    $("#pageTitle").textContent = titles[view][0];
    $("#pageSubtitle").textContent = titles[view][1];

    $("#sidebar").classList.remove("open");
    $("#overlay").classList.add("hidden");

    renderAll();
  }

  function selectedDashboardMonth() {
    return $("#dashboardMonth").value || monthKey();
  }

  function transactionIsRealized(transaction) {
    return transaction.status === "paid";
  }

  function dashboardData() {
    const selectedMonth = selectedDashboardMonth();
    const realized = state.transactions.filter(transactionIsRealized);

    const currentBalance = realized.reduce((total, item) =>
      total + (item.type === "income" ? item.value : -item.value), 0);

    const monthItems = realized.filter(item => item.date.startsWith(selectedMonth));
    const income = monthItems
      .filter(item => item.type === "income")
      .reduce((total, item) => total + item.value, 0);
    const expense = monthItems
      .filter(item => item.type === "expense")
      .reduce((total, item) => total + item.value, 0);

    return { selectedMonth, currentBalance, income, expense, result: income - expense, monthItems };
  }

  function renderDashboard() {
    const data = dashboardData();

    $("#currentBalance").textContent = brl(data.currentBalance);
    $("#monthIncome").textContent = brl(data.income);
    $("#monthExpense").textContent = brl(data.expense);
    $("#monthResult").textContent = brl(data.result);
    $("#monthResult").style.color = data.result >= 0 ? "var(--income)" : "var(--expense)";

    renderMonthlyChart(data.selectedMonth);
    renderCategoryDonut(data.monthItems);
    renderRecentTransactions();
  }

  function renderMonthlyChart(selectedMonth) {
    const chart = $("#monthlyChart");
    const [year, month] = selectedMonth.split("-").map(Number);
    const months = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(year, month - 1 - offset, 1);
      months.push(monthKey(date));
    }

    const totals = months.map(key => {
      const items = state.transactions.filter(item =>
        transactionIsRealized(item) && item.date.startsWith(key)
      );
      return {
        key,
        income: items.filter(i => i.type === "income").reduce((t, i) => t + i.value, 0),
        expense: items.filter(i => i.type === "expense").reduce((t, i) => t + i.value, 0)
      };
    });

    const max = Math.max(1, ...totals.flatMap(item => [item.income, item.expense]));
    chart.innerHTML = totals.map(item => `
      <div class="bar-group" title="${monthLabel(item.key)}: receitas ${brl(item.income)}; despesas ${brl(item.expense)}">
        <div class="bar income" style="height:${Math.max(2, item.income / max * 100)}%"></div>
        <div class="bar expense" style="height:${Math.max(2, item.expense / max * 100)}%"></div>
        <span class="bar-label">${monthLabel(item.key)}</span>
      </div>
    `).join("");
  }

  function renderCategoryDonut(monthItems) {
    const expenses = monthItems.filter(item => item.type === "expense");
    const totals = new Map();

    expenses.forEach(item => {
      totals.set(item.categoryId, (totals.get(item.categoryId) || 0) + item.value);
    });

    const groups = [...totals.entries()]
      .map(([categoryId, value]) => ({ category: getCategory(categoryId), value }))
      .sort((a, b) => b.value - a.value);

    const total = groups.reduce((sum, group) => sum + group.value, 0);
    $("#donutTotal").textContent = brl(total);

    if (!total) {
      $("#categoryDonut").style.background = "conic-gradient(#dfe8ef 0 100%)";
      $("#categoryLegend").innerHTML = '<div class="empty-state"><strong>Sem despesas</strong>Nenhuma despesa realizada neste mês.</div>';
      return;
    }

    let cursor = 0;
    const segments = groups.map(group => {
      const start = cursor;
      const portion = group.value / total * 100;
      cursor += portion;
      return `${group.category.color} ${start}% ${cursor}%`;
    });
    $("#categoryDonut").style.background = `conic-gradient(${segments.join(",")})`;

    $("#categoryLegend").innerHTML = groups.slice(0, 8).map(group => `
      <div class="legend-row">
        <i class="legend-swatch" style="background:${group.category.color}"></i>
        <span>${escapeHtml(group.category.name)}</span>
        <strong>${Math.round(group.value / total * 100)}%</strong>
      </div>
    `).join("");
  }

  function renderRecentTransactions() {
    const list = $("#recentTransactions");
    const recent = [...state.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    if (!recent.length) {
      list.innerHTML = '<div class="empty-state"><strong>Nenhuma movimentação</strong>Use “Novo lançamento” para começar.</div>';
      return;
    }

    list.innerHTML = recent.map(item => {
      const category = getCategory(item.categoryId);
      return `
        <div class="transaction-row">
          <i class="transaction-color" style="background:${category.color}"></i>
          <div class="transaction-main">
            <strong>${escapeHtml(item.description)}</strong>
            <span>${dateBR(item.date)} · ${escapeHtml(category.name)}${item.status === "pending" ? " · Pendente" : ""}</span>
          </div>
          <div class="transaction-value ${item.type}">
            ${item.type === "income" ? "+" : "−"} ${brl(item.value)}
          </div>
        </div>
      `;
    }).join("");
  }

  function filteredTransactions() {
    const search = $("#filterSearch").value.trim().toLocaleLowerCase("pt-BR");
    const month = $("#filterMonth").value;
    const type = $("#filterType").value;
    const category = $("#filterCategory").value;
    const status = $("#filterStatus").value;

    return [...state.transactions]
      .filter(item => !search || `${item.description} ${item.note || ""}`.toLocaleLowerCase("pt-BR").includes(search))
      .filter(item => !month || item.date.startsWith(month))
      .filter(item => !type || item.type === type)
      .filter(item => !category || item.categoryId === category)
      .filter(item => !status || item.status === status)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderTransactions() {
    const items = filteredTransactions();
    $("#transactionCount").textContent = `${items.length} ${items.length === 1 ? "registro" : "registros"}`;

    const emptyRow = `<tr><td colspan="6"><div class="empty-state"><strong>Nenhum lançamento encontrado</strong>Ajuste os filtros ou cadastre um novo lançamento.</div></td></tr>`;
    $("#transactionsTable").innerHTML = items.length ? items.map(transactionTableRow).join("") : emptyRow;
    $("#transactionsMobile").innerHTML = items.length ? items.map(transactionMobileCard).join("") :
      '<div class="empty-state"><strong>Nenhum lançamento encontrado</strong>Ajuste os filtros ou cadastre um novo lançamento.</div>';
  }

  function transactionTableRow(item) {
    const category = getCategory(item.categoryId);
    return `
      <tr>
        <td>${dateBR(item.date)}</td>
        <td><strong>${escapeHtml(item.description)}</strong>${item.note ? `<br><small>${escapeHtml(item.note)}</small>` : ""}</td>
        <td><span style="color:${category.color}">●</span> ${escapeHtml(category.name)}</td>
        <td><span class="status-pill ${item.status}">${item.status === "paid" ? (item.type === "income" ? "Recebido" : "Pago") : "Pendente"}</span></td>
        <td class="align-right table-value ${item.type}">${item.type === "income" ? "+" : "−"} ${brl(item.value)}</td>
        <td class="align-right">
          <span class="actions">
            <button class="action-btn" data-edit="${item.id}" title="Editar">✎</button>
            <button class="action-btn" data-delete="${item.id}" title="Excluir">🗑</button>
          </span>
        </td>
      </tr>
    `;
  }

  function transactionMobileCard(item) {
    const category = getCategory(item.categoryId);
    return `
      <article class="mobile-card">
        <div class="mobile-card-top">
          <div>
            <h3>${escapeHtml(item.description)}</h3>
            <p>${dateBR(item.date)} · <span style="color:${category.color}">●</span> ${escapeHtml(category.name)}</p>
          </div>
          <strong class="table-value ${item.type}">${item.type === "income" ? "+" : "−"} ${brl(item.value)}</strong>
        </div>
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        <div class="mobile-card-bottom">
          <span class="status-pill ${item.status}">${item.status === "paid" ? (item.type === "income" ? "Recebido" : "Pago") : "Pendente"}</span>
          <span class="actions">
            <button class="action-btn" data-edit="${item.id}">✎</button>
            <button class="action-btn" data-delete="${item.id}">🗑</button>
          </span>
        </div>
      </article>
    `;
  }

  function renderCategories() {
    const list = $("#categoriesList");

    list.innerHTML = state.categories.map(category => {
      const count = state.transactions.filter(item => item.categoryId === category.id).length;
      const typeName = category.type === "income" ? "Receita" : category.type === "expense" ? "Despesa" : "Receita e despesa";
      return `
        <div class="category-item">
          <i class="color" style="background:${category.color}"></i>
          <div>
            <strong>${escapeHtml(category.name)}</strong>
            <div class="category-type">${typeName}</div>
          </div>
          <span class="category-count">${count} ${count === 1 ? "lançamento" : "lançamentos"}</span>
          <button class="action-btn" data-delete-category="${category.id}" ${count ? "disabled" : ""} title="${count ? "Categoria em uso" : "Excluir"}">🗑</button>
        </div>
      `;
    }).join("");
  }

  function populateCategorySelects() {
    const filter = $("#filterCategory");
    const previousFilter = filter.value;
    filter.innerHTML = '<option value="">Todas</option>' + state.categories
      .map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
      .join("");
    filter.value = previousFilter;

    updateTransactionCategoryOptions();
  }

  function updateTransactionCategoryOptions() {
    const select = $("#transactionCategory");
    const type = $("#transactionType").value;
    const previous = select.value;
    const categories = state.categories.filter(category => category.type === type || category.type === "both");
    select.innerHTML = categories.map(category =>
      `<option value="${category.id}">${escapeHtml(category.name)}</option>`
    ).join("");
    if (categories.some(category => category.id === previous)) select.value = previous;
  }

  function renderAll() {
    populateCategorySelects();
    renderDashboard();
    renderTransactions();
    renderCategories();
  }

  function openTransactionModal(id = null) {
    state.editingId = id;
    const modal = $("#transactionModal");
    $("#transactionForm").reset();
    $("#transactionId").value = id || "";
    $("#transactionDate").value = isoDate();
    $("#transactionStatus").value = "paid";

    if (id) {
      const item = state.transactions.find(transaction => transaction.id === id);
      if (!item) return;
      $("#transactionModalTitle").textContent = "Editar lançamento";
      $("#transactionType").value = item.type;
      updateTransactionCategoryOptions();
      $("#transactionDate").value = item.date;
      $("#transactionDescription").value = item.description;
      $("#transactionCategory").value = item.categoryId;
      $("#transactionValue").value = item.value;
      $("#transactionStatus").value = item.status;
      $("#transactionNote").value = item.note || "";
    } else {
      $("#transactionModalTitle").textContent = "Novo lançamento";
      $("#transactionType").value = "expense";
      updateTransactionCategoryOptions();
    }

    modal.showModal();
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal?.open) modal.close();
  }

  function saveTransaction(event) {
    event.preventDefault();

    const item = {
      id: state.editingId || crypto.randomUUID(),
      type: $("#transactionType").value,
      date: $("#transactionDate").value,
      description: $("#transactionDescription").value.trim(),
      categoryId: $("#transactionCategory").value,
      value: Number($("#transactionValue").value),
      status: $("#transactionStatus").value,
      note: $("#transactionNote").value.trim()
    };

    if (!item.description || !item.date || !item.categoryId || !Number.isFinite(item.value) || item.value <= 0) {
      showToast("Preencha corretamente os campos obrigatórios.");
      return;
    }

    const index = state.transactions.findIndex(transaction => transaction.id === item.id);
    if (index >= 0) state.transactions[index] = item;
    else state.transactions.push(item);

    saveState();
    closeModal("transactionModal");
    renderAll();
    showToast(state.editingId ? "Lançamento atualizado." : "Lançamento adicionado.");
    state.editingId = null;
  }

  function deleteTransaction(id) {
    const item = state.transactions.find(transaction => transaction.id === id);
    if (!item) return;
    if (!confirm(`Excluir o lançamento “${item.description}”?`)) return;
    state.transactions = state.transactions.filter(transaction => transaction.id !== id);
    saveState();
    renderAll();
    showToast("Lançamento excluído.");
  }

  function addCategory(event) {
    event.preventDefault();
    const name = $("#categoryName").value.trim();
    if (!name) return;

    if (state.categories.some(category => category.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      showToast("Já existe uma categoria com esse nome.");
      return;
    }

    state.categories.push({
      id: crypto.randomUUID(),
      name,
      type: $("#categoryType").value,
      color: $("#categoryColor").value
    });
    saveState();
    event.target.reset();
    $("#categoryColor").value = "#0f6db5";
    renderAll();
    showToast("Categoria adicionada.");
  }

  function deleteCategory(id) {
    const count = state.transactions.filter(item => item.categoryId === id).length;
    if (count) {
      showToast("Esta categoria possui lançamentos e não pode ser excluída.");
      return;
    }
    const category = getCategory(id);
    if (!confirm(`Excluir a categoria “${category.name}”?`)) return;
    state.categories = state.categories.filter(item => item.id !== id);
    saveState();
    renderAll();
    showToast("Categoria excluída.");
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setupNavigation() {
    $$(".nav-item").forEach(button =>
      button.addEventListener("click", () => setView(button.dataset.view))
    );
    $$("[data-view-link]").forEach(button =>
      button.addEventListener("click", () => setView(button.dataset.viewLink))
    );

    $("#menuBtn").addEventListener("click", () => {
      $("#sidebar").classList.add("open");
      $("#overlay").classList.remove("hidden");
    });
    $("#overlay").addEventListener("click", () => {
      $("#sidebar").classList.remove("open");
      $("#overlay").classList.add("hidden");
    });
  }

  function setupFormsAndActions() {
    $("#newTransactionBtn").addEventListener("click", () => openTransactionModal());
    $("#transactionType").addEventListener("change", updateTransactionCategoryOptions);
    $("#transactionForm").addEventListener("submit", saveTransaction);
    $("#categoryForm").addEventListener("submit", addCategory);

    $$("[data-close-modal]").forEach(button =>
      button.addEventListener("click", () => closeModal(button.dataset.closeModal))
    );

    document.addEventListener("click", event => {
      const editButton = event.target.closest("[data-edit]");
      const deleteButton = event.target.closest("[data-delete]");
      const deleteCategoryButton = event.target.closest("[data-delete-category]");
      if (editButton) openTransactionModal(editButton.dataset.edit);
      if (deleteButton) deleteTransaction(deleteButton.dataset.delete);
      if (deleteCategoryButton) deleteCategory(deleteCategoryButton.dataset.deleteCategory);
    });

    ["filterSearch", "filterMonth", "filterType", "filterCategory", "filterStatus"].forEach(id => {
      document.getElementById(id).addEventListener(id === "filterSearch" ? "input" : "change", renderTransactions);
    });

    $("#clearFilters").addEventListener("click", () => {
      $("#filterSearch").value = "";
      $("#filterMonth").value = "";
      $("#filterType").value = "";
      $("#filterCategory").value = "";
      $("#filterStatus").value = "";
      renderTransactions();
    });

    $("#dashboardMonth").addEventListener("change", renderDashboard);
    $("#goCurrentMonth").addEventListener("click", () => {
      $("#dashboardMonth").value = monthKey();
      renderDashboard();
    });
  }

  function setupInstall() {
    const installBtn = $("#installBtn");

    const refreshInstallButton = () => {
      if (isStandalone()) {
        installBtn.classList.add("hidden");
      } else if (state.deferredPrompt || isIOS()) {
        installBtn.classList.remove("hidden");
      }
    };

    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      state.deferredPrompt = event;
      refreshInstallButton();
    });

    window.addEventListener("appinstalled", () => {
      state.deferredPrompt = null;
      installBtn.classList.add("hidden");
      showToast("Fluxo Fácil instalado com sucesso.");
    });

    installBtn.addEventListener("click", async () => {
      if (isIOS()) {
        $("#iosInstallModal").showModal();
        return;
      }
      if (!state.deferredPrompt) {
        showToast("Abra o menu do navegador e escolha “Instalar aplicativo”.");
        return;
      }
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      refreshInstallButton();
    });

    refreshInstallButton();
  }

  async function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("./sw.js");

      if (registration.waiting) {
        showUpdateToast(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(worker);
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.warn("Service worker não registrado:", error);
    }
  }

  function showUpdateToast(worker) {
    showToast("Uma nova versão está disponível.", "Atualizar", () => {
      worker.postMessage({ type: "SKIP_WAITING" });
    }, 0);
  }

  function init() {
    loadState();
    $("#dashboardMonth").value = monthKey();
    setupNavigation();
    setupFormsAndActions();
    setupInstall();
    setupServiceWorker();
    renderAll();

    window.addEventListener("load", () => {
      setTimeout(() => $("#splash").classList.add("hide"), 550);
    });
  }

  init();
})();
