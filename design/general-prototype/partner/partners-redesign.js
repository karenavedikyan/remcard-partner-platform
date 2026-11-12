// Новая компоновка раздела «Партнёры» и витрина поиска партнёров.
// Только дизайн: действия, фильтры и данные те же, что в прежней версии макета.
import { partnerDirections, directionLabel, stageLabel, filterDirectory } from "./partner-directory.js";

let api = null; // { E, d, D, r, se, paint }
let focusOutgoing = false;
let inviteDraft = { step: 1, partner: "", subject: "", template: "", templateText: "", certificateReturn: false };
const normalizePartnerName = value => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru").replace(/ё/g, "е");
const isAgentInvite = () => api.getRole() === "agent";
const invitePartner = () => api.getDirectory().find(partner => normalizePartnerName(partner.name) === normalizePartnerName(inviteDraft.partner));
const invitePublishedTerms = () => (invitePartner()?.generalTerms || []).filter(term => term.name && Number.isFinite(Number(term.limit)));
function getInvitationTemplates() {
  const agent = isAgentInvite();
  const proposal = agent
    ? "Предлагаю рекомендовать ваши товары или услуги своим клиентам и помогать вам увеличивать продажи."
    : "Давайте рекомендовать товары и услуги друг друга и привлекать новых клиентов, чтобы увеличивать продажи.";
  const friendlyProposal = agent
    ? "Хочу рекомендовать твои товары или услуги своим клиентам и помогать тебе увеличивать продажи."
    : "Давай рекомендовать друг друга и привлекать новых клиентов, чтобы увеличивать продажи.";
  return {
    short: { label: "Коротко", text: `Здравствуйте! ${proposal} Присоединяйтесь в RemCard по ссылке: зарегистрируйтесь или войдите, чтобы обсудить условия сотрудничества.` },
    business: { label: "По-деловому", text: `Здравствуйте! Приглашаю к сотрудничеству в RemCard. ${proposal} Перейдите по ссылке и зарегистрируйтесь или войдите в существующий аккаунт. В кабинете сможем ознакомиться с предложениями и согласовать условия сотрудничества. Само приглашение не означает принятия условий.` },
    friendly: { label: "По-дружески", text: `Привет! ${friendlyProposal} Пройди регистрацию в RemCard по ссылке или войди, если аккаунт уже есть. Условия сотрудничества обсудим в кабинете.` },
  };
}

function agentInviteProposal() {
  const partner = invitePartner();
  if (partner?.type === "agent") return "Предлагаю обмениваться рекомендациями клиентов.";
  const directions = partner ? partnerDirections(partner) : { products: [], services: [] };
  const offer = directions.products.length && !directions.services.length ? "товары"
    : directions.services.length && !directions.products.length ? "услуги" : "товары или услуги";
  return `Предлагаю рекомендовать ваши ${offer} своим клиентам.`;
}

function resetInviteTerms() {
  Object.assign(inviteDraft, { termsMode: "published", selectedTerms: [], partnerAction: "", partnerBenefit: "", ownTerms: "", terms: "" });
}

function updateInviteTerms() {
  const draft = inviteDraft;
  const agent = isAgentInvite();
  let partnerTerms = "";
  if (draft.termsMode === "custom") {
    partnerTerms = [
      draft.partnerAction?.trim() ? `Моё предложение: ${draft.partnerAction.trim()}` : "",
      draft.partnerBenefit?.trim() ? `Желаемые условия: ${draft.partnerBenefit.trim()}` : "",
    ].filter(Boolean).join("\n\n");
  } else {
    const terms = invitePublishedTerms().filter((term, index) => draft.selectedTerms?.includes(index));
    partnerTerms = terms.length
        ? `Хочу сотрудничать по вашим опубликованным условиям:\n${terms.map(term => `${term.name}: общий процент ${term.limit}%`).join("\n")}\nОбщий процент включает скидку клиенту и бонус агенту. Это не размер гарантированного вознаграждения.`
        : "Прошу предложить условия сотрудничества.";
  }
  draft.terms = [
    !agent ? "Предлагаю рекомендовать товары и услуги друг друга и привлекать новых клиентов, чтобы увеличивать продажи." : draft.termsMode !== "custom" ? agentInviteProposal() : "",
    partnerTerms,
    !agent ? draft.ownTerms?.trim() ? `Мои условия за рекомендации: ${draft.ownTerms.trim()}` : "Мои условия за рекомендации предлагаю согласовать отдельно." : "",
  ].filter(Boolean).join("\n\n");
  const hidden = api.se.querySelector('input[name="proposedTerms"]');
  if (hidden) hidden.value = draft.terms;
}

function inviteTermsEditor() {
  const { r } = api;
  const draft = inviteDraft;
  const partner = invitePartner();
  const terms = invitePublishedTerms();
  const agent = isAgentInvite();
  const custom = draft.termsMode === "custom";
  const selection = terms.length
    ? `<p class="small">Опубликованные демоусловия «${r(partner.name)}». Выберите подходящие категории.</p><div class="pr-published-terms">${terms.map((term, index) => `<label><input type="checkbox" data-invite-published="${index}" ${draft.selectedTerms?.includes(index) ? "checked" : ""}><span>${r(term.name)}</span><b>${r(term.limit)}%</b></label>`).join("")}</div><p class="small">Общий процент: скидка клиенту + бонус агенту. Не гарантированный доход.</p>`
    : `<p class="small pr-invite-no-terms">${partner ? `У «${r(draft.partner)}» нет опубликованных условий.` : `«${r(draft.partner)}» пока нет в демокаталоге, опубликованные условия недоступны.`} ${agent ? "В приглашении попросим партнёра предложить условия." : "Можно написать свой вариант или согласовать условия позже."}</p>`;
  const partnerEditor = `${agent && !custom ? `<div class="pr-agent-proposal"><span class="eyebrow">Что я предлагаю</span><p>${r(agentInviteProposal())}</p></div>` : ""}<div class="pr-invite-term-modes" role="group" aria-label="Источник условий"><button type="button" data-invite-terms-mode="published" aria-pressed="${!custom}">Условия партнёра</button><button type="button" data-invite-terms-mode="custom" aria-pressed="${custom}">Свой вариант</button></div>${custom ? `<div class="pr-invite-term-fields"><label class="field" for="partner-invite-action">${agent ? "Что я предлагаю партнёру" : "Как предлагаю рекомендовать партнёра"}<textarea id="partner-invite-action" data-invite-term="partnerAction" maxlength="250" rows="2" placeholder="Например, рекомендовать ваши товары своим клиентам">${r(draft.partnerAction || "")}</textarea></label><label class="field" for="partner-invite-benefit">${agent ? "На каких условиях хочу работать" : "На каких условиях хочу рекомендовать партнёра"}<textarea id="partner-invite-benefit" data-invite-term="partnerBenefit" maxlength="250" rows="2" placeholder="Напишите пожелания или оставьте пустым">${r(draft.partnerBenefit || "")}</textarea></label></div>` : selection}`;
  const ownEditor = !agent ? `<label class="field pr-invite-own" for="partner-invite-own">Что предлагаю партнёру за рекомендации<textarea id="partner-invite-own" data-invite-term="ownTerms" maxlength="250" rows="2" placeholder="Напишите свои условия или согласуйте их позже">${r(draft.ownTerms || "")}</textarea></label>` : "";
  return `<details class="pr-invite-terms" open><summary>Условия сотрудничества</summary>${partnerEditor}${ownEditor}</details>`;
}

export function compactPartnerCollection(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const collection = template.content.querySelector('[data-collection="partners"]');
  if (!collection) return html;
  const tools = collection.querySelector(".collection-tools");
  const mainFilters = collection.querySelector(".active-partner-main-filters");
  if (!tools || !mainFilters) return html;
  const search = tools.querySelector(".collection-search");
  const archive = tools.querySelector(":scope > .field:not(.collection-search)");
  const extra = tools.querySelector(".collection-filters");
  const view = tools.querySelector(".collection-view");
  const filterCount = [...collection.querySelectorAll(".directory-active button[data-coll-action]")].length
    + (archive?.querySelector("select")?.value === "archive" ? 1 : 0)
    + (extra?.querySelector('[data-coll-control="status"]')?.value ? 1 : 0);
  const filters = document.createElement("details");
  filters.className = "pr-quiet-filters";
  filters.open = !!document.querySelector("#pr-zone-active .pr-quiet-filters[open]");
  filters.innerHTML = `<summary>Фильтры${filterCount ? ` <span>${filterCount}</span>` : ""}<span aria-hidden="true">⌄</span></summary><div class="pr-quiet-filter-body"></div>`;
  const body = filters.lastElementChild;
  body.append(mainFilters);
  if (archive) body.append(archive);
  if (extra?.querySelector(".row")) body.append(extra.querySelector(".row"));
  if (search) {
    for (const node of [...search.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }
    const input = search.querySelector("input");
    input.setAttribute("aria-label", "Поиск среди своих партнёров");
    input.placeholder = "Найти среди своих партнёров";
  }
  tools.replaceChildren(...[search, filters, view].filter(Boolean));
  tools.classList.add("pr-quiet-tools");
  if (view) {
    view.querySelectorAll("button").forEach((button) => {
      button.setAttribute("title", button.textContent.trim());
    });
  }
  const count = collection.querySelector(".collection-count");
  if (count) count.classList.add("pr-quiet-count");
  return template.innerHTML;
}

export function initPartnersRedesign(context) {
  api = context;
  api.se.addEventListener("close", () => api.se.classList.remove("hub-wide"));
  document.addEventListener("submit", (event) => {
    if (event.target.id !== "partner-invite-step-form") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const input = event.target.querySelector("#partner-invite-value");
    const value = input.value.trim();
    input.setCustomValidity(value ? "" : "Заполните поле, чтобы продолжить.");
    if (!input.reportValidity()) return;
    if (inviteDraft.step === 1) {
      if (normalizePartnerName(inviteDraft.termsPartner) !== normalizePartnerName(value)) resetInviteTerms();
      inviteDraft.partner = value;
      inviteDraft.termsPartner = value;
    }
    if (inviteDraft.step === 2) inviteDraft.subject = value;
    inviteDraft.step++;
    if (inviteDraft.step === 2 && !inviteDraft.subject) {
      inviteDraft.subject = getInvitationTemplates().short.text;
      inviteDraft.templateText = inviteDraft.subject;
      inviteDraft.template = "short";
    }
    if (inviteDraft.step === 3) updateInviteTerms();
    paintPartnerInviteStep();
  }, true);
  document.addEventListener("input", (event) => {
    const termKey = event.target.dataset.inviteTerm;
    if (["partnerAction", "partnerBenefit", "ownTerms"].includes(termKey)) {
      inviteDraft[termKey] = event.target.value;
      updateInviteTerms();
      return;
    }
    if (event.target.matches("[data-invite-published]")) {
      inviteDraft.selectedTerms = [...api.se.querySelectorAll("[data-invite-published]:checked")].map(input => Number(input.dataset.invitePublished));
      updateInviteTerms();
      return;
    }
    if (event.target.id !== "partner-invite-value" || !event.target.closest("#partner-invite-step-form")) return;
    event.target.setCustomValidity("");
    if (inviteDraft.step === 1) inviteDraft.partner = event.target.value;
    if (inviteDraft.step === 2) {
      inviteDraft.subject = event.target.value;
      if (inviteDraft.subject !== inviteDraft.templateText) inviteDraft.template = "";
      api.se.querySelectorAll("[data-invite-template]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.inviteTemplate === inviteDraft.template)));
    }
  });
  document.addEventListener("click", (event) => {
    const termsMode = event.target.closest("[data-invite-terms-mode]");
    if (termsMode) {
      event.preventDefault();
      inviteDraft.termsMode = termsMode.dataset.inviteTermsMode;
      if (inviteDraft.termsMode === "custom" && isAgentInvite() && !inviteDraft.partnerAction) {
        inviteDraft.partnerAction = agentInviteProposal();
      }
      updateInviteTerms();
      paintPartnerInviteStep();
      return;
    }
    const templateButton = event.target.closest("[data-invite-template]");
    if (templateButton) {
      event.preventDefault();
      const key = templateButton.dataset.inviteTemplate;
      if (key) {
        const text = getInvitationTemplates()[key]?.text;
        if (!text) return;
        inviteDraft.subject = text;
        inviteDraft.templateText = text;
      } else {
        inviteDraft.templateText = "";
      }
      inviteDraft.template = key;
      paintPartnerInviteStep();
      return;
    }
    const button = event.target.closest("[data-invite-step]");
    if (!button) return;
    event.preventDefault();
    inviteDraft.step = Number(button.dataset.inviteStep);
    if (inviteDraft.step === 2 && !inviteDraft.subject) {
      inviteDraft.subject = getInvitationTemplates().short.text;
      inviteDraft.templateText = inviteDraft.subject;
      inviteDraft.template = "short";
    }
    paintPartnerInviteStep();
  });
}

export function openPartnerInviteWizard({ certificateReturn = false } = {}) {
  if (inviteDraft.role !== api.getRole()) {
    inviteDraft = { step: 1, partner: "", subject: "", template: "", templateText: "", certificateReturn: false };
    resetInviteTerms();
  }
  inviteDraft.role = api.getRole();
  inviteDraft.step = 1;
  inviteDraft.certificateReturn = certificateReturn;
  paintPartnerInviteStep();
}

function paintPartnerInviteStep() {
  const { E, d, D, r, se } = api;
  const draft = inviteDraft;
  const progress = `<div class="pr-invite-progress" aria-label="Шаг ${draft.step} из 3">${["Партнёр", "Сообщение", "Проверка"].map((label,index) => `<span class="${draft.step === index+1 ? "is-current" : draft.step > index+1 ? "is-complete" : ""}" ${draft.step === index+1 ? 'aria-current="step"' : ""}><b>${draft.step > index+1 ? D("check") : index+1}</b>${label}</span>`).join("")}</div>`;
  const back = draft.step > 1 ? `<button type="button" class="btn ghost" data-invite-step="${draft.step-1}">${D("arrow-left")} Назад</button>` : d("Другой способ", "partner-hub-choose", "ghost");
  const title = draft.step === 1 ? "Кого хотите пригласить?" : draft.step === 2 ? "Подготовьте приглашение" : "Проверьте приглашение";
  const intro = draft.step === 1
    ? "Укажите, кому отправите ссылку на сотрудничество."
    : draft.step === 2
      ? `Выберите, как пригласить «${r(draft.partner)}», или напишите по-своему. Ссылку добавим на следующем шаге.`
      : "Проверьте получателя и текст. Затем сможете скопировать приглашение со ссылкой и отправить удобным способом. Автоматической отправки нет.";
  let body;
  if (draft.step < 3) {
    const first = draft.step === 1;
    body = `<form id="partner-invite-step-form" class="pr-invite-form">${first ? "" : `<div class="pr-invite-templates" role="group" aria-label="Варианты приглашения">${Object.entries(getInvitationTemplates()).map(([key, item]) => `<button type="button" data-invite-template="${key}" aria-pressed="${draft.template === key}">${r(item.label)}</button>`).join("")}<button type="button" data-invite-template="" aria-pressed="${!draft.template}">Свой текст</button></div>`}<label class="field" for="partner-invite-value">${first ? "Имя или название партнёра" : "Пригласительное сообщение"}${first ? `<input id="partner-invite-value" name="partner" required maxlength="100" value="${r(draft.partner)}" placeholder="Например, «Дом материалов»" aria-describedby="partner-invite-help" autocomplete="off">` : `<textarea id="partner-invite-value" name="subject" required maxlength="1000" rows="5" placeholder="Напишите, как хотите пригласить партнёра" aria-describedby="partner-invite-help">${r(draft.subject)}</textarea>`}</label><p id="partner-invite-help" class="small">${first ? "Название магазина, компании или имя мастера. Контакты пока не нужны." : "Любой шаблон можно изменить. До 1000 символов. Условия сотрудничества согласуете отдельно."}</p>${first ? `<div class="pr-invite-example"><span class="eyebrow">Что будет дальше</span><p>Выберете готовое сообщение или напишете своё, затем проверите приглашение.</p></div>` : ""}<div class="pr-invite-footer">${back}<button type="submit" class="btn primary">${first ? "Далее: сообщение" : "Далее: проверить"} ${D("arrow-right")}</button></div></form>`;
  } else {
    body = `<div class="pr-invite-review"><div><span class="small">Кого приглашаете</span><strong>${r(draft.partner)}</strong><button type="button" class="linkbtn" data-invite-step="1" aria-label="Изменить имя партнёра">Изменить</button></div><div><span class="small">Пригласительное сообщение</span><p>${r(draft.subject)}</p><button type="button" class="linkbtn" data-invite-step="2" aria-label="Изменить сообщение">Изменить</button></div></div><p class="pr-invite-safety">${D("info")}<span>Это приглашение к обсуждению. Сотрудничество начнётся только после согласования и принятия условий обеими сторонами.</span></p><form id="link-create-form" data-kind="partner"><input type="hidden" name="partner" value="${r(draft.partner.trim())}"><input type="hidden" name="category" value="Приглашение к сотрудничеству"><input type="hidden" name="invitationMessage" value="${r(draft.subject.trim())}"><div class="pr-invite-footer">${back}<button type="submit" class="btn primary">Создать демоприглашение ${D("arrow-right")}</button></div></form>`;
  }
  if (draft.step === 2) {
    body = `<form id="partner-invite-step-form" class="pr-invite-form pr-invite-simple"><div class="pr-invite-templates" role="group" aria-label="Варианты приглашения">${Object.entries(getInvitationTemplates()).map(([key, item]) => `<button type="button" data-invite-template="${key}" aria-pressed="${draft.template === key}">${r(item.label)}</button>`).join("")}</div><label class="field" for="partner-invite-value">Текст приглашения<textarea id="partner-invite-value" name="subject" required maxlength="1000" rows="6" placeholder="Напишите своё приглашение">${r(draft.subject)}</textarea></label><div class="pr-invite-footer">${back}<button type="submit" class="btn primary">Далее: проверить ${D("arrow-right")}</button></div></form>`;
  }
  if (draft.step === 1) {
    if (!isAgentInvite()) {
      body = body.replace(/<div class="pr-invite-example">[\s\S]*?<\/div>/, "");
      body = body.replace("Название магазина, компании или имя мастера. Контакты пока не нужны.", "Контакты пока не нужны.");
    }
    body = body.replace('name="partner" required', 'name="partner" list="invite-partner-options" required');
    body = body.replace('</form>', `<datalist id="invite-partner-options">${api.getDirectory().map(partner => `<option value="${r(partner.name)}"></option>`).join("")}</datalist></form>`);
  }
  if (draft.step === 3) {
    body = body.replace('<p class="pr-invite-safety">', `${inviteTermsEditor()}<p class="pr-invite-safety">`);
    body = body.replace('<input type="hidden" name="category"', `<input type="hidden" name="proposedTerms" value="${r(draft.terms?.trim() || "")}"><input type="hidden" name="category"`);
  }
  const stepHead = draft.step === 2 ? "" : `<div class="pr-invite-step-head"><span class="eyebrow">Шаг ${draft.step} из 3</span><h2>${title}</h2><p class="small">${intro}</p></div>`;
  E("Пригласить по ссылке", `<section class="pr-invite-wizard" data-testid="partner-invite-wizard">${progress}${stepHead}${body}<p class="pr-invite-demo small">Только макет: реальные ссылки и уведомления не создаются.</p>${draft.certificateReturn ? d("Вернуться к сертификату", "cert-return", "ghost") : ""}</section>`);
  se.classList.add("pr-invite-dialog");
  if (draft.step !== 2) updateInviteTerms();
  requestAnimationFrame(() => se.querySelector("#partner-invite-value")?.focus({preventScroll:true}));
}

export function recipientInvitationSummary({ invitation, sender }) {
  const { r, D } = api;
  return `<section class="pr-recipient"><span class="eyebrow">Путь получателя · демонстрация</span><div class="pr-recipient-sender">${D("handshake")}<div><span class="small">Вас приглашает</span><h3>${r(sender)}</h3></div></div><p class="small">Для: ${r(invitation.partner)}</p><div class="pr-invite-message"><span class="eyebrow">Личное приглашение</span><p>${r(invitation.invitationMessage || invitation.category)}</p></div><div class="pr-recipient-terms"><span class="eyebrow">Предлагаемые условия</span>${invitation.proposedTerms ? `<p>${r(invitation.proposedTerms)}</p><small>Это предложение отправителя. Условия ещё не согласованы вами.</small>` : `<strong>Условия пока не указаны</strong><p>Отправитель приглашает обсудить сотрудничество. Скидки, вознаграждение и обязательства ещё не определены: их нужно согласовать отдельно.</p>`}</div><div class="pr-recipient-next"><strong>Зачем входить в RemCard?</strong><p>Чтобы вернуться к этому приглашению и перейти к обсуждению условий. Сам вход не подключает сотрудничество, не задаёт проценты и ни к чему не обязывает.</p></div></section>`;
}

export function showPartnerInviteReady({ id, partner, subject, proposedTerms, certificateReturn }) {
  const { E, d, D, r, se } = api;
  inviteDraft = {step:1,partner:"",subject:"",template:"",templateText:"",certificateReturn:false};
  E("Приглашение создано", `<section class="pr-invite-wizard" data-testid="partner-invite-ready"><div class="pr-invite-ready-icon">${D("check")}</div><div class="pr-invite-step-head"><h2>Теперь передайте приглашение</h2><p class="small">Для «${r(partner)}» всё подготовлено. Нажмите «Поделиться», скопируйте текст и передайте знакомому.</p></div><div class="pr-invite-message"><span class="eyebrow">Пригласительное сообщение</span><p>${r(subject)}</p></div>${d("Поделиться приглашением", `link-share:${id}`, "primary pr-invite-share")}${d("Открыть карточку приглашения", `link-open:${id}`, "ghost")}<details class="pr-invite-after"><summary>Что будет после передачи приглашения</summary><ol class="pr-invite-next"><li><b>1</b><div><strong>Партнёр зарегистрируется</strong><p class="small">После обычного входа или регистрации он вернётся к вашему приглашению.</p></div></li><li><b>2</b><div><strong>Вы согласуете условия</strong><p class="small">Само приглашение не активирует сотрудничество и не устанавливает проценты.</p></div></li></ol></details>${certificateReturn ? d("Вернуться к сертификату", "cert-return", "ghost") : ""}<p class="pr-invite-demo small">Это демонстрация. Реальная ссылка не создана, сообщение не отправлено. Приглашение сохранено только в памяти макета.</p></section>`);
  if (proposedTerms) se.querySelector(".pr-invite-message").insertAdjacentHTML("afterend", `<div class="pr-invite-message"><span class="eyebrow">Предлагаемые условия</span><p>${r(proposedTerms)}</p></div>`);
  se.classList.add("pr-invite-dialog");
}

export function markOutgoingFocus() {
  focusOutgoing = true;
}

const typeMeta = {
  store: { label: "Магазин", tone: "store" },
  company: { label: "Компания", tone: "company" },
  specialist: { label: "Мастер", tone: "specialist" },
  agent: { label: "Агент", tone: "agent" },
};

function monogram(name, type) {
  const { r } = api;
  const letters = String(name || "")
    .replace(/[«»"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return `<span class="pr-logo pr-logo-${typeMeta[type]?.tone || "company"}" aria-hidden="true">${r(letters || "?")}</span>`;
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// ---------- Раздел «Партнёры» ----------

export function renderPartnersRedesign(config) {
  const { d, D, r } = api;
  const partners = (config.partners || []).filter((p) => !p.archived && !p.deleted);
  const invites = (config.invitations || []).filter((e) => !e.archived);
  const decisions = invites.filter((e) => e.negotiation === "offered");
  const waiting = invites.filter((e) => e.negotiation !== "offered" && e.negotiation !== "accepted");
  const canManage = config.canManage;
  const openOutgoing = focusOutgoing;
  focusOutgoing = false;
  const isEmpty = !partners.length && !invites.length;

  const head = `<div class="pr-head"><p class="muted pr-lead">${config.employee ? "Рабочие партнёры организации, не личные партнёры сотрудника. Условия по каждому партнёру открываются в его строке." : "Магазины, мастера и компании, с которыми вы обмениваетесь клиентами. Условия по каждому партнёру открываются в его строке."}</p>${canManage ? d(`${D("user-plus")} Найти партнёра`, "partner-hub-choose", "primary pr-primary") : ""}</div>`;

  const tile = (count, title, note, target, tone = "") =>
    `<button type="button" class="pr-tile ${tone}" data-action="partner-zone:${target}" aria-label="${r(title.replace(/<[^>]+>/g, ""))}: ${count}"><strong>${count}</strong><span><b>${title}</b><small>${note}</small></span></button>`;
  const tiles = `<div class="pr-tiles">${tile(partners.length, "Действующие", "Можно рекомендовать клиентам", "active")}${tile(decisions.length, 'Ждут <span class="pr-long">вашего </span>решения', "Предложения условий от партнёров", "decide", decisions.length ? "is-attention" : "")}${tile(waiting.length, "Ожидают ответа", "Ваши приглашения партнёрам", "waiting")}</div>`;

  const decisionZone = decisions.length
    ? `<section class="panel pr-zone pr-zone-decide" id="pr-zone-decide" data-testid="partners-zone-decide"><div class="pr-zone-head"><div><h2>Ждут вашего решения <span class="badge-count">${decisions.length}</span></h2><p class="small">Пока вы не ответите, условия не вступят в силу. Решение можно отложить, предложение останется здесь.</p></div></div><div class="pr-decisions">${decisions
        .map(
          (e) =>
            `<article class="pr-decision" data-testid="partners-decision-${r(e.id)}"><div class="pr-decision-top">${monogram(e.partner, e.recipientType || "company")}<div><h3>${r(e.partner)}</h3><p class="small">${typeMeta[e.recipientType]?.label || "Партнёр"}${e.recipientCity ? ` · ${r(e.recipientCity)}` : ""} · ${r(e.category || "")}</p></div></div>${config.offerPanel(e)}</article>`,
        )
        .join("")}</div></section>`
    : "";

  const activeZone = `<section class="panel pr-zone" id="pr-zone-active" data-testid="partners-zone-active"><div class="pr-zone-head"><div><h2>Действующие партнёры <span class="badge-count">${partners.length}</span></h2><p class="small">Кому вы можете рекомендовать клиентов и кто рекомендует вас. Архив скрывает запись только из списка, не отменяя условия.</p></div></div>${
    partners.length || !canManage
      ? config.active()
      : `<div class="pr-empty-inline"><p class="small">Действующих партнёров пока нет. Начните с поиска или приглашения.</p></div>`
  }</section>`;

  const waitingZone = `<details class="panel pr-zone pr-zone-waiting" id="pr-zone-waiting" data-testid="partners-zone-waiting" ${openOutgoing || (!partners.length && waiting.length) ? "open" : ""}><summary><span><h2>Ожидают ответа <span class="badge-count">${waiting.length}</span></h2><small class="small">Отправленные приглашения и предложения. Партнёр увидит их в своём кабинете.</small></span>${D("chevron-down")}</summary><div class="pr-zone-body">${
    canManage ? `<div class="row pr-waiting-actions">${d("Найти в RemCard", "partner-hub", "ghost")}${d("Пригласить по ссылке", "external-partner", "ghost")}</div>` : ""
  }${config.outgoingList()}</div></details>`;

  const emptyState = `<section class="panel pr-empty" data-testid="partners-empty"><div class="pr-empty-icon">${D("handshake")}</div><h2>Партнёров пока нет</h2><p class="muted">Партнёр — это магазин, мастер или компания, которым вы рекомендуете клиентов и которые рекомендуют вас. Начните с одного из двух путей.</p>${scenarioCards()}</section>`;

  return `<div class="pr" data-testid="partners-redesign">${head}${isEmpty && canManage ? emptyState : `${tiles}${decisionZone}${activeZone}${waitingZone}`}<p class="small pr-footnote">Приглашения сотрудников находятся отдельно в разделе команды. Здесь только партнёрство.</p></div>`;
}

function scenarioCards() {
  const { D } = api;
  return `<div class="pr-scenarios"><button type="button" class="pr-scenario" data-action="partner-hub" data-testid="partners-scenario-find"><span class="pr-scenario-icon">${D("search")}</span><span class="eyebrow">Уже в RemCard</span><strong>Найти в RemCard</strong><p class="small">Партнёр уже зарегистрирован. Посмотрите витрину по этапам ремонта и направлениям, сравните условия и отправьте приглашение.</p><span class="pr-scenario-link">Открыть витрину ${D("arrow-right")}</span></button><button type="button" class="pr-scenario" data-action="external-partner" data-testid="partners-scenario-link"><span class="pr-scenario-icon">${D("link")}</span><span class="eyebrow">Ещё не в RemCard</span><strong>Пригласить по ссылке</strong><p class="small">Знакомого магазина или мастера нет на платформе. Создайте приглашение: по нему он зарегистрируется и вернётся к обсуждению условий.</p><span class="pr-scenario-link">Создать приглашение ${D("arrow-right")}</span></button></div>`;
}

export function scrollToZone(id) {
  const target = document.getElementById(`pr-zone-${id}`);
  if (!target) return;
  if (target.tagName === "DETAILS") target.open = true;
  target.scrollIntoView({ block: "start", behavior: "smooth" });
}

// ---------- Окно «Найти партнёра» ----------

export function hubChoose() {
  const { E, se } = api;
  E("Найти партнёра", `<p class="muted">Два пути: партнёр уже зарегистрирован в RemCard или его ещё нужно пригласить на платформу.</p>${scenarioCards()}<small>Приглашения сотрудников находятся отдельно в разделе команды.</small>`);
  se.classList.remove("hub-wide");
}

export function hubFindShell(options) {
  // options: { state, dictionary, cities, typeLabels, results, certReturn, escape }
  const { d, D, r, se, E } = api;
  const { state, dictionary, cities, typeLabels, certReturn } = options;
  E(
    "Витрина партнёров",
    `<div class="pr-showcase-intro"><p class="small">Найдите, кого рекомендовать своим клиентам. Направления и условия видны сразу.</p>${d(`${D("arrow-left")} Другой способ приглашения`, "partner-hub-choose", "ghost pr-back")}</div>
    <label class="field pr-search"><span class="sr-only">Поиск по словам</span><span class="pr-search-box">${D("search")}<input id="directory-query" type="search" maxlength="120" value="${r(state.q)}" placeholder="Название, товар, услуга, этап или ID"></span></label>
    <details class="optional pr-refine pr-showcase-refine" ${state.city || state.type ? "open" : ""}><summary>Город и тип партнёра${state.city || state.type ? " · выбраны" : ""}</summary><div class="directory-filters">
      <label class="field">Город<select data-directory-filter="city"><option value="">Все</option>${cities.map((c) => `<option value="${r(c)}" ${state.city === c ? "selected" : ""}>${r(c)}</option>`).join("")}</select></label>
      <label class="field">Тип партнёра<select data-directory-filter="type"><option value="">Все</option>${["store", "company", "specialist", "agent"].map((t) => `<option value="${t}" ${state.type === t ? "selected" : ""}>${typeLabels[t]}</option>`).join("")}</select></label>
      <label class="field">Специализация<select data-directory-filter="specialization" data-testid="directory-specialization"><option value="">Все специализации</option>${["services", "products"].map((group) => `<optgroup label="${group === "services" ? "Работы и услуги" : "Товары и материалы"}">${dictionary[group].map((item) => `<option value="${group}:${r(item.id)}" ${state.specialization === `${group}:${item.id}` ? "selected" : ""}>${r(item.label)}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <label class="field">Этап ремонта<select data-directory-filter="stage" data-testid="directory-stage"><option value="">Все этапы</option>${dictionary.stages.map((item) => `<option value="${r(item.id)}" ${state.stage === item.id ? "selected" : ""}>${r(item.label)}</option>`).join("")}</select></label>
    </div></details>
    <div id="directory-results" class="pr-results">${options.results()}</div>
    <div class="invite-inline pr-invite-inline"><div><strong>Знакомого ещё нет в RemCard?</strong><small>Отправьте персональную ссылку на приглашение.</small></div>${d("Пригласить по ссылке", "external-partner")}</div>
    ${certReturn ? d("Вернуться к сертификату", "cert-return", "ghost") : ""}
    <small>Макет общего поиска на примерах. Живая база платформы здесь не подключена.</small>`,
  );
  se.classList.add("hub-wide");
}

export function showcaseResults(options) {
  // options: { all, partners, state, dictionary, typeLabels, isInvited, terms }
  const { d, D, r } = api;
  const { all, partners, state, dictionary, typeLabels, isInvited } = options;

  const countBy = (group, id) => filterDirectory(all, {
    ...state,
    stage: group === "stages" ? id : state.stage,
    specialization: group === "stages" ? "" : `${group}:${id}`,
  }, dictionary).length;

  const stageIcons = { "L1-0": "stethoscope", "L1-1": "pencil-ruler", "L1-2": "file-check", "L1-3": "shovel", "L1-4": "hammer", "L1-5": "brick-wall", "L1-6": "house", "L1-7": "zap", "L1-8": "paint-roller", "L1-9": "paintbrush", "L1-10": "sofa", "L1-11": "badge-check" };
  const stageSteps = dictionary.stages.map((s, index) => ({ ...s, index, n: countBy("stages", s.id) }));
  const dirChips = ["services", "products"]
    .flatMap((group) => dictionary[group].map((item) => ({ group, id: item.id, label: item.label, n: countBy(group, item.id) })))
    .filter((c) => c.n);

  const chip = (label, n, action, selected) =>
    `<button type="button" class="pr-nav-item" aria-pressed="${selected}" data-action="${action}"><span>${r(label)}</span><small>${n}</small></button>`;
  const baseCount = filterDirectory(all, {...state, stage:"", specialization:""}, dictionary).length;
  const stageCount = filterDirectory(all, {...state, specialization:""}, dictionary).length;
  const stageTitle = stageLabel(dictionary, state.stage) || "Все этапы";
  const directionTitle = directionLabel(dictionary, state.specialization).replace(/^[^:]+:\s*/, "");
  const navOpen = document.querySelector(".pr-navigator")?.open || false;

  const totalSteps = stageSteps.length;
  const selectedStep = stageSteps.find((s) => s.id === state.stage);
  const coveredSteps = stageSteps.filter((s) => s.n).length;
  const progress = selectedStep ? Math.round(((selectedStep.index + 1) / totalSteps) * 100) : Math.round((coveredSteps / totalSteps) * 100);
  const questHead = `<div class="pr-quest-head"><span class="pr-quest-eyebrow">${D("route")} Путь ремонта</span><strong>${selectedStep ? `Этап ${selectedStep.index + 1} из ${totalSteps}` : `${totalSteps} этапов пути`}</strong><div class="pr-quest-bar" role="img" aria-label="${selectedStep ? `Этап ${selectedStep.index + 1} из ${totalSteps}` : `Партнёры есть на ${coveredSteps} из ${totalSteps} этапов`}"><i style="width:${progress}%"></i></div><small>${selectedStep ? `${r(selectedStep.label)} · ${selectedStep.n} ${plural(selectedStep.n, "партнёр", "партнёра", "партнёров")}` : `Партнёры есть на ${coveredSteps} из ${totalSteps} этапов`}</small></div>`;
  const stepButton = (s) => {
    const selected = state.stage === s.id;
    const passed = selectedStep ? s.index < selectedStep.index : false;
    const cls = `pr-path-step ${selected ? "is-current" : ""} ${passed ? "is-passed" : ""} ${s.n ? "" : "is-empty"}`;
    const inner = `<span class="pr-step-node">${D(stageIcons[s.id] || "milestone")}<i>${s.index + 1}</i></span><span class="pr-step-text"><b>${r(s.label)}</b><em>${selected ? "Вы здесь" : s.n ? `Уровень ${s.index + 1}` : "Пока без партнёров"}</em></span>`;
    return s.n
      ? `<li class="${cls}"><button type="button" class="pr-nav-item pr-step" aria-pressed="${selected}" data-action="directory-chip:stage=${s.id}">${inner}<small>${s.n}</small></button></li>`
      : `<li class="${cls}"><span class="pr-nav-item pr-step" aria-disabled="true">${inner}<small>—</small></span></li>`;
  };
  const pathAll = `<li class="pr-path-step pr-path-all ${state.stage ? "" : "is-current"}"><button type="button" class="pr-nav-item pr-step" aria-pressed="${!state.stage}" data-action="directory-chip:stage="><span class="pr-step-node">${D("map")}</span><span class="pr-step-text"><b>Весь путь</b><em>Все этапы ремонта</em></span><small>${baseCount}</small></button></li>`;
  const rails = `<details class="pr-navigator" ${navOpen ? "open" : ""}><summary><span>${D("route")}<b>${r(directionTitle || (selectedStep ? `Этап ${selectedStep.index + 1} из ${totalSteps} · ${stageTitle}` : stageTitle))}</b></span>${D("chevron-down")}</summary><nav class="pr-nav-body pr-quest" aria-label="Навигатор партнёров">${questHead}<ol class="pr-path" aria-label="Этапы ремонта">${pathAll}${stageSteps.map(stepButton).join("")}</ol><div class="pr-nav-section pr-skills"><h3>${D("sparkles")} Направление</h3><div class="pr-skill-grid">${chip("Все направления", stageCount, "directory-chip:specialization=", !state.specialization)}${dirChips
    .map((c) => chip(c.label, c.n, `directory-chip:specialization=${c.group}|${c.id}`, state.specialization === `${c.group}:${c.id}`))
    .join("")}</div></div></nav></details>`;

  const active = [
    ["specialization", directionLabel(dictionary, state.specialization)],
    ["stage", state.stage ? `Этап: ${stageLabel(dictionary, state.stage)}` : ""],
    ["city", state.city ? `Город: ${state.city}` : ""],
    ["type", state.type ? `Тип: ${typeLabels[state.type]}` : ""],
    ["q", state.q.trim() ? `Поиск: ${state.q.trim()}` : ""],
  ].filter(([, label]) => label);
  const activeRow = active.length
    ? `<div class="directory-active" aria-label="Выбранные фильтры">${active.map(([key, label]) => `<button type="button" class="directory-filter-chip" data-action="directory-clear:${key}" aria-label="Снять фильтр ${r(label)}">${r(label)}${D("x")}</button>`).join("")}${d("Сбросить всё", "directory-reset", "ghost")}</div>`
    : "";

  const card = (p) => {
    const dirs = partnerDirections(p);
    const labels = ["services", "products"].flatMap((group) => dirs[group].map((id) => dictionary[group].find((x) => x.id === id)?.label).filter(Boolean));
    const stages = dirs.stages.map((id) => stageLabel(dictionary, id)).filter(Boolean);
    const terms = p.generalTerms || [];
    const shownTerms = terms.slice(0, 3);
    const percents = terms.map(t => Number(t.limit)).filter(Number.isFinite);
    const percentLabel = !percents.length ? "" : Math.min(...percents) === Math.max(...percents)
      ? `${Math.min(...percents)}%` : `от ${Math.min(...percents)} до ${Math.max(...percents)}%`;
    const description = labels.length ? labels.slice(0,3).join(" · ") : (p.topics || []).join(" · ");
    const status = p.ready
      ? '<span class="pill good">Вы уже сотрудничаете</span>'
      : isInvited(p.id)
        ? '<span class="pill">Приглашение отправлено · демо</span>'
        : d("Сотрудничать", `directory-invite:${p.id}`, "primary");
    return `<article class="pr-card ${p.ready ? "is-partner" : ""}" data-testid="directory-partner-${r(p.id)}">
      <div class="pr-card-cover pr-cover-${typeMeta[p.type]?.tone || "company"}"><span>${typeLabels[p.type]}</span>${!p.ready && !isInvited(p.id) ? '<span class="pr-open">Открыт к партнёрству</span>' : ""}</div>
      <div class="pr-card-top">${monogram(p.name, p.type)}<div class="pr-card-title"><h3>${r(p.name)}</h3><p class="small">${r(p.city)}</p></div></div>
      <p class="pr-card-description">${r(description || "Направления не указаны")}</p>
      <p class="small pr-stages">${stages.length ? `${r(stages.slice(0, 3).join(" · "))}${stages.length > 3 ? ` и ещё ${stages.length - 3}` : ""}` : "Этапы ремонта не указаны"}</p>
      <div class="pr-terms"><div class="pr-terms-heading"><span class="pr-terms-title">Условия для агентов</span>${percentLabel ? `<strong>${r(percentLabel)}</strong><small>Скидка клиенту + бонус агенту</small>` : ""}</div>${
        shownTerms.length
          ? `<ul>${shownTerms.map((t) => `<li><span>${r(t.name)}</span><b>${t.limit}%</b></li>`).join("")}${terms.length > 3 ? `<li class="pr-terms-more">и ещё ${terms.length - 3} ${plural(terms.length - 3, "категория", "категории", "категорий")}</li>` : ""}</ul>`
          : "<small>Общие условия пока не опубликованы. Можно запросить персональное предложение.</small>"
      }</div>
      <div class="pr-card-foot">${d("Подробнее", `directory-detail:${p.id}`, "ghost")}${status}</div>
    </article>`;
  };

  const openCount = partners.filter((p) => !p.ready).length;
  const summary = `<div class="pr-showcase-heading"><div><span class="eyebrow">Партнёры RemCard</span><h2>${r(directionTitle || (state.stage ? stageTitle : "Найдите своего партнёра"))}</h2></div><p class="small pr-count" role="status" data-testid="directory-result-count">${partners.length} ${plural(partners.length,"партнёр","партнёра","партнёров")} · ${openCount} ${plural(openCount, "открыт", "открыты", "открыты")} к сотрудничеству</p></div>`;

  const rank = (p) => (p.ready ? 2 : isInvited(p.id) ? 1 : 0);
  const ordered = [...partners].sort((a, b) => rank(a) - rank(b));
  const grid = partners.length
    ? `<div class="pr-grid">${ordered.map(card).join("")}</div>`
    : `<div class="notice pr-notice"><strong>По выбранной задаче партнёров не найдено</strong><p>Снимите одно из ограничений или сбросьте поиск. В прототипе представлены только семь демонстрационных профилей, не вся база RemCard.</p>${d("Сбросить фильтры", "directory-reset", "ghost")}</div>`;

  return `<div class="pr-showcase-layout">${rails}<section class="pr-showcase-main" aria-label="Карточки партнёров">${summary}${activeRow}${grid}<p class="small pr-showcase-note">Демонстрационные профили. Указан общий процент на скидку клиенту и бонус агенту, не гарантированный доход. Итоговые условия согласовываются после приглашения.</p></section></div>`;
}
