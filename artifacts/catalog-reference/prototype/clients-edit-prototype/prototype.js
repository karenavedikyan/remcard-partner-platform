// Page 149: three ways to edit incoming appeals. Demo only, with in-memory data.
const $ = (s, root = document) => root.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const offerDemo = window.RCOfferDemo;
const paths = {
  home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-6h6v6"/>', users:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-16a3 3 0 0 1 0 6m0 4a4 4 0 0 1 4 4v2"/>',
  ticket:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 6v3m0 2v2m0 2v3"/>', link:'<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>', moon:'<path d="M20 15A8 8 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>', bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  rotate:'<path d="M4 12a8 8 0 1 1 3 6m-3-6V5m0 7h7"/>', edit:'<path d="m15 5 4 4M4 20l4-.8L20 8a2.8 2.8 0 0 0-4-4L4.8 16Z"/>',
  right:'<path d="m9 6 6 6-6 6"/>', left:'<path d="m15 6-6 6 6 6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', check:'<path d="m5 12 4 4L19 6"/>',
  paperclip:'<path d="M21 11.5 12 20.5a5 5 0 0 1-7-7l9-9a3 3 0 0 1 4.2 4.2L9 18a1 1 0 0 1-1.4-1.4l8-8"/>',
  photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18h1.4a1.7 1.7 0 0 0 1.2-2.9 1.7 1.7 0 0 1 1.2-2.9h1.7A3.5 3.5 0 0 0 21 11.7 8.8 8.8 0 0 0 12 3Z"/><path d="M7.5 12h.01M9 7.5h.01m5 0h.01m3 3.5h.01" stroke-width="2.6"/>',
  phone:'<path d="M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 20 4 14 3 5a2 2 0 0 1 2-2Z"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
document.querySelectorAll("[data-icon]").forEach(e => e.innerHTML = icon(e.dataset.icon));
const variants = [
  ["A","Боковая панель","Рекомендованный вариант","Нажмите на карандаш у запроса или выберите несколько строк. Список остаётся на месте."],
  ["B","В строке","Редактирование в реестре","Откройте форму прямо под нужной строкой. Удобно, когда важно видеть соседние обращения."],
  ["C","Рабочая очередь","Последовательная обработка","Список и карточка рядом. «Сохранить и далее» открывает следующее доступное обращение по текущему фильтру."]
];
const names = ["Алексей Р.","Марина С.","Илья П.","Софья А.","Дмитрий Н.","Ольга В.","Виктор К.","Анна Т.","Никита Е.","Ирина Л.","Сергей Д.","Елена Г.","Павел Ф.","Вера О.","Максим Ш.","Наталья Б.","Артём У.","Лидия Я."];
const titles = ["Подбор дверей для квартиры","Замена межкомнатных дверей","Комплект для ремонта","Замер на объекте","Ламинат для спальни","Консультация по материалам","Заказ для новостройки","Отделка прихожей","Двери для офиса","Отделка дачи","Подбор напольного покрытия","Замер в студии","Расчёт сметы","Комплект для кухни","Двери в частный дом","Материалы для гостиной","Отделка балкона","Уточнение комплектации"];
const assignees = ["Мария","Иван","Анна"];
const labelRole = {owner:"Владелец",staff:"Мария",viewer:"Наблюдатель"};
const makeDefinitions = () => [{key:"ext1",name:"Номер заказа в 1С"}];
let customFields=makeDefinitions(), nextField=2, settingsKey=null;
const sourceKinds = ["Направил партнёр","Вручную","Сертификат","Звонок"];
const makeSourceCatalog = () => [
  {id:"referral",name:"Рекомендация"},{id:"telegram",name:"Telegram"},
  {id:"website",name:"Сайт"},{id:"advertising",name:"Реклама"},{id:"offline",name:"Офлайн"}
];
let sourceCatalog=makeSourceCatalog(), nextSource=1, renameSourceId="";
const isManual = r => r.source==="Вручную";
const channelName = id => sourceCatalog.find(x=>x.id===id)?.name;
const sourceName = r => isManual(r) ? channelName(r.sourceId)||"Вручную · не указан" : r.source;
const makeRows = () => names.map((name,i) => ({
  id:String(2401+i),title:titles[i],name:String(2401+i)===offerDemo.appealId?offerDemo.name:name,clientId:String(2401+i)===offerDemo.appealId?offerDemo.clientId:"",
  request:["","Межкомнатные двери, 4 шт.","","Замер и установка","Ламинат для квартиры",""][i%6],
  source:sourceKinds[i%4],sourceId:({5:"telegram",9:"referral",13:"website"})[i]||"", assignee:String(2401+i)===offerDemo.appealId?"Мария":["","Мария","Иван","Анна","Мария",""][i%6],
  certificate:i%4===0 || i%4===2?`RC-2026-${String(128+i).padStart(5,"0")}`:"",
  branch:i%4===3 && String(2401+i)!==offerDemo.appealId?"Центральный":"Северный",state:["Новое","В работе","Новое","В работе","Оплачено","Новое"][i%6],
  author:i%6===0?"Мария":i%3===0?"Иван":"Анна", city:"",contact:"",note:"",
  custom:i%3===0?{ext1:`ЗК-000${128+i}`}:{},log:[]
}));
const formNames = {title:"Название обращения",name:"Имя клиента",request:"Запрос",city:"Город",contact:"Контакт",assignee:"Ответственный",note:"Внутренняя заметка"};
let rows = makeRows(), selected = new Set(), role = "owner", active = null, returnFocus = null, toastTimer, undoAction;
let variant = Math.max(0, variants.findIndex(v => v[0] === new URLSearchParams(location.search).get("variant")));
let bulk = {field:"request", mode:"empty", value:"", review:false};
const dialog = $("#dialog"), queue = $("#queue");
const offerDialog = $("#offer-dialog"), readOffers=new Set();
const phoneProfileDialog=$("#partner-phone-dialog");
const makeProfilePhones=()=>[
  {id:"phone-1",label:"Основной",number:"+70000000001"},
  {id:"phone-2",label:"Отдел продаж",number:"+70000000002"}
];
let profilePhones=makeProfilePhones(),profilePhoneDraft=[],nextProfilePhone=3,phoneProfileOpener=null;
let offers=[], offerDraft=null, offerEntry=null, previewEntry=null, offerSequence=0, offerChannels=[...offerDemo.channels], openOfferId="", clientTab="offers";
const canEdit = r => role === "owner" || (role === "staff" && r.branch === "Северный" && (r.author === "Мария" || r.assignee === "Мария"));
const normalize = v => String(v ?? "").toLocaleLowerCase("ru-RU").replaceAll("ё","е").replace(/[‐‑‒–—−]/g,"-").trim();
const sourceMatches = (r,filter) => !filter || (filter==="manual:all" ? isManual(r) :
  filter==="manual:none" ? isManual(r) && !r.sourceId :
  filter.startsWith("manual:") ? isManual(r) && filter===`manual:${r.sourceId}` : filter===`auto:${r.source}`);
const visible = ({ignoreAccount=false}={}) => {
  const q = normalize($("#search").value).split(/\s+/).filter(Boolean), branch = $("#branch").value, missing = $("#missing").value;
  const source=$("#source-filter").value, remcardOnly=!ignoreAccount&&$("#remcard-only").checked;
  const field=$("#custom-filter-field").value, value=normalize($("#custom-filter-value").value), mode=$("#custom-filter-mode").value;
  return rows.filter(r => {
    const data=normalize(r.custom[field]);
    const fields=[...Object.keys(formNames).map(k=>r[k]),r.id,r.clientId,r.certificate,r.source,sourceName(r),r.branch,r.state,r.author,...Object.values(r.custom)].map(normalize);
    return (!remcardOnly||!!r.clientId) && q.every(word=>fields.some(x=>x.includes(word))) &&
    (!branch || r.branch === branch) && (!missing || (missing === "empty" ? !r.request : !!r.request)) && sourceMatches(r,source) &&
    (!field || ((!value || data.includes(value)) && (!mode || (mode==="empty"?!data:!!data))));
  });
};
const chosen = () => rows.filter(r=>selected.has(r.id));
const tip = (msg,undo=null) => { clearTimeout(toastTimer);undoAction=undo; const t=$("#toast"); t.hidden=false;t.textContent=msg;if(undo)t.insertAdjacentHTML("beforeend",'<button type="button" class="text-button" data-act="undo">Отменить</button>');else toastTimer=setTimeout(()=>t.hidden=true,3300); };
const rowsById = id => rows.find(r=>r.id===id);
const audit = text => `${new Date().toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"})} · ${labelRole[role]}: ${text}`;
const copyLabel = kind => kind==="registration"?" Пригласить клиента":" Скопировать";
const copyButton = (kind,caption,showLabel=false,disabled=false) => `<button class="${showLabel?"secondary":"number-copy"}" type="button" data-copy="${kind}" aria-label="Скопировать: ${esc(caption)}" title="Скопировать: ${esc(caption)}" ${disabled?"disabled":""}>${icon("copy")}${showLabel?copyLabel(kind):""}</button><span class="sr-only" role="status"></span>`;
async function copyNumber(button) {
  const value=button.parentElement.querySelector("[data-copy-value]");
  const number=(value?.matches("input")?value.value:value?.textContent)?.trim();
  if(!number)return;
  let copied=false;
  try{await navigator.clipboard.writeText(number);copied=true;}catch{
    const input=document.createElement("textarea");
    input.value=number;input.className="copy-fallback";input.readOnly=true;
    (dialog.open?dialog:document.body).append(input);input.select();
    try{copied=document.execCommand("copy");}catch{}
    input.remove();button.focus({preventScroll:true});
  }
  if(!copied){
    if(button.dataset.copy==="registration")value.hidden=false;
    const selection=window.getSelection();
    if(value.matches("input")&&!value.disabled){value.focus();value.select();}
    else if(!value.matches("input") && selection){
      const range=document.createRange();
      range.selectNodeContents(value);
      selection.removeAllRanges();selection.addRange(range);
    } else { const manual=document.createElement("input");manual.readOnly=true;manual.value=number;manual.setAttribute("aria-label","Номер для ручного копирования");button.before(manual);manual.focus();manual.select(); }
    button.nextElementSibling.textContent="Значение выделено. Скопируйте его вручную.";
    return;
  }
  const live=button.nextElementSibling;
  const confirmation=button.dataset.copy==="registration"?"Ссылка скопирована":"Скопировано";
  live.textContent=confirmation;
  const label=button.classList.contains("secondary");
  button.classList.add("copied");button.innerHTML=icon("check")+(label?` ${confirmation}`:"");
  setTimeout(()=>{if(button.isConnected){button.classList.remove("copied");button.innerHTML=icon("copy")+(label?copyLabel(button.dataset.copy):"");live.textContent="";}},1700);
}
function syncFieldFilter() {
  const select=$("#custom-filter-field"), value=select.value;
  select.innerHTML=customFields.map(x=>`<option value="${x.key}">${esc(x.name)}</option>`).join("");
  if(customFields.some(x=>x.key===value))select.value=value;
  $("#one-c-heading").textContent=oneCLabel();
}
function syncSourceFilter() {
  const select=$("#source-filter"),previous=select.value;
  select.innerHTML=`<option value="">Все источники</option>
    <optgroup label="Ручной ввод"><option value="manual:all">Все внесённые вручную</option><option value="manual:none">Вручную · не указан</option>${sourceCatalog.map(x=>`<option value="manual:${x.id}">${esc(x.name)}</option>`).join("")}</optgroup>
    <optgroup label="Автоматические">${sourceKinds.filter(x=>x!=="Вручную").map(x=>`<option value="auto:${esc(x)}">${esc(x)}</option>`).join("")}</optgroup>`;
  if([...select.options].some(x=>x.value===previous))select.value=previous;
}
const oneCLabel = () => customFields.find(f=>f.key==="ext1").name;
const inviteClient = () => `<div class="invite-client"><a data-copy-value href="${esc(offerDemo.registerUrl)}" target="_blank" rel="noopener noreferrer" hidden>${esc(offerDemo.registerUrl)}</a><button class="secondary" type="button" data-copy="registration" title="Скопировать ссылку на регистрацию">${icon("copy")}${copyLabel("registration")}</button><span class="sr-only" role="status"></span></div>`;
const numberCell = (key,value,caption) => `<div class="cell number-cell ${key}-cell"><span class="number-label">${esc(caption)}</span><div class="number-content">${value?`<span class="number-value" data-copy-value>${esc(value)}</span>${copyButton(key,caption)}`:`<span class="muted" aria-label="Не указан">—</span>`}</div></div>`;
const statusClass = {"Новое":"is-new","В работе":"is-progress","Оплачено":"green"};
const appealStatus = state => `<span class="appeal-status pill ${statusClass[state]||""}"><span class="sr-only">Статус: </span>${esc(state)}</span>`;
const fieldPencil = (r,key) => canEdit(r)?`<button type="button" class="icon-button edit-icon" data-open="${r.id}" data-focus="${key}" aria-label="${key==="title"?"Изменить название обращения":"Изменить запрос"}: ${esc(r.title)}" title="${key==="title"?"Изменить название":"Изменить запрос"}">${icon("edit")}</button>`:"";
function render() {
  const remcardOnly=$("#remcard-only").checked, matches=visible({ignoreAccount:true});
  const linked=matches.filter(r=>r.clientId), list=remcardOnly?linked:matches;
  const eligible=list.filter(canEdit), all=eligible.length>0 && eligible.every(r=>selected.has(r.id));
  $("#remcard-filter-count").textContent=linked.length;
  $("#count").textContent=`${list.length} из ${rows.length}`;
  $("#select-head").innerHTML = eligible.length ? `<label class="select-all"><input type="checkbox" id="select-all" aria-label="Выбрать все доступные строки" ${all?"checked":""}></label>` : "";
  const head=$("#select-all"); if(head) head.indeterminate=!all && eligible.some(r=>selected.has(r.id));
  $("#rows").innerHTML = list.map(r=>`<article class="entry row ${active===r.id?"active":""}" data-row="${r.id}">
    <span class="check">${canEdit(r)?`<input type="checkbox" data-select="${r.id}" aria-label="Выбрать: ${esc(r.name)}" ${selected.has(r.id)?"checked":""}>`:`<span class="muted" title="Только просмотр">${icon("lock")}</span>`}</span>
    <div class="cell name-cell"><div class="title-line"><button class="name-button" type="button" data-open="${r.id}" data-default-focus="title">${esc(r.title)}</button>${fieldPencil(r,"title")}</div><small class="row-client-meta">${esc(r.name)} · № ${r.id} · ${esc(r.branch)}</small></div>
    <div class="cell row-state">${appealStatus(r.state)}</div>
    <div class="cell request">${r.request?`<span class="request-title">${esc(r.request)}</span>`:`<span class="request-title muted">Не указан</span>`}${fieldPencil(r,"request")}</div>
    ${numberCell("certificate",r.certificate,"№ сертификата")}${numberCell("one-c",r.custom.ext1,oneCLabel())}
    <div class="cell row-source"><span class="source-caption">Источник: </span><span>${esc(sourceName(r))}</span>${isManual(r)&&canEdit(r)?`<button type="button" class="icon-button edit-icon" data-open="${r.id}" data-focus="sourceId" aria-label="Изменить источник: ${esc(r.title)}" title="Изменить источник">${icon("edit")}</button>`:""}</div><div class="cell row-assignee">${esc(r.assignee || "Не назначен")}</div>
    <div class="row-account">${r.clientId?`<span class="row-remcard-indicator" title="У клиента есть личный кабинет RemCard">${icon("check")}<span>Есть в RemCard</span></span>`:""}</div>
    <button type="button" class="icon-button row-action" data-open="${r.id}" aria-label="Открыть обращение ${r.id}">${icon("right")}</button>
  </article>${variant===1 && active===r.id?`<div class="inline-editor">${editor(r)}</div>`:""}`).join("") || `<div class="empty">${remcardOnly?"Нет клиентов с RemCard по этим фильтрам.":"Нет обращений по этим фильтрам."} Измените поиск или снимите фильтры.</div>`;
  const bar=$("#bulk-bar");
  bar.hidden=!selected.size;
  bar.innerHTML=selected.size?`<strong>Выбрано: ${selected.size}</strong><div><button type="button" class="secondary" data-act="clear">Снять выбор</button><button type="button" class="primary" data-act="bulk">${icon("edit")} Изменить выбранные</button></div>`:"";
  queue.classList.toggle("hidden",variant!==2||!active);
  const r=rowsById(active);
  if(variant===2 && r) {
    const q=visible(),i=q.findIndex(x=>x.id===r.id);
    queue.innerHTML=`<div class="queue-nav"><strong>Обращение ${i+1} из ${q.length}</strong><div class="form-actions"><button class="icon-button" type="button" data-act="queue-prev" aria-label="Предыдущее обращение" ${i<=0?"disabled":""}>${icon("left")}</button><button class="icon-button" type="button" data-act="queue-next" aria-label="Следующее обращение" ${i===q.length-1?"disabled":""}>${icon("right")}</button></div></div>${editor(r)}`;
  } else queue.innerHTML="";
}
function field(name,content) { return `<label><span>${formNames[name]}</span>${content}</label>`; }
const input = (r,k,max) => `<input name="${k}" value="${esc(r[k])}" maxlength="${max}" ${["name","title"].includes(k)?"required":""}>`;
const assigneeOptions = current => `<option value="">Не назначен</option>${assignees.map(x=>`<option ${x===current?"selected":""}>${x}</option>`).join("")}`;
function editor(r) {
  const edit=canEdit(r), hasNext=nextEditable(r)!==null;
  return `<form class="editor" data-single="${r.id}">
    <header class="editor-head"><div><div class="queue-kicker">${edit?"РЕДАКТИРОВАНИЕ":"ТОЛЬКО ПРОСМОТР"}</div><h2 id="form-title">${esc(r.title)}</h2><div class="editor-status">${appealStatus(r.state)}</div><p>${esc(r.name)} · № ${r.id} · ${r.branch}</p></div>
    <button class="icon-button" type="button" data-act="close" aria-label="Закрыть">${icon("close")}</button></header>
    <div class="editor-body">
    <section class="appeal-client-box" aria-label="Клиент RemCard"><div class="certificate-summary"><span>ID клиента RemCard</span><strong data-copy-value>${esc(r.clientId || "Нет ID")}</strong>${r.clientId?copyButton("client-id","ID клиента RemCard"):""}</div>
    ${edit?(r.clientId?`<button type="button" class="secondary" data-offer-for="${r.id}" title="Отправить коммерческое предложение">Отправить КП</button>`:inviteClient()):""}</section>
    <div class="certificate-summary"><span>Номер сертификата RemCard</span><strong data-copy-value>${esc(r.certificate || "Не привязан")}</strong>${r.certificate?copyButton("certificate","Номер сертификата RemCard",true):""}</div>
    ${!edit?`<p class="review">У этой роли нет права редактировать обращение.</p>`:""}
    <fieldset ${edit?"":"disabled"} class="edit-fields">
      ${field("title",input(r,"title",120))}
      ${field("request",`<textarea name="request" maxlength="200" placeholder="Например, двери и замер">${esc(r.request)}</textarea>`)}
      ${isManual(r)&&edit?`<label><span>Источник обращения</span><select name="sourceId"><option value="">Не указан</option>${sourceCatalog.map(x=>`<option value="${x.id}" ${x.id===r.sourceId?"selected":""}>${esc(x.name)}</option>`).join("")}</select><small class="source-note">Обращение внесено вручную</small></label>`:`<div class="source-readonly"><span>Источник обращения</span><strong>${esc(sourceName(r))}</strong>${isManual(r)?"":'<small class="source-note">Определён автоматически</small>'}</div>`}
      <div class="field-grid">${field("name",input(r,"name",120))}${field("assignee",`<select name="assignee">${assigneeOptions(r.assignee)}</select>`)}${field("city",input(r,"city",70))}${field("contact",input(r,"contact",80))}</div>
      ${field("note",`<textarea name="note" maxlength="500" placeholder="Только для вашей команды">${esc(r.note)}</textarea>`)}
    </fieldset>
    <section class="custom-fields" aria-label="Поля партнёра"><strong>Поля партнёра</strong><div class="field-grid">${customFields.map(x=>`<div class="custom-value-field"><label><span>${esc(x.name)}</span><input name="${x.key}" value="${esc(r.custom[x.key])}" ${edit?"":"readonly"} maxlength="100" placeholder="${x.key==="ext1"?"Например, ЗК-000128":"Введите значение"}" data-copy-value></label>${copyButton(x.key,x.name,false,!r.custom[x.key])}</div>`).join("")}</div><p class="help">Эти номера не заменяют № ${r.id} в RemCard.</p></section>
    <p class="help">Создал: ${esc(r.author)}. Статус здесь не меняется.</p>
    <details class="history"><summary>История изменений · ${r.log.length}</summary>${r.log.length?`<ul>${r.log.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"<p>Пока изменений нет.</p>"}</details>
    </div>
    ${edit ? `<footer class="editor-foot"><div class="form-actions"><button type="button" class="secondary" data-act="close">Отмена</button>${variant===2?`<button type="submit" class="secondary" name="next" value="yes" ${hasNext?"":"disabled"}>Сохранить и далее</button>`:""}<button type="submit" class="primary">Сохранить</button></div></footer>`:""}
  </form>`;
}
function nextEditable(r) {
  const list=visible();return list.slice(list.findIndex(x=>x.id===r.id)+1).find(canEdit) || null;
}
function focusEditor(key) {
  const f = dialog.open ? $("[data-single]",dialog) : $("[data-single]");
  const focus=f?.querySelector(key && canEdit(rowsById(active))?`[name="${key}"]`:"[data-act=close]");
  focus?.focus({preventScroll:key!=="sourceId"});
}
function openRow(id,key,from) {
  if(!rowsById(id))return;
  if(from?.isConnected) returnFocus = {id,key,selector:from.dataset.focus?`[data-focus="${from.dataset.focus}"]`:from.classList.contains("name-button")?".name-button":".row-action"};
  active=id; render();
  if(variant===0) {
    dialog.className="drawer";dialog.innerHTML=editor(rowsById(id));
    if(!dialog.open)dialog.showModal();
  } else if(variant===2 && matchMedia("(max-width:900px)").matches) queue.scrollIntoView({block:"start"});
  focusEditor(key);
}
function closeEditor(restore=true) {
  const from=returnFocus; active=null; returnFocus=null;
  if(dialog.open)dialog.close();
  render();
  if(restore && from) $(`[data-row="${from.id}"] ${from.selector}`)?.focus({preventScroll:true});
}
const moneyRu = value => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(value);
const attachmentSize = size => size<1024?`${size} Б`:size<1048576?`${Math.round(size/1024)} КБ`:`${(size/1048576).toLocaleString("ru-RU",{maximumFractionDigits:1})} МБ`;
const attachmentList = (items,editable) => items.map((file,i)=>`<li><span class="offer-file-mark">${icon(file.type.startsWith("image/")?"photo":"paperclip")}</span><span class="offer-file-name">${esc(file.name)} <small>${attachmentSize(file.size)}</small></span>${editable?`<button class="icon-button" type="button" data-remove-file="${i}" aria-label="Убрать файл: ${esc(file.name)}">${icon("close")}</button>`:""}</li>`).join("");
const offerFields = [
  ["price","Стоимость","Например, 48 000 ₽ с НДС",80],
  ["timing","Срок выполнения","Например, 7 рабочих дней после замера",100],
  ["validity","Действует до","",0],
  ["payment","Условия оплаты","Например, 50% аванс, остаток после сдачи",150],
  ["next","Что предложить клиенту сделать","Например: выберите удобное время для замера",200]
];
const phoneForOffer = id=>profilePhones.find(x=>x.id===id);
const displayOfferPhone = value=>value.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/,"+7 ($1) $2-$3-$4");
function normalizeOfferPhone(value) {
  if(!/^\+?[\d\s().-]+$/.test(value))return "";
  const digits=value.replace(/\D/g,"");
  if(digits.length===10&&!value.startsWith("+"))return `+7${digits}`;
  if(/^[78]\d{10}$/.test(digits)&&(!value.startsWith("+")||digits[0]==="7"))return `+7${digits.slice(1)}`;
  return "";
}
const hasTypedPhone = value=>/(?:^|[^\d])(?:\+?[78][\s().-]*)?(?:\d[\s().-]*){9}\d(?!\d)/.test(value);
function offerPhoneOptions(id) {
  return `<option value="">${profilePhones.length?"Не указывать телефон":"В профиле пока нет номеров"}</option>${profilePhones.map(x=>`<option value="${x.id}" ${id===x.id?"selected":""}>${esc(x.label)} · ${displayOfferPhone(x.number)}</option>`).join("")}`;
}
function syncOfferPhone() {
  const input=$("[name=offer-phone]",offerDialog);
  if(!input||offerDraft?.stage!=="compose")return;
  const old=input.value;
  input.innerHTML=offerPhoneOptions(old);input.disabled=!profilePhones.length;
}
function showPhoneProfile() {
  const editable=role==="owner";
  phoneProfileDialog.innerHTML=`<form id="phone-profile-form" class="editor">
    <header class="editor-head"><div><div class="queue-kicker">ПРОФИЛЬ ПАРТНЁРА · ДЕМО</div><h2 id="partner-phone-title">Телефоны для КП</h2><p>${esc(offerDemo.partner)} · Только рабочие номера, которые можно показывать клиентам.</p></div><button type="button" class="icon-button" data-act="phone-profile-close" aria-label="Закрыть">${icon("close")}</button></header>
    <div class="editor-body"><div class="profile-phone-list">${profilePhoneDraft.length?profilePhoneDraft.map((x,i)=>editable?
      `<div class="profile-phone-item" data-phone-row="${x.id}"><label><span>Название</span><input name="phone-label-${x.id}" value="${esc(x.label)}" maxlength="28" aria-label="Название номера ${i+1}" required placeholder="Например, Отдел продаж"></label>
      <label><span>Номер</span><input type="tel" name="phone-number-${x.id}" value="${esc(displayOfferPhone(x.number))}" maxlength="24" aria-label="Телефон ${i+1}" required placeholder="+7 (___) ___-__-__"></label>
      <button type="button" class="icon-button" data-profile-phone-remove="${x.id}" aria-label="Убрать номер ${i+1}">${icon("close")}</button></div>`:
      `<div class="settings-item"><span>${esc(x.label)}</span><strong>${displayOfferPhone(x.number)}</strong></div>`).join(""):'<p class="help">Телефоны для КП пока не добавлены.</p>'}</div>
    ${editable?`<button type="button" class="secondary profile-phone-add" data-act="phone-profile-add" ${profilePhoneDraft.length>=10?"disabled":""}>Добавить номер</button><p class="help">Изменения действуют только в этом просмотре прототипа.</p>`:'<p class="help">Номера добавляет и меняет владелец профиля.</p>'}</div>
    <footer class="editor-foot"><div class="form-actions"><button type="button" class="secondary" data-act="phone-profile-close">${editable?"Отмена":"Готово"}</button>${editable?'<button type="submit" class="primary">Сохранить телефоны</button>':""}</div></footer>
  </form>`;
  if(!phoneProfileDialog.open)phoneProfileDialog.showModal();
}
function capturePhoneProfile() {
  const f=$("#phone-profile-form",phoneProfileDialog);
  profilePhoneDraft.forEach(x=>{x.label=f.elements[`phone-label-${x.id}`].value;x.number=f.elements[`phone-number-${x.id}`].value;});
}
function closePhoneProfile() {
  phoneProfileDialog.close();syncOfferPhone();
  phoneProfileOpener?.focus({preventScroll:true});phoneProfileOpener=null;
}
const offerDate = value => new Date(value+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});
const offerBrand = `<div class="kp-brand"><span class="brand-mark">${icon("home")}</span><span>remcard<span class="dot">.</span></span></div>`;
const offerThemes = {
  store:{label:"Магазин",pattern:"shelf",items:[["Лесной","#20443a"],["Глиняный","#f0daca"]]},
  company:{label:"Компания",pattern:"grid",items:[["Графитовый","#263343"],["Стальной","#dce7f1"]]},
  specialist:{label:"Специалист",pattern:"arc",items:[["Песочный","#efe1c3"],["Оливковый","#414b31"]]},
  agent:{label:"Агент",pattern:"stripe",items:[["Сливовый","#4a3158"],["Лавандовый","#eee4f1"]]}
};
const makeOfferLook = () => ({mode:"template",type:"store",preset:0,color:"#20443a",logo:null,open:false,loading:false,error:""});
const offerTemplateOptions = look => offerThemes[look.type].items.map(([label],index)=>`<option value="${index}" ${look.preset===index?"selected":""}>${label}</option>`).join("");
function offerColors(look) {
  const group=offerThemes[look.type], custom=look.mode==="custom";
  const bg=custom?look.color:group.items[look.preset][1];
  const [r,g,b]=bg.slice(1).match(/../g).map(x=>{const n=parseInt(x,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});
  const luminance=.2126*r+.7152*g+.0722*b;
  return {style:`--kp-partner-bg:${bg};--kp-partner-ink:${luminance>.179?"#000":"#fff"}`,pattern:custom?"solid":group.pattern};
}
const partnerBadge = look => `<span class="kp-partner-mark ${look.logo?"has-logo":""}" aria-hidden="true">${look.logo?`<img alt="" src="${esc(look.logo.url)}">`:esc(offerDemo.partner.slice(0,2).toUpperCase())}</span>`;
function offerLookSample(look) {
  const {style,pattern}=offerColors(look);
  return `<div class="kp-look-sample kp-partner-surface" data-pattern="${pattern}" style="${style}">${partnerBadge(look)}<div><strong>${esc(offerDemo.partner)}</strong><span>${look.mode==="custom"?"Фирменный фон":offerThemes[look.type].items[look.preset][0]}</span></div></div>`;
}
function offerLookEditor(look) {
  return `<details class="kp-terms-editor kp-look" ${look.open?"open":""}><summary>${icon("palette")}<span>Оформление партнёра</span><small>логотип и фон</small></summary>
    <div class="kp-look-fields">
      <div id="kp-look-sample">${offerLookSample(look)}</div>
      <label><span>Фон предложения</span><select name="offer-look-mode"><option value="template" ${look.mode==="template"?"selected":""}>Готовый шаблон</option><option value="custom" ${look.mode==="custom"?"selected":""}>Свой фирменный цвет</option></select></label>
      <div class="kp-look-options" id="kp-look-templates" ${look.mode==="custom"?"hidden":""}>
        <label><span>Шаблоны для типа партнёра</span><select name="offer-look-type">${Object.entries(offerThemes).map(([id,item])=>`<option value="${id}" ${look.type===id?"selected":""}>${item.label}</option>`).join("")}</select></label>
        <label><span>Стиль и фон</span><select name="offer-look-preset">${offerTemplateOptions(look)}</select></label>
      </div>
      <div id="kp-look-custom" ${look.mode==="custom"?"":"hidden"}><label class="kp-color-line"><span>Цвет фона</span><input type="color" name="offer-look-color" value="${look.color}"></label></div>
      <div class="kp-logo-row"><input type="file" id="kp-logo-input" accept="image/png,image/jpeg,image/webp" aria-label="Файл логотипа партнёра" hidden>
        <button class="secondary" type="button" data-act="offer-logo">${icon("photo")}<span id="kp-logo-action">${look.logo?"Заменить логотип":"Добавить логотип"}</span></button>
        <button class="secondary" type="button" data-act="offer-logo-remove" ${look.logo?"":"hidden"}>Убрать логотип</button>
        <span class="kp-logo-caption" id="kp-logo-caption">${esc(look.logo?.name||"PNG, JPG или WebP до 2 МБ")}</span>
      </div>
      <p class="kp-error" id="kp-logo-error" role="alert" ${look.error?"":"hidden"}>${esc(look.error)}</p>
    </div></details>`;
}
function syncOfferLook(look) {
  const get=s=>$(s,offerDialog);
  get("#kp-look-sample").innerHTML=offerLookSample(look);
  get("#kp-look-templates").hidden=look.mode==="custom";
  get("#kp-look-custom").hidden=look.mode!=="custom";
  get("#kp-logo-action").textContent=look.logo?"Заменить логотип":"Добавить логотип";
  get("[data-act=offer-logo-remove]").hidden=!look.logo;
  get("#kp-logo-caption").textContent=look.loading?"Проверяем изображение…":look.logo?.name||"PNG, JPG или WebP до 2 МБ";
  get("#kp-logo-error").hidden=!look.error;
  get("#kp-logo-error").textContent=look.error;
  get(".kp-footer button[type=submit]").disabled=look.loading;
}
async function addOfferLogo(file,draft) {
  const look=draft.look;
  look.error="";
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2*1024*1024) {
    look.error="Выберите PNG, JPG или WebP размером до 2 МБ.";syncOfferLook(look);return;
  }
  look.loading=true;syncOfferLook(look);
  try {
    const url=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
    });
    const img=new Image();img.src=url;await img.decode();
    look.logo={url,name:file.name};
  } catch {
    look.error="Не удалось открыть изображение. Попробуйте другой файл.";
  } finally {
    look.loading=false;
    if(offerDraft===draft&&draft.stage==="compose")syncOfferLook(look);
  }
}
function offerPreview(d,r) {
  const terms=offerFields.slice(0,-1).filter(([key])=>d.terms[key]);
  const phone=phoneForOffer(d.phoneId);
  const {style,pattern}=offerColors(d.look);
  return `<article class="kp-preview" aria-label="Предложение для клиента">
    <header class="kp-preview-cover kp-partner-surface" data-pattern="${pattern}" style="${style}">
      <div class="kp-cover-identity">
        <div class="kp-partner-heading">${partnerBadge(d.look)}<div><p>Предложение от партнёра</p><strong>${esc(offerDemo.partner)}</strong></div></div>
        <div class="kp-affiliation">${offerBrand}<span class="kp-affiliation-caption">Навигатор ремонта</span></div>
      </div>
      <h3>${esc(d.title)}</h3>
      <p class="kp-cover-meta">Получатель: ${esc(r.name)} <span aria-hidden="true">·</span> ${esc(d.date)}</p></header>
    <div class="kp-preview-body">
      ${d.message?`<section><h4>Что предлагаем</h4><p class="kp-message">${esc(d.message)}</p></section>`:""}
      ${terms.length?`<dl class="kp-quote-terms">${terms.map(([key,label])=>`<div class="kp-term kp-term-${key}"><dt>${label}</dt><dd>${esc(key==="validity"?offerDate(d.terms[key]):d.terms[key])}</dd></div>`).join("")}</dl>`:""}
      ${d.files.length?`<section><h4>Вложения</h4><ul class="offer-files" aria-label="Вложения">${attachmentList(d.files,false)}</ul></section>`:""}
      ${d.terms.next||phone?`<section class="kp-next">${icon("right")}<div><h4>${d.terms.next?"Что предлагает сделать партнёр":"Как связаться с партнёром"}</h4>${d.terms.next?`<p>${esc(d.terms.next)}</p>`:""}${phone?`<div class="kp-next-phone">${icon("phone")}<div><span>Телефон партнёра · ${esc(phone.label)}</span><strong>${displayOfferPhone(phone.number)}</strong></div></div>`:""}</div></section>`:""}
    </div>
  </article>`;
}
function showOffer() {
  const d=offerDraft, r=rowsById(d.source);
  const stage=d.stage;
  const recipient=`<div class="kp-route"><div><span>Отправитель</span><strong>${esc(offerDemo.partner)}</strong></div><span class="kp-route-arrow">${icon("right")}</span>
    <div><span>Получатель · личный кабинет RemCard</span><strong>${esc(r.name)}</strong><small>${esc(r.clientId)}</small></div></div>`;
  const compose=`${recipient}<label><span>Название предложения</span><input name="offer-name" maxlength="120" required value="${esc(d.title)}"></label>
    <label><span>Текст предложения</span><textarea name="offer-message" maxlength="1000" aria-describedby="offer-content-error" placeholder="Напишите, что получает клиент, что входит в работу и что оплачивается отдельно.">${esc(d.message)}</textarea></label>
    <div class="offer-attachments"><div class="kp-section-label">Вложения <small>необязательно</small></div><div class="offer-picker-actions">
    <input type="file" id="offer-files-input" aria-label="Файлы предложения" multiple hidden><button class="secondary" type="button" data-act="offer-add-files">${icon("paperclip")}Прикрепить файл</button>
    <input type="file" id="offer-photos-input" aria-label="Фото для предложения" accept="image/*" multiple hidden><button class="secondary" type="button" data-act="offer-add-photos">${icon("photo")}Добавить фото</button>
    </div><ul class="offer-files" id="offer-files-list" aria-label="Вложения" ${d.files.length?"":"hidden"}>${attachmentList(d.files,true)}</ul><p id="offer-content-error" class="kp-error" role="alert" hidden></p></div>
    <details class="kp-terms-editor" ${d.termsOpen?"open":""}><summary>Условия предложения и контакты <small>необязательно</small></summary>
      <div class="kp-terms-fields">${offerFields.map(([key,label,placeholder,max])=>`<label class="kp-field-${key}"><span>${label}</span><input name="offer-${key}" ${max?`maxlength="${max}" placeholder="${esc(placeholder)}"`:'type="date"'} value="${esc(d.terms[key])}"></label>`).join("")}
      <div class="kp-phone-field"><label><span>Телефон партнёра из профиля</span><select name="offer-phone" ${profilePhones.length?"":"disabled"}>${offerPhoneOptions(d.phoneId)}</select></label><button type="button" class="text-button" data-act="offer-profile">${role==="owner"?"Настроить телефоны в профиле":"Посмотреть телефоны в профиле"}</button></div></div>
    </details>${offerLookEditor(d.look)}`;
  offerDialog.dataset.stage=stage;
  offerDialog.innerHTML=`<form id="offer-form" class="editor kp-form">
    <header class="editor-head kp-header"><div><div class="kp-kicker"><span class="kp-step">${{compose:"1 из 2 · Черновик",review:"2 из 2 · Проверка",sent:"Проверка завершена"}[stage]}</span><span class="kp-demo">Демо</span></div>
    <h2 id="offer-title" tabindex="-1">${{compose:"Коммерческое предложение",review:"Как увидит клиент",sent:"Демо-отправка завершена"}[stage]}</h2></div>
    <button type="button" class="icon-button kp-close" data-act="offer-close" aria-label="Закрыть">${icon("close")}</button></header>
    <div class="editor-body kp-body">${stage==="compose"?compose:stage==="review"?`<p class="kp-review-note">Проверьте текст, условия и вложения перед отправкой.</p>${offerPreview(d,r)}`:
      `<div class="kp-success" role="status"><span>${icon("check")}</span><div><strong>${esc(d.title)}</strong><p>Предложение, файлы и уведомления клиенту не отправлены.</p></div></div>`}</div>
    <footer class="editor-foot kp-footer"><p>${stage==="compose"?"Клиент ничего не получит на этапе предпросмотра.":stage==="review"?"Демо: клиенту ничего не отправится.":""}</p>
    <div class="form-actions">${stage==="sent"?'<button type="button" class="primary" data-act="offer-close">Готово</button>':
    `${stage==="review"?'<button type="button" class="secondary" data-act="offer-back">Назад</button>':'<button type="button" class="secondary" data-act="offer-close">Отмена</button>'}<button type="submit" class="primary">${stage==="review"?`${icon("send")}Отправить КП · демо`:`Предпросмотр${icon("right")}`}</button>`}</div></footer></form>`;
  if(!offerDialog.open)offerDialog.showModal();
  $("#offer-title",offerDialog)?.focus({preventScroll:true});
}
function renderOfferFiles() {
  const list=$("#offer-files-list",offerDialog);
  list.innerHTML=attachmentList(offerDraft.files,true);
  list.hidden=!offerDraft.files.length;
  if(offerDraft.files.length)$("#offer-content-error",offerDialog).hidden=true;
}
function startOffer(source, opener) {
  const r=rowsById(source);
  if(!r?.clientId || !canEdit(r))return;
  offerEntry=opener;
  offerDraft={stage:"compose",source,clientId:r.clientId,title:r.title,message:"",files:[],terms:{},termsOpen:false,phoneId:"",look:makeOfferLook(),date:new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})};
  showOffer();
}
function closeOffer() {
  offerDialog.close();
  const opener=offerEntry;offerEntry=null;offerDraft=null;
  if(opener?.isConnected)opener.focus({preventScroll:true});
}
const noticeFor = x => `Партнёр «${x.partner}» отправил вам новое предложение в RemCard.`;
const shortDate = d => new Date(d).toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
function renderClientPreview(focus) {
  const items=offers.filter(x=>x.clientId===offerDemo.clientId), current=items.find(x=>x.id===openOfferId);
  const unread=items.filter(x=>!readOffers.has(x.id)).length;
  const clientId=`<div class="client-id-plate"><div><span class="client-eyebrow">Мой ID RemCard</span><strong data-copy-value>${esc(offerDemo.clientId)}</strong></div><p>Передайте ID партнёру, чтобы получить предложение в личном кабинете.</p>${copyButton("client-id","Мой ID RemCard",true)}</div>`;
  const offerCard=(x,details)=>`<article class="client-offer-card"><header><span class="client-eyebrow">${esc(x.partner)}</span><time>${shortDate(x.createdAt)}</time></header><h3>${esc(x.title)}</h3>${details?`<p class="client-message">${esc(x.message)}</p>`:""}${x.amount?`<strong>${moneyRu(x.amount)}</strong>`:""}${details?
    `<details class="client-messenger"><summary>Уведомление в мессенджерах · демо</summary>${x.channels.length?`<div class="client-channels">${x.channels.map(n=>`<span class="pill green">${esc(n)}</span>`).join("")}</div><p>${esc(noticeFor(x))}</p><button type="button" class="secondary" data-client-offer="${esc(x.id)}">Открыть предложение</button>`:`<p>Уведомления в мессенджерах не включены. Предложение есть в вашем ЛК.</p>`}</details>`:`<button type="button" class="secondary" data-client-offer="${esc(x.id)}">Открыть предложение</button>`}</article>`;
  const nav=[["offers","Предложения"],["notices","Уведомления"],["profile","Профиль"]];
  const view=$("#client-offers-view");
  view.innerHTML=`<div class="client-shell"><div class="client-who"><span class="avatar">АП</span><div><strong>Анна Петрова</strong><div>Клиент RemCard · демо</div></div></div>
  <nav class="client-nav" aria-label="Личный кабинет клиента">${nav.map(([key,label])=>`<button type="button" class="secondary ${clientTab===key?"current":""}" data-client-tab="${key}" ${clientTab===key?'aria-current="page"':""}>${label}${key==="notices"&&unread?` <span class="count">${unread}</span>`:""}</button>`).join("")}</nav>
  <section class="client-content"><h2 id="client-section-title" tabindex="-1">${nav.find(([key])=>key===clientTab)[1]}</h2>
  ${clientTab==="offers"?`<p class="client-intro">Предложения партнёров. Просмотр не подтверждает заказ и не запускает оплату.</p>${current?`<button type="button" class="text-button" data-client-tab="offers">← Все предложения</button>${offerCard(current,true)}`:items.length?items.map(x=>offerCard(x,false)).join(""):`<div class="client-offer-card"><h3>Пока нет предложений</h3><p>Когда партнёр отправит предложение на ваш ID, оно появится здесь.</p></div>`}`:""}
  ${clientTab==="notices"?`${items.length?items.map(x=>`<button type="button" class="client-notice-row ${readOffers.has(x.id)?"":"unread"}" data-client-offer="${esc(x.id)}"><span><strong>${esc(noticeFor(x))}</strong><small>${shortDate(x.createdAt)} · ${readOffers.has(x.id)?"Прочитано":"Новое"}</small></span>${icon("right")}</button>`).join(""):`<div class="client-offer-card"><h3>Пока нет уведомлений</h3><p>Новые предложения будут отмечены здесь.</p></div>`}`:""}
  ${clientTab==="profile"?`${clientId}<div class="client-offer-card"><h3>Новые предложения партнёров</h3><p>Уведомления приходят только в подключённые и включённые каналы. В демо оба мессенджера подключены.</p>${offerDemo.channels.map(c=>`<div class="client-channel-setting"><strong>${c}</strong><button class="secondary" type="button" role="switch" aria-label="Уведомления о предложениях: ${c}" aria-checked="${offerChannels.includes(c)}" data-client-channel="${c}">${offerChannels.includes(c)?"Включено":"Выключено"}</button></div>`).join("")}</div>`:""}
  </section></div>`;
  if(focus)$("#client-section-title").focus({preventScroll:true});
}
function openClientPreview(opener) {
  if(!offerDemo.enabled)return;
  previewEntry=opener?.isConnected && !offerDialog.contains(opener)?opener:$("[data-offers-preview]");
  openOfferId=offerDraft?.stage==="sent"?offerDraft.sentId:"";
  if(openOfferId)readOffers.add(openOfferId);
  clientTab="offers";
  if(offerDialog.open)closeOffer();
  if(active)closeEditor(false);
  $("#client-preview").hidden=false;$("#partner-main").hidden=true;$(".sidebar").hidden=true;$(".variants").hidden=true;
  $("#bulk-bar").hidden=true;$("#toast").hidden=true;
  $("#page-demo-label").innerHTML="<i></i> Стр. 150 · Демо";
  renderClientPreview();
  $("#return-to-partner").focus();
}
$("#return-to-partner").onclick=()=>{
  $("#client-preview").hidden=true;$("#partner-main").hidden=false;$(".sidebar").hidden=false;$(".variants").hidden=false;
  $("#page-demo-label").innerHTML="<i></i> Стр. 149 · Демо";
  render();previewEntry?.focus({preventScroll:true});
};
offerDialog.addEventListener("cancel",e=>{e.preventDefault();closeOffer();});
phoneProfileDialog.addEventListener("cancel",e=>{e.preventDefault();closePhoneProfile();});
function showSettings(key=null) {
  settingsKey=key;
  const config=customFields.find(x=>x.key===key), editable=role==="owner";
  dialog.className="";
  dialog.innerHTML=`<form class="editor" id="settings-form">
    <header class="editor-head"><div><div class="queue-kicker">НАСТРОЙКИ ОБРАЩЕНИЙ</div><h2 id="form-title">Поля партнёра</h2><p>Один набор полей для входящих обращений команды.</p></div><button class="icon-button" type="button" data-act="close-settings" aria-label="Закрыть">${icon("close")}</button></header>
    <div class="editor-body"><div class="settings-list">${customFields.map(x=>`<div class="settings-item"><span>${esc(x.name)} <small class="muted">· Текст</small></span>${editable?`<button type="button" class="secondary" data-rename="${x.key}" aria-label="Переименовать: ${esc(x.name)}">${icon("edit")} Название</button>`:""}</div>`).join("")}</div>
    ${editable?`<label><span>${config?"Новое название":"Название нового поля"}</span><input name="field-name" maxlength="45" required value="${esc(config?.name)}" placeholder="Например, Номер заявки в CRM"></label><p class="help">Храним как текст, чтобы сохранить нули, буквы и дефисы. Переименование не меняет заполненные значения.</p>`:`<p class="review">Названия и состав полей меняет владелец. Сотрудники заполняют их в обращениях, которые могут редактировать.</p>`}</div>
    <footer class="editor-foot"><div class="form-actions">${config?`<button class="secondary" type="button" data-act="field-back">Отмена</button>`:""}<button class="secondary" type="button" data-act="close-settings">Готово</button>${editable?`<button class="primary" type="submit">${config?"Сохранить название":"Добавить поле"}</button>`:""}</div></footer></form>`;
  if(!dialog.open)dialog.showModal();
  if(config)$('[name="field-name"]',dialog).focus();
}
function showSourceSettings(id="") {
  renameSourceId=id;
  const item=sourceCatalog.find(x=>x.id===id), editable=role==="owner";
  dialog.className="";
  dialog.innerHTML=`<form class="editor" id="source-settings-form">
    <header class="editor-head"><div><div class="queue-kicker">НАСТРОЙКИ ОБРАЩЕНИЙ</div><h2 id="form-title">Источники</h2><p>Выбираются для обращений, внесённых вручную.</p></div><button type="button" class="icon-button" data-act="close-sources" aria-label="Закрыть">${icon("close")}</button></header>
    <div class="editor-body"><div class="settings-list" aria-label="Справочник источников">${sourceCatalog.map(x=>`<div class="settings-item"><span>${esc(x.name)}</span>${editable?`<button type="button" class="secondary" data-source-rename="${x.id}" aria-label="Переименовать источник: ${esc(x.name)}">${icon("edit")} Название</button>`:""}</div>`).join("")}</div>
    ${editable?`<label><span>${item?"Новое название источника":"Название нового источника"}</span><input name="source-name" maxlength="45" required value="${esc(item?.name)}" placeholder="Например, Выставка"></label>`:'<p class="help">Справочник редактирует владелец.</p>'}<p class="help source-result" role="status"></p></div>
    <footer class="editor-foot"><div class="form-actions">${item?'<button type="button" class="secondary" data-act="source-back">Отмена</button>':""}<button type="button" class="secondary" data-act="close-sources">Готово</button>${editable?`<button type="submit" class="primary">${item?"Сохранить название":"Добавить источник"}</button>`:""}</div></footer>
  </form>`;
  if(!dialog.open)dialog.showModal();
  if(item)$('[name="source-name"]',dialog)?.focus();
}
function skipReason(r) {
  if(!canEdit(r))return "Нет права редактировать";
  if(bulk.mode==="empty" && r[bulk.field])return "Поле уже заполнено";
  if(r[bulk.field]===bulk.value)return "Значение не изменилось";
  return "";
}
const bulkTargets = () => chosen().filter(r=>!skipReason(r));
function showBulk() {
  const target=bulkTargets(), skipped=chosen().filter(skipReason), total=selected.size;
  dialog.className="";
  dialog.innerHTML=`<form class="editor" id="bulk-form">
    <header class="editor-head"><div><div class="queue-kicker">МАССОВОЕ РЕДАКТИРОВАНИЕ</div><h2 id="form-title">${bulk.review?"Проверьте изменения":"Изменить выбранные"}</h2><p>Выбрано обращений: ${total}</p></div><button class="icon-button" type="button" data-act="close-bulk" aria-label="Закрыть">${icon("close")}</button></header>
    <div class="editor-body">${bulk.review?`<div class="review"><p><strong>${esc(formNames[bulk.field])}:</strong> ${esc(bulk.value)}</p><p>Изменим <strong>${target.length} из ${total}</strong> · Пропустим: ${skipped.length}</p><p>${bulk.mode==="empty"?"Заполненные поля не изменятся.":"Существующие значения в выбранном поле будут заменены."}</p></div>
    ${target.length?`<details class="history" open><summary>Обновятся · ${target.length}</summary><ul>${target.map(r=>`<li>№ ${r.id} · ${esc(r.name)}${bulk.mode==="replace"&&r[bulk.field]?` · было: ${esc(r[bulk.field])}`:""}</li>`).join("")}</ul></details>`:""}
    ${skipped.length?`<details class="history"><summary>Пропустим · ${skipped.length}</summary><ul>${skipped.map(r=>`<li>№ ${r.id} · ${esc(r.name)} · ${esc(skipReason(r))}</li>`).join("")}</ul></details>`:""}`:
    `<label><span>Какое поле изменить</span><select name="field"><option value="request" ${bulk.field==="request"?"selected":""}>Запрос</option><option value="assignee" ${bulk.field==="assignee"?"selected":""}>Ответственный</option></select></label>
    <label><span>Как применить</span><select name="mode"><option value="empty" ${bulk.mode==="empty"?"selected":""}>Только заполнить пустые</option><option value="replace" ${bulk.mode==="replace"?"selected":""}>Заменить у выбранных</option></select></label>
    <label><span>Новое значение</span>${bulk.field==="request"?`<input name="value" value="${esc(bulk.value)}" maxlength="200" required placeholder="Например, требуется замер">`:`<select name="value" required>${assigneeOptions(bulk.value).replace("Не назначен","Выберите сотрудника")}</select>`}</label>
    <p class="help">За один раз меняется одно поле. Внешние номера, имя, контакт, заметка и статус редактируются только в отдельном обращении.</p>`}</div>
    <footer class="editor-foot"><div class="form-actions">${bulk.review?`<button class="secondary" type="button" data-act="bulk-back">Назад</button><button class="primary" type="submit" ${target.length?"":"disabled"}>Применить (${target.length})</button>`:`<button class="secondary" type="button" data-act="close-bulk">Отмена</button><button class="primary" type="submit">Проверить изменения</button>`}</div></footer></form>`;
  if(!dialog.open)dialog.showModal();
}
function setVariant(i,write=true) {
  closeEditor(false); variant=(i+variants.length)%variants.length;
  const [key,label,title,hint]=variants[variant];
  $("#variant-title").textContent=title;$("#variant-hint").textContent=hint;$("#variant-label").textContent=`${key} · ${label}`;
  if(write){try{const u=new URL(location.href);u.searchParams.set("variant",key);history.replaceState(null,"",u);}catch{/* Preview can be framed. */}}
  render();
}
$("#prev-variant").onclick=()=>setVariant(variant-1);
$("#next-variant").onclick=()=>setVariant(variant+1);
$("#theme").onclick=()=>{
  const isLight = document.documentElement.dataset.theme==="light";
  document.documentElement.dataset.theme=isLight?"dark":"light";
  $("#theme").setAttribute("aria-label",`Включить ${isLight?"светлую":"тёмную"} тему`);
  $("#theme").innerHTML=icon(isLight?"sun":"moon");
};
$("#reset").onclick=()=>{closeEditor(false);profilePhones=makeProfilePhones();nextProfilePhone=3;sourceCatalog=makeSourceCatalog();nextSource=1;rows=makeRows();offers=[];readOffers.clear();offerChannels=[...offerDemo.channels];customFields=makeDefinitions();nextField=2;syncFieldFilter();syncSourceFilter();selected.clear();$("#remcard-only").checked=false;for(const id of ["search","branch","missing","source-filter","custom-filter-value","custom-filter-mode"])$(`#${id}`).value="";render();tip("Демонстрационные данные восстановлены");};
$("#fields-settings").onclick=()=>{closeEditor(false);showSettings();};
$("#source-settings").onclick=()=>{closeEditor(false);showSourceSettings();};
$("#role").onchange=e=>{role=e.target.value;selected.clear();closeEditor(false);tip(role==="staff"?"Мария работает со своими или назначенными ей обращениями Северного филиала.":`Роль: ${labelRole[role]}`);};
for(const id of ["search","branch","missing","source-filter","remcard-only","custom-filter-field","custom-filter-value","custom-filter-mode"]) $(`#${id}`).addEventListener(["search","custom-filter-value"].includes(id)?"input":"change",()=>{
  selected.clear();
  if(active && !visible().some(r=>r.id===active))closeEditor(false);else render();
});
document.addEventListener("keydown",e=>{
  if(dialog.open || offerDialog.open || phoneProfileDialog.open || !$("#client-preview").hidden || e.target.matches("input,textarea,select,[contenteditable]"))return;
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();setVariant(variant+(e.key==="ArrowRight"?1:-1));}
});
dialog.addEventListener("cancel",e=>{
  e.preventDefault();
  if($("#bulk-form",dialog)) {dialog.close();$('[data-act="bulk"]')?.focus();}
  else if($("#settings-form",dialog)){dialog.close();$("#fields-settings").focus();}
  else if($("#source-settings-form",dialog)){dialog.close();$("#source-settings").focus();}
  else closeEditor();
});
document.addEventListener("click",e=>{
  const b=e.target.closest("button");
  if(!b)return;
  if(b.dataset.act==="offer-profile"){
    profilePhoneDraft=profilePhones.map(x=>({...x}));phoneProfileOpener=b;showPhoneProfile();return;
  }
  if(b.dataset.act==="phone-profile-close"){closePhoneProfile();return;}
  if(role==="owner" && phoneProfileDialog.open && (b.dataset.act==="phone-profile-add"||b.dataset.profilePhoneRemove)){
    capturePhoneProfile();
    if(b.dataset.profilePhoneRemove){
      profilePhoneDraft=profilePhoneDraft.filter(x=>x.id!==b.dataset.profilePhoneRemove);showPhoneProfile();
      $("[data-act=phone-profile-add]",phoneProfileDialog)?.focus();return;
    }
    if(profilePhoneDraft.length>=10)return;
    const id=`phone-${nextProfilePhone++}`;profilePhoneDraft.push({id,label:"",number:""});showPhoneProfile();
    $(`[name=phone-label-${id}]`,phoneProfileDialog)?.focus();return;
  }
  if(b.dataset.clientTab){
    clientTab=b.dataset.clientTab;openOfferId="";renderClientPreview(true);return;
  }
  if(b.dataset.clientOffer){
    clientTab="offers";openOfferId=b.dataset.clientOffer;readOffers.add(openOfferId);renderClientPreview(true);return;
  }
  if(offerDemo.channels.includes(b.dataset.clientChannel)){
    const c=b.dataset.clientChannel;
    offerChannels=offerChannels.includes(c)?offerChannels.filter(x=>x!==c):offerDemo.channels.filter(x=>x===c||offerChannels.includes(x));
    b.setAttribute("aria-checked",String(offerChannels.includes(c)));b.textContent=offerChannels.includes(c)?"Включено":"Выключено";return;
  }
  if(b.hasAttribute("data-offers-preview")){openClientPreview(b);return;}
  if(b.dataset.offerFor){startOffer(b.dataset.offerFor,b);return;}
  if(b.dataset.removeFile!==undefined && offerDraft?.stage==="compose"){
    const index=Number(b.dataset.removeFile);
    offerDraft.files.splice(index,1);renderOfferFiles();
    ($(`[data-remove-file="${index}"]`,offerDialog)||$('[data-act="offer-add-files"]',offerDialog)).focus();return;
  }
  if(b.dataset.copy){copyNumber(b);return;}
  if(b.dataset.rename){showSettings(b.dataset.rename);return;}
  if(b.dataset.sourceRename&&role==="owner"){showSourceSettings(b.dataset.sourceRename);return;}
  if(b.dataset.open){openRow(b.dataset.open,b.dataset.focus || b.dataset.defaultFocus,b);return;}
  switch(b.dataset.act){
    case "offer-close":closeOffer();break;
    case "offer-back":offerDraft.stage="compose";showOffer();break;
    case "offer-add-files":$("#offer-files-input",offerDialog).click();break;
    case "offer-add-photos":$("#offer-photos-input",offerDialog).click();break;
    case "offer-logo":if(!offerDraft.look.loading)$("#kp-logo-input",offerDialog).click();break;
    case "offer-logo-remove": {
      const look=offerDraft.look;
      if(!look.loading){look.logo=null;look.error="";syncOfferLook(look);$("[data-act=offer-logo]",offerDialog).focus();}
      break;
    }
    case "close": closeEditor(); break;
    case "close-settings":dialog.close();$("#fields-settings").focus();break;
    case "field-back":showSettings();break;
    case "close-sources":dialog.close();$("#source-settings").focus();break;
    case "source-back":showSourceSettings();break;
    case "undo": undoAction?.();render();tip("Массовое изменение отменено.");break;
    case "clear": selected.clear();render();break;
    case "bulk": closeEditor(false);bulk={field:"request",mode:"empty",value:"",review:false};showBulk();break;
    case "bulk-back":bulk.review=false;showBulk();break;
    case "close-bulk":dialog.close();$('[data-act="bulk"]')?.focus();break;
    case "queue-prev":case "queue-next": {
      const list=visible(),i=list.findIndex(r=>r.id===active),r=list[i+(b.dataset.act==="queue-next"?1:-1)];
      if(r)openRow(r.id,"request");break;
    }
  }
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(offerDraft?.stage==="compose"&&el.form?.id==="offer-form"){
    const look=offerDraft.look;
    if(el.id==="kp-logo-input"){const file=el.files[0];el.value="";if(file&&!look.loading)addOfferLogo(file,offerDraft);return;}
    if(el.name==="offer-look-mode"){look.mode=el.value;syncOfferLook(look);return;}
    if(el.name==="offer-look-type"){look.type=el.value;look.preset=0;$("[name=offer-look-preset]",offerDialog).innerHTML=offerTemplateOptions(look);syncOfferLook(look);return;}
    if(el.name==="offer-look-preset"){look.preset=Number(el.value);syncOfferLook(look);return;}
  }
  if((el.id==="offer-files-input" || el.id==="offer-photos-input") && offerDraft?.stage==="compose"){
    for(const {name,size,type,lastModified} of el.files){
      if(!offerDraft.files.some(f=>f.name===name&&f.size===size&&f.lastModified===lastModified))offerDraft.files.push({name,size,type,lastModified});
    }
    el.value="";renderOfferFiles();return;
  }
  if(el.id==="select-all"){
    for(const r of visible().filter(canEdit)) el.checked?selected.add(r.id):selected.delete(r.id);
    render();$("#select-all")?.focus();
  } else if(el.dataset.select){
    const id=el.dataset.select;
    if(canEdit(rowsById(id)))el.checked?selected.add(id):selected.delete(id);
    render();$(`[data-select="${id}"]`)?.focus();
  } else if(el.form?.id==="bulk-form" && !bulk.review) {
    const d=new FormData(el.form);bulk.mode=d.get("mode");bulk.value=String(d.get("value")??"").trim();
    if(el.name==="field"){bulk.field=d.get("field");bulk.value="";showBulk();$('[name="field"]',dialog)?.focus();}
  }
});
document.addEventListener("input",e=>{
  const el=e.target;
  if(el.form?.id==="phone-profile-form")el.form.querySelectorAll("input").forEach(input=>input.setCustomValidity(""));
  if(el.name==="offer-next")el.setCustomValidity("");
  if(el.name==="offer-look-color"&&offerDraft?.stage==="compose"&&/^#[0-9a-f]{6}$/i.test(el.value)){offerDraft.look.color=el.value;syncOfferLook(offerDraft.look);}
  if(el.name==="offer-message" && el.value.trim())$("#offer-content-error",offerDialog).hidden=true;
  if(el.matches(".custom-value-field input"))el.closest(".custom-value-field").querySelector("[data-copy]").disabled=!el.value.trim();
});
document.addEventListener("submit",e=>{
  e.preventDefault();
  const f=e.target;
  if(f.id==="phone-profile-form"){
    if(role!=="owner"||!phoneProfileDialog.open)return;
    capturePhoneProfile();
    const seen=new Set(), saved=[];
    for(const x of profilePhoneDraft){
      const number=normalizeOfferPhone(x.number.trim()),label=x.label.trim();
      const field=f.elements[`${!label?"phone-label":"phone-number"}-${x.id}`];
      const error=!label?"Введите название номера.":!number?"Введите российский номер из 10 цифр или 11 цифр с +7 или 8.":seen.has(number)?"Этот номер уже есть в списке.":"";
      if(error){field.setCustomValidity(error);field.reportValidity();return;}
      seen.add(number);saved.push({id:x.id,label,number});
    }
    profilePhones=saved;closePhoneProfile();if(!offerDialog.open)tip("Телефоны профиля сохранены");return;
  }
  if(f.id==="offer-form"){
    const draft=offerDraft;
    const r=draft&&rowsById(draft.source);
    if(!r || !canEdit(r) || r.clientId!==draft.clientId || draft.stage==="sent" || draft.look.loading)return;
    if(draft.stage==="compose"){
      const data=new FormData(f);
      draft.title=String(data.get("offer-name")??"").trim()||r.title;
      draft.message=String(data.get("offer-message")??"").trim();
      draft.terms=Object.fromEntries(offerFields.map(([key])=>[key,String(data.get(`offer-${key}`)??"").trim()]));
      draft.phoneId=phoneForOffer(data.get("offer-phone"))?.id||"";
      draft.termsOpen=$(".kp-terms-editor",f).open;
      draft.look.open=$(".kp-look",f).open;
      if(hasTypedPhone(draft.terms.next)){
        $(".kp-terms-editor",f).open=true;
        const next=f.elements["offer-next"];next.setCustomValidity("Выберите телефон из профиля. Здесь оставьте только инструкцию для клиента.");next.reportValidity();return;
      }
      if(!draft.message && !draft.files.length){
        const error=$("#offer-content-error",f);
        error.textContent="Добавьте текст или хотя бы один файл.";
        error.hidden=false;f.elements["offer-message"].focus();return;
      }
      draft.stage="review";
    } else if(draft.stage==="review"){
      draft.stage="sent";
    }
    showOffer();
    return;
  }
  if(f.id==="settings-form"){
    if(role!=="owner")return;
    const input=$('[name="field-name"]',f), name=input.value.trim();
    if(!name || customFields.some(x=>x.key!==settingsKey && x.name.toLowerCase()===name.toLowerCase())){
      input.setCustomValidity(name?"Поле с таким названием уже есть.":"Введите название поля.");
      input.reportValidity();input.addEventListener("input",()=>input.setCustomValidity(""),{once:true});return;
    }
    if(settingsKey)customFields.find(x=>x.key===settingsKey).name=name;
    else customFields.push({key:`ext${nextField++}`,name});
    syncFieldFilter();render();showSettings();return;
  }
  if(f.id==="source-settings-form"){
    if(role!=="owner")return;
    const input=f.elements["source-name"],name=input.value.trim().replace(/\s+/g," "),key=normalize(name);
    if(!key || sourceKinds.some(x=>normalize(x)===key) || sourceCatalog.some(x=>x.id!==renameSourceId&&normalize(x.name)===key)){
      input.setCustomValidity(key?"Источник с таким названием уже есть.":"Введите название источника.");
      input.reportValidity();input.addEventListener("input",()=>input.setCustomValidity(""),{once:true});return;
    }
    const item=sourceCatalog.find(x=>x.id===renameSourceId);
    if(item)item.name=name;
    else sourceCatalog.push({id:`source-${nextSource++}`,name});
    syncSourceFilter();selected.clear();render();showSourceSettings();
    $('.source-result',dialog).textContent=item?"Название обновлено во всех связанных обращениях.":"Источник добавлен.";
    $('[name="source-name"]',dialog)?.focus();return;
  }
  if(f.id==="bulk-form"){
    if(!bulk.review){const d=new FormData(f);bulk.value=String(d.get("value")??"").trim();bulk.mode=d.get("mode");if(!bulk.value)return;bulk.review=true;showBulk();return;}
    const target=bulkTargets(),total=selected.size, {field,value}=bulk;
    const previous=target.map(r=>[r,r[field]]);
    target.forEach(r=>{r[field]=value;r.log.unshift(audit(`${formNames[field]} → ${value} (массово)`));});
    dialog.close();selected.clear();render();tip(`Изменено: ${target.length}. Пропущено: ${total-target.length}.`,()=>{
      previous.forEach(([r,v])=>{if(r[field]===value){r[field]=v;r.log.unshift(audit(`отменено массовое изменение: ${formNames[field]}`));}});
    });return;
  }
  if(!f.dataset.single)return;
  const r=rowsById(f.dataset.single);if(!r||!canEdit(r))return;
  const d=new FormData(f),next=e.submitter?.name==="next"?nextEditable(r):null;
  for(const key of ["title","name"]){
    if(!String(d.get(key)??"").trim()){const n=$(`[name="${key}"]`,f);n.setCustomValidity(key==="title"?"Введите название обращения":"Введите имя клиента");n.reportValidity();n.addEventListener("input",()=>n.setCustomValidity(""),{once:true});return;}
  }
  const changed=[];
  for(const key of Object.keys(formNames)){
    const v=String(d.get(key)??"").trim();
    if(v!==r[key]){r[key]=v;changed.push(formNames[key]);}
  }
  for(const {key,name:label} of customFields){
    const v=String(d.get(key)??"").trim();
    if(v!==(r.custom[key]||"")){if(v)r.custom[key]=v;else delete r.custom[key];changed.push(label);}
  }
  const sourceId=d.get("sourceId");
  if(isManual(r)&&sourceId!==null&&sourceId!==r.sourceId&&(sourceId===""||channelName(sourceId))){
    const old=channelName(r.sourceId)||"не указан";
    r.sourceId=sourceId;
    changed.push(`источник: ${old} → ${channelName(sourceId)||"не указан"}`);
  }
  if(changed.length)r.log.unshift(audit(`изменено: ${changed.join(", ")}`));
  if(next) openRow(next.id,"request"); else closeEditor();
  tip(changed.length?`Обращение № ${r.id} сохранено.`:"Нет изменений.");
});
syncFieldFilter();
syncSourceFilter();
setVariant(variant,false);
if(offerDemo.enabled && new URLSearchParams(location.search).get("side")==="client"){
  offers.push({...offerDemo.sample,clientId:offerDemo.clientId});offerSequence=1;openClientPreview();
}
