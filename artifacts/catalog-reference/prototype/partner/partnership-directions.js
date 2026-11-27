// Design preview only. No network, storage, production records or real messages.
import { receivingPolicySnapshot, acceptReceivingPolicy, certificatePolicyPartnersEntry } from "./certificate-policy.js";
import { invitationRates, invitationComment, invitationNote, readInvitationRates, validInvitationRates, rateLabel } from "./invitation-fields.js";
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const roles = new Set(["store","company","specialist","agent"]);
const views = new Map();
let api, draft, dirty = false, pendingExit;
const button = (text, action, primary = false, extra = "") => `<button type="button" class="btn ${primary ? "primary" : ""}" data-dp-action="${action}" ${extra}>${text}</button>`;
const factoryTerms = () => ({days:30,operations:1,minimum:0,promotions:false,exclusions:"Не действует на акционные товары.",rates:[{name:"Мебель",rate:10},{name:"Кухни",rate:10}]});
function current() {
  const role = api.getRole();
  if (!views.has(role)) {
    const catalog = api.getDirectory?.() || [];
    const seed = (id, active, incoming) => {
      const profile = catalog.find(p=>p.id===id);
      if (!profile) return null;
      const policy = {...factoryTerms(),rates:(profile.generalTerms || []).map(r=>({name:r.name,rate:r.limit}))};
      return {id,name:profile.name,type:profile.type==="store" ? "Магазин" : "Компания",city:profile.city,status:active ? "active" : "missing",active:active ? clone(policy) : null,pending:null,offered:policy,issued:[],incoming:role!=="agent" && incoming,incomingPending:null};
    };
    const referredPartners = (api.getReferrals?.() || []).map(profile => {
      const policy = {...factoryTerms(),rates:[{name:profile.category,rate:10}]};
      return {id:profile.id,name:profile.name,type:"Компания",city:profile.city,
        category:profile.category,status:"active",active:clone(policy),offered:policy,
        pending:null,issued:[],incoming:false};
    });
    views.set(role, {
    tab: role === "agent" ? "out" : "in", query:"", selected:"factory", notice:"",
    partners:[
      {id:"factory",name:"Соляник Фэмили",type:"Компания",city:"Краснодар",status:"missing",active:null,pending:null,offered:factoryTerms(),issued:[]},
      seed("materials",true,true),
      seed("interior",role==="agent",true),
      seed("light",true,false),
      ...referredPartners,
    ].filter(Boolean),
  });
  }
  return views.get(role);
}
const partner = () => current().partners.find(p => p.id === current().selected);
const me = () => api.getName().replace(/\s*·\s*демо/g,"");
const outgoingLabel = () => ["store","company"].includes(api.getRole()) ? "Мы рекомендуем" : "Я рекомендую";
const incomingLabel = () => ["store","company"].includes(api.getRole()) ? "Нас рекомендуют" : "Меня рекомендуют";
const us = () => ["store","company"].includes(api.getRole()) ? "нас" : "меня";
export function directoryDirectionState(profile) {
  if (!api || !roles.has(api.getRole())) return null;
  const p=current().partners.find(p=>p.id===profile.id);
  return p ? {partner:p,incoming:api.getRole()!=="agent" && !!p.incoming,outgoing:!!p.active,agent:api.getRole()==="agent",connected:!!p.incoming || !!p.active} : null;
}
export function incomingDirectoryPartners(profiles) {
  if (!api || !roles.has(api.getRole()) || api.getRole()==="agent") return profiles.filter(p=>p.ready);
  return profiles.filter(profile=>directoryDirectionState(profile)?.incoming ?? profile.ready).map(p=>p.ready ? p : {...p,ready:true});
}
function cooperationHeader(state,compact) {
  const p=state.partner, both=state.incoming && state.outgoing;
  const direction=both ? "both" : state.outgoing ? "out" : "in";
  const tipId=`dp-cooperation-tip-${compact ? "card" : "profile"}-${api.getRole()}-${p.id}`;
  const arrow=key=>`<svg viewBox="0 0 16 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-direction-arrow="${key}"><path d="${key==="out" ? "M8 16V4m-4 4 4-4 4 4" : "M8 4v12m-4-4 4 4 4-4"}"/></svg>`;
  const explanation=[state.outgoing ? "Ваши клиенты → партнёру" : "",state.incoming ? "Клиенты партнёра → к вам" : ""].filter(Boolean);
  const reciprocal=both || state.agent ? "" : state.outgoing
    ? button(p.incomingPending ? "Приглашение" : "Пригласить",`directory-in:${p.id}`,false,`aria-label="${p.incomingPending ? "Посмотреть приглашение" : `Пригласить партнёра рекомендовать ${us()}`}"`)
    : button(p.pending ? "Рассмотреть" : p.status==="requested" ? "Посмотреть запрос" : "Рекомендовать",`directory-out:${p.id}`,false,`aria-label="${p.pending ? "Рассмотреть предложение партнёра" : p.status==="requested" ? "Посмотреть запрос условий" : "Запросить условия, чтобы рекомендовать партнёра"}"`);
  return `<div class="dp-cooperation-head"><div class="dp-cooperation-state" data-direction="${direction}"><button type="button" class="pill good dp-cooperation-badge" data-dp-tip aria-describedby="${esc(tipId)}" aria-label="Сотрудничаем. ${esc(explanation.join(". "))}"><span class="dp-cooperation-arrows">${state.outgoing ? arrow("out") : ""}${state.incoming ? arrow("in") : ""}</span><span>Сотрудничаем</span></button><div class="dp-cooperation-tooltip" id="${esc(tipId)}" role="tooltip"><strong>${both ? "В обе стороны" : "Одно направление"}</strong>${explanation.map(text=>`<span>${esc(text)}</span>`).join("")}</div></div>${reciprocal ? `<div class="dp-cooperation-action">${reciprocal}</div>` : ""}</div>`;
}
export function directoryCooperationHtml(profile,compact=false) {
  const state=directoryDirectionState(profile);
  if (!state?.connected) return "";
  const p=state.partner;
  const direction = (key, label, active, policy, pending, waiting) => {
    return `<div class="dp-direction-line ${active ? "is-agreed" : "is-missing"}" data-testid="directory-${key}-${esc(p.id)}"><div class="dp-direction-heading"><strong>${label}</strong><span class="small">${active ? "Согласовано" : pending ? "Ждёт решения" : waiting ? "Ждём ответа" : "Не подключено"}</span></div>${active
      ? `<p class="dp-direction-summary">${policyPool(policy)} · ${summary(policy)}</p><button type="button" class="dp-direction-link" data-dp-action="directory-terms:${esc(p.id)}:${key}">${key==="out" ? "Условия партнёра" : "Ваши условия"} <span aria-hidden="true">›</span></button>${pending ? `<p class="small dp-direction-pending">Есть новое предложение</p>` : ""}`
      : ""}</div>`;
  };
  return `<section class="dp-directory ${compact ? "dp-directory-card" : ""}" data-testid="directory-directions-${esc(p.id)}" aria-label="Направления сотрудничества">${cooperationHeader(state,compact)}${direction("out",outgoingLabel(),state.outgoing,p.active,p.pending,p.status==="requested")}${state.agent ? "" : direction("in",incomingLabel(),state.incoming,p.incomingTerms || receivingPolicySnapshot(p.id),false,p.incomingPending)}</section>`;
}
function policyPool(policy) {
  const rates=policy.rates.filter(row=>!row.isExcluded).map(rate=>Number(rate.rate)).filter(Number.isFinite);
  if (!rates.length) return "Процент не указан";
  const min=Math.min(...rates),max=Math.max(...rates);
  return min===max ? `${min}%` : `${min}–${max}%`;
}
function directoryTerms(direction) {
  const p=partner(), incoming=direction==="in";
  if (incoming && (api.getRole()==="agent" || !p.incoming)) return;
  const policy=incoming ? p.incomingTerms || receivingPolicySnapshot(p.id) : p.active;
  if (!policy) return details();
  dirty=false;
  show(incoming ? "Ваши условия для партнёра" : "Условия партнёра",`<p class="dp-context">${incoming ? `Клиенты «${esc(p.name)}» → ${esc(me())}` : `Ваши клиенты → ${esc(p.name)}`}</p><span class="dp-status dp-status-active">Действующие условия</span>${terms(policy)}${!incoming && p.pending ? `<section class="cp-pending"><h3>Есть новое предложение</h3><p class="small">До вашего решения действуют прежние условия.</p>${button("Рассмотреть предложение","review")}</section>` : ""}<div class="cp-actions">${button("Назад к поиску","directory-back")}${button("Закрыть","close")}</div>`);
}
export function openDirectionalCertificate(id) {
  if(!api || !roles.has(api.getRole())) return false;
  const p=current().partners.find(p=>p.id===id);
  if(!p?.active) return false;
  current().selected=id;create();return true;
}
export function openDirectionalPartner(id) {
  if (!api || !roles.has(api.getRole()) || !current().partners.some(p=>p.id===id)) return false;
  if (current().selected!==id) {current().clientQuery="";current().clientStatus="";}
  current().selected=id;current().directoryOrigin=false;details();return true;
}
function incomingInvitation() {
  const p=partner();
  if(api.getRole()==="agent" || p.incoming) return;
  dirty=false;
  const policy=p.incomingPending || receivingPolicySnapshot(p.id);
  if(!p.incomingPending) draft=clone(policy);
  show(p.incomingPending ? "Встречное приглашение" : `Пригласить рекомендовать ${us()}`,`<p class="dp-context">Клиенты «${esc(p.name)}» → ${esc(me())}</p>${p.incomingPending ? `<p>Ваше предложение ожидает решения партнёра.</p>${terms(policy)}<div class="cp-actions">${button("Отозвать приглашение","incoming-withdraw")}${button("Назад к поиску","directory-back")}</div><details class="dp-demo-tools"><summary>Проверить другую сторону · демо</summary><p class="small">Ответить от имени партнёра, которого вы приглашаете.</p>${button("Кабинет партнёра","incoming-review")}</details>` : `<p class="small">Условия только для этого приглашения. Общие условия не изменятся.</p><form id="dp-incoming-form" class="dp-invitation-form" novalidate>
    <div class="cp-tiles"><label class="cp-tile"><span class="cp-eyebrow">Срок, дней</span><div class="dp-invitation-number"><input name="days" type="number" inputmode="numeric" min="1" max="3650" step="1" required value="${esc(policy.days)}" aria-label="Срок скидки, дней"></div></label><label class="cp-tile"><span class="cp-eyebrow">Покупок</span><div class="dp-invitation-number"><input name="operations" type="number" inputmode="numeric" min="1" max="10000" step="1" required value="${esc(policy.operations)}" aria-label="Количество покупок"></div></label></div>
    <section class="cp-block"><div class="cp-block-head"><span class="cp-eyebrow">Процент по категориям</span><small>скидка клиенту + бонус партнёру</small></div>${invitationRates(policy.rates,"dp-invite")}</section>
    <details class="cp-details"><summary>Ограничения</summary><div class="cp-details-body"><label class="cp-field"><span>Покупка от, ₽</span><input name="minimum" type="number" inputmode="numeric" min="0" step="1" required value="${esc(policy.minimum)}"></label><label class="cp-check"><input name="promotions" type="checkbox" ${policy.promotions ? "checked" : ""}><b>Суммируется с другими скидками</b></label><label class="cp-field"><span>Исключения</span><textarea name="exclusions" rows="2" maxlength="500">${esc(policy.exclusions)}</textarea></label></div></details>
    ${invitationComment()}<p class="dp-error" id="dp-error" role="alert"></p><div class="cp-actions"><button type="submit" class="btn primary" data-dp-action="incoming-send">Отправить запрос</button>${button("Отмена","directory-back")}</div></form>`}${p.incomingPending ? invitationNote(p.incomingInvitationComment) : ""}`);
}
function incomingReview() {
  const p=partner();
  if(api.getRole()==="agent" || !p.incomingPending) return;
  show("Кабинет партнёра · демо",`<p class="dp-context">Вы смотрите от имени «${esc(p.name)}»</p><h3>Рекомендовать «${esc(me())}»</h3>${terms(p.incomingPending)}${invitationNote(p.incomingInvitationComment)}<div class="cp-actions">${button("Принять условия","incoming-accept",true)}${button("Отклонить","incoming-decline")}${button("Вернуться в мой кабинет","incoming-return")}</div>`);
}
const status = p => p.pending ? (p.active ? "Новые условия на согласовании" : "Ждут вашего решения") : p.active ? "Условия согласованы" : ({missing:"Условия не согласованы",requested:"Условия запрошены",rejected:"Предложение отклонено"})[p.status];
const summary = p => `${p.days} дн. · ${p.operations} ${p.operations%10===1 && p.operations%100!==11 ? "покупка" : p.operations%10>=2 && p.operations%10<=4 && (p.operations%100<12 || p.operations%100>14) ? "покупки" : "покупок"}`;
function terms(p, pool = true) {
  return `<div class="dp-terms">${pool ? `<ul class="cp-list">${p.rates.map(r=>`<li><span>${esc(r.name)}</span><b>${rateLabel(r)}</b></li>`).join("")}</ul><p class="small">Общий процент: скидка клиенту + бонус рекомендателю.</p>` : ""}
    <div class="cp-stats"><div class="cp-stat"><span class="cp-eyebrow">Срок скидки</span><strong>${p.days} <small>дней</small></strong></div><div class="cp-stat"><span class="cp-eyebrow">Покупок</span><strong>${p.operations}</strong></div></div>
    <details class="dp-restrictions"><summary>Ограничения</summary><p>${p.minimum ? `Покупка от ${p.minimum} ₽` : "Без минимальной суммы"} · ${p.promotions ? "суммируется" : "не суммируется"} с другими скидками.</p>${p.exclusions ? `<p>${esc(p.exclusions)}</p>` : ""}</details></div>`;
}
function policyFromForm(form, base) {
  const data=new FormData(form);
  return {days:Number(data.get("days")),operations:Number(data.get("operations")),minimum:Number(data.get("minimum")),promotions:data.has("promotions"),exclusions:String(data.get("exclusions")||"").trim(),rates:readInvitationRates(data,base.rates)};
}
function validPolicyForm(form, next, allowZero=false) {
  return ![...form.querySelectorAll('input[type="number"]:not(:disabled)')].some(el=>el.value==="")
    && Number.isInteger(next.days) && next.days>=1 && next.days<=3650
    && Number.isInteger(next.operations) && next.operations>=1 && next.operations<=10000
    && Number.isSafeInteger(next.minimum) && next.minimum>=0
    && validInvitationRates(form,next.rates)
    && next.rates.every(row=>row.isExcluded || allowZero || row.rate>0);
}
function pendingRow(p) {
  return `<article class="dp-pending-row" data-testid="dp-partner-${esc(p.id)}"><div><button type="button" class="collection-open" data-dp-action="detail:${esc(p.id)}">${esc(p.name)}</button><p class="small">${esc(p.type)} · ${esc(p.city)} · ${status(p)}</p></div>${button(p.pending ? "Посмотреть условия" : p.status==="requested" ? "Посмотреть запрос" : "Запросить условия",`${p.pending ? "review" : p.status==="requested" ? "detail" : "request"}:${p.id}`)}</article>`;
}
function renderOutgoing(config, legacy) {
  const v=current(), snapshots=api.getReferrals?.() || [];
  const active=v.partners.filter(p=>p.active);
  active.forEach(p=>{p.referredCount=snapshots.find(profile=>profile.id===p.id)?.clients.length || 0;});
  const pending=v.partners.filter(p=>p.pending || p.status==="requested");
  const missing=v.partners.filter(p=>!p.active && !p.pending && p.status!=="requested");
  return legacy({...config,direction:"out",partners:active,keepCollectionVisible:true,
    headActions:`<div class="row">${button("Создать сертификат","picker")}${config.canManage ? api.button("Найти партнёра","partner-hub-choose","primary pr-primary") : ""}</div>`,
    invitations:pending.map(p=>({id:p.id,partner:p.name,recipientType:p.type==="Магазин" ? "store" : "company",recipientCity:p.city,negotiation:p.pending ? "offered" : "requested"})),
    active:()=>api.renderOutgoingCollection(active),
    offerPanel:entry=>{const p=v.partners.find(p=>p.id===entry.id);return `<p class="small">Условия приёма ваших клиентов${p.active ? ". Пока действуют прежние." : "."}</p>${button("Посмотреть условия",`review:${p.id}`,true)}`;},
    outgoingList:()=>{const waiting=pending.filter(p=>!p.pending);return waiting.length ? waiting.map(pendingRow).join("") : '<p class="small muted">Нет запросов без ответа.</p>';},
  }) + (missing.length ? `<details class="panel pr-zone dp-not-agreed"><summary>Не согласованы <span class="badge-count">${missing.length}</span></summary>${missing.map(pendingRow).join("")}</details>` : "") + issuedList();
}
export function renderDirectionalPartners(config, legacy) {
  if (!roles.has(api.getRole())) return legacy(config);
  const v = current(), agent = api.getRole() === "agent";
  if (agent) v.tab = "out";
  const navigation = agent
    ? `<div class="dp-agent-title"><h2>Я рекомендую</h2><p class="small">Партнёры, к которым вы направляете клиентов.</p></div>`
    : `<div class="dp-tabs" role="tablist" aria-label="Направления рекомендаций">${[["in",incomingLabel()],["out",outgoingLabel()]].map(([key,label])=>`<button type="button" role="tab" id="dp-tab-${key}" aria-controls="dp-panel" aria-selected="${v.tab===key}" tabindex="${v.tab===key ? 0 : -1}" data-dp-action="tab:${key}">${label}</button>`).join("")}</div>`;
  const emptyHTML = config.directionEmptyHTML ? (v.tab === "in" ? config.directionEmptyHTML : `<section class="panel pr-empty"><h2>Кого вы будете рекомендовать?</h2><p class="muted">Найдите принимающего партнёра и согласуйте его условия для ваших клиентов.</p><div class="row">${api.button("Найти партнёра","partner-hub","primary")}${api.button("Пригласить по ссылке","external-partner","")}</div><p class="small">Сертификат станет доступен после принятия условий.</p>${api.button("Посмотреть на примере","empty:demo","ghost")}</section>`) : "";
  const body = emptyHTML || (v.tab === "in"
    ? legacy(config)
    : renderOutgoing(config,legacy));
  return `<section class="dp" data-testid="directional-partners">${certificatePolicyPartnersEntry()}${navigation}<div id="dp-panel" role="tabpanel" ${agent ? 'aria-label="Я рекомендую"' : `aria-labelledby="dp-tab-${v.tab}"`}>${v.notice ? `<p class="cp-status" role="status">${esc(v.notice)}</p>` : ""}${body}</div><div class="dp-demo"><span>Прототип · условные данные</span>${button("Сбросить пример","reset")}</div></section>`;
}
function issuedList() {
  const records = current().partners.flatMap(p=>p.issued.map((cert,index)=>({p,cert,index})));
  return records.length ? `<section class="panel dp-issued-list"><h2>Образцы сертификатов</h2>${records.map(({p,cert,index})=>`<div class="dp-issued-row"><div><b>${esc(cert.client)}</b><p class="small">${esc(p.name)} · скидка ${cert.offers.map(r=>`${esc(r.name)} ${r.discount}%`).join(", ")}</p></div>${button("Открыть образец",`issued:${p.id}:${index}`)}</div>`).join("")}</section>` : "";
}
function show(title, html) {
  api.modal(title,`<div class="dp-modal" data-dp-modal>${html}<p class="dp-modal-demo">Прототип · условные данные. Ничего не отправляется.</p></div>`);
  document.getElementById("role-dialog").classList.add("dp-dialog");
  requestAnimationFrame(()=>{
    const dialog=document.getElementById("role-dialog");
    dialog.querySelector('[data-action="close-dialog"]')?.focus({preventScroll:true});
    dialog.scrollTop=0;
  });
}
function details() {
  const p = partner();
  dirty = false;
  show(p.name,`${partnerTabs("terms")}<div id="dp-partner-content" role="tabpanel" aria-labelledby="dp-partner-tab-terms"><p class="dp-context">Условия, которые ${esc(p.name)} дал вам</p><span class="dp-status ${p.active ? "dp-status-active" : ""}">${status(p)}</span>
    ${p.active ? terms(p.active) : `<p>${p.status === "requested" ? "Запрос условий подготовлен в макете. Партнёр должен предложить свои условия приёма." : "Без согласованных условий сертификат к этому партнёру создать нельзя."}</p>`}
    ${p.pending ? `<div class="cp-pending"><h3>Есть новое предложение</h3>${button("Посмотреть условия","review",true)}</div>` : ""}
    <div class="cp-actions">${p.active ? button("Создать сертификат","create",true) : !p.pending && p.status !== "requested" ? button("Запросить условия","request",true) : ""}${current().directoryOrigin ? button("Назад к поиску","directory-back") : ""}${button("Закрыть","close")}</div>
    <details class="dp-demo-tools"><summary>Проверить другую сторону · демо</summary><p class="small">Посмотреть, как партнёр получает запрос и предлагает свои условия.</p>${button("Кабинет партнёра","counterparty")}</details></div>`);
}
function referralSnapshot() {
  return api.getReferrals?.().find(profile=>profile.id===partner().id) ||
    {clients:[],stats:{total:0,inWork:0,paidThrough:0}};
}
function partnerTabs(selected) {
  const count=referralSnapshot().clients.length;
  return `<div class="dp-tabs dp-partner-tabs" role="tablist" aria-label="Карточка партнёра">${[["terms","Условия","detail"],["clients",`Клиенты <span class="badge-count">${count}</span>`,"clients"]].map(([id,label,action])=>`<button type="button" role="tab" id="dp-partner-tab-${id}" aria-controls="dp-partner-content" aria-selected="${id===selected}" tabindex="${id===selected ? 0 : -1}" data-dp-action="${action}">${label}</button>`).join("")}</div>`;
}
function referredClientRows() {
  const v=current(), all=referralSnapshot().clients;
  const q=(v.clientQuery || "").trim().toLocaleLowerCase("ru");
  const rows=all.filter(client=>(!v.clientStatus || client.statusId===v.clientStatus) && `${client.name} ${client.certificate} ${client.status}`.toLocaleLowerCase("ru").includes(q));
  return `<p class="small muted">Найдено: ${rows.length}</p>${rows.length ? rows.map(client=>`<button type="button" class="dp-referral-row" data-dp-action="client:${esc(partner().id)}:${esc(client.id)}"><span><strong>${esc(client.name)}</strong><small>${esc(client.certificate)}</small></span><span class="dp-referral-status"><span class="pill">${esc(client.status)}</span><small>${esc(client.updated)}</small></span><span aria-hidden="true">›</span></button>`).join("") : `<div class="dp-referral-empty"><h3>${all.length ? "Клиенты не найдены" : "Клиентов пока нет"}</h3><p class="small">${all.length ? "Измените поиск или статус." : "Когда клиент обратится к партнёру по вашему сертификату, здесь появятся его статус и история."}</p>${all.length ? button("Сбросить фильтры","clients-reset") : ""}</div>`}`;
}
function referredClients() {
  dirty=false;
  const p=partner(), snapshot=referralSnapshot(), v=current();
  const statuses=[...new Map(snapshot.clients.map(client=>[client.statusId,client.status])).entries()];
  show(p.name,`${partnerTabs("clients")}<div id="dp-partner-content" role="tabpanel" aria-labelledby="dp-partner-tab-clients"><p class="dp-context">Клиенты по вашим сертификатам → ${esc(p.name)}</p>
    <div class="dp-referral-stats"><div><strong>${snapshot.stats.total}</strong><small>Клиентов</small></div><div><strong>${snapshot.stats.inWork}</strong><small>В работе</small></div><div><strong>${snapshot.stats.paidThrough}</strong><small>Дошли до оплаты</small></div></div>
    ${snapshot.clients.length ? `<div class="dp-referral-tools"><label><span class="sr-only">Поиск клиентов</span><input type="search" aria-label="Поиск клиентов" placeholder="Имя или номер сертификата" value="${esc(v.clientQuery || "")}" data-dp-client-search></label><label><span class="sr-only">Статус клиента</span><select aria-label="Статус клиента" data-dp-client-status><option value="">Все статусы</option>${statuses.map(([id,label])=>`<option value="${esc(id)}" ${v.clientStatus===id ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label></div>` : ""}
    <div data-dp-client-results>${referredClientRows()}</div><p class="small muted dp-referral-privacy">Только ваши направления. Внутренние заметки партнёра не видны.</p><div class="cp-actions">${p.active ? button("Создать сертификат","create",true) : ""}${button("Закрыть","close")}</div></div>`);
}
function referredClient(id) {
  const client=referralSnapshot().clients.find(client=>client.id===id);
  if (!client) return referredClients();
  dirty=false;
  show(client.name,`${button("Назад к клиентам","clients")}<p class="dp-context">${esc(partner().name)}</p><p>${esc(client.interest)}</p><dl class="dp-client-summary"><div><dt>Сертификат</dt><dd>${esc(client.certificate)}</dd></div><div><dt>Статус у партнёра</dt><dd><span class="pill">${esc(client.status)}</span></dd></div>${client.purchase ? `<div><dt>Покупка</dt><dd>${esc(client.purchase.amountLabel)}</dd></div>` : ""}</dl>${client.purchase ? `<p class="small muted">${esc(client.purchase.note)}</p>` : ""}
    <h3>История по сертификату</h3><ul class="ca-timeline dp-client-timeline">${client.timeline.length ? client.timeline.map(event=>`<li class="ca-tl-item"><span class="ca-tl-dot" aria-hidden="true"></span><div><time class="small muted" datetime="${esc(event.at)}">${esc(event.date)}</time><p>${esc(event.text)}</p></div></li>`).join("") : '<li class="small muted">Публичных событий пока нет.</li>'}</ul><p class="small muted">Без внутренних заметок партнёра. Только просмотр.</p>`);
}
function request() {
  const p = partner();
  if (p.active || p.pending) return details();
  p.status = "requested";
  current().notice = `Условия у «${p.name}» запрошены · демо`;
  api.refresh();
  details();
}
function counterparty() {
  const p = partner();
  dirty = false;
  show("Кабинет партнёра · демо",`<p class="dp-context">Вы смотрите от имени «${esc(p.name)}»</p>
    <h3>${["Магазин","Компания"].includes(p.type) ? "Нас рекомендуют" : "Меня рекомендуют"}</h3><div class="dp-counterparty"><b>${esc(me())}</b><p>${p.active ? "Рекомендует вас по согласованным условиям." : p.pending ? "Рассматривает ваше предложение. Принять его может только другая сторона." : "Запрашивает условия, чтобы направлять к вам своих клиентов."}</p></div>
    ${p.active ? terms(p.active) : ""}${p.pending ? `<div class="cp-pending"><h3>Ожидает ответа</h3>${terms(p.pending)}</div>` : ""}
    <div class="cp-actions">${!p.pending ? button(p.active ? "Предложить новые условия" : "Предложить условия","offer",true) : button("Отозвать предложение","withdraw")}${button("Вернуться в мой кабинет","return")}</div>`);
}
function offer() {
  const p = partner();
  draft = clone(p.active || p.offered || factoryTerms());
  dirty = false;
  show("Условия приёма клиентов",`<p class="dp-context">Принимает ${esc(p.name)} · предлагает ${esc(p.name)}</p><form id="dp-offer-form" novalidate>
    <div class="dp-form-grid"><label>Срок скидки, дней<input name="days" type="number" min="1" max="3650" step="1" required value="${draft.days}"></label><label>Покупок<input name="operations" type="number" min="1" max="10000" step="1" required value="${draft.operations}"></label></div>
    <h3>Общий процент по категориям</h3><p class="small">На скидку клиенту и бонус рекомендателю.</p>
    ${invitationRates(draft.rates,"dp-offer")}
    <details class="dp-restrictions"><summary>Ограничения</summary><label>Минимальная покупка, ₽<input name="minimum" type="number" min="0" step="1" value="${draft.minimum}"></label><label class="dp-check"><input type="checkbox" name="promotions" ${draft.promotions ? "checked" : ""}> Суммируется с другими скидками</label><label>Исключения<textarea name="exclusions" maxlength="500" rows="2">${esc(draft.exclusions)}</textarea></label></details>
    <p class="dp-error" id="dp-error" role="alert"></p><div class="cp-actions"><button class="btn primary" type="submit">Предложить условия</button>${button("Отмена","cancel-offer")}</div></form>`);
}
function review() {
  const p = partner();
  if (!p.pending) return details();
  dirty = false;
  show("Условия партнёра",`<p class="dp-context">Вы направляете клиентов → ${esc(p.name)}</p><h3>${esc(p.name)} предлагает</h3>${terms(p.pending)}
    ${p.active ? `<p class="small">До согласования действуют прежние условия. Выпущенные сертификаты не изменятся.</p>` : `<p class="small">После принятия вы сможете выпускать сертификаты к этому партнёру.</p>`}
    <div class="cp-actions">${button("Принять условия","accept",true)}${button("Отклонить","decline")}${button("Решить позже","close")}</div>`);
}
function picker() {
  dirty = false;
  show("К кому направить клиента?",`<p>Выберите принимающего партнёра.</p><div class="dp-picker">${current().partners.map(p=>`<div class="dp-picker-row"><div><b>${esc(p.name)}</b><p class="small">${p.active ? summary(p.active) : status(p)}</p></div>${button("Выбрать",`create:${p.id}`,true,p.active ? "" : 'disabled aria-disabled="true"')}${!p.active ? button(p.pending ? "Посмотреть условия" : p.status === "requested" ? "Запрос отправлен" : "Запросить условия",`${p.pending ? "review" : p.status === "requested" ? "detail" : "request"}:${p.id}`) : ""}</div>`).join("")}</div>`);
}
function create() {
  const p = partner();
  if (!p.active) return details();
  dirty = false;
  show("Создать сертификат",`<p class="dp-context">Ваш клиент → ${esc(p.name)}</p><form id="dp-create-form" novalidate>
    <label>Клиент<input name="client" maxlength="100" placeholder="Имя или пометка" autocomplete="off" required></label>
    <div class="dp-fixed-terms"><b>${summary(p.active)}</b><span class="small">Условия принимающего партнёра</span></div>
    ${p.active.rates.map((r,i)=>r.isExcluded ? "" : `<div class="dp-allocation"><label class="dp-check"><input type="checkbox" name="category-${i}" data-dp-category="${i}" checked> ${esc(r.name)}</label><label>Скидка клиенту, %<input name="discount-${i}" aria-label="${esc(r.name)}, скидка клиенту" type="number" min="0" max="${r.rate}" step="0.1" value="${Math.min(5,r.rate)}" data-dp-discount="${i}"></label><span class="dp-bonus" data-dp-bonus="${i}">Ваш бонус ${Math.round((r.rate-Math.min(5,r.rate))*10)/10}%</span></div>`).join("")}
    <details class="dp-restrictions"><summary>Ограничения</summary><p>${p.active.promotions ? "Суммируется" : "Не суммируется"} с другими скидками. ${esc(p.active.exclusions)}</p>${p.active.minimum ? `<p>Минимальная покупка ${p.active.minimum} ₽</p>` : ""}</details>
    <p class="dp-error" id="dp-error" role="alert"></p><div class="cp-actions"><button class="btn primary" type="submit">Создать образец</button>${button("Назад","back-picker")}</div></form>`);
}
function issued(index) {
  const p = partner(), cert = p.issued[index];
  if (!cert) return details();
  dirty = false;
  show("Образец сертификата",`<article class="dp-certificate"><div class="dp-certificate-top"><b>remcard.</b><span>Образец · не действует</span></div><p>Для ${esc(cert.client)}</p><h3>${esc(p.name)}</h3><div class="dp-certificate-offers">${cert.offers.map(r=>`<div><span>${esc(r.name)}</span><strong>${r.discount}%</strong></div>`).join("")}</div><p>${summary(cert.policy)} · до ${cert.expires}</p></article>
    <p class="small">Это сохранённый образец. Последующие изменения условий его не меняют.</p><details class="dp-restrictions"><summary>Условия образца</summary>${terms(cert.policy,false)}</details>
    <div class="cp-actions">${button("Готово","close",true)}${button("Создать ещё","create")}</div>`);
}
function guard(next) {
  if (!dirty) return next();
  pendingExit = next;
  const root = document.querySelector("[data-dp-modal]");
  if (!root || root.querySelector("[data-dp-discard]")) return;
  root.insertAdjacentHTML("afterbegin",`<section class="cp-pending" role="alertdialog" aria-label="Несохранённые изменения" data-dp-discard><h3>Изменения не сохранены</h3><div class="cp-actions">${button("Продолжить редактирование","keep",true)}${button("Выйти без сохранения","discard")}</div></section>`);
  root.querySelector('[data-dp-action="keep"]').focus();
  document.getElementById("role-dialog").scrollTop=0;
}
export function initDirectionalPartners(context) {
  api = context;
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape") {
      const tip=document.querySelector(".dp-cooperation-state[data-tip-open],.dp-cooperation-state:hover,.dp-cooperation-state:focus-within");
      if(tip && !tip.hasAttribute("data-tip-dismissed")) {
        event.preventDefault();event.stopImmediatePropagation();
        tip.removeAttribute("data-tip-open");tip.setAttribute("data-tip-dismissed","");
        tip.querySelector("[data-dp-tip]")?.blur();return;
      }
    }
    const partnerTab=event.target.closest(".dp-partner-tabs [role=tab]");
    if (partnerTab && ["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) {
      event.preventDefault();
      const next=event.key==="Home" ? "terms" : event.key==="End" ? "clients" : partnerTab.id.endsWith("terms") ? "clients" : "terms";
      next==="terms" ? details() : referredClients();
      document.getElementById(`dp-partner-tab-${next}`)?.focus();return;
    }
    const tab=event.target.closest('[data-dp-action^="tab:"]');
    if (!tab || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    current().tab = event.key==="Home" ? "in" : event.key==="End" ? "out" : current().tab==="in" ? "out" : "in";
    api.refresh();
    document.getElementById(`dp-tab-${current().tab}`)?.focus();
  });
  document.addEventListener("pointerover",event=>{
    const tip=event.target.closest(".dp-cooperation-state");
    if(tip && !tip.contains(event.relatedTarget)) tip.removeAttribute("data-tip-dismissed");
  });
  document.addEventListener("focusin",event=>{
    event.target.closest(".dp-cooperation-state")?.removeAttribute("data-tip-dismissed");
  });
  document.addEventListener("click",event=>{
    const tipButton=event.target.closest("[data-dp-tip]");
    document.querySelectorAll(".dp-cooperation-state[data-tip-open]").forEach(tip=>{
      if(tip!==tipButton?.closest(".dp-cooperation-state")) tip.removeAttribute("data-tip-open");
    });
    if(tipButton) {
      event.preventDefault();event.stopImmediatePropagation();
      const tip=tipButton.closest(".dp-cooperation-state"),open=tip.hasAttribute("data-tip-open");
      tip.toggleAttribute("data-tip-open",!open);tip.toggleAttribute("data-tip-dismissed",open);return;
    }
    if (roles.has(api.getRole()) && event.target.closest('[data-action="action:recommend"],[data-action="wf-prof-rec-create"]')) {
      event.preventDefault();event.stopImmediatePropagation();current().directoryOrigin=false;picker();return;
    }
    const el=event.target.closest("[data-dp-action]");
    const close=event.target.closest('[data-action="close-dialog"]');
    if (close && document.querySelector("[data-dp-modal]") && dirty) {
      event.preventDefault();event.stopImmediatePropagation();guard(()=>api.close());return;
    }
    if (!el) return;
    event.preventDefault();event.stopImmediatePropagation();
    const [action,id,index]=el.dataset.dpAction.split(":");
    if(el.closest('[data-testid="directional-partners"]')) current().directoryOrigin=false;
    if (id && action!=="tab") {
      if (current().selected!==id) {current().clientQuery="";current().clientStatus="";}
      current().selected=id;
    }
    if(action==="directory-out") {current().directoryOrigin=true;return partner().pending ? review() : partner().status==="requested" ? details() : request();}
    if(action==="directory-terms") {current().directoryOrigin=true;return directoryTerms(index);}
    if(action==="directory-in" || action==="incoming-return") {current().directoryOrigin=true;return incomingInvitation();}
    if(action==="directory-back") return guard(()=>api.openDirectory?.());
    if(action==="incoming-send") {
      document.getElementById("dp-incoming-form")?.requestSubmit();return;
    }
    if(action==="incoming-withdraw") {if(api.getRole()==="agent")return;partner().incomingPending=null;api.refresh();return incomingInvitation();}
    if(action==="incoming-review") return incomingReview();
    if(action==="incoming-accept" || action==="incoming-decline") {
      const p=partner();
      if(api.getRole()==="agent" || !p.incomingPending || !document.querySelector('[data-dp-action="incoming-accept"]')) return;
      if(action==="incoming-accept") {p.incoming=true;p.incomingTerms=clone(p.incomingPending);acceptReceivingPolicy(p.id,p.incomingTerms);}
      p.incomingPending=null;api.refresh();return api.openDirectory?.();
    }
    if (action==="keep") {document.querySelector("[data-dp-discard]")?.remove();pendingExit=null;return;}
    if (action==="discard") {dirty=false;document.querySelector("[data-dp-discard]")?.remove();const next=pendingExit;pendingExit=null;next?.();return;}
    if (action==="tab") {current().tab = api.getRole()==="agent" ? "out" : id;current().notice="";api.refresh();document.getElementById(`dp-tab-${current().tab}`)?.focus({preventScroll:true});return;}
    if (action==="reset") {
      show("Сбросить пример?",`<p>Условные предложения и образцы сертификатов этого кабинета будут сброшены. Рабочие данные RemCard не затрагиваются.</p><div class="cp-actions">${button("Сбросить","confirm-reset",true)}${button("Отмена","close")}</div>`);return;
    }
    if (action==="confirm-reset") {views.delete(api.getRole());api.resetSamples?.();dirty=false;api.close();api.refresh();return;}
    if (action==="own") {api.openOwn();return;}
    if (action==="close") {guard(()=>api.close());return;}
    if (action==="cancel-offer") {guard(counterparty);return;}
    if (action==="back-picker") {guard(picker);return;}
    if (action==="return") {guard(()=>{api.close();api.refresh();if(current().directoryOrigin) api.openDirectory?.();});return;}
    if (action==="request") return request();
    if (action==="detail") return details();
    if (action==="clients") return referredClients();
    if (action==="client") return referredClient(index);
    if (action==="clients-reset") {current().clientQuery="";current().clientStatus="";return referredClients();}
    if (action==="counterparty") return counterparty();
    if (action==="offer") return offer();
    if (action==="review") return review();
    if (action==="picker") return picker();
    if (action==="create") return create();
    if (action==="issued") return issued(Number(index));
    if (action==="withdraw") {
      const p=partner();p.pending=null;p.status=p.active ? "active" : "requested";api.refresh();return counterparty();
    }
    if (action==="accept" || action==="decline") {
      const p=partner();if (!p.pending) return;
      if (action==="accept") {p.active=clone(p.pending);p.status="active";}
      else p.status=p.active ? "active" : "rejected";
      p.pending=null;current().notice=action==="accept" ? `Условия «${p.name}» приняты` : p.active ? "Предложение отклонено. Прежние условия сохранены." : "Предложение отклонено. Для сертификата нужны согласованные условия.";
      api.close();api.refresh();
      if(current().directoryOrigin) api.openDirectory?.();
    }
  },true);
  document.addEventListener("input",event=>{
    const el=event.target;
    if (el.matches("[data-dp-client-search]")) {current().clientQuery=el.value;document.querySelector("[data-dp-client-results]").innerHTML=referredClientRows();return;}
    if (el.closest("#dp-offer-form,#dp-create-form,#dp-incoming-form")) dirty=true;
    if (el.matches("[data-dp-discount]")) {
      const i=Number(el.dataset.dpDiscount),left=partner().active.rates[i].rate-Number(el.value);
      document.querySelector(`[data-dp-bonus="${i}"]`).textContent=el.value!=="" && left>=0 && Number(el.value)>=0 ? `Ваш бонус ${Math.round(left*10)/10}%` : "Проверьте скидку";
    }
  });
  document.addEventListener("change",event=>{
    const el=event.target;
    if (el.matches("[data-dp-client-status]")) {current().clientStatus=el.value;document.querySelector("[data-dp-client-results]").innerHTML=referredClientRows();return;}
    if (el.closest("#dp-offer-form,#dp-create-form,#dp-incoming-form")) dirty=true;
    if (el.matches("[data-dp-category]")) {
      const index=el.dataset.dpCategory;
      document.querySelector(`[name="discount-${index}"]`).disabled=!el.checked;
    }
  });
  document.addEventListener("submit",event=>{
    const form=event.target;
    if (!["dp-offer-form","dp-create-form","dp-incoming-form"].includes(form.id)) return;
    event.preventDefault();event.stopImmediatePropagation();
    const data=new FormData(form),p=partner(),error=form.querySelector("#dp-error");
    if (form.id==="dp-offer-form" || form.id==="dp-incoming-form") {
      const incoming=form.id==="dp-incoming-form",next=policyFromForm(form,draft);
      if(incoming && (api.getRole()==="agent" || p.incoming || p.incomingPending)) return;
      if (!validPolicyForm(form,next,incoming)) {
        error.textContent=`Проверьте срок, число покупок, сумму и проценты от ${incoming ? "0" : "0,1"} до 100.`;return;
      }
      if(incoming) {p.incomingPending=clone(next);p.incomingInvitationComment=String(data.get("invitationComment")||"").trim();dirty=false;api.refresh();incomingInvitation();return;}
      p.pending=clone(next);p.offered=clone(next);p.status="proposed";dirty=false;api.refresh();counterparty();
    } else {
      if (!p.active) return details();
      const client=String(data.get("client")||"").trim();
      const offers=p.active.rates.flatMap((r,i)=>!r.isExcluded&&data.has(`category-${i}`) ? [{name:r.name,discount:Number(data.get(`discount-${i}`)),raw:data.get(`discount-${i}`),pool:r.rate}] : []);
      if (!client || !offers.length || offers.some(r=>r.raw===""||!Number.isFinite(r.discount)||r.discount<0||r.discount>r.pool||Math.abs(r.discount*10-Math.round(r.discount*10))>1e-8)) {
        error.textContent="Укажите клиента, хотя бы одну категорию и скидку в пределах общего процента.";return;
      }
      const date=new Date();date.setDate(date.getDate()+p.active.days);
      p.issued.push({client,policy:clone(p.active),expires:date.toLocaleDateString("ru-RU"),offers:offers.map(({raw,...r})=>r)});
      api.created?.(p,p.issued[p.issued.length-1]);
      dirty=false;api.refresh();issued(p.issued.length-1);
    }
  },true);
  const dialog=document.getElementById("role-dialog");
  dialog.addEventListener("cancel",event=>{
    if (!dialog.querySelector("[data-dp-modal]") || !dirty) return;
    event.preventDefault();event.stopImmediatePropagation();guard(()=>api.close());
  },true);
  dialog.addEventListener("close",()=>{
    if(dialog.open) return;
    dialog.classList.remove("dp-dialog");dirty=false;
    if(dialog.querySelector('[data-testid="certificate-policy"]')) api.refresh();
  });
}
