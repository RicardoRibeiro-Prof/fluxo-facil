(() => {
  const files = ["./supabase-core.js", "./ui-online.js"];
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
  (async () => {
    try {
      for (const file of files) await load(file);
    } catch (error) {
      console.error(error);
      document.body.innerHTML = `<div style="padding:30px;font-family:Arial">Não foi possível carregar o aplicativo. Atualize a página.</div>`;
    }
  })();
})();
