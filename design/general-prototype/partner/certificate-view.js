import { a as makeQR } from "./chunk-3HBG25M4.js";
import { a as logo } from "./chunk-PG3I4FMB.js";
import { j as publicCertificateUrl } from "./chunk-QXOSRGZH.js";
import { demoRandomToken } from "./demo-random-id.js";
const QR = makeQR();
const types = {
  agent: ["А", "Агент"],
  store: ["М", "Магазин"],
  company: ["К", "Компания"],
  specialist: ["С", "Специалист"],
};
const esc = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function certificateIdentity({
  role,
  name,
  actorRole = role,
  city = "Город не указан",
}) {
  const [prefix, label] = types[role] || ["К", "Компания"];
  return {
    displayCode: `${prefix}-${demoRandomToken(8)}`,
    issuerTypeSnapshot: role,
    issuerTypeLabel: label,
    issuerNameSnapshot: name,
    issuerCitySnapshot: city,
    issuerUserId: `DEMO-${role}`,
    actorUserId: `DEMO-${actorRole}`,
  };
}
export function certificatePublicModel(record) {
  // Deliberate allowlist: no private bonuses, employer actor IDs or customer details.
  return {
    v: 2,
    code: record.displayCode,
    issuer: "RemCard",
    style: "brand",
    used: 0,
    limit: null,
    validUntil: null,
    cancelled: !!record.disabled,
    paused: false,
    excludesPromotions: true,
    usageMode: record.usageMode || "once_per_partner",
    offers: (record.terms?.length
      ? record.terms
      : [
          {
            partnerName: record.partner,
            categoryName: record.category,
            discount: 0,
          },
        ]
    ).map((item) => ({
      name: item.partnerName || "Партнёр",
      city: "Город уточните у партнёра",
      category: item.categoryName || "Уточните условия",
      discount: Number(item.discount) || 0,
    })),
  };
}
export function certificateCard(record, management = "") {
  const code = record.displayCode || "Код не указан";
  const url = publicCertificateUrl(certificatePublicModel(record));
  const terms = record.terms || [];
  return `<section class="rc-cert-wrap" data-testid="certificate-result"><article class="rc-cert">
    <div class="rc-cert-brand">${logo}</div><span class="rc-cert-badge">${record.disabled ? "Отключён" : "Демонстрационный сертификат"}</span>
    <h2>Скидочный сертификат RemCard</h2>
    <p>${esc(record.partner)}</p>
    <div class="rc-cert-offers">${terms.length ? `<strong>${terms.length} ${terms.length === 1 ? "предложение" : terms.length < 5 ? "предложения" : "предложений"}</strong><span>${[...new Set(terms.map((t) => t.partnerName))].map(esc).join(" · ")}</span>` : "<span>Уточните предложение у партнёра</span>"}</div>
    <div class="rc-cert-qr"><canvas data-certificate-qr="${esc(url)}" aria-label="QR демонстрационного сертификата"></canvas></div>
    <div class="rc-cert-code" data-testid="certificate-code">${esc(code)}</div>
    <button type="button" class="btn" data-certificate-copy="${esc(code)}">Скопировать код</button>
    ${management ? `<div class="rc-cert-management"><span class="small">Название для себя</span><strong>${esc(record.name)}</strong>${management}</div>` : ""}
    </article><button type="button" class="btn" data-testid="certificate-public-view" data-action="proto-guest-preview:139:${esc(record.id || record.displayCode || "demo")}">Посмотреть как клиент</button>
    <details class="rc-cert-details"><summary>Условия и информация о создании</summary><p>Создатель: ${esc(record.issuerNameSnapshot || "Не указан")} · ${esc(record.issuerTypeLabel || "Тип не указан")}</p><ul>${terms.map((item) => `<li>${esc(item.partnerName)} · ${esc(item.categoryName)}: скидка ${esc(item.discount)}%</li>`).join("")}</ul></details>
    <p class="small">А: агент · М: магазин · К: компания · С: специалист. Буква фиксируется при создании.</p>
    <p class="small">Демо: QR открывает публичный пример, не рабочий сертификат. Ссылка содержит только предложения и скидки, без бонусов и личных данных. Статус примера не синхронизируется с кабинетом.</p>
    <p class="small" role="status" data-certificate-copy-status></p></section>`;
}
export function hydrateCertificateCard(root) {
  const canvas = root.querySelector("[data-certificate-qr]");
  if (canvas)
    QR.toCanvas(
      canvas,
      canvas.dataset.certificateQr,
      { width: 220, margin: 2 },
      (error) => {
        if (error)
          root.querySelector("[data-certificate-copy-status]").textContent =
            "Не удалось показать QR. Код доступен выше.";
      },
    );
  root
    .querySelector("[data-certificate-copy]")
    ?.addEventListener("click", async (event) => {
      const text = event.currentTarget.dataset.certificateCopy;
      const status = root.querySelector("[data-certificate-copy-status]");
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = "Код скопирован.";
      } catch {
        const input = document.createElement("textarea");
        input.value = text;
        root.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        status.textContent = copied
          ? "Код скопирован."
          : `Скопируйте код вручную: ${text}`;
      }
    });
}
