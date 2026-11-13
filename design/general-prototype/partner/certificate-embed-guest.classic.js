(function certificateEmbedGuestClassic() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const demo = { signedIn: false, saved: Object.create(null), offersConsent: false };
  let currentPayload = null;
  let viewMode = "main";

  function esc(text) {
    return String(text ?? "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );
  }

  function certKey(model) {
    return `${model.code}|${model.issuer}`;
  }

  function offerList(model) {
    return (
      model.offers || [
        {
          name: model.seller,
          city: model.city,
          category: model.category,
          discount: model.discount,
        },
      ]
    );
  }

  function parseModel(root) {
    const mount = root.querySelector("[data-cert-mount]");
    if (!mount?.dataset?.certPayload) return currentPayload?.publicModel || null;
    try {
      return JSON.parse(mount.dataset.certPayload);
    } catch (_) {
      return currentPayload?.publicModel || null;
    }
  }

  function renderClientPanel(model, mode) {
    const saved = !!demo.saved[certKey(model)];
    const consent = demo.offersConsent ? "checked" : "";
    if (mode === "account") {
      return `<section class="cc-panel"><span class="cc-eyebrow">ЛИЧНЫЙ КАБИНЕТ КЛИЕНТА · ДЕМО</span><h2>Мои сертификаты</h2><p>Здесь собраны ваши сертификаты, партнёры, условия и QR-коды. Сохранение не означает покупку и не расходует лимит.</p><div class="cc-saved"><span class="cc-check">Сохранён в кабинете</span><h3>${esc(model.code)}</h3><p>От ${esc(model.issuer)} · предложений: ${offerList(model).length}</p><ul>${offerList(model)
        .map(
          (s) =>
            `<li><span>${esc(s.name)} · ${esc(s.category)}</span><strong>${s.discount}%</strong></li>`,
        )
        .join("")}</ul><button class="pc-primary" data-client-action="open">Условия, партнёры и QR-код</button></div><label class="cc-consent"><input type="checkbox" data-client-consent ${consent}><span>Хочу получать полезные предложения партнёров RemCard. Необязательно, можно отключить в любой момент.</span></label><p class="cc-small">В этом прототипе данные живут только до обновления страницы. Сообщения и рассылки не отправляются.</p></section>`;
    }
    if (mode === "register" || mode === "login") {
      const eyebrow = mode === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ КЛИЕНТА";
      const complete =
        mode === "login" ? "Войти в демо и сохранить" : "Зарегистрироваться в демо и сохранить";
      return `<section class="cc-panel"><span class="cc-eyebrow">${eyebrow} · ДЕМО</span><h2>Сертификат будет в вашем кабинете</h2><p>В рабочем RemCard здесь проходит ${
        mode === "login" ? "вход в существующий аккаунт" : "регистрация клиента"
      }. Для проверки прототипа не нужны телефон, пароль или личные данные.</p><ul><li>Не потеряете сертификат в переписке.</li><li>Всегда сможете найти условия, контакты партнёров и QR-код.</li><li>По желанию будете получать подходящие предложения.</li></ul><label class="cc-consent"><input type="checkbox" data-client-consent ${consent}><span>Хочу получать предложения партнёров. Это необязательно и не влияет на скидку.</span></label><div class="cc-actions"><button class="pc-primary" data-client-action="complete">${complete}</button><button data-client-action="open">Продолжить без регистрации</button></div><p class="cc-small">Создаётся только демонстрационное состояние. Настоящий аккаунт не регистрируется.</p></section>`;
    }
    return `<section class="cc-panel"><span class="cc-eyebrow">ДВА СПОСОБА ИСПОЛЬЗОВАТЬ СЕРТИФИКАТ</span><h2>${
      saved ? "Сертификат уже в вашем кабинете" : "Сохраните сертификат, чтобы он был под рукой"
    }</h2><p>После регистрации он появится в разделе «Мои сертификаты»: все скидки, принимающие партнёры, контакты и QR-код в одном месте.</p><div class="cc-actions"><button class="pc-primary" data-client-action="${
      saved ? "account" : "register"
    }">${saved ? "Открыть «Мои сертификаты»" : "Активировать и сохранить в кабинете"}</button>${
      saved ? "" : '<button data-client-action="login">У меня уже есть аккаунт</button>'
    }<button data-client-action="qr">Показать QR без регистрации</button></div><p class="cc-small"><strong>Регистрация не обязательна для покупки.</strong> Просто покажите QR-код партнёру до оплаты. Активация лишь сохраняет сертификат в кабинете и не расходует его.</p><div class="cc-status" role="status">${
      saved ? "Сохранено в демонстрационном кабинете. Лимит покупок не изменился." : ""
    }</div></section>`;
  }

  function patchClientArea(guestRoot, model, mode) {
    const area = guestRoot.querySelector("[data-client-area]");
    const mount = guestRoot.querySelector("[data-cert-mount]");
    if (!area) return;
    area.innerHTML = renderClientPanel(model, mode);
    if (mount) mount.hidden = mode !== "intro";
  }

  function feedbackMount(scope) {
    return scope.querySelector(".cert-feedback") || scope.querySelector("[data-cert-mount]")?.parentElement;
  }

  function setFeedback(scope, message, copyValue) {
    const host = feedbackMount(scope);
    if (!host) return;
    host.textContent = message;
    if (copyValue) {
      const input = document.createElement("input");
      input.readOnly = true;
      input.value = copyValue;
      input.setAttribute("aria-label", "Текст для копирования");
      host.append(input);
      input.focus();
      input.select();
    }
  }

  async function copyText(scope, value, okMessage) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(scope, okMessage);
    } catch (_) {
      setFeedback(scope, "Автокопирование недоступно. Выделите и скопируйте:", value);
    }
  }

  function hydrateQr(scope, payload) {
    const img = scope.querySelector("[data-cert-qr]");
    if (img && payload?.qrDataUrl) img.src = payload.qrDataUrl;
  }

  function tameEmbedGuestLinks(scope) {
    if (params.get("cabinet_embed") !== "1") return;
    scope.querySelectorAll(".cert-partner-actions a[href], .cert-guest a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!/partner=\d+/.test(href) && !/certificate\.html/i.test(href)) return;
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });
  }

  function partnerIndexFromHref(href) {
    if (!href) return null;
    try {
      const u = new URL(href, document.baseURI);
      const p = u.searchParams.get("partner");
      if (p !== null && /^\d+$/.test(p)) return Number(p);
    } catch (_) {}
    return null;
  }

  function isCertificateBackHref(href) {
    try {
      const u = new URL(href, document.baseURI);
      if (u.searchParams.get("partner") !== null) return false;
      return /certificate\.html/i.test(u.pathname) || href.indexOf("certificate.html") >= 0;
    } catch (_) {
      return false;
    }
  }

  function showPartnerProfile(index, payload, options) {
    const html = payload?.partnerProfileHtmlByIndex?.[index];
    if (!html) return false;
    viewMode = "partner";
    const root = document.getElementById("certificate-root");
    root.innerHTML = html;
    if (options?.focusContact) {
      requestAnimationFrame(() => {
        document.getElementById("partner-contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("pc-message")?.focus({ preventScroll: true });
      });
    }
    return true;
  }

  function restoreMain(payload) {
    if (!payload?.publicHtml) return;
    viewMode = "main";
    const root = document.getElementById("certificate-root");
    root.innerHTML = payload.publicHtml;
    hydrateQr(root, payload);
    tameEmbedGuestLinks(root);
  }

  function guestMainRoot() {
    return document.querySelector("#certificate-root .cert-guest");
  }

  function bindPayload(payload) {
    currentPayload = payload;
    const root = document.getElementById("certificate-root");
    if (!root) return;

    const initialPartner = payload.initialPartnerIndex;
    if (Number.isInteger(initialPartner) && initialPartner >= 0) {
      showPartnerProfile(initialPartner, payload, {
        focusContact: params.get("contact") === "1",
      });
      return;
    }

    viewMode = "main";
    hydrateQr(root, payload);
    tameEmbedGuestLinks(root);
  }

  window.__certificateEmbedGuestHydrate = function hydrateCertificateEmbedGuest(root, payload) {
    bindPayload(payload);
  };

  document.addEventListener(
    "click",
    (ev) => {
      if (params.get("cabinet_embed") !== "1") return;
      const link = ev.target.closest('a[href*="partner="]');
      if (!link || viewMode !== "main") return;
      const partnerIdx = partnerIndexFromHref(link.getAttribute("href"));
      if (partnerIdx === null) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const focusContact = /contact=1/.test(link.getAttribute("href") || "");
      showPartnerProfile(partnerIdx, currentPayload, { focusContact });
    },
    true,
  );

  document.addEventListener("change", (ev) => {
    if (ev.target.matches("[data-client-consent]")) demo.offersConsent = ev.target.checked;
  });

  document.addEventListener("submit", (ev) => {
    const form = ev.target;
    if (form.id !== "pc-contact-form") return;
    ev.preventDefault();
    const data = new FormData(form);
    const message = String(data.get("message") || "").trim();
    const error = form.querySelector(".pc-error");
    if (!message) {
      if (error) error.textContent = "Напишите, что хотите уточнить у партнёра.";
      return;
    }
    if (error) error.textContent = "";
    const result = document.querySelector(".pc-contact-result");
    if (result) {
      result.innerHTML = `<h3>Демонстрационное обращение создано</h3><p>Получатель: ${esc(form.dataset.partner)}. Сертификат: ${esc(form.dataset.code)}.</p><blockquote>${esc(message)}</blockquote><p>Реального сообщения нет. В рабочем продукте обращение появится у выбранного партнёра; дальнейший вход и способы связи зависят от выбранного канала.</p>`;
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  document.addEventListener("click", async (ev) => {
    const link = ev.target.closest("a[href]");
    if (link && viewMode === "main" && link.closest(".cert-guest, [data-cert-mount]")) {
      const partnerIdx = partnerIndexFromHref(link.getAttribute("href"));
      if (partnerIdx !== null) {
        ev.preventDefault();
        const focusContact = /contact=1/.test(link.getAttribute("href") || "");
        showPartnerProfile(partnerIdx, currentPayload, { focusContact });
        return;
      }
    }
    if (link && viewMode === "partner" && isCertificateBackHref(link.getAttribute("href"))) {
      ev.preventDefault();
      restoreMain(currentPayload);
      return;
    }

    const profileBtn = ev.target.closest("[data-profile-action]");
    if (profileBtn && viewMode === "partner") {
      if (profileBtn.dataset.profileAction === "phone") {
        profileBtn.hidden = true;
        if (profileBtn.nextElementSibling) profileBtn.nextElementSibling.hidden = false;
      }
      if (profileBtn.dataset.profileAction === "contact") {
        document.getElementById("partner-contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("pc-message")?.focus({ preventScroll: true });
      }
      return;
    }

    const guestRoot = guestMainRoot();
    if (!guestRoot || viewMode !== "main") return;

    const clientBtn = ev.target.closest("[data-client-action]");
    if (clientBtn) {
      const mount = guestRoot.querySelector("[data-cert-mount]");
      const model = parseModel(guestRoot);
      if (!mount || !model) return;
      const action = clientBtn.dataset.clientAction;
      if (action === "qr") {
        mount.hidden = false;
        hydrateQr(guestRoot, currentPayload);
        mount.querySelector(".cert-redeem")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      let panel = "intro";
      if (action === "register" || action === "login") {
        panel = demo.signedIn ? "account" : action;
        if (demo.signedIn) demo.saved[certKey(model)] = model;
      } else if (action === "account") {
        panel = "account";
      } else if (action === "complete") {
        demo.signedIn = true;
        demo.saved[certKey(model)] = model;
        panel = "account";
      }
      patchClientArea(guestRoot, model, panel);
      if (mount) mount.hidden = panel !== "intro";
      guestRoot.querySelector("[data-client-area]")?.scrollIntoView({ block: "start" });
      return;
    }

    const certBtn = ev.target.closest("[data-cert-action]");
    if (!certBtn) return;
    const mount = guestRoot.querySelector("[data-cert-mount]");
    const model = parseModel(guestRoot);
    if (!mount || !model) return;
    const certAction = certBtn.dataset.certAction;
    if (certAction === "code") {
      ev.preventDefault();
      await copyText(guestRoot, model.code, "Промокод скопирован.");
      return;
    }
    if (certAction === "share") {
      ev.preventDefault();
      const url = currentPayload?.shareUrl || "";
      if (url) await copyText(guestRoot, url, "Ссылка скопирована. Клиенту не нужен аккаунт RemCard.");
      return;
    }
    if (certAction === "pdf") {
      ev.preventDefault();
      setFeedback(
        guestRoot,
        "PDF во встроенном просмотре недоступен. Скопируйте ссылку или откройте сертификат в отдельной вкладке.",
      );
    }
  });
})();
