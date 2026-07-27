(() => {
  "use strict";

  const translations = [
    [/Password is known to be weak and easy to guess.*$/i, "Essa senha é muito fraca ou comum. Crie outra com pelo menos 8 caracteres, usando letras, números e símbolo."],
    [/Invalid login credentials/i, "E-mail ou senha incorretos."],
    [/User already registered/i, "Este e-mail já está cadastrado."],
    [/Email not confirmed/i, "Confirme seu e-mail antes de entrar."],
    [/Signup requires a valid password/i, "Crie uma senha válida com pelo menos 8 caracteres."],
    [/For security purposes.*$/i, "Aguarde alguns segundos antes de tentar novamente."]
  ];

  function translateMessage() {
    const message = document.querySelector("#authMessage");
    if (!message || !message.textContent.trim()) return;

    for (const [pattern, replacement] of translations) {
      if (pattern.test(message.textContent)) {
        message.textContent = replacement;
        break;
      }
    }
  }

  function improvePasswordFields() {
    const password = document.querySelector("#authPassword");
    const confirmation = document.querySelector("#authConfirm");
    if (!password) return;

    password.minLength = 8;
    password.placeholder = "Mínimo de 8 caracteres";
    if (confirmation) confirmation.minLength = 8;

    if (!document.querySelector("#passwordHint")) {
      const hint = document.createElement("small");
      hint.id = "passwordHint";
      hint.textContent = "Use letras, números e símbolo. Evite senhas comuns, nomes e sequências.";
      hint.style.cssText = "display:block;margin-top:-7px;color:#66758a;font-size:11px;line-height:1.4";
      password.closest("label")?.insertAdjacentElement("afterend", hint);
    }
  }

  function apply() {
    improvePasswordFields();
    translateMessage();
  }

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  apply();
})();
