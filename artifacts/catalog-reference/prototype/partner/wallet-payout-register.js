import {brandLockup, getCardEdition, workspaceRibbonName} from "./wallet-accruals.js";
import {addPayoutNotice, hasPayoutNotices, payoutNoticeAccount, payoutCounterpartyAccount, renderPayoutNoticeInbox} from "./payout-notifications.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const rub = (kop) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;
const historyDate = new Intl.DateTimeFormat("ru-RU", {day:"2-digit", month:"2-digit", year:"numeric"});
const money = (s) => {
  const v = String(s ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(v)) return NaN;
  const [whole, fraction = ""] = v.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};
const models = new Map();
const fixtures = [
  {id:"RC-W01", partner:"Дом материалов", branch:0, dir:"in", ready:500000, initialRequest:200000},
  {id:"RC-W02", partner:"Плитка и стиль", branch:1, dir:"in", ready:240000},
  {id:"RC-W03", partner:"Мастерская интерьера", branch:0, dir:"out", ready:300000},
  {id:"RC-W04", partner:"Свет и дом", branch:"office", dir:"in", ready:150000},
  {id:"RC-W05", partner:"Студия ремонта", branch:0, dir:"out", ready:180000},
  {id:"RC-W06", partner:"Северный декор", branch:0, dir:"out", ready:600000, stage:"not-ready"},
];
const model = (c) => {
  const key = c.role === "employee" ? c.employerRole?.() || "employee" : c.role;
  if (!models.has(key)) models.set(key, {
    rows: fixtures.map((r) => {
      const row = {stage:"ready", receipts:[], issued:new Set(), pending:null, ...r};
      if (row.initialRequest) issueCode(row, row.initialRequest);
      return row;
    }),
    filters:{}, notices:{},
  });
  return models.get(key);
};
const rows = (c) => c.walletEmpty ? [] : model(c).rows.filter((r) =>
  r.stage === "ready" &&
  (c.role !== "agent" || r.dir === "in") &&
  (c.role !== "employee" || (r.branch === "office" ? c.walletOffice?.() : r.branch < (c.walletBranches?.().length || 0))) &&
  ((c.role !== "store" && !(c.role === "employee" && c.employerRole?.() === "store")) || r.branch === 0));
const canAct = (c) => c.role !== "employee" || c.canTransfer?.();
const payerBalance = (r) => r.ready - r.receipts.reduce((sum, p) => sum + p.amount, 0);
const receiverBalance = (r) => payerBalance(r) - (r.pending?.status === "approved" ? r.pending.amount : 0);
const ownBalance = (r) => r.dir === "in" ? receiverBalance(r) : payerBalance(r);
const btn = (label, action, {primary = false, attr = ""} = {}) =>
  `<button type="button" class="pw-btn${primary ? " primary" : ""}" data-payout-action="${action}" ${attr}>${label}</button>`;
const branchLabel = (c, r) => c.role !== "employee" ? "" :
  `<p class="pw-muted">${esc(r.branch === "office" ? "Головной офис" : c.walletBranches?.()[r.branch] || "Филиал")}</p>`;
const checkIcon = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="m3.5 8.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const debitIcon = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M4 12 12 4m0 0H6m6 0v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function issueCode(r, amount) {
  const seed = new Uint32Array(1);
  let code;
  do {
    crypto.getRandomValues(seed);
    code = String(100000 + seed[0] % 900000);
  } while (r.issued.has(code));
  r.issued.add(code);
  r.pending = {amount, code, status:"waiting"};
}

function renderRow(c, r) {
  const amount = ownBalance(r);
  const incoming = r.dir === "in";
  const req = r.pending;
  const status = req?.status;
  let primary = "", detail = "";
  if (incoming) {
    if (status === "waiting") {
      detail = `К подтверждению: ${rub(req.amount)}`;
      primary = btn("Проверить сумму", `receive:${r.id}`, {primary:true});
    } else if (status === "rejected") {
      detail = "Ждём исправления суммы";
    } else if (status === "approved") {
      detail = `Ждём ввода кода: ${rub(req.amount)}`;
      primary = btn("Код", `receive:${r.id}`, {attr:'aria-label="Посмотреть код"'});
    } else if (r.receipts.length) {
      detail = `Получено ${rub(r.receipts.at(-1).amount)}`;
    } else {
      detail = "Ждём сумму";
    }
  } else if (status === "approved") {
    detail = `Подтверждено ${rub(req.amount)}`;
    primary = btn("Списать по коду", `writeoff:${r.id}`, {primary:true});
  } else if (status === "rejected") {
    detail = "Сумма не совпала";
    primary = btn("Исправить сумму", `request:${r.id}`, {primary:true});
  } else if (status === "waiting") {
    detail = `Ждём подтверждения: ${rub(req.amount)}`;
    primary = btn("Изменить сумму", `request:${r.id}`, {primary:true});
  } else if (amount > 0) {
    primary = btn("Запросить код", `request:${r.id}`, {primary:true});
  }
  const success = incoming && !status && r.receipts.length > 0;
  return `<article class="wallet-payout-item" data-payout-row="${r.id}" data-direction="${r.dir}">
    <div class="wallet-payout-heading">
      <div><h3 tabindex="-1">${esc(r.partner)}</h3>${branchLabel(c,r)}
        ${detail ? `<div class="wallet-payout-status${success ? " is-success" : ""}">${success ? checkIcon : ""}<span>${detail}</span></div>` : ""}
      </div>
      ${amount > 0 ? `<div class="wallet-payout-balance"><span>${incoming ? "Осталось получить" : "К выплате"}</span><strong data-payout-remaining>${rub(amount)}</strong></div>` : ""}
      ${canAct(c) ? primary : ""}
    </div>
  </article>`;
}

function renderDemoControls(c, visible) {
  if (!canAct(c)) return "";
  const items = visible.map((r) => {
    const status = r.pending?.status;
    const op = r.dir === "in" ? (status === "approved" ? "demo-sender-code" : payerBalance(r) > 0 ? "demo-sender" : "")
      : (status === "waiting" || status === "approved") ? "demo-receiver" : "";
    const demoInbox = hasPayoutNotices(counterparty(c,r)) ? btn("Уведомления", `demo-inbox:${r.id}`) : "";
    if (!op && !demoInbox) return "";
    const label = {"demo-sender":"Кабинет отправителя","demo-sender-code":"Ввести код за отправителя","demo-receiver":"Кабинет получателя"}[op];
    return `<li><span>${esc(r.partner)}</span><div class="cab-actions">${op ? btn(label, `${op}:${r.id}`) : ""}${demoInbox}</div></li>`;
  }).join("");
  return items ? `<details class="wallet-payout-demo-toggle"><summary>Демо: вторая сторона</summary><ul>${items}</ul></details>` : "";
}

const ownNoticeAccount = (c) => payoutNoticeAccount(c.role, c.employerRole?.());
const counterparty = (c,r) => payoutCounterpartyAccount(ownNoticeAccount(c), r.id);
function notifyPayout(c,r,side,type,amount) {
  const own = side === (r.dir === "in" ? "receiver" : "sender");
  addPayoutNotice(own ? ownNoticeAccount(c) : counterparty(c,r), {
    type, amount, id:r.id, partner:own ? r.partner : c.workspaceDisplayName?.() || "Партнёр RemCard",
  });
}

export function showIncomingPayouts(role, employer) {
  model({role, employerRole:() => employer}).filters[role] = "in";
}

export function renderPayoutRegister(c) {
  const state = model(c);
  const filter = c.role === "agent" ? "in" : state.filters[c.role] || "in";
  const all = rows(c);
  const total = (dir) => all.filter((r) => r.dir === dir).reduce((sum, r) => sum + ownBalance(r), 0);
  const visible = all.filter((r) => r.dir === filter && (ownBalance(r) > 0 || r.pending || (filter === "in" && r.receipts.length > 0)));
  const history = all.filter((r) => r.dir === filter)
    .flatMap((r) => r.receipts.map((receipt) => ({partner:r.partner, ...receipt})))
    .sort((a,b) => b.confirmedAt - a.confirmedAt);
  const direction = filter === "in" ? "К получению" : "К выплате";
  const amount = total(filter);
  return `<section class="wallet-payout-register" data-payout-register aria-labelledby="wallet-register-title">
    <header><span class="wallet-payout-demo">Демо · СМС не отправляются</span><h2 id="wallet-register-title">Выплаты</h2>
    ${c.role === "employee" && !canAct(c) ? '<p class="pw-muted">Только просмотр по доступным подразделениям.</p>' : ""}</header>
    <div class="wallet-payout-layout">
    <div class="wallet-accruals-card-column">
      <div class="wallet-payout-directions cab-tabs" role="group" aria-label="Направление выплат">
      ${(c.role === "agent" ? [["in","Мне должны"]] : [["in","Мне должны"],["out","Я должен"]]).map(([dir,label]) =>
        btn(label, `filter:${dir}`, {attr:`aria-pressed="${filter === dir}"`})).join("")}</div>
      <div class="wallet-rc-card wallet-rc-card--${getCardEdition()} wallet-payout-card" data-payout-card>
        <div class="wallet-rc-card__head"><span class="wallet-rc-card__ribbon">${esc(workspaceRibbonName(c))}</span>${brandLockup()}</div>
        <div class="wallet-rc-card__body"><span class="wallet-rc-card__label">${direction}</span>
          <div class="wallet-rc-card__hero"><strong class="wallet-rc-card__amount" data-payout-total>${(amount / 100).toLocaleString("ru-RU")}</strong><span class="wallet-rc-card__unit">₽</span></div>
        </div>
      </div>
    </div>
    <div class="wallet-payout-partners">
    <h3 class="wallet-payout-list-title">Партнёры</h3>
    <div class="sr-only" role="status">${esc(state.notices[c.role])}</div>
    <div class="wallet-payout-list">${visible.length ? visible.map((r) => renderRow(c,r)).join("") : `<p class="wallet-payout-empty pw-muted" data-testid="payout-empty">${filter === "in" ? "Нет сумм к получению." : "Нет сумм, готовых к выплате."}</p>`}</div>
    ${history.length ? `<details class="wallet-payout-history"><summary>История выплат</summary><ul>${history.map((p) => {
      const day = historyDate.format(p.confirmedAt);
      const received = filter === "in";
      return `<li><div class="wallet-payout-history-entry"><span>${esc(p.partner)}</span><time datetime="${new Date(p.confirmedAt).toISOString()}" aria-label="Дата подтверждения: ${day}">${day}</time></div><strong class="wallet-payout-history-badge" data-direction="${filter}">${received ? checkIcon : debitIcon}<span>${received ? "Получено" : "Списано"} ${rub(p.amount)}</span></strong></li>`;
    }).join("")}</ul></details>` : ""}
    ${renderDemoControls(c, all.filter((r) => r.dir === filter))}
    </div></div>
    <dialog class="wallet-accrual-dialog" data-register-dialog aria-labelledby="register-dialog-title"></dialog>
  </section>`;
}

export function hydratePayoutRegister(c, root = document.querySelector("[data-payout-register]")) {
  if (!root || root.dataset.hydrated) return;
  root.dataset.hydrated = "true";
  const state = model(c);
  const dialog = root.querySelector("[data-register-dialog]");
  let flow;
  const finish = (id, notice = "") => {
    if (dialog.open) dialog.close();
    state.notices[c.role] = notice;
    c.refresh();
    const target = document.querySelector(`[data-payout-row="${id}"] h3`) ||
      document.querySelector('[data-payout-register] [aria-pressed="true"]');
    target?.focus({preventScroll:true});
  };
  const show = (title, copy, content, submit) => {
    dialog.innerHTML = `<form class="wallet-accrual-dialog__inner wallet-payout-dialog">
      <h3 id="register-dialog-title">${title}</h3><p class="pw-muted">${copy}</p>
      ${content}<p class="wallet-payout-error" data-payout-error role="alert"></p>
      <div class="cab-actions">${submit ? `<button type="submit" class="pw-btn primary">${submit}</button>` : ""}${btn(submit ? "Отмена" : "Закрыть","cancel")}</div></form>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("input")?.focus();
  };
  const amountField = (label, value) =>
    `<label class="wallet-payout-field">${label}<input name="amount" type="text" inputmode="decimal" required value="${value}"></label>`;
  const openRow = (op, r) => {
    if (!r || !canAct(c)) return;
    const req = r.pending;
    if (op === "demo-inbox" && hasPayoutNotices(counterparty(c,r))) {
      flow = null;
      show("Демо: уведомления партнёра", esc(r.partner), renderPayoutNoticeInbox(counterparty(c,r)), "");
    } else if (((op === "request" && r.dir === "out") || (op === "demo-sender" && r.dir === "in")) &&
        payerBalance(r) > 0 && req?.status !== "approved") {
      flow = {mode:"request", id:r.id, req};
      show(op === "demo-sender" ? "Демо: кабинет отправителя" : req ? "Изменить сумму выплаты" : "Запросить код",
        `Партнёр: ${esc(r.partner)}. К выплате: ${rub(payerBalance(r))}. ${req ? "Новый код заменит предыдущий." : "Сумма и код появятся в демо-СМС получателя."}`,
        amountField("Сколько выплатили, ₽", (req?.amount || payerBalance(r)) / 100), req ? "Запросить новый код" : "Запросить код");
    } else if (((op === "receive" && r.dir === "in") || (op === "demo-receiver" && r.dir === "out")) &&
        req && req.status !== "rejected") {
      flow = {mode:"receive", id:r.id, req};
      const approved = req.status === "approved";
      show(op === "demo-receiver" ? "Демо: кабинет получателя" : approved ? "Код для отправителя" : "Проверьте сумму",
        approved ? "Передайте этот код отправителю, чтобы он списал сумму." : "Сверьте сумму в СМС с фактическим поступлением. Если они не совпадают, сумму должен исправить отправитель.",
        `<div class="wallet-payout-sms" data-demo-sms><span>Демо-СМС получателю</span><p>Отправитель: ${esc(r.dir === "in" ? r.partner : workspaceRibbonName(c))}</p><p>Подтвердите получение <strong data-request-amount>${rub(req.amount)}</strong>.</p><p>Код: <strong data-demo-code>${req.code}</strong></p></div>
        ${approved ? "" : btn("Сумма не совпадает", "reject")}`, approved ? "" : "Подтвердить получение");
    } else if (((op === "writeoff" && r.dir === "out") || (op === "demo-sender-code" && r.dir === "in")) && req?.status === "approved") {
      flow = {mode:"writeoff", id:r.id, req};
      show(op === "demo-sender-code" ? "Демо: отправитель вводит код" : "Списать по коду",
        `${esc(r.partner)} · ${rub(req.amount)}. Введите код, который вам назвал получатель.`,
        '<label class="wallet-payout-field">Код из 6 цифр<input name="code" type="text" inputmode="numeric" maxlength="6" required></label>', "Подтвердить списание");
    }
  };
  root.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-payout-action]");
    if (!trigger) return;
    const [op,id] = trigger.dataset.payoutAction.split(":");
    if (op === "cancel") { dialog.close(); return; }
    if (op === "filter" && ["in","out"].includes(id) && (c.role !== "agent" || id === "in")) {
      state.filters[c.role] = id;
      finish();
      return;
    }
    if (op === "reject" && flow?.mode === "receive" && canAct(c)) {
      const r = rows(c).find((item) => item.id === flow.id);
      if (!r || r.pending !== flow.req || r.pending?.status !== "waiting") return;
      r.pending.status = "rejected";
      finish(r.id, "Сумма не подтверждена. Отправителю нужно указать верную сумму и отправить новый код.");
      return;
    }
    openRow(op, rows(c).find((r) => r.id === id));
  });
  dialog.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!flow || !canAct(c)) return;
    const r = rows(c).find((item) => item.id === flow.id);
    if (!r || r.pending !== flow.req) return;
    const fields = new FormData(e.target);
    const error = (message) => { dialog.querySelector("[data-payout-error]").textContent = message; };
    if (flow.mode === "request" && r.pending?.status !== "approved") {
      const amount = money(fields.get("amount"));
      const limit = payerBalance(r);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > limit) {
        error(`Введите сумму больше нуля и не больше ${rub(limit)}.`);
        return;
      }
      issueCode(r, amount);
      notifyPayout(c,r,"receiver",flow.req ? "replacement" : "request",amount);
      finish(r.id, `В демо-СМС получателя: сумма ${rub(amount)} и ${flow.req ? "новый код" : "код подтверждения"}.`);
      return;
    }
    if (flow.mode === "receive" && r.pending?.status === "waiting") {
      r.pending.status = "approved";
      finish(r.id, r.dir === "in" ? `Получение ${rub(r.pending.amount)} подтверждено. Передайте код отправителю.` : `Получатель подтвердил ${rub(r.pending.amount)}. Теперь можно списать по его коду.`);
      return;
    }
    if (flow.mode !== "writeoff" || r.pending?.status !== "approved") return;
    if (fields.get("code")?.trim() !== r.pending.code) {
      error("Код не подходит. Проверьте его и попробуйте снова.");
      return;
    }
    const {amount} = r.pending;
    r.receipts.push({amount, confirmedAt:Date.now()});
    r.pending = null;
    notifyPayout(c,r,"receiver","receipt",amount);
    notifyPayout(c,r,"sender","debit",amount);
    finish(r.id, r.dir === "in"
      ? `Отправитель ввёл код. Его задолженность уменьшилась на ${rub(amount)}.`
      : `Списано ${rub(amount)}. Сумма к выплате уменьшилась.`);
  });
}
