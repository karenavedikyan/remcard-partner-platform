// Shared prototype fields retained from the existing live invitation form.
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const rateLabel = row => row.isExcluded ? "Не участвует" : `${row.rate}%`;
export function invitationRates(rates, prefix) {
  return `<div class="retained-rates">${rates.map((row,index)=>`<div class="retained-category" data-excluded="${!!row.isExcluded}">
    <div class="retained-category-head"><label for="${prefix}-rate-${index}">${esc(row.name)}</label><label class="retained-exclude"><input type="checkbox" name="excluded-${index}" data-retained-exclude ${row.isExcluded ? "checked" : ""} aria-label="${esc(row.name)}: Исключить"><span>Исключить</span></label></div>
    <label class="retained-percent" for="${prefix}-rate-${index}"><span>Процент</span><span class="retained-percent-input"><input id="${prefix}-rate-${index}" data-testid="${prefix}-rate-${index}" name="rate-${index}" type="number" inputmode="decimal" min="0" max="100" step="0.1" required value="${esc(row.rate)}" aria-label="${esc(row.name)}, общий процент" ${row.isExcluded ? "disabled" : ""}><span aria-hidden="true">%</span></span></label>
    <span class="retained-excluded-caption">Категория не участвует</span>
  </div>`).join("")}</div>`;
}
export function invitationComment(value = "") {
  return `<label class="retained-comment">Комментарий к приглашению<textarea name="invitationComment" rows="3" maxlength="1000" placeholder="Необязательно">${esc(value)}</textarea><small>Необязательно</small></label>`;
}
export function invitationNote(value) {
  return value ? `<section class="retained-note"><h3>Комментарий к приглашению</h3><p>${esc(value)}</p></section>` : "";
}
export function readInvitationRates(data, rates) {
  return rates.map((row,index)=>({...row,isExcluded:data.has(`excluded-${index}`),rate:data.has(`excluded-${index}`) ? row.rate : Number(data.get(`rate-${index}`))}));
}
export function validInvitationRates(form, rates) {
  return rates.some(row=>!row.isExcluded)
    && ![...form.querySelectorAll('input[name^="rate-"]:not(:disabled)')].some(el=>el.value==="")
    && rates.every(row=>row.isExcluded || Number.isFinite(row.rate) && row.rate>=0 && row.rate<=100 && Math.abs(row.rate*10-Math.round(row.rate*10))<=1e-8);
}
export function invitationSnapshot(policy, comment = "") {
  return `${policy ? `<section class="retained-snapshot"><h3>Условия отправителя за рекомендации</h3><ul class="cp-list">${policy.rates.map(row=>`<li><span>${esc(row.name)}</span><b>${rateLabel(row)}</b></li>`).join("")}</ul><p class="small">${policy.days} дней · покупок: ${policy.operations}</p><p class="small">Только предложение. Начало сотрудничества требует согласования.</p></section>` : ""}${invitationNote(comment)}`;
}
document.addEventListener("change",event=>{
  const checkbox=event.target.closest("[data-retained-exclude]");
  if(!checkbox)return;
  const row=checkbox.closest(".retained-category");
  row.dataset.excluded=String(checkbox.checked);
  row.querySelector('input[type="number"]').disabled=checkbox.checked;
});
