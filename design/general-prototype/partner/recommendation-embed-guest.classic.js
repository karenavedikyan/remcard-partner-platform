(function recommendationEmbedGuestClassic() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  let currentPayload = null;

  function esc(text) {
    return String(text ?? "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );
  }

  function parseModel(scope) {
    const card = scope.querySelector("[data-recommendation-payload]");
    if (!card?.dataset?.recommendationPayload) return currentPayload?.publicModel || null;
    try {
      return JSON.parse(card.dataset.recommendationPayload);
    } catch (_) {
      return currentPayload?.publicModel || null;
    }
  }

  function setFeedback(card, message, copyValue) {
    const host = card.querySelector(".rec-client-feedback");
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

  async function copyText(card, value, okMessage) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(card, okMessage);
    } catch (_) {
      setFeedback(card, "Автокопирование недоступно. Выделите и скопируйте:", value);
    }
  }

  function hydrateQr(scope, payload) {
    const img = scope.querySelector("[data-recommendation-qr]");
    if (img && payload?.qrDataUrl) img.src = payload.qrDataUrl;
  }

  function bindCard(card, payload) {
    if (card.dataset.recEmbedActionsReady === "1") return;
    card.dataset.recEmbedActionsReady = "1";
    card.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("[data-rec-client-action]");
      if (!btn) return;
      const model = parseModel(card);
      if (!model) return;
      const action = btn.dataset.recClientAction;
      if (action === "qr") {
        card.querySelector(".cert-redeem")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (action === "code") {
        ev.preventDefault();
        await copyText(card, model.code, "Промокод скопирован.");
        return;
      }
      if (action === "share") {
        ev.preventDefault();
        const url = payload?.shareUrl || "";
        if (url) await copyText(card, url, "Ссылка скопирована.");
        return;
      }
      if (action === "pdf") {
        ev.preventDefault();
        setFeedback(
          card,
          "PDF во встроенном просмотре недоступен. Скопируйте ссылку или откройте рекомендацию в отдельной вкладке.",
        );
      }
    });
  }

  window.__recommendationEmbedGuestHydrate = function hydrateRecommendationEmbedGuest(root, payload) {
    currentPayload = payload || null;
    if (!root) return;
    hydrateQr(root, payload);
    const cards = root.querySelectorAll("[data-recommendation-payload]");
    cards.forEach((card) => bindCard(card, payload));
  };
})();
