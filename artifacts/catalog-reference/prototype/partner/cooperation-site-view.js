// Prototype markup matching the deployed da8812b CounterpartyProfile and
// PartnerPartnershipDetailDialog layout. No production code or API calls.
import { partnerDirections, stageLabel } from "./partner-directory.js";

export function directoryProspectHtml({partner, dictionary, typeLabel, policy, actions, escape:esc}) {
  const groups=partnerDirections(partner);
  const names=group=>groups[group].map(id=>dictionary[group].find(t=>t.id===id)?.label).filter(Boolean);
  const services=names("services"),products=names("products");
  const stages=groups.stages.map(id=>stageLabel(dictionary,id)).filter(Boolean);
  const specialties=[...products,...services];
  const chips=values=>`<div class="site-coop-chips">${values.map(value=>`<span>${esc(value)}</span>`).join("")}</div>`;
  const rates=partner.generalTerms || [];
  return `<div class="prospect-view" data-testid="prospect-detail">
    <p class="prospect-meta">${esc(typeLabel)}<span aria-hidden="true">·</span>${esc(partner.city || "Город не указан")}</p>
    <p class="prospect-specialty">${esc((specialties.length ? specialties.slice(0,2) : partner.topics || []).join(" · "))}</p>
    ${partner.type==="agent" ? "" : `<section class="prospect-terms" aria-labelledby="prospect-terms-title">
      <h3 id="prospect-terms-title">Условия партнёра</h3>
      ${rates.length ? `<dl class="dp-category-rates">${rates.map(row=>`<div><dt>${esc(row.name)}</dt><dd><strong>${esc(row.limit)}%</strong></dd></div>`).join("")}</dl><p class="prospect-hint">Скидка клиенту + бонус рекомендателю</p>` : `<p class="prospect-hint">Условия пока не опубликованы</p>`}
      <div class="prospect-stats"><div><span>Срок скидки</span><b>${esc(policy.days)} дней</b></div><div><span>Покупок</span><b>${esc(policy.operations)}</b></div></div>
      <p class="prospect-hint">Общие условия · персональные согласуются отдельно</p>
    </section>`}
    ${specialties.length || stages.length ? `<details class="prospect-details"><summary>Специализация и этапы</summary>
      ${products.length ? `<h4>Товары</h4>${chips(products)}` : ""}
      ${services.length ? `<h4>Работы и услуги</h4>${chips(services)}` : ""}
      ${stages.length ? `<h4>Этапы ремонта</h4>${chips(stages)}` : ""}
    </details>` : ""}
    <div class="prospect-actions">${actions}</div>
    <p class="prospect-footnote">Прототип · демонстрационные данные</p>
  </div>`;
}

export function currentSiteCooperationHtml({partner, dictionary, typeLabel, status, categories, actions, directions, receivingPolicy="", compact=true, escape:esc}) {
  const groups=partnerDirections(partner);
  const chips=values=>values.length ? `<div class="site-coop-chips">${values.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : '<p class="muted">Не указано</p>';
  const names=group=>groups[group].map(id=>dictionary[group].find(t=>t.id===id)?.label).filter(Boolean);
  const initials=partner.name.split(/\s+/).slice(0,2).map(s=>s[0]).join("");
  const publicId=`RC-${String(partner.id).replace(/[^a-z0-9]/gi,"").slice(0,8).toUpperCase() || "DEMO"}`;
  return `<div class="site-cooperation-view" data-testid="site-cooperation-detail">
    <div class="site-coop-profile" data-testid="counterparty-profile">
      <section class="site-coop-summary">
        <div class="site-coop-summary-head">
          <div class="site-coop-avatar" aria-hidden="true">${esc(initials)}</div>
          <div><span class="site-coop-kicker">${esc(typeLabel)}</span><p class="site-coop-name">${esc(partner.name)}</p><p class="site-coop-city">${esc(partner.city || "Город не указан")}</p></div>
          <span class="site-coop-status">${esc(status)}</span>
        </div>
        <div class="site-coop-id"><label for="site-partner-id">ID партнёра</label><div><input id="site-partner-id" aria-label="ID партнёра" readonly value="${esc(publicId)}"><code class="sr-only" data-testid="counterparty-public-id">${esc(publicId)}</code><button type="button" class="btn" data-action="coop-copy-id:${esc(partner.id)}">Копировать</button></div></div>
      </section>
      ${directions || ""}
      ${receivingPolicy}
      <section class="site-coop-section"><h3>О партнёре</h3><p class="muted">Описание пока не добавлено.</p></section>
      <section class="site-coop-section"><h3>Направления работы</h3><p class="site-coop-label">Товары</p>${chips(names("products"))}<p class="site-coop-label">Услуги</p>${chips(names("services"))}<p class="site-coop-label">Этапы ремонта</p>${chips(groups.stages.map(id=>stageLabel(dictionary,id)).filter(Boolean))}</section>
      <section class="site-coop-section"><h3>География</h3><p>${esc(partner.city || "Не указано")}</p></section>
      <section class="site-coop-section"><h3>Контакт для сотрудничества</h3><p class="muted">Партнёр пока не добавил контакт для сотрудничества.</p></section>
      <section class="site-coop-section site-coop-highlight"><h3>Ваше сотрудничество</h3><p>${esc(status)}</p><p class="muted">Демонстрационные данные, не реальные соглашения.</p></section>
    </div>
    ${directions ? "" : `<h3 class="site-coop-section-title">${compact ? "Ваши условия по категориям" : "Персональные условия"}</h3>
    <ul class="site-coop-category-list ${compact ? "" : "site-coop-agent-list"}">${categories.map(c=>`<li>${esc(c.name)} · ${esc(c.limit)}%</li>`).join("")}</ul>`}
    ${actions}
    ${partner.partnershipNote ? `<section class="site-coop-section"><h3>Комментарий</h3><p>${esc(partner.partnershipNote)}</p></section>` : ""}
    <p class="site-coop-footnote">Прототип · все данные и действия демонстрационные.</p>
  </div>`;
}
