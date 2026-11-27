// Local prototype model. No production APIs, browser storage or financial writes.
import { a as logo } from "./chunk-PG3I4FMB.js";
import { invitationRates, readInvitationRates, validInvitationRates, rateLabel } from "./invitation-fields.js";
const copy = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const defaults = {
  days: 30, operations: 1, minimum: 0, promotions: false,
  exclusions: "Не действует на акционные товары.",
  rates: [{name:"Двери",rate:15},{name:"Напольные покрытия",rate:13},{name:"Фурнитура",rate:8}],
};
const counterparties = [
  {id:"factory",name:"Соляник Фэмили",role:"Компания",initials:"СФ"},
  {id:"ivan",name:"Иван",role:"Дизайнер",initials:"ИВ"},
  {id:"anna",name:"Анна",role:"Агент",initials:"АН"},
  {id:"studio",name:"Студия ремонта",role:"Компания",initials:"СР"},
];
const state = {general:copy(defaults),individual:new Map(),pending:new Map(),issued:[],tab:"settings",scope:"general",partner:"ivan",audience:"ivan",draft:null,status:"",dirty:false};
let api;
const receivingName = () => api?.getRole()==="agent" ? "Оптовик" : api?.getName?.() || "Оптовик";
const roleStates = new Map();
let stateRole = "store";
function syncRole() {
  const role = api?.getRole() || "store";
  if (role === stateRole) return;
  roleStates.set(stateRole,{...state});
  const rates = role === "company" ? [{name:"Малярные работы",rate:10},{name:"Сборка мебели",rate:8}] : role === "specialist" ? [{name:"Дизайн интерьера",rate:10},{name:"Авторский надзор",rate:8}] : copy(defaults.rates);
  Object.assign(state,roleStates.get(role) || {general:{...copy(defaults),rates},individual:new Map(),pending:new Map(),issued:[],tab:"settings",scope:"general",partner:"ivan",audience:"ivan",draft:null,status:"",dirty:false});
  stateRole=role;
}
export function ownCertificatePolicy(partnerId = null) {
  syncRole();
  if (api?.getRole()==="agent") return null;
  if (partnerId && !state.individual.has(partnerId)) state.individual.set(partnerId,copy(state.general));
  return copy(partnerId ? effective(partnerId) : state.general);
}
// Pure display getter. Unlike preparing an invitation, reading a search card
// must not create an individual agreement or freeze inherited general terms.
export function receivingPolicySnapshot(partnerId) {
  syncRole();
  if (api?.getRole()==="agent") return null;
  return copy(effective(partnerId));
}
// Apply only an explicitly accepted incoming agreement, never an invitation draft.
export function acceptReceivingPolicy(partnerId, policy) {
  syncRole();
  if (api?.getRole()==="agent" || !partnerId) return;
  state.individual.set(partnerId,copy(policy));
  state.pending.delete(partnerId);
}
const effective = id => state.individual.get(id) || state.general;
const plural = (n,one,few,many) => { const a=n%10,b=n%100; return a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many; };
const daysWord = n => plural(n,"день","дня","дней");
const opsWord = n => plural(n,"покупка","покупки","покупок");
const modeWord = n => n===1 ? "разовый" : "многоразовый";
const opsChip = n => n===1 ? "Разовый" : `${n} ${opsWord(n)}`;
const rubles = n => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
const dateLabel = value => new Date(value).toLocaleDateString("ru-RU");
function expiry(days, now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23,59,59,999);
  return end.toISOString();
}
// Read-only key numbers: the two things a partner must notice first.
function stats(p, until) {
  return `<div class="cp-stats"><div class="cp-stat"><span class="cp-eyebrow">Срок скидки</span><strong>${p.days} <small>${daysWord(p.days)}</small></strong>${until?`<span class="cp-fine">до ${dateLabel(until)}</span>`:""}</div><div class="cp-stat"><span class="cp-eyebrow">Покупок</span><strong>${p.operations} <small>${modeWord(p.operations)}</small></strong></div></div>`;
}
function chips(p) {
  const list = [p.promotions ? "Суммируется со скидками" : "Не суммируется со скидками"];
  if (p.minimum) list.push(`Покупка от ${rubles(p.minimum)}`);
  return `<div class="cp-chips">${list.map(t=>`<span class="cp-chip">${t}</span>`).join("")}</div>${p.exclusions?`<p class="cp-fine">${esc(p.exclusions)}</p>`:""}`;
}
function terms(p, title = "Процент по категориям") {
  const max = Math.max(0,...p.rates.filter(r=>!r.isExcluded).map(r=>r.rate));
  return `<div class="cp-terms"><div class="cp-terms-head"><span class="cp-eyebrow">${title}</span><strong>до ${max}%</strong><small>скидка клиенту + бонус партнёру</small></div><ul class="cp-list">${p.rates.map(r=>`<li><span>${esc(r.name)}</span><b>${rateLabel(r)}</b></li>`).join("")}</ul></div>`;
}
function tabs() {
  const hidden = ["agent","employee"].includes(api.getRole());
  return `<nav class="cp-seg cp-tabs" role="tablist" aria-label="Условия сертификатов">${[["settings","Мои условия"],["partner","Видит партнёр"],["catalog","Каталог"],["create","Сертификат"]].filter(([key])=>key!=="settings"||!hidden).map(([key,label])=>`<button type="button" data-cp-tab="${key}" data-testid="cp-tab-${key}" role="tab" aria-selected="${state.tab===key}">${label}</button>`).join("")}</nav>`;
}
function who(current, attr, testid, withState = false, label = "Партнёр") {
  return `<div class="cp-block"><span class="cp-eyebrow">${label}</span><div class="cp-who" role="group" aria-label="${label}" data-testid="${testid}">${counterparties.map(c=>{
    const note = !withState ? c.role : state.pending.has(c.id) ? "Ждёт ответа" : state.individual.has(c.id) ? "Свои условия" : "Общие условия";
    return `<button type="button" ${attr}="${c.id}" aria-pressed="${current===c.id}"><span class="cp-ava" aria-hidden="true">${c.initials}</span><span><b>${esc(c.name)}</b><small>${note}</small></span></button>`;
  }).join("")}</div></div>`;
}
function diff(cur, next) {
  const rows = [];
  const add = (label,a,b) => { if (a !== b) rows.push([label,a,b]); };
  add("Срок", `${cur.days} ${daysWord(cur.days)}`, `${next.days} ${daysWord(next.days)}`);
  add("Покупок", String(cur.operations), String(next.operations));
  next.rates.forEach((r,i)=>add(r.name, rateLabel(cur.rates[i]), rateLabel(r)));
  add("Покупка от", cur.minimum?rubles(cur.minimum):"нет", next.minimum?rubles(next.minimum):"нет");
  add("Другие скидки", cur.promotions?"суммируется":"не суммируется", next.promotions?"суммируется":"не суммируется");
  add("Исключения", cur.exclusions||"нет", next.exclusions||"нет");
  return rows;
}
function proposal(cur, next, title, actions, testid = "cp-pending") {
  return `<section class="cp-pending" data-testid="${testid}"><h3>${title}</h3><table class="cp-diff"><thead><tr><th scope="col">Условие</th><th scope="col">Сейчас</th><th scope="col">Новое</th></tr></thead><tbody>${diff(cur,next).map(([l,a,b])=>`<tr><th scope="row">${esc(l)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table><div class="cp-actions">${actions}</div></section>`;
}
function stepper(id, name, value, min, max, label) {
  return `<div class="cp-stepper"><button type="button" data-cp-step="${id}:-1" aria-label="Уменьшить">−</button><input id="${id}" name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" required value="${esc(value)}" aria-label="${label}" data-testid="${id}"><button type="button" data-cp-step="${id}:1" aria-label="Увеличить">+</button></div>`;
}
function settings() {
  const scope = state.scope, id = state.partner, pending = state.pending.get(id);
  const p = scope === "general" ? state.general : effective(id);
  const locked = pending && scope === "individual";
  const limits = [p.minimum ? `от ${rubles(p.minimum)}` : "без минимума", p.promotions ? "суммируется" : "не суммируется"].join(" · ");
  return `<div class="cp-seg cp-scope" role="group" aria-label="Для кого условия" data-testid="cp-scope"><button type="button" data-cp-scope="general" aria-pressed="${scope==="general"}">Для всех</button><button type="button" data-cp-scope="individual" aria-pressed="${scope==="individual"}">Для партнёра</button></div>
  ${scope==="individual" ? state.focusPartner ? `<div class="cp-block" data-testid="cp-focused-partner"><span class="cp-eyebrow">Для партнёра</span><h3>${esc(counterparties.find(p=>p.id===id)?.name || id)}</h3><p class="cp-fine">${state.individual.has(id)?"Индивидуальные условия":"Пока действуют общие условия"}</p></div>` : who(id,"data-cp-partner","cp-partner",true) : ""}
  ${locked ? proposal(effective(id), pending, "Ждёт ответа партнёра", `<button class="btn" type="button" data-cp-action="respond" data-testid="cp-open-response">Ответить за партнёра</button>`) : `<form id="cp-settings-form" novalidate class="cp-form">
    <div class="cp-tiles">
      <div class="cp-tile"><span class="cp-eyebrow">Срок скидки</span>${stepper("cp-days","days",p.days,1,3650,"Срок действия и гарантии скидки, дней")}<small id="cp-days-unit">${daysWord(p.days)} с выпуска</small></div>
      <div class="cp-tile"><span class="cp-eyebrow">Покупок</span>${stepper("cp-operations","operations",p.operations,1,10000,"Количество покупок по сертификату")}<small id="cp-operations-unit">${modeWord(p.operations)}</small></div>
    </div>
    <section class="cp-block"><div class="cp-block-head"><span class="cp-eyebrow">Процент по категориям</span><small>скидка клиенту + бонус партнёру</small></div>
    ${invitationRates(p.rates,"cp")}</section>
    <details class="cp-details"><summary><span>Ограничения</span><small>${limits}</small></summary><div class="cp-details-body">
      <label class="cp-field" for="cp-minimum"><span>Покупка от, ₽</span><input id="cp-minimum" name="minimum" type="number" inputmode="numeric" min="0" step="1" value="${p.minimum}" data-testid="cp-minimum"></label>
      <label class="cp-check"><input name="promotions" id="cp-promotions" type="checkbox" ${p.promotions?"checked":""} data-testid="cp-promotions"><b>Суммируется с другими скидками</b></label>
      <label class="cp-field" for="cp-exclusions"><span>Исключения</span><textarea name="exclusions" id="cp-exclusions" rows="2" maxlength="500" data-testid="cp-exclusions">${esc(p.exclusions)}</textarea></label>
    </div></details>
    <p class="cp-error" role="alert" id="cp-error"></p>
    <div class="cp-actions"><span class="cp-fine">Выпущенные сертификаты не меняются</span><button type="button" class="btn ghost" data-cp-action="reset">Отмена</button><button type="submit" class="btn primary" data-testid="cp-save">${scope==="general"?"Сохранить":"Предложить партнёру"}</button></div>
  </form>`}`;
}
function partnerView() {
  const p = effective(state.audience);
  const own = state.individual.has(state.audience);
  const pending = state.pending.get(state.audience);
  const viewer=counterparties.find(c=>c.id===state.audience);
  const label=["Компания","Магазин","company","store"].includes(viewer?.role)?"Мы рекомендуем":"Я рекомендую";
  return `${state.focusPartner ? `<p class="cp-fine">Кабинет «${esc(viewer?.name || "Партнёр")}» · демо</p>` : who(state.audience,"data-cp-audience","cp-audience",false,"Кто смотрит")}<h3 data-testid="cp-recommender-view">${label}</h3>
  ${pending ? proposal(p, pending, `${esc(receivingName())} предлагает новые условия`, `<button class="btn ghost" type="button" data-cp-action="reject" data-testid="cp-reject">Отклонить</button><button class="btn primary" type="button" data-cp-action="approve" data-testid="cp-approve">Согласовать</button>`, "cp-incoming") : ""}
  <article class="cp-card" data-testid="cp-effective"><div class="cp-card-cover"><span>${esc(receivingName())} принимает сертификаты</span><span class="cp-tag ${own?"is-own":""}">${own?"Свои условия":"Общие условия"}</span></div><div class="cp-card-body">${stats(p)}${terms(p)}${chips(p)}<div class="cp-actions"><button class="btn primary" type="button" data-cp-tab="create">Создать сертификат</button></div></div></article>`;
}
function catalog() {
  const g = state.general;
  return `<article class="cp-card" data-testid="cp-catalog-card"><div class="cp-card-cover"><span>${({company:"Компания",specialist:"Специалист"})[api.getRole()] || "Магазин"}</span><span class="cp-open">Открыт к партнёрству</span></div><div class="cp-card-body"><div class="cp-card-top"><span class="cp-logo" aria-hidden="true">${esc(receivingName().slice(0,2).toLocaleUpperCase("ru"))}</span><div><h3>${esc(receivingName())}</h3><p class="cp-fine">Краснодар · ${g.rates.map(r=>esc(r.name)).join(", ")}</p></div></div>${terms(g,"Условия для партнёров")}<div class="cp-block"><span class="cp-eyebrow">Сертификат</span>${stats(g)}${chips(g)}</div><div class="cp-card-foot"><span class="cp-fine">Возможны индивидуальные условия</span><button type="button" class="btn primary" data-cp-action="request">Обсудить условия</button></div></div></article>`;
}
function create() {
  const p = effective(state.audience);
  const own = state.individual.has(state.audience);
  return `${who(state.audience,"data-cp-audience","cp-audience",false,"Кто выпускает")}<form id="cp-create-form" class="cp-form" novalidate>
    <label class="cp-field" for="cp-client"><span class="cp-eyebrow">Клиент</span><input id="cp-client" name="client" value="Карен" maxlength="80" required data-testid="cp-client"></label>
    <article class="cp-card"><div class="cp-card-cover"><span>${esc(receivingName())}</span><span class="cp-tag ${own?"is-own":""}">${own?"Свои условия":"Общие условия"}</span></div><div class="cp-card-body">${stats(p, expiry(p.days))}${chips(p)}</div></article>
    <section class="cp-block"><div class="cp-block-head"><span class="cp-eyebrow">Скидка клиенту</span><small>остаток станет вашим бонусом</small></div>
    <div class="cp-rates">${p.rates.map((r,i)=>{if(r.isExcluded)return "";const first=i===p.rates.findIndex(row=>!row.isExcluded),d=Math.min(7,r.rate);return `<div class="cp-alloc"><label class="cp-check"><input type="checkbox" name="category-${i}" data-cp-category="${i}" ${first?"checked":""}><span><b>${esc(r.name)}</b><small>до ${r.rate}%</small></span></label><div class="cp-pct"><input id="cp-discount-${i}" type="number" inputmode="decimal" name="discount-${i}" min="0" max="${r.rate}" step="0.1" value="${d}" aria-label="Скидка клиенту: ${esc(r.name)}, %" data-cp-discount="${i}" ${first?"":"disabled"}><span aria-hidden="true">%</span></div><span class="cp-bonus" id="cp-bonus-${i}" data-rate="${r.rate}">${first?`бонус ${Math.round((r.rate-d)*10)/10}%`:"—"}</span></div>`;}).join("")}</div></section>
    <p class="cp-error" role="alert" id="cp-error"></p>
    <div class="cp-actions"><span class="cp-fine">Бонус считается на дату покупки</span><button type="submit" class="btn primary" data-testid="cp-create">Создать сертификат</button></div></form>
    ${state.issued.length?`<section class="cp-block"><span class="cp-eyebrow">Выпущенные</span><div class="cp-rates">${state.issued.map((c,i)=>`<button type="button" class="cp-issued-row" data-cp-issued="${i}"><b>${esc(c.client)}</b><span>${c.offers.map(o=>`${o.discount}%`).join(" · ")} · до ${dateLabel(c.expires)} · ${opsChip(c.policy.operations).toLowerCase()}</span></button>`).join("")}</div></section>`:""}`;
}
function issued(index) {
  const c = state.issued[index];
  if (!c) return;
  state.dirty = false;
  queueMicrotask(()=>{
    const who=document.querySelector('[data-testid="cp-issued-card"] .cp-cert-who');
    if(who)who.textContent=`${c.client} · ${c.receiverName || receivingName()}`;
  });
  const fine = [c.policy.promotions ? "Суммируется со скидками" : "Не суммируется со скидками", c.policy.minimum ? `покупка от ${rubles(c.policy.minimum)}` : "", c.policy.exclusions].filter(Boolean).join(" · ");
  api.modal("Сертификат клиента", `<div class="cp"><article class="rc-cert cp-cert" data-testid="cp-issued-card"><div class="rc-cert-brand">${logo}</div><span class="rc-cert-badge">Демонстрационный сертификат</span><h2>Скидочный сертификат</h2><p class="cp-cert-who">${esc(c.client)} · Оптовик</p><div class="cp-cert-offers">${c.offers.map(r=>`<div><strong>${r.discount}%</strong><span>${esc(r.name)}</span></div>`).join("")}</div><div class="cp-cert-facts"><div><small>Действует до</small><b>${dateLabel(c.expires)}</b></div><div><small>Покупок</small><b>${c.policy.operations} · ${modeWord(c.policy.operations)}</b></div></div><p class="cp-cert-fine">${esc(fine)}</p></article><p class="cp-demo">Условия зафиксированы при выпуске · бонус партнёра клиент не видит</p><div class="cp-actions"><button type="button" class="btn" data-cp-action="back-create">Назад</button></div></div>`);
  document.querySelector("#role-dialog")?.classList.add("cp-policy-dialog");
  topOfDialog();
}
function topOfDialog() {
  requestAnimationFrame(()=>{
    const dialog=document.querySelector("#role-dialog");
    if(!dialog?.open)return;
    dialog.scrollTop=0;
    dialog.querySelector('button[data-action="close-dialog"]')?.focus({preventScroll:true});
  });
}
function render() {
  if (!api) return;
  api.modal("Условия сертификатов", `<div class="cp" data-testid="certificate-policy">${tabs()}${state.status?`<p class="cp-status" role="status">${esc(state.status)}</p>`:""}${({settings,partner:partnerView,catalog,create}[state.tab])()}<p class="cp-demo">Демо · изменения только в этом просмотре</p></div>`);
  document.querySelector("#role-dialog")?.classList.add("cp-policy-dialog");
  topOfDialog();
}
function guard(next) {
  if (!state.dirty) { next(); return; }
  const box = document.querySelector('[data-testid="certificate-policy"]');
  if (!box || box.querySelector("[data-cp-discard]")) return;
  const decision = document.createElement("section");
  decision.className = "cp-pending";
  decision.dataset.cpDiscard = "";
  decision.setAttribute("role","alertdialog");
  decision.setAttribute("aria-label","Несохранённые изменения");
  decision.innerHTML = `<h3>Изменения не сохранены</h3><div class="cp-actions"><button type="button" class="btn ghost" data-cp-leave>Выйти без сохранения</button><button type="button" class="btn primary" data-cp-keep>Продолжить</button></div>`;
  box.prepend(decision);
  decision.querySelector("[data-cp-keep]").onclick = () => decision.remove();
  decision.querySelector("[data-cp-leave]").onclick = () => {state.dirty=false;state.draft=null;next();};
  decision.querySelector("[data-cp-keep]").focus();
  document.querySelector("#role-dialog").scrollTop = 0;
}
export function openCertificatePolicy(tab="settings", options = {}) {
  syncRole();
  state.focusPartner=options.partner || null;
  if(options.general) state.scope="general";
  if(options.partner && counterparties.some(p=>p.id===options.partner)) {
    state.partner=options.partner;state.audience=options.partner;state.scope="individual";
  }
  state.tab=["settings","partner","catalog","create"].includes(tab)?tab:"settings";
  if(["agent","employee"].includes(api.getRole())&&state.tab==="settings")state.tab="partner";
  state.status="";state.draft=null;state.dirty=false;render();
}
export function certificatePolicyEntry(role) {
  if(role==="employee")return "";
  if(role==="agent")return `<section class="panel cp-profile-entry"><div class="cp-panel-title"><div><h2>Условия сертификатов</h2><p class="small">Срок скидки и число покупок у партнёров.</p></div><button type="button" class="btn" data-cp-open="partner">Посмотреть</button></div></section>`;
  return `<section class="panel cp-profile-entry"><div class="cp-panel-title"><div><h2>Условия сертификатов</h2><p class="small">Срок скидки и число покупок для ваших партнёров.</p></div><button type="button" class="btn" data-cp-open="settings" data-cp-general data-testid="cp-open-settings">Настроить</button></div></section>`;
}
export function certificatePolicyPartnersEntry() {
  if(!["store","company","specialist"].includes(api?.getRole()))return "";
  const p=ownCertificatePolicy();
  return `<section class="panel dp-policy-entry" aria-labelledby="dp-policy-title" data-testid="partners-certificate-policy"><div class="dp-policy-heading"><h2 id="dp-policy-title">Общие условия сертификатов</h2><p class="small">Для клиентов, которых направляют к вам партнёры.</p></div><dl class="dp-policy-summary"><div><dt>Срок скидки</dt><dd data-testid="partners-policy-days">${p.days} ${daysWord(p.days)}</dd></div><div><dt>Покупок</dt><dd data-testid="partners-policy-purchases">${p.operations}</dd></div></dl><button type="button" class="btn" data-cp-open="settings" data-cp-general data-testid="partners-policy-settings">Настроить</button></section>`;
}
export function certificatePolicyPartnerEntry(partner) {
  if(!["store","company","specialist"].includes(api?.getRole()))return "";
  syncRole();
  if(!counterparties.some(p=>p.id===partner.id))counterparties.push({id:partner.id,name:partner.name,role:partner.type || "Партнёр",initials:partner.name.split(/\s+/).slice(0,2).map(s=>s[0]).join("")});
  const p=effective(partner.id),pending=state.pending.has(partner.id);
  return `<section class="site-coop-section dp-individual-policy" data-testid="partner-certificate-policy"><div><h3>Ваши условия для партнёра</h3><p class="small">${pending?"Изменения ждут согласования":state.individual.has(partner.id)?"Индивидуальные условия":"Действуют общие условия"}</p></div><dl class="dp-policy-summary"><div><dt>Срок скидки</dt><dd>${p.days} ${daysWord(p.days)}</dd></div><div><dt>Покупок</dt><dd>${p.operations}</dd></div></dl><button type="button" class="btn" data-cp-partner-open="${esc(partner.id)}" data-testid="partner-policy-settings">${pending?"Посмотреть предложение":"Настроить"}</button></section>`;
}
const policyChips = p => `<span class="cp-chip">${p.days} ${daysWord(p.days)}</span><span class="cp-chip">${opsChip(p.operations)}</span>`;
export function certificatePolicyCompact(partner) {
  const p = certificatePolicySnapshot(partner).policy;
  return `<div class="pr-terms cp-compact" data-testid="cp-directory-${esc(partner.id)}"><span class="pr-terms-title">Сертификат</span><div class="cp-chips">${policyChips(p)}</div></div>`;
}
export function certificateRecipientPolicy(partner) {
  const p = certificatePolicySnapshot(partner).policy;
  return `<div class="cp-chips cp-recipient" data-testid="cp-recipient-${esc(partner.id)}">${policyChips(p)}</div>`;
}
export function certificatePolicySnapshot(partner) {
  const company=partner?.type==="company"||partner?.id==="interior";
  const policy={...copy(defaults),operations:company?3:1,days:company?45:30};
  return {policy,validUntil:expiry(policy.days)};
}
export function initCertificatePolicy(context) {
  api=context;
  document.addEventListener("click", event=>{
    const pick = name => event.target.closest(`[data-cp-${name}]`);
    const open=pick("open"), tab=pick("tab"), item=pick("issued"), scope=pick("scope"), partner=pick("partner"), audience=pick("audience"), step=pick("step");
    const action=pick("action")?.dataset.cpAction;
    const individual=pick("partner-open");
    if(individual){openCertificatePolicy("settings",{partner:individual.dataset.cpPartnerOpen});return;}
    if(open){openCertificatePolicy(open.dataset.cpOpen,{general:open.hasAttribute("data-cp-general")});return;}
    if(tab){guard(()=>{state.tab=tab.dataset.cpTab;state.status="";state.draft=null;render();});return;}
    if(item){issued(Number(item.dataset.cpIssued));return;}
    if(scope){guard(()=>{state.scope=scope.dataset.cpScope;state.status="";render();});return;}
    if(partner){guard(()=>{state.partner=partner.dataset.cpPartner;state.status="";render();});return;}
    if(audience){state.audience=audience.dataset.cpAudience;state.status="";render();return;}
    if(step){
      const [id,delta]=step.dataset.cpStep.split(":"),input=document.getElementById(id);
      const next=Math.min(Number(input.max),Math.max(Number(input.min),(Math.round(Number(input.value))||0)+Number(delta)));
      input.value=String(next);
      input.dispatchEvent(new Event("input",{bubbles:true}));
      return;
    }
    if(action==="reset"){state.dirty=false;state.draft=null;state.status="";render();}
    if(action==="respond"){state.audience=state.partner;state.tab="partner";state.status="";render();}
    if(action==="request"){
      state.status="";
      if(["agent","employee"].includes(api.getRole())){state.tab="partner";render();return;}
      state.tab="settings";state.scope="individual";state.partner=state.audience;render();
    }
    if(action==="approve"||action==="reject"){
      const pending=state.pending.get(state.audience);
      if(!pending)return;
      if(action==="approve")state.individual.set(state.audience,copy(pending));
      state.pending.delete(state.audience);
      state.status=action==="approve"?"Согласовано · действует для новых сертификатов":"Отклонено · условия прежние";
      render();
    }
    if(action==="back-create"){state.tab="create";state.status="";render();}
  });
  document.addEventListener("change",event=>{
    const el=event.target;
    if(el.matches("[data-cp-category]")){
      const i=el.dataset.cpCategory,input=document.querySelector(`#cp-discount-${i}`),bonus=document.querySelector(`#cp-bonus-${i}`);
      input.disabled=!el.checked;
      bonus.textContent=el.checked?`бонус ${Math.round((Number(bonus.dataset.rate)-Number(input.value))*10)/10}%`:"—";
    }
  });
  document.addEventListener("input",event=>{
    const el=event.target;
    if(el.closest("#cp-settings-form"))state.dirty=true;
    if(el.id==="cp-days")document.querySelector("#cp-days-unit").textContent=`${daysWord(Math.abs(Math.round(Number(el.value)))||0)} с выпуска`;
    if(el.id==="cp-operations")document.querySelector("#cp-operations-unit").textContent=modeWord(Number(el.value));
    if(el.matches("[data-cp-discount]")){
      const bonus=document.querySelector(`#cp-bonus-${el.dataset.cpDiscount}`),left=Math.round((Number(bonus.dataset.rate)-Number(el.value))*10)/10;
      bonus.textContent=left<0||el.value===""?"—":`бонус ${left}%`;
    }
  });
  document.addEventListener("submit",event=>{
    if(event.target.id==="cp-settings-form"){
      event.preventDefault();event.stopImmediatePropagation();
      const form=new FormData(event.target),base=state.scope==="general"?state.general:effective(state.partner),error=document.querySelector("#cp-error");
      const p={days:Number(form.get("days")),operations:Number(form.get("operations")),minimum:Number(form.get("minimum")),promotions:form.has("promotions"),exclusions:String(form.get("exclusions")).trim(),rates:readInvitationRates(form,base.rates)};
      const empty=[...event.target.querySelectorAll('input[type="number"]:not(:disabled)')].some(el=>el.value.trim()==="");
      if(empty||!Number.isSafeInteger(p.days)||p.days<1||p.days>3650||!Number.isSafeInteger(p.operations)||p.operations<1||p.operations>10000||!Number.isSafeInteger(p.minimum)||p.minimum<0||!validInvitationRates(event.target,p.rates)){
        error.textContent="Проверьте значения: срок 1–3650 дней, покупок 1–10 000, проценты 0–100, сумма без копеек.";return;
      }
      if(state.scope==="individual"&&!diff(base,p).length){error.textContent="Нет отличий от действующих условий.";return;}
      if(state.scope==="general"){state.general=copy(p);state.status="Сохранено · каталог обновлён";}
      else{state.pending.set(state.partner,copy(p));state.status="Отправлено · до ответа действуют прежние условия";}
      state.dirty=false;state.draft=null;render();
    }
    if(event.target.id==="cp-create-form"){
      event.preventDefault();event.stopImmediatePropagation();
      const form=new FormData(event.target),p=effective(state.audience),client=String(form.get("client")||"").trim();
      const offers=p.rates.flatMap((r,i)=>!r.isExcluded&&form.has(`category-${i}`)?[{name:r.name,discount:Number(form.get(`discount-${i}`)),raw:form.get(`discount-${i}`)}]:[]);
      if(!client||!offers.length||offers.some(o=>o.raw===""||!Number.isFinite(o.discount)||o.discount<0||o.discount>p.rates.find(r=>r.name===o.name).rate||Math.abs(o.discount*10-Math.round(o.discount*10))>1e-8)){
        document.querySelector("#cp-error").textContent="Укажите клиента, категорию и скидку в пределах доступного процента.";return;
      }
      state.issued.push({client,issuer:state.audience,receiverName:receivingName(),policy:copy(p),expires:expiry(p.days),offers:offers.map(({raw,...r})=>r)});
      issued(state.issued.length-1);
    }
  },true);
  const dialog=document.querySelector("#role-dialog");
  dialog.addEventListener("click",event=>{
    if(!event.target.closest('[data-action="close-dialog"]')||!dialog.querySelector('[data-testid="certificate-policy"]'))return;
    if(state.dirty){event.preventDefault();event.stopImmediatePropagation();guard(()=>api.close());}
  },true);
  dialog.addEventListener("cancel",event=>{
    if(dialog.querySelector('[data-testid="certificate-policy"]')&&state.dirty){event.preventDefault();event.stopImmediatePropagation();guard(()=>api.close());}
  },true);
  dialog.addEventListener("close",()=>{if(!dialog.open)dialog.classList.remove("cp-policy-dialog");});
}
