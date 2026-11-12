// Prototype-only navigation and bank details. No API, payments or browser storage.
import { a as remcardLogo } from "./chunk-PG3I4FMB.js";
import { renderSettlementDemo, hydrateSettlementDemo, settlementTotals } from "./settlement-demo.js";
import { renderWalletAccruals, hydrateWalletAccruals } from "./wallet-accruals.js";
import {
  renderAgentReceivablesRegistry,
  hydrateAgentReceivablesRegistry,
} from "./agent-receivables-registry.js";
import { bankState, selectedLegal } from "./partner-legal.js";
const views = new Map();
let nextBankId = 1;
const esc = (v = "") =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const types = {
  person: "Физическое лицо",
  company: "Юридическое лицо",
  ip: "ИП",
};
const button = (label, action, extra = "") =>
  `<button type="button" class="pw-btn" data-cab-action="${action}" data-testid="cab-${action}" ${extra}>${label}</button>`;
function view(role) {
  if (!views.has(role))
    views.set(role, {
      partners: "active",
      invites: "incoming",
      wallet: "settlements",
      walletSubview: null,
    });
  return views.get(role);
}
function tabs(items, active, prefix) {
  return `<div class="cab-tabs" role="group" aria-label="${prefix === "partners" ? "Партнёры" : prefix === "invites" ? "Приглашения" : "Разделы кошелька"}">${items.map(([id, label]) => button(label, `${prefix}-${id}`, `aria-pressed="${active === id}"`)).join("")}</div>`;
}
export function showPartnerInvitations(role) {
  view(role).partners = "invites";
  view(role).invites = "outgoing";
}
export function showWalletSection(role, section) {
  const v = view(role);
  v.walletSubview = null;
  if (section === "requisites") v.wallet = "requisites";
  else v.wallet = "settlements";
}

export function openWalletMasterLedger(role) {
  const v = view(role);
  v.wallet = "settlements";
  v.walletSubview = "master-ledger";
}

export function closeWalletMasterLedger(role) {
  view(role).walletSubview = null;
}

export function openWalletAgentRegistry(role) {
  const v = view(role);
  v.wallet = "settlements";
  v.walletSubview = "agent-registry";
}

export function closeWalletAgentRegistry(role) {
  view(role).walletSubview = null;
}
export function renderPartners(config) {
  const s = view(config.role);
  const panel =
    s.partners === "active"
      ? config.active()
      : `${tabs(
          [
            ["incoming", "Входящие"],
            ["outgoing", "Отправленные"],
          ],
          s.invites,
          "invites",
        )}
    ${s.invites === "incoming" ? '<section class="pw-card"><h2>Входящие приглашения</h2><p class="pw-muted">В этом макете входящих приглашений нет. Здесь будут предложения партнёров, которые можно принять или отклонить.</p></section>' : config.outgoing()}`;
  return `<div class="pw cab-sections" data-cabinet-sections data-cab-role="${config.role}">${tabs(
    [
      ["active", "Мои партнёры"],
      ["invites", `Приглашения${config.pending ? ` · ${config.pending}` : ""}`],
    ],
    s.partners,
    "partners",
  )}<div class="cab-panel">${panel}</div><p class="pw-footnote">Приглашения сотрудников находятся отдельно в разделе команды. Здесь только партнёрство.</p></div>`;
}
function fields(d) {
  const field = (key, label, hint = "", required = false, numeric = false) =>
    `<div class="pw-field"><label for="bank-${key}">${label}${required ? ' <span class="pw-required">*</span>' : ""}</label><input id="bank-${key}" name="${key}" value="${esc(d[key])}" ${numeric ? 'inputmode="numeric"' : ""} ${required ? "required" : ""} data-testid="bank-${key}" autocomplete="off"><small>${hint}</small></div>`;
  return `<div class="pw-fields pw-two">${field("label", "Название набора", "Например, Личный счёт или Основной счёт компании.")}
    ${field("recipient", d.type === "company" ? "Название организации-получателя" : d.type === "ip" ? "ИП, фамилия, имя и отчество" : "Фамилия, имя и отчество получателя", "", true)}
    ${field("bank", "Название банка", "", true)}
    ${field("bik", "БИК", "9 цифр.", true, true)}
    ${field("account", d.type === "person" ? "Номер банковского счёта" : "Расчётный счёт", "20 цифр. Не номер карты.", true, true)}
    ${field("correspondent", "Корреспондентский счёт", "20 цифр.", true, true)}
    ${field("inn", "ИНН получателя", d.type === "company" ? "10 цифр." : "12 цифр. Для физического лица необязательно.", d.type !== "person", true)}
    ${d.type === "company" ? field("kpp", "КПП", "9 цифр, если применимо.", false, true) : ""}</div>`;
}
function details(r) {
  return `<dl class="pw-facts"><div><dt>Тип получателя</dt><dd>${types[r.type]}</dd></div><div><dt>Получатель</dt><dd>${esc(r.recipient)}</dd></div><div><dt>Банк</dt><dd>${esc(r.bank)}</dd></div><div><dt>БИК</dt><dd>${esc(r.bik)}</dd></div><div><dt>Счёт</dt><dd>${esc(r.account)}</dd></div><div><dt>Корреспондентский счёт</dt><dd>${esc(r.correspondent)}</dd></div>${r.inn ? `<div><dt>ИНН</dt><dd>${esc(r.inn)}</dd></div>` : ""}${r.type === "company" && r.kpp ? `<div><dt>КПП</dt><dd>${esc(r.kpp)}</dd></div>` : ""}</dl>`;
}
export function renderBankDetails(config) {
  const readonly = config.role === "employee";
  const owner = readonly
    ? config.canViewEmployerBank
      ? config.employerRole?.()
      : null
    : config.role;
  const s = bankState(owner || "unlinked-employee");
  const selected =
    s.records.find((r) => r.id === s.selected) ||
    s.records.find((r) => r.id === s.defaultId) ||
    s.records[0];
  const inWallet = config.location === "wallet";
  let content = "";
  if (s.draft && !readonly) {
    const d = s.draft;
    content = `<form data-bank-form novalidate><h3>${d.id ? "Изменить реквизиты" : "Новые реквизиты"}</h3><div class="pw-field"><label for="bank-type">Тип получателя</label><select id="bank-type" name="type" data-testid="bank-type">${Object.entries(
      types,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${d.type === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></div>${fields(d)}<p class="pw-error" role="alert" data-testid="bank-error">${esc(s.error)}</p><div class="pw-actions"><button type="submit" class="pw-btn primary" data-testid="bank-save">Сохранить реквизиты</button>${button("Отменить", "bank-cancel")}</div><p class="pw-footnote">Только демонстрационные данные. Форма проверяет формат, но не принадлежность счёта и не действительность реквизитов.</p></form>`;
  } else if (!s.records.length) {
    content = `<p class="pw-muted">${readonly ? (!config.canViewEmployerBank ? "Просмотр реквизитов работодателя доступен только при назначенном финансовом доступе. Сотрудник не может их редактировать." : "Работодатель пока не добавил реквизиты для получения оплаты. Сотрудник не может их редактировать.") : "Добавьте банковский счёт, на который партнёры смогут перечислять оплату по безналичному расчёту. Это необязательно для заполнения профиля."}</p>${!readonly ? button("Добавить реквизиты", "bank-add") : ""}`;
  } else if (inWallet) {
    content = `<div class="pw-field"><label for="bank-select">Получатель оплаты</label><select id="bank-select" data-testid="bank-select" ${readonly ? "disabled" : ""}>${s.records.map((r) => `<option value="${r.id}" ${r.id === selected?.id ? "selected" : ""}>${esc(r.label || r.recipient)} · …${esc(r.account.slice(-4))}</option>`).join("")}</select></div>
      <div class="cab-bank-preview"><span class="pw-kicker">${types[selected.type]}${s.defaultId === selected.id ? " · основные реквизиты" : ""}</span><strong>${esc(selected.recipient)}</strong><p class="pw-muted">${esc(selected.bank)} · счёт …${esc(selected.account.slice(-4))}</p></div>
      <div class="cab-actions">${button(s.expanded === selected.id ? "Скрыть подробности" : "Посмотреть полностью", `bank-expand:${selected.id}`)}${button("Скопировать реквизиты", `bank-copy:${selected.id}`)}${!readonly ? button("Применить для следующего расчёта", "bank-apply") + button("Добавить реквизиты", "bank-add") : '<span class="pw-label">Реквизиты работодателя: только просмотр</span>'}</div>
      ${s.expanded === selected.id ? details(selected) : ""}${s.applied ? `<p class="pw-success">Для следующего деморасчёта выбраны: ${esc(s.records.find((r) => r.id === s.applied)?.label || s.records.find((r) => r.id === s.applied)?.recipient)}.</p>` : ""}
      <p class="pw-footnote">Это реквизиты для получения оплаты, не вывод бонусов. Выбор не меняет уже оформленные счета и расчёты. Переводы в макете не выполняются.</p>`;
  } else {
    content =
      s.records
        .map(
          (r) =>
            `<article class="cab-bank-card"><div><strong>${esc(r.label || r.recipient)}</strong>${s.defaultId === r.id ? '<span class="pw-status">Основные</span>' : ""}<p class="pw-muted">${types[r.type]} · ${esc(r.bank)} · счёт …${esc(r.account.slice(-4))}</p></div><div class="cab-actions">${button(s.expanded === r.id ? "Скрыть" : "Посмотреть", `bank-expand:${r.id}`)}${button("Скопировать", `bank-copy:${r.id}`)}${!readonly ? button("Изменить", `bank-edit:${r.id}`) + (s.defaultId !== r.id ? button("Сделать основными", `bank-default:${r.id}`) : "") : ""}</div>${s.expanded === r.id ? details(r) : ""}</article>`,
        )
        .join("") +
      (!readonly ? button("Добавить ещё реквизиты", "bank-add") : "");
  }
  const identity=selectedLegal(owner);
  return `<section class="pw pw-card cab-bank" data-bank-panel data-bank-owner="${owner || "unlinked-employee"}" data-bank-readonly="${readonly}" data-testid="bank-panel"><div class="pw-card-top"><h2>${inWallet ? "Куда получать оплату" : "Реквизиты для получения оплаты"}</h2><span class="pw-label">${readonly ? "Только просмотр" : "Необязательно"}</span></div>${content}${identity ? `<p class="pw-footnote" data-testid="bank-settlement-identity">Сторона новых взаиморасчётов: <strong>${esc(identity.name)}</strong>${identity.inn ? ` · ИНН ${esc(identity.inn)}` : ""}. Уже созданные заказы и сверки сохраняют прежние данные.</p>` : ""}<p role="status" data-testid="bank-status">${esc(s.status)}</p><textarea class="cab-copy-fallback" data-bank-copy-value aria-label="Реквизиты для ручного копирования" hidden readonly></textarea></section>`;
}
function walletTabs(config, active) {
  const items = [];
  const canWorkspace =
    config.allowed.includes("bonus") ||
    config.allowed.includes("history") ||
    config.allowed.includes("settlements");
  if (canWorkspace) items.push(["settlements", "Взаиморасчёты"]);
  items.push(["requisites", "Реквизиты"]);
  const resolved =
    active === "requisites"
      ? "requisites"
      : active === "settlements" || active === "accruals" || active === "bonus"
        ? "settlements"
        : active;
  return {
    items,
    active: items.some(([id]) => id === resolved) ? resolved : items[0][0],
  };
}

export function renderWallet(config) {
  const s = view(config.role);
  const canWorkspace =
    config.allowed.includes("bonus") ||
    config.allowed.includes("history") ||
    config.allowed.includes("settlements");
  if (!canWorkspace)
    return `<section class="pw pw-card" data-testid="wallet-denied"><h2>Кошелёк недоступен</h2><p class="pw-muted">Работодатель не назначил право просмотра взаиморасчётов. Другие разделы ЛК остаются без изменений.</p></section>`;
  const { items, active } = walletTabs(config, s.wallet);
  s.wallet = active;
  const incomingOnly = config.role === "agent";
  const masterLedger =
    config.allowed.includes("settlements") ||
    (config.role !== "employee" &&
      ["store", "company", "specialist", "agent"].includes(config.role));
  let panel = "";
  if (s.wallet === "settlements") {
    if (s.walletSubview === "master-ledger" && masterLedger) {
      panel = renderSettlementDemo({
        ...config,
        walletMasterLedger: true,
      });
    } else if (s.walletSubview === "agent-registry" && config.role === "agent") {
      panel = renderAgentReceivablesRegistry(config);
    } else {
      panel = renderWalletAccruals(config, {
        incomingOnly,
        ledgerLink: masterLedger,
        agentRegistryLink: config.role === "agent",
        historyHubLink: !incomingOnly || config.role === "agent",
      });
    }
  } else {
    panel = renderBankDetails({ ...config, location: "wallet" });
  }
  return `<div class="pw cab-sections cab-wallet-shell" data-cabinet-sections data-cab-role="${config.role}" data-testid="wallet-shell" data-wallet-tab="${s.wallet}">
    <div class="cab-wallet-actions settlement-wallet-tabs" role="tablist" aria-label="Кошелёк">${tabs(items, s.wallet, "wallet")}</div>
    <div class="cab-panel" data-wallet-panel="${s.walletSubview || s.wallet}">${panel}</div>
    <p class="pw-footnote">Демонстрационные суммы и записи. Выплаты, переводы и API не выполняются.</p>
    </div>`;
}
// Kept only as a reference for the original ZIP. Not used by wallet navigation.
function renderLegacyWallet(config) {
  const s = view(config.role);
  const items = [];
  if (config.allowed.includes("bonus") || config.allowed.includes("history"))
    items.push(["credits", "Начисления"]);
  if (config.allowed.includes("history"))
    items.push(["debits", "Списания"], ["history", "История"]);
  const extra = config.allowed.includes("settlements")
    ? [
        ["settlements", "Взаиморасчёты"],
        ["requisites", "Реквизиты"],
      ]
    : [["requisites", "Реквизиты"]];
  if (![...items, ...extra].some(([id]) => id === s.wallet))
    s.wallet = items[0]?.[0] || extra[0][0];
  const all = config.transactions || [];
  const transactions = all.filter(
    (t) => s.wallet === "history" || t.type === s.wallet,
  );
  const amount = (v) => `${new Intl.NumberFormat("ru-RU").format(v)} ₽`;
  function transactionRow(t, example = false) {
    const style =
      t.state === "pending"
        ? "pending"
        : t.type === "refund"
          ? "refund"
          : t.type === "debits"
            ? "debit"
            : "credit";
    const label = {
      pending: "В ожидании",
      refund: "Возврат по сделке",
      debit: "Списание",
      credit: "Начисление",
    }[style];
    const sign =
      t.type === "debits"
        ? "−"
        : t.type === "refund"
          ? t.direction === "out"
            ? "−"
            : "+"
          : "+";
    return `<details class="cab-transaction cab-${style}"><summary><span class="cab-transaction-icon" aria-hidden="true">${style === "pending" ? "◷" : style === "refund" ? "↩" : sign}</span><span class="cab-transaction-main"><strong>${esc(t.title)}</strong><small>${esc(t.partner)} · ${esc(t.date)}</small><span class="cab-transaction-status">${label}${example ? " · пример" : ""}</span></span><strong>${sign}${amount(t.amount)}</strong></summary><div class="cab-transaction-detail"><p>${esc(t.description)}</p><p class="pw-muted">${esc(t.status)}</p><small>${example ? "Только образец оформления. Не включён в баланс и список операций." : "Демонстрационная операция. Начисление бонуса не означает, что деньги уже выплачены."}</small></div></details>`;
  }
  const samples = [
    {
      type: "credits",
      title: "Начисление бонуса",
      amount: 600,
      status: "Подтверждено",
    },
    {
      type: "debits",
      title: "Выплата партнёру",
      amount: 450,
      status: "Выплата подтверждена",
    },
    {
      type: "credits",
      state: "pending",
      title: "Бонус ожидает подтверждения",
      amount: 800,
      status: "В ожидании, не включён в подтверждённый баланс",
    },
    {
      type: "refund",
      direction: "out",
      title: "Возврат по сделке",
      amount: 300,
      status: "Обратная операция: отмена ранее начисленного бонуса",
    },
  ].map((t) => ({
    ...t,
    partner: "Пример оформления",
    date: "13.10.2026",
    description: "Иллюстрация типа и статуса операции, не запись кошелька.",
  }));
  const list = `<section class="pw-card cab-ledger" data-testid="wallet-transactions"><div class="pw-card-top"><h2>${s.wallet === "credits" ? "Начисления" : s.wallet === "debits" ? "Списания" : "История операций"}</h2><span class="pw-label">Демо</span></div><div class="cab-status-legend" aria-label="Обозначения операций"><span class="cab-credit">+ Начисление</span><span class="cab-debit">− Списание</span><span class="cab-pending">◷ В ожидании</span><span class="cab-refund">↩ Возврат</span></div>${transactions.length ? transactions.map((t) => transactionRow(t)).join("") : `<div class="cab-ledger-empty"><h3>${s.wallet === "debits" ? "Списаний пока нет" : "Операций пока нет"}</h3><p class="pw-muted">${s.wallet === "debits" ? "Здесь появятся подтверждённые списания и выплаты. Покупки клиентов сами по себе не являются списанием с вашего кошелька." : "Здесь будут операции, доступные в вашем рабочем контексте. Реальные данные пока не подключены."}</p></div>`}${s.wallet === "history" ? `<details class="cab-transaction-examples"><summary>Посмотреть примеры ожидания, списания и возврата</summary><p class="pw-footnote">Образцы оформления, не операции вашего кошелька. Суммы не влияют на баланс.</p>${samples.map((t) => transactionRow(t, true)).join("")}</details>` : ""}</section>`;
  return `<div class="pw cab-sections" data-cabinet-sections data-cab-role="${config.role}"><div class="cab-wallet-top"><section class="cab-remcard-card" data-testid="wallet-brand-card"><div class="cab-card-top">${remcardLogo}<span>КОШЕЛЁК · ДЕМО</span></div><div class="cab-card-balance"><span>Баланс бонусов · к получению</span><strong data-testid="wallet-balance">${esc(config.bonusTotal || "— ₽")}</strong></div><div class="cab-card-bottom"><span>${config.role === "employee" ? "Рабочий кошелёк организации" : "Партнёр RemCard"}</span><span>Не банковская карта</span></div></section><div class="cab-wallet-actions"><h2>Кошелёк RemCard</h2><p class="pw-muted">Бонусы и расчёты с партнёрами. Начисленные средства и подтверждённые выплаты показываются отдельно.</p>${tabs(extra, s.wallet, "wallet")}<p class="pw-footnote">${config.role === "employee" ? "Только разделы, разрешённые работодателем. Права не расширены." : "Без подключения платёжного сервиса. Карта обозначает кошелёк, а не банковский счёт."}</p></div></div>${tabs(items, s.wallet, "wallet")}<div class="cab-panel">${s.wallet === "requisites" ? renderBankDetails({ ...config, location: "wallet" }) : s.wallet === "settlements" ? renderSettlementDemo(config) : list}</div><p class="pw-footnote">Все суммы и операции в макете демонстрационные. «—» означает, что баланс не предоставлен, а не нулевой остаток. Вывод и переводы не выполняются.</p></div>`;
}
export function hydrateCabinet(config) {
  const walletConfig = {
    ...config,
    openWalletMasterLedger: () => {
      openWalletMasterLedger(config.role);
      config.refresh?.();
    },
    closeWalletMasterLedger: () => {
      closeWalletMasterLedger(config.role);
      config.refresh?.();
    },
    openWalletAgentRegistry: () => {
      openWalletAgentRegistry(config.role);
      config.refresh?.();
    },
    closeWalletAgentRegistry: () => {
      closeWalletAgentRegistry(config.role);
      config.refresh?.();
    },
  };
  hydrateSettlementDemo(walletConfig);
  hydrateWalletAccruals(walletConfig);
  hydrateAgentReceivablesRegistry(walletConfig);
  document
    .querySelectorAll("[data-cabinet-sections], [data-bank-panel]")
    .forEach((root) => {
      if (root.dataset.cabHydrated) return;
      root.dataset.cabHydrated = "true";
      const owner = root.dataset.bankOwner;
      const s = owner ? bankState(owner) : null;
      const readonly = root.dataset.bankReadonly === "true";
      const capture = () => {
        if (s?.draft)
          root
            .querySelectorAll("[data-bank-form] [name]")
            .forEach((el) => (s.draft[el.name] = el.value.trim()));
      };
      root.addEventListener("change", (e) => {
        if (!s) return;
        e.stopPropagation();
        if (e.target.id === "bank-type" && !readonly) {
          capture();
          s.error = "";
          config.refresh();
        }
        if (e.target.id === "bank-select" && !readonly) {
          s.selected = e.target.value;
          s.expanded = "";
          s.status = "";
          config.refresh();
        }
      });
      root.addEventListener("submit", (e) => {
        if (!e.target.matches("[data-bank-form]")) return;
        if (!s) return;
        e.preventDefault();
        e.stopPropagation();
        if (readonly) return;
        capture();
        const d = s.draft;
        const checks = [
          ["recipient", /\S/, "Укажите получателя."],
          ["bank", /\S/, "Укажите название банка."],
          ["bik", /^\d{9}$/, "БИК должен содержать 9 цифр."],
          ["account", /^\d{20}$/, "Счёт должен содержать 20 цифр."],
          [
            "correspondent",
            /^\d{20}$/,
            "Корреспондентский счёт должен содержать 20 цифр.",
          ],
        ];
        if (d.type !== "person" || d.inn)
          checks.push([
            "inn",
            d.type === "company" ? /^\d{10}$/ : /^\d{12}$/,
            "Проверьте длину ИНН: 10 цифр для организации, 12 для физлица или ИП.",
          ]);
        if (d.type === "company" && d.kpp)
          checks.push(["kpp", /^\d{9}$/, "КПП должен содержать 9 цифр."]);
        const invalid = checks.find(([key, re]) => !re.test(d[key] || ""));
        if (invalid) {
          s.error = invalid[2];
          root.querySelector("[data-testid=bank-error]").textContent = s.error;
          root.querySelector(`#bank-${invalid[0]}`)?.focus();
          return;
        }
        const record = {
          ...d,
          id: d.id || `bank-${nextBankId++}`,
          kpp: d.type === "company" ? d.kpp : "",
        };
        const idx = s.records.findIndex((r) => r.id === record.id);
        idx < 0 ? s.records.push(record) : s.records.splice(idx, 1, record);
        if (!s.defaultId) s.defaultId = record.id;
        if (!s.selected) s.selected = record.id;
        s.draft = null;
        s.error = "";
        s.status =
          "Реквизиты сохранены в макете и доступны в профиле и кошельке.";
        config.refresh();
      });
      root.addEventListener("click", async (e) => {
        const target = e.target.closest("[data-cab-action]");
        if (
          !target ||
          target.closest("[data-bank-panel]") !== (owner ? root : null)
        )
          return;
        e.stopPropagation();
        const [action, id] = target.dataset.cabAction.split(":");
        if (action.startsWith("bank-")) {
          if (!s) return;
          if (readonly && !["bank-copy", "bank-expand"].includes(action))
            return;
          if (action === "bank-add") {
            s.draft = { type: "person" };
            s.error = "";
            s.status = "";
          }
          if (action === "bank-edit") {
            s.draft = { ...s.records.find((r) => r.id === id) };
            s.error = "";
          }
          if (action === "bank-cancel") {
            s.draft = null;
            s.error = "";
          }
          if (action === "bank-default") {
            s.defaultId = id;
            s.applied = "";
            s.status =
              "Основные реквизиты изменены. Уже оформленные расчёты не затронуты.";
          }
          if (action === "bank-expand")
            s.expanded = s.expanded === id ? "" : id;
          if (action === "bank-apply") {
            s.applied = s.selected || s.defaultId;
            s.status =
              "Выбор применён только в макете. Деньги не переводились.";
          }
          if (action === "bank-copy") {
            const r = s.records.find((r) => r.id === id);
            const text = `${types[r.type]}\nПолучатель: ${r.recipient}\nБанк: ${r.bank}\nБИК: ${r.bik}\nСчёт: ${r.account}\nКорреспондентский счёт: ${r.correspondent}${r.inn ? `\nИНН: ${r.inn}` : ""}${r.kpp ? `\nКПП: ${r.kpp}` : ""}`;
            try {
              await navigator.clipboard.writeText(text);
              s.status = "Реквизиты скопированы.";
              root.querySelector("[data-testid=bank-status]").textContent =
                s.status;
            } catch {
              const area = root.querySelector("[data-bank-copy-value]");
              area.hidden = false;
              area.value = text;
              area.focus();
              area.select();
              root.querySelector("[data-testid=bank-status]").textContent =
                "Автоматическое копирование недоступно. Скопируйте выделенный текст вручную.";
            }
            return;
          }
        } else {
          const v = view(config.role);
          const [group, ...rest] = action.split("-");
          if (group === "wallet") {
            v.walletSubview = null;
            v.wallet =
              rest[0] === "requisites" ? "requisites" : "settlements";
          } else if (["partners", "invites"].includes(group)) {
            v[group] = rest.join("-");
          }
        }
        config.refresh();
      });
    });
}
