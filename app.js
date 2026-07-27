(() => {
  "use strict";

  // Remove somente os dados demonstrativos das versões locais antigas.
  [
    "fluxoFacil.transactions.v1",
    "fluxoFacil.transactions.v2",
    "fluxoFacil.categories.v1",
    "fluxoFacil.categories.v2",
    "fluxoFacil.initialized.v1"
  ].forEach(key => localStorage.removeItem(key));

  const shell = document.querySelector(".app-shell");
  if (shell) shell.style.display = "none";

  const files = [
    "./supabase-core.js?v=6",
    "./ui-online.js?v=6",
    "./auth-ptbr.js?v=6"
  ];

  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });

  (async () => {
    try {
      for (const file of files) await load(file);
    } catch (error) {
      console.error(error);
      document.body.innerHTML = `<div style="padding:30px;font-family:Arial;text-align:center"><h2>Fluxo Fácil</h2><p>Não foi possível carregar o aplicativo.</p><button onclick="location.reload(true)" style="padding:12px 18px">Atualizar</button></div>`;
    }
  })();
})();
