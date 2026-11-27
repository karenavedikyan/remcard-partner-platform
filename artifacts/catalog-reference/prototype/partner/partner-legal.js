// Shared profile requisites; transaction identity snapshots never follow later edits.
const banks = new Map();
export function bankState(owner) {
  if (!banks.has(owner)) banks.set(owner,{records:[],defaultId:"",selected:"",applied:"",draft:null,error:"",status:"",expanded:""});
  return banks.get(owner);
}
const fixture = {
  materials:{type:"company",recipient:'ООО «Дом материалов Юг» · демо',inn:"0000000101",kpp:"000000001"},
  interior:{type:"company",recipient:'ООО «Мастерская интерьера» · демо',inn:"0000000102",kpp:"000000002"},
  light:{type:"company",recipient:'ООО «Студия света» · демо',inn:"0000000103",kpp:"000000003"},
  tile:{type:"ip",recipient:"ИП Учебный Партнёр · демо",inn:"000000000104",kpp:""},
  master:{type:"ip",recipient:"ИП Учебный Мастер · демо",inn:"000000000105",kpp:""},
};
const owners={materials:"store",interior:"company",master:"specialist"};
export const legalTypes={company:"Юридическое лицо",ip:"ИП",person:"Физическое лицо"};
export function snapshotLegal(record,at="") {
  if(!record?.recipient) return null;
  return Object.freeze({recordId:record.id || "",type:record.type || "person",name:record.recipient,inn:record.inn || "",kpp:record.type==="company" ? record.kpp || "" : "",capturedAt:at});
}
export function selectedLegal(owner) {
  if(!owner) return null;
  const s=bankState(owner);
  return snapshotLegal(s.records.find(r=>r.id===(s.applied || s.defaultId)));
}
export function partnerLegal(id,at="") {
  const live=owners[id] && selectedLegal(owners[id]);
  return live ? Object.freeze({...live,capturedAt:at}) : snapshotLegal(fixture[id] ? {...fixture[id],id:`demo-profile-${id}`} : null,at);
}
export const legalKey=(p)=>p ? JSON.stringify([p.type,p.name,p.inn,p.kpp]) : "unspecified";
export const legalCaption=(p)=>p ? `${p.name}${p.inn ? ` · ИНН ${p.inn}` : ""}` : "Получатель: реквизиты не указаны";
export function legalGroups(records) {
  const groups=new Map();
  for(const r of records) {
    const key=`${r.partnerId}:${legalKey(r.partnerLegal)}:${legalKey(r.ourLegal)}`;
    if(!groups.has(key)) groups.set(key,{key,partnerId:r.partnerId,partner:r.partner,partnerLegal:r.partnerLegal || null,ourLegal:r.ourLegal || null,records:[]});
    groups.get(key).records.push(r);
  }
  return [...groups.values()];
}
export function legalBlock(p,esc,label="Сторона партнёра") {
  return `<div class="ledger-legal-block"><span class="pw-muted">${label}</span>${p ? `<strong>${esc(p.name)}</strong><small>${legalTypes[p.type] || "Получатель"}${p.inn ? ` · ИНН ${esc(p.inn)}` : ""}${p.kpp ? ` · КПП ${esc(p.kpp)}` : ""}</small>` : '<small class="pw-muted">Реквизиты не указаны. Документ требует заполнения стороны.</small>'}</div>`;
}
export function renderLegalParties(r,esc) {
  return `<section class="ledger-document-parties">${legalBlock(r.partnerLegal,esc)}${legalBlock(r.ourLegal,esc,"Ваша сторона")}<small class="pw-muted">Юридические стороны зафиксированы в исходных заказах. Изменения профиля не заменяют их задним числом.</small></section>`;
}
