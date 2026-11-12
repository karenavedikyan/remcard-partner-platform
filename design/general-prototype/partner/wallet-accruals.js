import { buildAccrualLines } from "./wallet-accruals-data.js";
import {
  clientPurchaseLedgerRows,
  filterClientPurchaseLedgerRows,
  renderClientPurchaseLedgerRow,
} from "./client-purchase-ledger.js";
import {
  ACCRUAL_DEMO_ANCHOR,
  ACCRUAL_SCENARIOS,
  accrualOverview,
  allowedDirections,
  findAccessibleLine,
  formatHistoryDate,
  formatMoscowDate,
  formatRub,
  mergeSchedule,
} from "./wallet-accruals-math.js";

const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const CARD_EDITIONS = ["silver", "gold", "platinum", "black"];
const EDITION_LABELS = { silver: "Silver", gold: "Gold", platinum: "Platinum", black: "Black" };

const REMCARD_WORDMARK = `<span class="wallet-rc-lockup__word">remcard<em class="wallet-rc-lockup__dot">.</em></span>`;

function brandLockup() {
  return `<span class="wallet-rc-lockup" aria-hidden="true">${REMCARD_WORDMARK}</span>`;
}

let cardEdition = "black";
let focusEditionAfterRender = null;
let focusDirectionAfterRender = null;

export function getCardEdition() {
  return cardEdition;
}

export function consumeEditionFocusTarget() {
  const id = focusEditionAfterRender;
  focusEditionAfterRender = null;
  return id;
}

export function setCardEdition(edition, options = {}) {
  if (!CARD_EDITIONS.includes(edition)) return;
  cardEdition = edition;
  if (options.focusAfterRender) focusEditionAfterRender = edition;
}

export function getActiveDirection(config) {
  const s = getAccrualState(config);
  return s.activeDirection === "out" ? "out" : "in";
}

export function setActiveDirection(config, direction, options = {}) {
  if (direction !== "in" && direction !== "out") return;
  const s = getAccrualState(config);
  s.activeDirection = direction;
  s.historyFilter = "all";
  if (options.focusAfterRender) focusDirectionAfterRender = direction;
}

function consumeDirectionFocusTarget() {
  const id = focusDirectionAfterRender;
  focusDirectionAfterRender = null;
  return id;
}

const DIRECTION_LABELS = { in: "Мне должны", out: "Я должен" };

/** Schedule rows for detail drawer — access filter first, then opened card direction. */
export function detailScheduleRows(overview, incomingOnly, direction) {
  const rows = mergeSchedule(overview, allowedDirections(incomingOnly));
  if (!direction) return rows;
  return rows.filter((row) => row.direction === direction);
}

const states = new Map();

function stateKey(config) {
  return `${config.role}:${config.employerRole?.() || "self"}`;
}

export function getAccrualState(config) {
  const key = stateKey(config);
  if (!states.has(key)) {
    states.set(key, {
      scenario: "pending-only",
      panel: null,
      detailTab: "confirmed",
      scheduleExpanded: false,
      historyFilter: "all",
      activeDirection: "in",
      txnView: null,
      txnReturnPanel: null,
      txnReturnDetailTab: null,
    });
  }
  return states.get(key);
}

export function setAccrualScenario(config, scenario) {
  const s = getAccrualState(config);
  s.scenario = scenario;
  s.panel = null;
  s.detailTab = "confirmed";
  s.scheduleExpanded = false;
  s.historyFilter = "all";
  s.activeDirection = "in";
  s.txnView = null;
  s.txnReturnPanel = null;
  s.txnReturnDetailTab = null;
}

function linesFor(config) {
  return buildAccrualLines(getAccrualState(config).scenario);
}

function overviewFor(config, incomingOnly) {
  return accrualOverview(linesFor(config), ACCRUAL_DEMO_ANCHOR, {
    allowedDirections: allowedDirections(incomingOnly),
  });
}

function renderEditionSelector(edition) {
  return `<div class="wallet-accruals-editions" role="radiogroup" aria-label="Материал карты · только дизайн прототипа" data-testid="wallet-card-editions">
    ${CARD_EDITIONS.map((id) => {
      const selected = edition === id;
      return `<button type="button" class="wallet-accruals-edition-btn${selected ? " is-selected" : ""}" role="radio" aria-checked="${selected ? "true" : "false"}" tabindex="${selected ? "0" : "-1"}" data-accrual-edition="${id}" data-testid="wallet-edition-${id}">${EDITION_LABELS[id]}</button>`;
    }).join("")}
  </div>`;
}

function renderDirectionToggle(incomingOnly, activeDirection) {
  if (incomingOnly) return "";
  const tabs = [
    ["in", DIRECTION_LABELS.in, "wallet-direction-in"],
    ["out", DIRECTION_LABELS.out, "wallet-direction-out"],
  ];
  return `<div class="wallet-direction" role="tablist" aria-label="Направление взаиморасчётов" data-testid="wallet-direction">
    ${tabs
      .map(([dir, label, testid]) => {
        const selected = activeDirection === dir;
        return `<button type="button" class="wallet-direction__tab${selected ? " is-active" : ""}" role="tab" aria-selected="${selected ? "true" : "false"}" tabindex="${selected ? "0" : "-1"}" data-accrual-direction="${dir}" data-testid="${testid}">${esc(label)}</button>`;
      })
      .join("")}
  </div>`;
}

const DEMO_PARTNER_CARD_NUMBERS = {
  store: "RC 0000 0001 0482",
  company: "RC 0000 0002 0482",
  specialist: "RC 0000 0003 0482",
  agent: "RC 0000 0004 0482",
};

function workspaceOwnerRole(config) {
  return config.role === "employee" ? config.employerRole?.() : config.role;
}

/** Mirrors prototype roles.js workspace display ($e / ke) — demo labels only. */
export function workspaceRibbonName(config) {
  const role = workspaceOwnerRole(config);
  if (role === "store") return "Мой магазин";
  if (role === "company") return "Моя компания";
  return "Алексей";
}

export function demoPartnerCardNumber(config) {
  const role = workspaceOwnerRole(config);
  return DEMO_PARTNER_CARD_NUMBERS[role] || "RC 0000 0000 0000";
}

function formatAmountNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const stamp = iso.includes("T") ? iso : `${iso}T12:00:00+03:00`;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(stamp));
}

function formatDayMonth(iso) {
  if (!iso) return "—";
  const stamp = iso.includes("T") ? iso : `${iso}T12:00:00+03:00`;
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(new Date(stamp));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${day}.${month}`;
}

function historyRowFromLine(line, kind, amount, sortDate, paidEntry = null) {
  return {
    lineId: line.id,
    kind,
    amount,
    sortDate: sortDate || ACCRUAL_DEMO_ANCHOR,
    category: line.category,
    partner: line.partner,
    purchaseId: line.purchaseId || "",
    gross: line.gross,
    confirmDays: line.confirmDays,
    confirmDate: line.confirmDate,
    direction: line.direction,
    suspendedReason: line.suspendedReason,
    paidEntry,
  };
}

/** Demo operation history rows derived from canonical lines (read-only data). */
export function buildHistoryRows(lines, incomingOnly) {
  const allowed = new Set(allowedDirections(incomingOnly));
  const rows = [];
  for (const line of lines) {
    if (line.excluded) {
      if (!allowed.has(line.direction)) continue;
      rows.push(historyRowFromLine(line, "return", line.gross, ACCRUAL_DEMO_ANCHOR));
      continue;
    }
    if (!allowed.has(line.direction)) continue;
    if (line.waitingConfirmation > 0) {
      rows.push(historyRowFromLine(line, "waiting", line.waitingConfirmation, line.confirmDate || ACCRUAL_DEMO_ANCHOR));
    }
    if (line.confirmedUnpaid > 0) {
      rows.push(historyRowFromLine(line, "confirmed", line.confirmedUnpaid, line.confirmDate || ACCRUAL_DEMO_ANCHOR));
    }
    if (line.suspended > 0) {
      rows.push(historyRowFromLine(line, "suspended", line.suspended, line.confirmDate || ACCRUAL_DEMO_ANCHOR));
    }
    for (const h of line.paidHistory || []) {
      rows.push(
        historyRowFromLine(line, line.direction === "in" ? "received" : "paid-out", h.amount, h.at, h),
      );
    }
  }
  return rows.sort((a, b) => {
    const da = Date.parse(String(a.sortDate).includes("T") ? a.sortDate : `${a.sortDate}T12:00:00+03:00`) || 0;
    const db = Date.parse(String(b.sortDate).includes("T") ? b.sortDate : `${b.sortDate}T12:00:00+03:00`) || 0;
    if (db !== da) return db - da;
    return b.amount - a.amount;
  });
}

export function filterHistoryRows(rows, filter, incomingOnly) {
  if (filter === "all") return rows;
  if (filter === "waiting") return rows.filter((r) => r.kind === "waiting");
  if (filter === "received") return rows.filter((r) => r.kind === "received" || r.kind === "confirmed");
  if (filter === "paid") return rows.filter((r) => r.kind === "paid-out");
  return rows;
}

export function sumHistoryRowAmounts(rows) {
  return rows.reduce((n, r) => n + (r.kind === "return" ? 0 : r.amount), 0);
}

function badgeMetaForKind(kind, row) {
  switch (kind) {
    case "waiting":
      return { caption: "ожидает", extra: row.confirmDays != null ? `${row.confirmDays} дн` : "", tone: "graphite" };
    case "confirmed":
      return { caption: "подтверждено", extra: "", tone: "teal-outline" };
    case "received":
      return { caption: "получено", extra: formatShortDate(row.sortDate), tone: "teal-fill" };
    case "paid-out":
      return { caption: "выплачено", extra: formatShortDate(row.sortDate), tone: "red-fill" };
    case "suspended":
      return {
        caption: "приостановлено",
        extra: "",
        tone: "amber",
      };
    case "return":
      return { caption: "возврат", extra: "", tone: "muted" };
    case "schedule":
      return {
        caption: row.scheduleCaption || "ожидает",
        extra: row.scheduleExtra || "",
        tone: "graphite",
      };
    default:
      return { caption: kind, extra: "", tone: "graphite" };
  }
}

function renderStatusBadge(kind, amount, row, { strikethrough = false } = {}) {
  const meta = badgeMetaForKind(kind, row);
  const amountClass = strikethrough ? " wallet-status-badge__amount--strike" : "";
  return `<span class="wallet-status-badge wallet-status-badge--${meta.tone}" aria-hidden="true">
    <strong class="wallet-status-badge__amount${amountClass}">${formatRub(amount)}</strong>
    <span class="wallet-status-badge__caption">${esc(meta.caption)}</span>
    ${meta.extra ? `<span class="wallet-status-badge__extra">${esc(meta.extra)}</span>` : ""}
  </span>`;
}

function renderAccrualRow({
  line,
  amount,
  kind,
  sortDate,
  action,
  testid,
  strikethrough = false,
  scheduleCaption,
  scheduleExtra,
  asStatic = false,
  noteBelow = "",
}) {
  const row = {
    confirmDays: line.confirmDays,
    confirmDate: line.confirmDate,
    sortDate,
    suspendedReason: line.suspendedReason,
    scheduleCaption,
    scheduleExtra,
  };
  const tag = asStatic ? "div" : "button";
  const typeAttr = asStatic ? "" : ' type="button"';
  const actionAttr = asStatic ? "" : ` data-accrual-action="${esc(action)}"`;
  return `<${tag}${typeAttr} class="wallet-accrual-row wallet-accruals-history__row" data-accrual-row-kind="${esc(kind)}"${actionAttr} data-testid="${esc(testid)}">
    <span class="wallet-accrual-row__main">
      <strong class="wallet-accrual-row__title">${esc(line.category)}</strong>
      <span class="wallet-accrual-row__sub">${esc(line.partner)}${line.purchaseId ? ` · № ${esc(line.purchaseId)}` : ""}</span>
      <span class="wallet-accrual-row__sub wallet-accrual-row__date">${formatShortDate(sortDate)}</span>
    </span>
    ${renderStatusBadge(kind, amount, row, { strikethrough })}
  </${tag}>${noteBelow ? `<p class="wallet-line-detail__note">${esc(noteBelow)}</p>` : ""}`;
}

function renderHistoryTotalMarkup(total) {
  const rub = formatRub(total);
  const suffix = "\u00a0₽";
  const amount = rub.endsWith(suffix) ? rub.slice(0, -suffix.length) : rub;
  const currency = rub.endsWith(suffix) ? suffix : "";
  return `Всего <span class="wallet-accruals-history__total-value" data-testid="wallet-history-total-value">${esc(amount)}</span><span class="wallet-accruals-history__total-currency">${esc(currency)}</span>`;
}

function renderHistoryPanel(config, incomingOnly, activeDirection, options = {}) {
  const st = getAccrualState(config);
  const direction = incomingOnly ? "in" : activeDirection;
  const lines = linesFor(config);
  const allRows = buildHistoryRows(lines, incomingOnly).filter((r) => r.direction === direction);
  let filter = st.historyFilter;
  if (direction === "in" && filter === "paid") {
    filter = "all";
    st.historyFilter = "all";
  }
  if (direction === "out" && filter === "received") {
    filter = "all";
    st.historyFilter = "all";
  }
  const visible = filterHistoryRows(allRows, filter, incomingOnly);
  config.refreshClientPurchaseLedger?.();
  const fetchLedger =
    typeof config.clientPurchaseLedgerRows === "function"
      ? (dir) => config.clientPurchaseLedgerRows(dir)
      : (dir) => clientPurchaseLedgerRows(config, dir);
  const clientLedger = filterClientPurchaseLedgerRows(fetchLedger(direction), filter);
  const clientLedgerHtml = clientLedger.map((entry) => renderClientPurchaseLedgerRow(entry, direction)).join("");
  const total = sumHistoryRowAmounts(visible);
  const filters =
    direction === "in"
      ? [
          ["all", "Все"],
          ["waiting", "Ожидает"],
          ["received", "Получено"],
        ]
      : [
          ["all", "Все"],
          ["waiting", "Ожидает"],
          ["paid", "Выплачено"],
        ];

  const filterChips = filters
    .map(([id, label]) => {
      const active = st.historyFilter === id;
      return `<button type="button" class="wallet-accruals-history__filter${active ? " is-active" : ""}" data-accrual-action="history-filter:${id}" data-testid="wallet-history-filter-${id}">${esc(label)}</button>`;
    })
    .join("");

  const demoList = visible
    .map((r) =>
      renderAccrualRow({
        line: {
          id: r.lineId,
          category: r.category,
          partner: r.partner,
          purchaseId: r.purchaseId,
          gross: r.gross,
          confirmDays: r.confirmDays,
          confirmDate: r.confirmDate,
          suspendedReason: r.suspendedReason,
        },
        amount: r.amount,
        kind: r.kind,
        sortDate: r.sortDate,
        action: txnActionFromHistoryRow(r),
        testid: `wallet-history-row-${r.lineId}-${r.kind}`,
        strikethrough: r.kind === "return",
      }),
    )
    .join("");
  const list =
    clientLedgerHtml || demoList
      ? `${clientLedgerHtml}${demoList}`
      : `<p class="wallet-accruals-history__empty pw-muted">Операций пока нет</p>`;

  const historyHub =
    options.historyHubLink !== false
      ? `<a href="./partner-wallet-history.html" class="wallet-accruals-history__hub-link" data-testid="wallet-history-hub-link">Покупки и транзакции в разделе «История»</a>`
      : "";

  return `<aside class="wallet-accruals-history" data-testid="wallet-history" data-history-filter="${st.historyFilter}" data-history-direction="${direction}">
    <div class="wallet-accruals-history__header">
      <div class="wallet-accruals-history__header-text">
        ${historyHub}
        <span class="wallet-accruals-history__eyebrow">История · ${esc(DIRECTION_LABELS[direction])}</span>
        <strong class="wallet-accruals-history__total" data-testid="wallet-history-total">${renderHistoryTotalMarkup(total)}</strong>
      </div>
      <div class="wallet-accruals-history__filters" role="group" aria-label="Фильтр истории">${filterChips}</div>
    </div>
    <div class="wallet-accruals-history__list">${list}</div>
  </aside>`;
}

function renderQuickActions(direction, incomingOnly) {
  if (direction === "out" && incomingOnly) return "";
  const paidLabel = direction === "in" ? "Получено" : "Выплачено";
  const dir = direction;
  return `<div class="wallet-accruals-quick" data-testid="wallet-quick-${dir}" aria-label="Быстрые действия · ${direction === "in" ? "Мне должны" : "Я должен"}">
    <button type="button" class="wallet-accruals-quick__btn wallet-accruals-quick__btn--teal" data-accrual-quick="waiting:${dir}" data-testid="wallet-quick-${dir}-waiting">Ожидает</button>
    <button type="button" class="wallet-accruals-quick__btn wallet-accruals-quick__btn--teal" data-accrual-quick="schedule:${dir}" data-testid="wallet-quick-${dir}-schedule">График</button>
    <button type="button" class="wallet-accruals-quick__btn wallet-accruals-quick__btn--accent" data-accrual-quick="paid:${dir}" data-testid="wallet-quick-${dir}-paid">${paidLabel}</button>
  </div>`;
}

function renderCompactCard(config, direction, title, summary, testPrefix, incomingOnly, edition) {
  if (direction === "out" && incomingOnly) return "";
  const variant = direction === "in" ? "receivable" : "payable";
  const amountLabel = direction === "in" ? "к получению:" : "к оплате:";
  const ribbonName = workspaceRibbonName(config);
  const demoNumber = demoPartnerCardNumber(config);
  const ariaDirection = direction === "in" ? "Мне должны" : "Я должен";
  return `<div class="wallet-accruals-card-column" data-testid="wallet-column-${variant}">
    <button type="button" class="wallet-rc-card wallet-rc-card--${edition}" data-accrual-action="detail:${direction}" data-testid="wallet-rc-${variant}-face" aria-label="${esc(ariaDirection)} · ${amountLabel.replace(":", "")} ${formatRub(summary.confirmedNow)} подтверждено, в ожидании ${formatRub(summary.waiting)}. Открыть детали">
      <div class="wallet-rc-card__head">
        <span class="wallet-rc-card__ribbon" data-testid="wallet-${testPrefix}-ribbon">${esc(ribbonName)}</span>
        ${brandLockup()}
      </div>
      <div class="wallet-rc-card__body">
        <p class="wallet-rc-card__label" data-testid="wallet-${testPrefix}-amount-label">${amountLabel}</p>
        <div class="wallet-rc-card__hero">
          <strong class="wallet-rc-card__amount" data-testid="wallet-${testPrefix}">${formatAmountNumber(summary.confirmedNow)}</strong>
          <span class="wallet-rc-card__unit" aria-hidden="true">₽</span>
        </div>
        <p class="wallet-rc-card__label wallet-rc-card__label--secondary">в ожидании:</p>
        <div class="wallet-rc-card__waiting-row">
          <strong class="wallet-rc-card__waiting-amount" data-testid="wallet-${testPrefix}-waiting">${formatAmountNumber(summary.waiting)}</strong>
          <span class="wallet-rc-card__unit wallet-rc-card__unit--waiting" aria-hidden="true">₽</span>
        </div>
      </div>
      <span class="wallet-rc-card__pan" aria-label="номер карты партнёра (демо)" data-testid="wallet-${testPrefix}-demo-number">${esc(demoNumber)}</span>
    </button>
    ${renderQuickActions(direction, incomingOnly)}
  </div>`;
}

function scheduleBadgeParts(row) {
  if (row.kind === "handover") return { caption: "ожидает", extra: "передача" };
  if (!row.confirmDate) return { caption: "ожидает", extra: row.termsDays != null ? `${row.termsDays} дн` : "" };
  const days = row.days != null ? `${row.days} дн` : `${row.termsDays ?? ""} дн`.trim();
  return { caption: "ожидает", extra: `до ${formatDayMonth(row.confirmDate)} · ${days}` };
}

function renderSchedule(config, overview, incomingOnly, { embedded = false, direction = null } = {}) {
  const st = getAccrualState(config);
  const rows = detailScheduleRows(overview, incomingOnly, direction);
  if (!rows.length) {
    return `<div class="wallet-accrual-row-list"><p class="pw-muted wallet-accrual-empty">Операций пока нет</p></div>`;
  }
  const visible =
    embedded && !st.scheduleExpanded && rows.length > 5
      ? rows.slice(0, 5)
      : st.scheduleExpanded
        ? rows
        : rows.slice(0, embedded ? rows.length : rows.length);
  const toggle =
    rows.length > 5 && embedded
      ? `<button type="button" class="pw-btn wallet-accruals-schedule__toggle" data-accrual-action="schedule-toggle">${st.scheduleExpanded ? "Свернуть" : `Показать все (${rows.length})`}</button>`
      : "";
  const lineById = (id) => linesFor(config).find((l) => l.id === id);
  return `<div class="wallet-accrual-row-list" data-testid="wallet-accruals-schedule">${visible
    .map((row) => {
      const line = lineById(row.lineId) || {
        category: row.category,
        partner: row.partner,
        purchaseId: row.purchaseId,
        gross: row.amount,
        confirmDays: row.termsDays,
        confirmDate: row.confirmDate,
      };
      const lineWithId = { ...line, id: row.lineId };
      const parts = scheduleBadgeParts(row);
      return renderAccrualRow({
        line,
        amount: row.amount,
        kind: "schedule",
        sortDate: row.confirmDate || ACCRUAL_DEMO_ANCHOR,
        action: txnActionFromLine(lineWithId, "schedule", row.amount, row.confirmDate || ACCRUAL_DEMO_ANCHOR),
        testid: `wallet-schedule-${row.lineId}`,
        scheduleCaption: parts.caption,
        scheduleExtra: parts.extra,
      });
    })
    .join("")}${toggle}</div>`;
}

function bucketTabCounts(bucket, excluded, direction) {
  const lines = bucket.lines;
  return {
    confirmed: lines.filter((l) => l.confirmedUnpaid > 0).length,
    waiting:
      lines.filter((l) => l.waitingConfirmation > 0).length +
      excluded.filter((l) => l.direction === direction).length,
    suspended: lines.filter((l) => l.suspended > 0).length,
    paid: lines.reduce((n, l) => n + (l.paidHistory?.length || 0), 0),
    schedule: lines.filter((l) => l.waitingConfirmation > 0).length,
  };
}

function renderStatTiles(bucket) {
  const tiles = [
    ["confirmed", "Подтверждено", bucket.confirmedNow],
    ["waiting", "Ожидает", bucket.waiting],
    ["suspended", "Приостановлено", bucket.suspended],
  ];
  const nonZero = tiles.filter(([, , v]) => v > 0);
  const show = nonZero.length ? nonZero : tiles;
  return `<div class="wallet-accrual-stat-tiles" data-testid="wallet-detail-stat-tiles">${show
    .map(
      ([id, label, value]) =>
        `<div class="wallet-accrual-stat-tiles__tile" data-testid="wallet-detail-stat-${id}"><strong>${formatRub(value)}</strong><span>${esc(label)}</span></div>`,
    )
    .join("")}</div>`;
}

function panelBucketBody(kind, arg, overview, config, direction) {
  const bucket = arg === "in" ? overview.receivable : overview.payable;
  const lines = bucket.lines;
  const excluded = overview.excluded.filter((l) => l.direction === direction);

  if (kind === "confirmed") {
    const items = lines.filter((l) => l.confirmedUnpaid > 0);
    if (!items.length) return `<div class="wallet-accrual-row-list"><p class="pw-muted wallet-accrual-empty">Нет подтверждённых сумм</p></div>`;
    return `<div class="wallet-accrual-row-list">${items
      .map((l) =>
        renderAccrualRow({
          line: l,
          amount: l.confirmedUnpaid,
          kind: "confirmed",
          sortDate: l.confirmDate || ACCRUAL_DEMO_ANCHOR,
          action: txnActionFromLine(l, "confirmed", l.confirmedUnpaid, l.confirmDate || ACCRUAL_DEMO_ANCHOR),
        }),
      )
      .join("")}</div>`;
  }
  if (kind === "waiting") {
    const waitingLines = lines.filter((l) => l.waitingConfirmation > 0);
    const returns = excluded.map((l) =>
      renderAccrualRow({
        line: l,
        amount: l.gross,
        kind: "return",
        sortDate: ACCRUAL_DEMO_ANCHOR,
        action: txnActionFromLine(l, "return", l.gross, ACCRUAL_DEMO_ANCHOR),
        strikethrough: true,
      }),
    );
    if (!waitingLines.length && !returns.length) {
      return `<div class="wallet-accrual-row-list"><p class="pw-muted wallet-accrual-empty">Нет сумм в ожидании</p></div>`;
    }
    return `<div class="wallet-accrual-row-list">${waitingLines
      .map((l) =>
        renderAccrualRow({
          line: l,
          amount: l.waitingConfirmation,
          kind: "waiting",
          sortDate: l.confirmDate || ACCRUAL_DEMO_ANCHOR,
          action: txnActionFromLine(l, "waiting", l.waitingConfirmation, l.confirmDate || ACCRUAL_DEMO_ANCHOR),
          testid: `wallet-detail-waiting-${l.id}`,
        }),
      )
      .join("")}${returns.join("")}</div>`;
  }
  if (kind === "suspended") {
    const suspendedLines = lines.filter((l) => l.suspended > 0);
    if (!suspendedLines.length) {
      return `<div class="wallet-accrual-row-list"><p class="pw-muted wallet-accrual-empty">Нет приостановленных сумм</p></div>`;
    }
    return `<div class="wallet-accrual-row-list">${suspendedLines
      .map((l) =>
        renderAccrualRow({
          line: l,
          amount: l.suspended,
          kind: "suspended",
          sortDate: l.confirmDate || ACCRUAL_DEMO_ANCHOR,
          action: txnActionFromLine(l, "suspended", l.suspended, l.confirmDate || ACCRUAL_DEMO_ANCHOR),
          testid: `wallet-detail-suspended-${l.id}`,
        }),
      )
      .join("")}</div>`;
  }
  if (kind === "paid") {
    const paidRows = lines.flatMap((l) =>
      (l.paidHistory || []).map((h) => ({ line: l, h })),
    );
    if (!paidRows.length) {
      const empty = direction === "in" ? "Пока нет поступлений" : "Пока нет выплат";
      return `<div class="wallet-accrual-row-list"><p class="pw-muted wallet-accrual-empty">${empty}</p></div>`;
    }
    return `<div class="wallet-accrual-row-list">${paidRows
      .map(({ line: l, h }) =>
        renderAccrualRow({
          line: l,
          amount: h.amount,
          kind: l.direction === "in" ? "received" : "paid-out",
          sortDate: h.at,
          action: txnActionFromLine(l, l.direction === "in" ? "received" : "paid-out", h.amount, h.at, h.at),
          testid: `wallet-detail-paid-${l.id}-${h.at}`,
        }),
      )
      .join("")}</div>`;
  }
  return "";
}

function formatIsoShort(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}`;
}

function isoDateMinusDays(iso, days) {
  if (!iso || days == null) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() - Number(days));
  return d.toISOString().slice(0, 10);
}

export function buildTxnOpenAction({ lineId, rowKind, amount, sortDate = "", paidAt = "" }) {
  return `txn-open|${lineId}|${rowKind}|${amount}|${sortDate}|${paidAt}`;
}

export function parseTxnOpenAction(action) {
  if (!action.startsWith("txn-open|")) return null;
  const parts = action.split("|");
  if (parts.length < 4) return null;
  const [, lineId, rowKind, amountStr, sortDate = "", paidAt = ""] = parts;
  return { lineId, rowKind, amount: Number(amountStr), sortDate, paidAt };
}

function txnActionFromHistoryRow(r) {
  return buildTxnOpenAction({
    lineId: r.lineId,
    rowKind: r.kind,
    amount: r.amount,
    sortDate: r.sortDate,
    paidAt: r.kind === "received" || r.kind === "paid-out" ? r.sortDate : "",
  });
}

function txnActionFromLine(l, kind, amount, sortDate, paidAt = "") {
  return buildTxnOpenAction({
    lineId: l.id,
    rowKind: kind,
    amount,
    sortDate,
    paidAt: paidAt || (kind === "received" || kind === "paid-out" ? sortDate : ""),
  });
}

function badgeKindForTxn(rowKind) {
  if (rowKind === "schedule") return "schedule";
  return rowKind;
}

function operationDateForLine(line, txnView) {
  if (line.excluded || txnView.rowKind === "return") {
    return (txnView.sortDate || ACCRUAL_DEMO_ANCHOR).slice(0, 10);
  }
  if (line.confirmDate && line.confirmDays != null) {
    return isoDateMinusDays(line.confirmDate, line.confirmDays) || line.confirmDate.slice(0, 10);
  }
  const firstPaid = line.paidHistory?.[0]?.at;
  if (firstPaid && line.confirmDays != null) {
    return isoDateMinusDays(firstPaid, line.confirmDays) || firstPaid.slice(0, 10);
  }
  return (txnView.sortDate || ACCRUAL_DEMO_ANCHOR).slice(0, 10);
}

function defaultTxnViewForLine(line) {
  if (line.excluded) {
    return { lineId: line.id, rowKind: "return", amount: line.gross, sortDate: ACCRUAL_DEMO_ANCHOR, paidAt: "" };
  }
  if (line.waitingConfirmation > 0) {
    return {
      lineId: line.id,
      rowKind: "waiting",
      amount: line.waitingConfirmation,
      sortDate: line.confirmDate || ACCRUAL_DEMO_ANCHOR,
      paidAt: "",
    };
  }
  if (line.confirmedUnpaid > 0) {
    return {
      lineId: line.id,
      rowKind: "confirmed",
      amount: line.confirmedUnpaid,
      sortDate: line.confirmDate || ACCRUAL_DEMO_ANCHOR,
      paidAt: "",
    };
  }
  if (line.suspended > 0) {
    return {
      lineId: line.id,
      rowKind: "suspended",
      amount: line.suspended,
      sortDate: line.confirmDate || ACCRUAL_DEMO_ANCHOR,
      paidAt: "",
    };
  }
  const lastPaid = line.paidHistory?.[line.paidHistory.length - 1];
  if (lastPaid) {
    return {
      lineId: line.id,
      rowKind: line.direction === "in" ? "received" : "paid-out",
      amount: lastPaid.amount,
      sortDate: lastPaid.at,
      paidAt: lastPaid.at,
    };
  }
  return { lineId: line.id, rowKind: "waiting", amount: 0, sortDate: ACCRUAL_DEMO_ANCHOR, paidAt: "" };
}

function normalizedTxnKind(rowKind) {
  if (rowKind === "schedule") return "waiting";
  return rowKind;
}

function confirmDaysLabel(line) {
  if (line.confirmDays == null) return "—";
  if (line.confirmDays === 0) return "без ожидания";
  return `${line.confirmDays} дн`;
}

function txnStatusShortLabel(kind, direction) {
  switch (kind) {
    case "waiting":
    case "schedule":
      return "Ожидает";
    case "confirmed":
      return "Подтверждено";
    case "received":
      return "Получено";
    case "paid-out":
      return "Выплачено";
    case "suspended":
      return "Приостановлено";
    case "return":
      return "Возврат";
    default:
      return kind;
  }
}

function clearTxnDialogState(config, body) {
  const st = getAccrualState(config);
  st.panel = null;
  st.txnView = null;
  st.txnReturnPanel = null;
  st.txnReturnDetailTab = null;
  if (body) body.innerHTML = "";
}

function txnViewKey(view) {
  return `${view.lineId}|${view.rowKind}|${view.amount}|${view.sortDate}|${view.paidAt || ""}`;
}

function renderTxnHeroBadge(line, txnView) {
  const kind = badgeKindForTxn(txnView.rowKind);
  const row = {
    confirmDays: line.confirmDays,
    confirmDate: line.confirmDate,
    sortDate: txnView.sortDate,
    suspendedReason: line.suspendedReason,
    scheduleCaption: kind === "schedule" ? "ожидает" : undefined,
    scheduleExtra: kind === "schedule" ? waitingBadgeExtra(line) : undefined,
  };
  return renderStatusBadge(kind, txnView.amount, row, { strikethrough: txnView.rowKind === "return" }).replace(
    'class="wallet-status-badge ',
    'class="wallet-status-badge wallet-status-badge--hero ',
  );
}

function renderTxnFacts(line, txnView) {
  const kind = normalizedTxnKind(txnView.rowKind);
  const direction = line.direction === "in" ? "Мне должны" : "Я должен";
  const dateOp = operationDateForLine(line, txnView);
  let cells = [];

  if (kind === "return") {
    cells = [
      ["Направление", direction],
      ["Дата возврата", formatIsoShort(txnView.sortDate || dateOp)],
      ["Сумма по заказу", formatRub(line.gross)],
    ];
  } else if (kind === "waiting") {
    cells = [
      ["Направление", direction],
      ["Дата операции", formatIsoShort(dateOp)],
      ["Подтверждение до", line.confirmDate ? formatIsoShort(line.confirmDate) : "—"],
      ["Срок подтверждения", confirmDaysLabel(line)],
    ];
  } else if (kind === "confirmed") {
    cells = [
      ["Направление", direction],
      ["Дата операции", formatIsoShort(dateOp)],
      ["Подтверждено", line.confirmDate ? formatIsoShort(line.confirmDate) : "—"],
      ["Сумма по заказу", formatRub(line.gross)],
    ];
  } else if (kind === "suspended") {
    cells = [
      ["Направление", direction],
      ["Дата операции", formatIsoShort(dateOp)],
      ["Причина", line.suspendedReason || "—"],
      ["Сумма по заказу", formatRub(line.gross)],
    ];
  } else if (kind === "received" || kind === "paid-out") {
    const paidAt = txnView.paidAt || txnView.sortDate;
    cells = [
      ["Направление", direction],
      ["Дата выплаты", formatIsoShort(paidAt)],
      ["Сумма по заказу", formatRub(line.gross)],
      ["Срок подтверждения", confirmDaysLabel(line)],
    ];
  }

  return `<dl class="wallet-txn-facts">${cells
    .map(
      ([label, value]) =>
        `<div class="wallet-txn-facts__cell"><dt>${esc(label)}</dt><dd>${esc(String(value))}</dd></div>`,
    )
    .join("")}</dl>`;
}

function renderTxnTimeline(line, txnView) {
  const kind = normalizedTxnKind(txnView.rowKind);
  const dateOp = operationDateForLine(line, txnView);
  const steps = [];

  if (kind === "return") {
    steps.push({ state: "done", title: `Операция проведена · ${formatIsoShort(dateOp)}` });
    steps.push({
      state: "current",
      title: `Возврат до подтверждения · ${formatIsoShort(txnView.sortDate || dateOp)}`,
      tone: "danger",
    });
  } else if (kind === "waiting") {
    steps.push({ state: "done", title: `Операция проведена · ${formatIsoShort(dateOp)}` });
    steps.push({
      state: "current",
      title: line.confirmDate
        ? `Ожидает подтверждения · до ${formatIsoShort(line.confirmDate)}`
        : "Ожидает подтверждения",
    });
    steps.push({ state: "future", title: "Выплата · после подтверждения" });
  } else if (kind === "confirmed") {
    steps.push({ state: "done", title: `Операция проведена · ${formatIsoShort(dateOp)}` });
    steps.push({
      state: "done",
      title: line.confirmDate ? `Подтверждено · ${formatIsoShort(line.confirmDate)}` : "Подтверждено",
    });
    steps.push({ state: "future", title: "Выплата · по графику" });
  } else if (kind === "suspended") {
    steps.push({ state: "done", title: `Операция проведена · ${formatIsoShort(dateOp)}` });
    steps.push({
      state: "current",
      title: `Приостановлено · ${line.suspendedReason || "без комментария"}`,
      tone: "amber",
    });
    steps.push({ state: "future", title: "Выплата" });
  } else if (kind === "received" || kind === "paid-out") {
    const paidAt = txnView.paidAt || txnView.sortDate;
    const paidLabel = kind === "received" ? "Получено" : "Выплачено";
    steps.push({ state: "done", title: `Операция проведена · ${formatIsoShort(dateOp)}` });
    steps.push({ state: "done", title: "Подтверждено" });
    steps.push({
      state: "done",
      title: `${paidLabel} · ${formatIsoShort(paidAt)} · ${formatRub(txnView.amount)}`,
    });
  }

  return `<ol class="wallet-txn-timeline" data-testid="wallet-txn-timeline">${steps
    .map(
      (s) =>
        `<li class="wallet-txn-timeline__step wallet-txn-timeline__step--${s.state}${s.tone ? ` wallet-txn-timeline__step--${s.tone}` : ""}"><span class="wallet-txn-timeline__dot" aria-hidden="true"></span><span class="wallet-txn-timeline__label">${esc(s.title)}</span></li>`,
    )
    .join("")}</ol>`;
}

function renderTxnRelated(config, line, txnView, incomingOnly) {
  if (!line.purchaseId) return "";
  const direction = getActiveDirection(config);
  const dir = incomingOnly ? "in" : direction;
  const related = buildHistoryRows(linesFor(config), incomingOnly)
    .filter((r) => r.purchaseId === line.purchaseId && r.direction === dir)
    .sort((a, b) => {
      const db =
        Date.parse(String(b.sortDate).includes("T") ? b.sortDate : `${b.sortDate}T12:00:00+03:00`) || 0;
      const da =
        Date.parse(String(a.sortDate).includes("T") ? a.sortDate : `${a.sortDate}T12:00:00+03:00`) || 0;
      return db - da;
    });
  if (!related.length) return "";
  const currentKey = txnViewKey(txnView);
  return `<section class="wallet-txn-related" data-testid="wallet-txn-related" aria-label="Операции по заказу">
    <h4 class="wallet-txn-section-title">Операции по заказу № ${esc(line.purchaseId)}</h4>
    <div class="wallet-txn-related__list">${related
      .map((r) => {
        const view = {
          lineId: r.lineId,
          rowKind: r.kind,
          amount: r.amount,
          sortDate: r.sortDate,
          paidAt: r.kind === "received" || r.kind === "paid-out" ? r.sortDate : "",
        };
        const isCurrent = txnViewKey(view) === currentKey;
        const label = `${txnStatusShortLabel(r.kind, r.direction)} · ${formatIsoShort(r.sortDate)}`;
        if (isCurrent) {
          return `<div class="wallet-txn-related__item is-current" data-testid="wallet-txn-related-current"><span class="wallet-txn-related__label">${esc(label)}</span><strong class="wallet-txn-related__amount">${formatRub(r.amount)}</strong></div>`;
        }
        return `<button type="button" class="wallet-txn-related__item" data-accrual-action="${esc(buildTxnOpenAction(view))}" data-testid="wallet-txn-related-${esc(r.lineId)}-${esc(r.kind)}"><span class="wallet-txn-related__label">${esc(label)}</span><strong class="wallet-txn-related__amount">${formatRub(r.amount)}</strong></button>`;
      })
      .join("")}</div>
  </section>`;
}

function renderTransactionPanel(config, line, txnView, incomingOnly) {
  const st = getAccrualState(config);
  const purchaseSub = line.purchaseId ? `${line.partner} · Заказ № ${line.purchaseId}` : line.partner;
  const backLabel = st.txnReturnPanel ? "← Назад" : "← К истории";
  return `<article class="wallet-txn-panel" data-testid="wallet-txn-panel">
    <div class="wallet-txn-panel__top">
      <div class="wallet-txn-panel__head-row">
        <h3 id="accrual-panel-title" class="wallet-txn-panel__title">${esc(line.category)}</h3>
        <div class="wallet-txn-panel__hero" data-testid="wallet-txn-hero">${renderTxnHeroBadge(line, txnView)}</div>
        <button type="button" class="wallet-accrual-dialog__close" data-accrual-action="dialog-close" aria-label="Закрыть">×</button>
      </div>
      <p class="wallet-txn-panel__sub">${esc(purchaseSub)}</p>
    </div>
    ${renderTxnFacts(line, txnView)}
    ${renderTxnTimeline(line, txnView)}
    ${renderTxnRelated(config, line, txnView, incomingOnly)}
    <div class="wallet-txn-panel__footer">
      <button type="button" class="wallet-txn-back" data-accrual-action="txn-back" data-testid="wallet-txn-back">${esc(backLabel)}</button>
    </div>
  </article>`;
}

function waitingBadgeExtra(line) {
  if (line.handoverPending) return "передача";
  if (line.confirmDate) return `до ${formatDayMonth(line.confirmDate)} · ${line.confirmDays} дн`;
  return `${line.confirmDays} дн`;
}

function renderLinePanelContent(line) {
  return renderTransactionPanel({ role: "store" }, line, defaultTxnViewForLine(line), false);
}

function resolveTransactionPanel(config, lineId, incomingOnly) {
  const line = linesFor(config).find((l) => l.id === lineId);
  if (!line || (!line.excluded && !findAccessibleLine(linesFor(config), lineId, incomingOnly))) {
    return `<h3 id="accrual-panel-title">Категория</h3><p class="pw-muted">Запись недоступна для этого профиля.</p>`;
  }
  const st = getAccrualState(config);
  const view =
    st.txnView && st.txnView.lineId === lineId
      ? st.txnView
      : defaultTxnViewForLine(line);
  return renderTransactionPanel(config, line, view, incomingOnly);
}

function detailPanelContent(config, direction, overview, incomingOnly, activeTab) {
  const title = direction === "in" ? "Мне должны" : "Я должен";
  const tabs = [
    ["confirmed", direction === "in" ? "К получению" : "К оплате"],
    ["waiting", "Ожидает"],
    ["suspended", "Приостановлено"],
    ["paid", direction === "in" ? "Получено" : "Выплачено"],
    ["schedule", "График"],
  ];
  const bucket = direction === "in" ? overview.receivable : overview.payable;
  const counts = {
    ...bucketTabCounts(bucket, overview.excluded, direction),
    schedule: detailScheduleRows(overview, incomingOnly, direction).length,
  };
  const nav = `<div class="wallet-accrual-detail-tabs" role="tablist" aria-label="Статусы ${esc(title)}">${tabs
    .map(([id, label]) => {
      const count = counts[id] ?? 0;
      const muted = count === 0 ? " is-muted" : "";
      return `<button type="button" class="wallet-accrual-detail-tabs__btn${activeTab === id ? " is-active" : ""}${muted}" role="tab" aria-selected="${activeTab === id}" data-accrual-action="detail-tab:${id}:${direction}" data-testid="wallet-detail-tab-${id}">${esc(label)}<span class="wallet-accrual-detail-tabs__count">${count}</span></button>`;
    })
    .join("")}</div>`;

  let body = "";
  if (activeTab === "schedule") {
    body = renderSchedule(config, overview, incomingOnly, { embedded: true, direction });
  } else {
    body = panelBucketBody(activeTab, direction, overview, config, direction);
  }

  return `<div class="wallet-accrual-dialog__head">
    <h3 id="accrual-panel-title">${esc(title)}</h3>
    <button type="button" class="wallet-accrual-dialog__close" data-accrual-action="dialog-close" aria-label="Закрыть">×</button>
  </div>
  ${renderStatTiles(bucket)}
  ${nav}
  <div class="wallet-accrual-detail-body" role="tabpanel">${body}</div>`;
}

function panelContent(config, panel, overview, incomingOnly) {
  if (panel.startsWith("txn|")) {
    return resolveTransactionPanel(config, panel.slice(4), incomingOnly);
  }
  const idx = panel.indexOf(":");
  const kind = panel.slice(0, idx);
  const arg = panel.slice(idx + 1);

  if (kind === "detail") {
    const st = getAccrualState(config);
    return detailPanelContent(config, arg, overview, incomingOnly, st.detailTab || "confirmed");
  }

  if (kind === "txn" || kind === "line") {
    const lineId = kind === "line" ? arg : arg;
    return resolveTransactionPanel(config, lineId, incomingOnly);
  }

  if (incomingOnly && arg === "out") {
    return `<h3 id="accrual-panel-title">Недоступно</h3><p class="pw-muted">Для агента показаны только входящие суммы.</p>`;
  }

  const titles = {
    confirmed: arg === "in" ? "К получению сейчас" : "К оплате сейчас",
    waiting: "Ожидает подтверждения",
    suspended: "Приостановлено",
    paid: arg === "in" ? "Получено" : "Выплачено",
  };
  if (titles[kind]) {
    return `<h3 id="accrual-panel-title">${titles[kind]}</h3>${panelBucketBody(kind, arg, overview, config, arg)}`;
  }
  return "";
}

export function renderWalletAccruals(config, options = {}) {
  const incomingOnly = options.incomingOnly ?? config.role === "agent";
  const st = getAccrualState(config);
  const edition = getCardEdition();
  const activeDirection = incomingOnly ? "in" : getActiveDirection(config);
  const overview = overviewFor(config, incomingOnly);
  const scenarioOptions = Object.entries(ACCRUAL_SCENARIOS)
    .map(([id, label]) => `<option value="${id}" ${st.scenario === id ? "selected" : ""}>${esc(label)}</option>`)
    .join("");
  const cardSummary = activeDirection === "in" ? overview.receivable : overview.payable;
  const cardPrefix = activeDirection === "in" ? "receivable" : "payable";
  const cardTitle = DIRECTION_LABELS[activeDirection];
  const extensionLinks = [
    options.ledgerLink
      ? `<button type="button" class="wallet-accruals-extensions__link" data-accrual-action="open-master-ledger" data-testid="wallet-open-master-ledger">Реестр, сверка и Excel</button>`
      : "",
    options.agentRegistryLink
      ? `<button type="button" class="wallet-accruals-extensions__link" data-accrual-action="open-agent-registry" data-testid="wallet-open-agent-registry">Реестр начислений агента</button>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  const extensions = extensionLinks
    ? `<div class="wallet-accruals-extensions" data-testid="wallet-accruals-extensions">${extensionLinks}</div>`
    : "";

  return `<section class="wallet-accruals" data-wallet-accruals data-testid="wallet-accruals" data-incoming-only="${incomingOnly}" data-card-edition="${edition}" data-active-direction="${activeDirection}">
    <div class="wallet-accruals-layout">
      <div class="wallet-accruals-main">
        <div class="wallet-accruals-demo-bar" data-testid="wallet-accruals-demo-bar">
          <span class="pw-label">DEMO · сценарий</span>
          <label class="wallet-accruals-scenario"><span class="sr-only">Сценарий демонстрации</span>
            <select data-accrual-scenario data-testid="wallet-accrual-scenario">${scenarioOptions}</select>
          </label>
        </div>
        ${renderEditionSelector(edition)}
        ${renderDirectionToggle(incomingOnly, activeDirection)}
        <div class="wallet-accruals-cards ${incomingOnly ? "incoming-only" : ""}" data-testid="wallet-brand-card">
          ${renderCompactCard(config, activeDirection, cardTitle, cardSummary, cardPrefix, incomingOnly, edition)}
        </div>
        ${extensions}
      </div>
      ${renderHistoryPanel(config, incomingOnly, activeDirection, options)}
    </div>
    <dialog class="wallet-accrual-dialog" data-accrual-dialog aria-labelledby="accrual-panel-title">
      <form method="dialog" class="wallet-accrual-dialog__inner">
        <div data-accrual-panel-body>${st.panel ? panelContent(config, st.panel, overview, incomingOnly) : ""}</div>
        <div class="cab-actions"><button type="submit" class="pw-btn primary">Закрыть</button></div>
      </form>
    </dialog>
  </section>`;
}

export function hydrateWalletAccruals(config, root = document) {
  const section = root.querySelector("[data-wallet-accruals]");
  if (!section || section.dataset.hydrated) return;
  section.dataset.hydrated = "true";
  const incomingOnly = section.dataset.incomingOnly === "true";
  const refresh = () => config.refresh?.();
  const dialog = section.querySelector("[data-accrual-dialog]");
  const body = section.querySelector("[data-accrual-panel-body]");

  const openPanel = (panel) => {
    const st = getAccrualState(config);
    st.panel = panel;
    const overview = overviewFor(config, incomingOnly);
    if (body) body.innerHTML = panelContent(config, st.panel, overview, incomingOnly);
    dialog?.showModal();
  };

  const rememberTxnReturnPanel = (st) => {
    if (st.panel?.startsWith("txn|")) return;
    if (st.panel?.startsWith("detail:")) {
      st.txnReturnPanel = st.panel;
      st.txnReturnDetailTab = st.detailTab || "confirmed";
    } else {
      st.txnReturnPanel = null;
      st.txnReturnDetailTab = null;
    }
  };

  dialog?.addEventListener("close", () => {
    clearTxnDialogState(config, body);
  });

  section.addEventListener("change", (event) => {
    const select = event.target.closest("[data-accrual-scenario]");
    if (!select) return;
    setAccrualScenario(config, select.value);
    refresh();
  });

  const editionRadios = (group) => [...group.querySelectorAll("[data-accrual-edition]")];

  section.addEventListener("keydown", (event) => {
    const dirTab = event.target.closest("[data-accrual-direction]");
    if (dirTab) {
      const group = dirTab.closest(".wallet-direction");
      if (!group) return;
      const tabs = [...group.querySelectorAll("[data-accrual-direction]")];
      const idx = tabs.indexOf(dirTab);
      if (idx < 0) return;
      let nextIdx = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIdx = (idx + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIdx = (idx - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIdx = 0;
          break;
        case "End":
          nextIdx = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      setActiveDirection(config, tabs[nextIdx].dataset.accrualDirection, { focusAfterRender: true });
      refresh();
      return;
    }

    const radio = event.target.closest("[data-accrual-edition]");
    if (!radio) return;
    const group = radio.closest(".wallet-accruals-editions");
    if (!group) return;
    const radios = editionRadios(group);
    const idx = radios.indexOf(radio);
    if (idx < 0) return;
    let nextIdx = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIdx = (idx + 1) % radios.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIdx = (idx - 1 + radios.length) % radios.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = radios.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setCardEdition(radios[nextIdx].dataset.accrualEdition, { focusAfterRender: true });
    refresh();
  });

  section.addEventListener("click", (event) => {
    const directionBtn = event.target.closest("[data-accrual-direction]");
    if (directionBtn) {
      event.preventDefault();
      setActiveDirection(config, directionBtn.dataset.accrualDirection, { focusAfterRender: true });
      refresh();
      return;
    }

    const editionBtn = event.target.closest("[data-accrual-edition]");
    if (editionBtn) {
      event.preventDefault();
      setCardEdition(editionBtn.dataset.accrualEdition, { focusAfterRender: true });
      refresh();
      return;
    }

    const quickBtn = event.target.closest("[data-accrual-quick]");
    if (quickBtn) {
      event.preventDefault();
      const action = quickBtn.dataset.accrualQuick;
      const [tab, direction] = action.split(":");
      const st = getAccrualState(config);
      st.panel = `detail:${direction}`;
      st.detailTab = tab;
      openPanel(`detail:${direction}`);
      return;
    }

    const btn = event.target.closest("[data-accrual-action]");
    if (!btn) return;
    const action = btn.dataset.accrualAction;
    const st = getAccrualState(config);
    if (action === "open-master-ledger") {
      config.openWalletMasterLedger?.();
      return;
    }
    if (action === "open-agent-registry") {
      config.openWalletAgentRegistry?.();
      return;
    }
    if (action === "schedule-toggle") {
      st.scheduleExpanded = !st.scheduleExpanded;
      const overview = overviewFor(config, incomingOnly);
      if (body && st.panel) body.innerHTML = panelContent(config, st.panel, overview, incomingOnly);
      else refresh();
      return;
    }
    if (action.startsWith("detail-tab:")) {
      const parts = action.split(":");
      const tab = parts[1];
      const direction = parts[2];
      st.panel = `detail:${direction}`;
      st.detailTab = tab;
      const overview = overviewFor(config, incomingOnly);
      if (body) body.innerHTML = panelContent(config, st.panel, overview, incomingOnly);
      return;
    }
    if (action.startsWith("detail:")) {
      st.detailTab = "confirmed";
      openPanel(action);
      return;
    }
    if (action.startsWith("txn-open|")) {
      const parsed = parseTxnOpenAction(action);
      if (!parsed) return;
      const line = linesFor(config).find((l) => l.id === parsed.lineId);
      if (!line || (!line.excluded && !findAccessibleLine(linesFor(config), parsed.lineId, incomingOnly))) return;
      rememberTxnReturnPanel(st);
      st.txnView = parsed;
      openPanel(`txn|${parsed.lineId}`);
      return;
    }
    if (action === "txn-back") {
      if (st.txnReturnPanel) {
        st.txnView = null;
        st.panel = st.txnReturnPanel;
        st.detailTab = st.txnReturnDetailTab || st.detailTab || "confirmed";
        const overview = overviewFor(config, incomingOnly);
        if (body) body.innerHTML = panelContent(config, st.panel, overview, incomingOnly);
      } else {
        clearTxnDialogState(config, body);
        dialog?.close();
      }
      return;
    }
    if (action.startsWith("line:")) {
      const lineId = action.slice(5);
      const line = linesFor(config).find((l) => l.id === lineId);
      if (!line || (!line.excluded && !findAccessibleLine(linesFor(config), lineId, incomingOnly))) return;
      rememberTxnReturnPanel(st);
      st.txnView = defaultTxnViewForLine(line);
      openPanel(`txn|${lineId}`);
      return;
    }
    if (action.startsWith("history-filter:")) {
      const filter = action.slice(15);
      st.historyFilter = filter;
      refresh();
      return;
    }
    if (action === "dialog-close") {
      clearTxnDialogState(config, body);
      dialog?.close();
      return;
    }
    openPanel(action);
  });

  const focusEdition = consumeEditionFocusTarget();
  if (focusEdition) {
    queueMicrotask(() => {
      section.querySelector(`[data-accrual-edition="${focusEdition}"]`)?.focus();
    });
  }
  const focusDirection = consumeDirectionFocusTarget();
  if (focusDirection) {
    queueMicrotask(() => {
      section.querySelector(`[data-accrual-direction="${focusDirection}"]`)?.focus();
    });
  }
}

export function accrualTotalsForSettlement(config) {
  const overview = overviewFor(config, config.role === "agent");
  return {
    incoming: overview.receivable.confirmedNow,
    outgoing: overview.payable.confirmedNow,
  };
}
