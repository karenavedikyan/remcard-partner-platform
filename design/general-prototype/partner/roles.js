import { Z as ve, _ as be } from "./chunk-RVN7VNK5.js";
import { initPartnersRedesign, renderPartnersRedesign, markOutgoingFocus, scrollToZone, hubChoose, hubFindShell, showcaseResults, compactPartnerCollection, openPartnerInviteWizard, showPartnerInviteReady, recipientInvitationSummary } from "./partners-redesign.js?v=coop2";
import { initCooperationControls, cooperationHasUnsavedDraft, requestClose } from "./cooperation-controls.js?v=coop8";
import {
  renderProfileWizard,
  hydrateProfileWizards,
  renderEmployerIdLookup,
  employeeEmployerRole,
  profileHasUnsavedChanges,
  syncProfileIdentity,
} from "./profile-wizard.js";
import { renderPartnerTypeSettings, hydratePartnerTypeSettings } from "./partner-type.js";
import { hydrateCatalogWizard } from "./catalog-wizard.js";
import { catalogPendingView } from "./catalog-status.js";
import { profileCatalogSeed, hasCatalogValue } from "./catalog-prefill.js";
import {
  normalizeContact,
  validContact,
  contactError,
  formatPhoneForDisplay,
} from "./contact-validation.js?v=ad03d606643d";
import {
  navigatorExplanation,
  addDirection,
  customDirectionForm,
} from "./direction-options.js";
import {
  stageProposalSection,
  categoryProposalSection,
  hydrateStageProposals,
} from "./stage-proposals.js";
import {
  specialistPresetSection,
  ensureSpecialistPresetDictionary,
} from "./specialist-presets.js";
import { hydrateMobileNavigation } from "./mobile-navigation.js";
import { renderCareSection, careHomeTeaser, hydrateCareServices } from "./care-services.js?v=care2";
import { renderProcurementSection, procurementHomeTeaser, hydrateProcurement } from "./procurement.js?v=proc5";
import { renderClientAppeals, clientAppealsPageTitle, clientAppealsPageMuted, clientAppealsHeaderPill, clientAppealsSubpageBack, hydrateClientAppeals, openClientAppealFromLegacy, resetClientAppealsNav, primeClientAppealsView, refreshClientPurchaseLedgerForWallet } from "./client-appeals.js?v=ca10";
import { clientPurchaseLedgerRows } from "./client-purchase-ledger.js";
import { createEmptyStates, renderEmptyState, emptyStateActive, renderDatasetControl, emptyHeaderPill } from "./empty-states.js?v=es2";
import { entryState, isEntryScreen, renderEntry, hydrateEntry, initializeEntry } from "./registration-entry.js";
import {
  renderAccountMenu,
  renderProfileSessionActions,
  renderSignedOut,
  hydrateAccountSession,
} from "./account-session.js";
import { filterDirectory, directionLabel, stageLabel, directoryFacts, directoryFullDirections } from "./partner-directory.js";
import { openSettlementPartner, settlementPartnerSummary } from "./settlement-demo.js";
import {
  certificateIdentity,
  certificateCard as renderCertificateCard,
  hydrateCertificateCard,
} from "./certificate-view.js";
import {
  renderPartners,
  renderWallet,
  renderBankDetails,
  hydrateCabinet,
  showPartnerInvitations,
  showWalletSection,
} from "./cabinet-sections.js";
import "./chunk-5TBO732O.js";
var xe =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
function Ke(e, t) {
  return `<button class="btn ${t ? "action-saved" : "primary"}" type="submit" data-save-label="${e}">${t ? xe + "Сохранено" : e}</button>`;
}
function Ye(e) {
  let t = e?.querySelector("[data-save-label]");
  (t &&
    (t.classList.remove("action-saved"),
    t.classList.add("primary"),
    (t.textContent = t.dataset.saveLabel)),
    e?.querySelector("[data-save-result]")?.remove());
}
var Je = () =>
    '<p class="action-result" data-save-result role="status">Данные сохранены в макете до обновления страницы. Ничего не опубликовано.</p>',
  X,
  jt;
function Re() {
  (clearTimeout(jt), X?.remove(), (X = null));
}
function U(e, t = "success") {
  (Re(),
    (X = document.createElement("div")),
    (X.className = `action-toast action-${t}`),
    X.setAttribute("role", "status"),
    X.setAttribute("aria-live", "polite"),
    X.setAttribute("popover", "manual"));
  let a = document.createElement("span");
  (a.setAttribute("aria-hidden", "true"),
    t === "success"
      ? (a.innerHTML = xe)
      : (a.textContent = t === "error" ? "!" : "i"));
  let s = document.createElement("span");
  s.textContent = e;
  let n = document.createElement("button");
  ((n.type = "button"),
    (n.textContent = "Закрыть"),
    n.setAttribute("aria-label", "Закрыть сообщение"),
    n.addEventListener("click", Re),
    X.append(a, s, n),
    document.body.append(X),
    X.showPopover
      ? X.showPopover()
      : (document.querySelector("dialog[open]") || document.body).append(X),
    (jt = setTimeout(Re, 8e3)));
}
async function Qe(e, t, a, s) {
  if (e.disabled) return;
  e.dataset.copyLabel ||= e.textContent;
  let n = e.dataset.copyLabel;
  (e.classList.remove("action-saved"),
    (e.disabled = !0),
    e.setAttribute("aria-busy", "true"),
    (e.textContent = "Копируем…"),
    a && ((a.textContent = "Копируем…"), a.classList.remove("action-result")));
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("clipboard unavailable");
    if ((await navigator.clipboard.writeText(t), !e.isConnected)) return;
    ((e.innerHTML = xe + "Скопировано"),
      e.classList.add("action-saved"),
      a &&
        ((a.textContent = "Скопировано. Можно вставить в сообщение."),
        a.classList.add("action-result")));
  } catch {
    if (!e.isConnected) return;
    ((e.textContent = n),
      e.classList.remove("action-saved"),
      a &&
        ((a.textContent =
          "Не удалось скопировать автоматически. Текст выделен: скопируйте его вручную."),
        a.classList.remove("action-result")),
      s?.focus(),
      s?.select());
  } finally {
    ((e.disabled = !1), e.removeAttribute("aria-busy"));
  }
}
function Lt(e) {
  let t = new Map(),
    a = new Map(),
    s = new Map(),
    n = null,
    l = e.escape,
    o = (m) => (
      t.has(m) ||
        t.set(m, {
          q: "",
          archive: "active",
          status: "",
          sort: "newest",
          size: 25,
          page: 1,
          view: "list",
          selected: new Set(),
          feedback: null,
          partnerType: "", specialization: "", city: "", stage: "",
        }),
      t.get(m)
    ),
    b = (m) => `data-coll-key="${l(m)}"`,
    A = (m, c, g, h = "") =>
      `<button type="button" class="btn" ${b(m)} data-coll-action="${c}" ${h}>${g}</button>`,
    x = (m) =>
      a
        .get(m)
        .items.filter((c) => !c.deleted)
        .map((c, g) => ({
          item: c,
          index: g,
          ...e.describe(a.get(m).type, c),
        })),
    te = (m) => {
      let c = o(m),
        g = c.q.trim().toLocaleLowerCase("ru"),
        h = x(m).filter(
          (y) =>
            (c.archive === "archive" ? !!y.item.archived : !y.item.archived) &&
            (!c.status || y.status === c.status) &&
            (a.get(m).type !== "partners" || filterDirectory([y.item], { q: "", type: c.partnerType, specialization: c.specialization, city: c.city, stage: c.stage }, Le).length > 0) &&
            (!g ||
              `${y.name} ${y.detail} ${y.search || ""}`
                .toLocaleLowerCase("ru")
                .includes(g) || a.get(m).type === "partners" && filterDirectory([y.item], { q: g }, Le).length > 0),
        );
      return (
        h.sort((y, q) =>
          c.sort === "name"
            ? y.name.localeCompare(q.name, "ru")
            : c.sort === "status"
              ? y.status.localeCompare(q.status, "ru")
              : q.index - y.index,
        ),
        h
      );
    },
    le = (m) => {
      let c = o(m),
        g = te(m);
      return (
        (c.page = Math.max(
          1,
          Math.min(c.page, Math.ceil(g.length / c.size) || 1),
        )),
        g.slice((c.page - 1) * c.size, c.page * c.size)
      );
    };
  function re(m) {
    let c = o(m),
      g = a.get(m),
      h = te(m),
      y = x(m),
      q = y.filter((S) => S.item.archived).length,
      j = [...new Set(y.map((S) => S.status))];
    const partnerOptions = g.type === "partners" ? `<div class="active-partner-main-filters" data-testid="active-partner-filters"><label class="field">Тип партнёра<select ${b(m)} data-coll-control="partnerType" data-testid="active-partner-type"><option value="">Все типы</option>${["agent", "specialist", "store", "company"].map((type) => `<option value="${type}" ${c.partnerType === type ? "selected" : ""}>${l(ee[type].label)}</option>`).join("")}</select></label><label class="field">Специализация<select ${b(m)} data-coll-control="specialization" data-testid="active-partner-specialization"><option value="">Все специализации</option>${["services", "products"].map((group) => `<optgroup label="${group === "services" ? "Работы и услуги" : "Товары и материалы"}">${Le[group].map((item) => `<option value="${group}:${l(item.id)}" ${c.specialization === `${group}:${item.id}` ? "selected" : ""}>${l(item.label)}</option>`).join("")}</optgroup>`).join("")}</select></label></div>` : "";
    const extraPartners = g.type === "partners" ? `<label class="field">Город<select ${b(m)} data-coll-control="city" data-testid="active-partner-city"><option value="">Все города</option>${[...new Set(g.items.map((item) => item.city).filter(Boolean))].sort((first, second) => first.localeCompare(second, "ru")).map((city) => `<option value="${l(city)}" ${c.city === city ? "selected" : ""}>${l(city)}</option>`).join("")}</select></label><label class="field">Этап ремонта<select ${b(m)} data-coll-control="stage" data-testid="active-partner-stage"><option value="">Все этапы</option>${Le.stages.map((item) => `<option value="${l(item.id)}" ${c.stage === item.id ? "selected" : ""}>${l(item.label)}</option>`).join("")}</select></label>` : "";
    const chips = g.type === "partners" ? [["partnerType", c.partnerType ? `Тип: ${ee[c.partnerType]?.label || c.partnerType}` : ""], ["specialization", directionLabel(Le, c.specialization)], ["city", c.city ? `Город: ${c.city}` : ""], ["stage", c.stage ? `Этап: ${stageLabel(Le, c.stage)}` : ""]].filter(([, label]) => label) : [];
    return `${partnerOptions}<div class="collection-tools"><label class="field collection-search">Поиск<input type="search" ${b(m)} data-coll-control="q" value="${l(c.q)}" placeholder="${g.type === "clients" ? "Имя, контакт, город или задача" : "Название, партнёр или категория"}"></label>
      <label class="field">Показывать<select ${b(m)} data-coll-control="archive"><option value="active" ${c.archive === "active" ? "selected" : ""}>Активные (${y.length - q})</option><option value="archive" ${c.archive === "archive" ? "selected" : ""}>Архив (${q})</option></select></label>
      <details class="collection-filters" ${c.status || c.sort !== "newest" || c.city || c.stage ? "open" : ""}><summary>${g.type === "partners" ? "Ещё фильтры и сортировка" : "Фильтры и сортировка"}</summary><div class="row">${extraPartners}<label class="field">Статус<select ${b(m)} data-coll-control="status"><option value="">Все</option>${j.map((S) => `<option value="${l(S)}" ${c.status === S ? "selected" : ""}>${l(S)}</option>`).join("")}</select></label><label class="field">Порядок<select ${b(m)} data-coll-control="sort">${[
        ["newest", "Сначала новые"],
        ["name", "По названию"],
        ["status", "По статусу"],
      ]
        .map(
          ([S, p]) =>
            `<option value="${S}" ${c.sort === S ? "selected" : ""}>${p}</option>`,
        )
        .join("")}</select></label></div></details>
      <div class="segment collection-view" aria-label="Вид списка">${["list", "cards"].map((S) => `<button ${b(m)} data-coll-action="view-${S}" aria-pressed="${c.view === S}">${S === "list" ? "Список" : "Карточки"}</button>`).join("")}</div></div>
      ${chips.length ? `<div class="directory-active" aria-label="Применённые фильтры партнёров">${chips.map(([field, label]) => A(m, `clear-${field}`, `${l(label)} ×`, `aria-label="Снять фильтр ${l(label)}"`)).join("")}</div>` : ""}
      <div class="collection-count"><span>Найдено: ${h.length}</span>${c.q || c.status || c.archive !== "active" || chips.length ? A(m, "reset", "Сбросить фильтры") : ""}<small>${g.readOnly ? "Доступен просмотр. Управление выполняет уполномоченный сотрудник." : c.archive === "archive" ? "Архив не отключает ссылки и не расторгает сотрудничество." : "Выделите записи, чтобы работать с ними вместе."}</small></div>`;
  }
  function K(m) {
    let c = o(m),
      g = a.get(m),
      h = c.selected.size;
    if (!h || g.readOnly) return "";
    let y =
      c.archive === "archive"
        ? [["restore", "Вернуть из архива"]]
        : [["archive", "В архив"]];
    return (
      ["certificates", "invitations"].includes(g.type) &&
        y.push([
          "disable",
          g.type === "certificates"
            ? "Отключить сертификаты"
            : "Отключить ссылки",
        ]),
      g.type !== "partners" && y.push(["delete", "Удалить"]),
      `<div class="collection-bulk" role="region" aria-label="Массовые действия"><strong>Выбрано: ${h}</strong><div class="row">${y.map(([q, j]) => A(m, q, j)).join("")}${A(m, "clear", "Снять выбор")}</div><div class="row">${A(m, "select-all", `Выбрать все найденные (${te(m).length})`)}<small>Это отдельное действие, не только текущая страница.</small></div></div>`
    );
  }
  function Q(m) {
    let c = o(m).feedback;
    return c
      ? `<div class="notice collection-feedback" data-tone="${c.failures?.length ? "partial" : "success"}" role="status"><strong>${c.failures?.length ? "" : xe}${l(c.title)}</strong>${c.failures?.length ? `<details><summary>Почему не выполнено: ${c.failures.length}</summary><ul>${c.failures.map((g) => `<li>${l(g.name)}: ${l(g.reason)}</li>`).join("")}</ul><p>Эти записи остались выделенными. Повторите действие или снимите выбор.</p></details>` : ""}</div>`
      : "";
  }
  function u(m) {
    let c = o(m),
      g = a.get(m),
      h = le(m),
      y = h.filter((S) => c.selected.has(S.item.id)).length,
      q = (S) =>
        g.readOnly
          ? ""
          : `<input type="checkbox" ${b(m)} data-coll-select="${l(S.item.id)}" ${c.selected.has(S.item.id) ? "checked" : ""} aria-label="Выбрать ${l(S.name)}">`,
      j = g.readOnly
        ? ""
        : `<label class="collection-select-page"><input type="checkbox" ${b(m)} data-coll-page ${y === h.length && h.length ? "checked" : ""} ${y > 0 && y < h.length ? 'data-partial="true"' : ""} ${h.length ? "" : "disabled"}> Выбрать страницу (${h.length})</label>`;
    return h.length
      ? c.view === "cards"
        ? `${j}<div class="collection-cards">${h.map((S) => `<div class="collection-card-shell ${c.selected.has(S.item.id) ? "selected" : ""}" data-record-id="${l(S.item.id)}">${g.readOnly ? "" : `<label class="collection-card-select">${q(S)} Выбрать</label>`}${e.card(g.type, S.item, m, g.readOnly)}</div>`).join("")}</div>`
        : `${j}<table class="collection-table collection-table--certificates"><thead><tr><th class="select-col"><span class="sr-only">Выбор</span></th><th>${g.type === "clients" ? "Клиент" : "Название"}</th><th>Подробности</th><th>Статус</th><th><span class="sr-only">Действия</span></th></tr></thead><tbody>${h.map((S) => `<tr class="${c.selected.has(S.item.id) ? "selected" : ""}" data-record-id="${l(S.item.id)}"><td class="select-col">${q(S)}</td><td><button class="collection-open" ${b(m)} data-coll-open="${l(S.item.id)}">${l(S.name)}</button>${S.caption ? `<small>${l(S.caption)}</small>` : ""}</td><td class="collection-detail">${l(S.detail)}</td><td><span class="pill">${l(S.status)}</span></td><td class="collection-row-action">${e.rowActions(g.type, S.item, m, g.readOnly, true)}</td></tr>`).join("")}</tbody></table>`
      : `<section class="panel collection-empty"><h3>Записей не найдено</h3><p class="muted">${l(c.q || c.status ? "Попробуйте другие условия поиска." : c.archive === "archive" ? "В архиве пока нет записей." : g.empty || "Пока нет записей.")}</p></section>`;
  }
  function $(m) {
    a.set(m.key, m);
    let c = m.key,
      g = o(c),
      h = new Set(m.items.filter((j) => !j.deleted).map((j) => j.id));
    for (let j of g.selected) h.has(j) || g.selected.delete(j);
    let y = te(c),
      q = Math.max(1, Math.ceil(y.length / g.size));
    return (
      le(c),
      `<section class="collection" data-collection="${l(c)}" aria-label="${l(m.title || "Список записей")}">${re(c)}${Q(c)}${K(c)}${u(c)}
      <div class="collection-footer"><label class="field">На странице<select ${b(c)} data-coll-control="size">${[25, 50, 100].map((j) => `<option ${g.size === j ? "selected" : ""}>${j}</option>`).join("")}</select></label><span>Страница ${g.page} из ${q}</span><div class="row">${A(c, "prev", "Назад", g.page <= 1 ? "disabled" : "")}${A(c, "next", "Далее", g.page >= q ? "disabled" : "")}</div></div>
      ${m.seed !== !1 ? `<details class="collection-demo"><summary>Проверить макет с большим списком</summary><p class="small">Добавит до 80 вымышленных записей только в этот просмотр. На одной записи можно проверить повтор после временной ошибки.</p>${A(c, "seed", "Добавить 80 демозаписей")}</details>` : ""}</section>`
    );
  }
  function v() {
    (document
      .querySelectorAll("[data-coll-page]")
      .forEach((m) => (m.indeterminate = m.dataset.partial === "true")),
      e.afterPaint?.());
  }
  function I(m) {
    let c = document.querySelector(`[data-collection="${CSS.escape(m)}"]`);
    if (!c) return;
    let g = document.activeElement,
      h = g?.dataset.collControl,
      y = g?.selectionStart,
      q = g?.selectionEnd,
      j = ["data-coll-select", "data-coll-page", "data-coll-action"].find((f) =>
        g?.hasAttribute(f),
      ),
      S = j ? g.getAttribute(j) : null,
      p = window.scrollY;
    if (((c.outerHTML = compactPartnerCollection($(a.get(m)))), v(), h)) {
      let f = document.querySelector(
        `[data-collection="${CSS.escape(m)}"] [data-coll-control="${h}"]`,
      );
      (f?.focus({ preventScroll: !0 }),
        y != null && f?.setSelectionRange && f.setSelectionRange(y, q));
    } else
      j &&
        document
          .querySelector(
            `[data-collection="${CSS.escape(m)}"] [${j}="${CSS.escape(S)}"]`,
          )
          ?.focus({ preventScroll: !0 });
    window.scrollTo(0, p);
  }
  function F(m, c, g) {
    let h = a.get(m),
      y = o(m),
      q = [],
      j = 0;
    for (let p of g) {
      let f = h.items.find((M) => M.id === p);
      if (!f || f.deleted) {
        q.push({
          id: p,
          name: p,
          reason: "Запись больше недоступна.",
        });
        continue;
      }
      let w = e.describe(h.type, f),
        L = e.canApply(h.type, f, c);
      if (
        (!L &&
          f.demoFailOnce &&
          ((f.demoFailOnce = !1),
          (L = "Временная ошибка \xB7 демо. Можно повторить.")),
        L)
      ) {
        q.push({ id: p, name: w.name, reason: L });
        continue;
      }
      (c === "archive" && (f.archived = !0),
        c === "restore" && (f.archived = !1),
        c === "disable" && (f.disabled = !0),
        c === "delete" &&
          ((f.deleted = !0),
          ["certificates", "invitations"].includes(h.type) &&
            f.negotiation !== "accepted" &&
            !f.accepted &&
            (f.disabled = !0)),
        j++);
    }
    y.selected = new Set([...y.selected].filter((p) => !g.includes(p)).concat(q.map((p) => p.id)));
    let S = {
      archive: "Архивировано",
      restore: "Восстановлено",
      disable:
        h.type === "certificates"
          ? "Сертификатов отключено"
          : "Ссылок отключено",
      delete: "Удалено из списка",
    };
    ((y.feedback = {
      title: `${S[c]}: ${j}. Не выполнено: ${q.length}.`,
      failures: q,
    }),
      (n = null),
      e.closeModal(),
      e.refresh(),
      v(),
      U(y.feedback.title, q.length ? (j ? "info" : "error") : "success"));
  }
  function ae(m, c, ids = null) {
    let g = ids || [...o(m).selected];
    if (!g.length) return;
    let h = a.get(m);
    if (["archive", "restore"].includes(c)) {
      F(m, c, g);
      return;
    }
    let y =
      h.type === "clients"
        ? "Клиенты с покупками или связанными сертификатами не будут удалены. Их можно архивировать."
        : c === "disable"
          ? h.type === "certificates"
            ? "Новые использования выбранных сертификатов будут запрещены, в том числе по сохранённым QR и ссылкам. Покупки, бонусы и расчёты сохраняются. Записи с операциями или обязательствами не отключаются; для них доступен архив."
            : "Действующие ссылки перестанут работать. Принятые сотрудники, партнёрства, покупки и расчёты не отменяются."
          : "Карточки исчезнут из списка, неиспользованные ссылки перестанут работать. Записи с покупками или обязательствами не удаляются; история сохраняется.";
    ((n = { key: m, action: c, ids: g }),
      e.modal(
        c === "delete" ? "Подтвердите удаление" : "Подтвердите отключение",
        `<p>Выбрано записей: <strong>${g.length}</strong>.</p><div class="notice">${y}</div><details open><summary>Выбранные записи</summary><ul class="collection-confirm-list">${g
          .map((q) => {
            let j = h.items.find((S) => S.id === q);
            return `<li>${l(j ? e.describe(h.type, j).name : q)}</li>`;
          })
          .join(
            "",
          )}</ul></details><div class="row">${A(m, "cancel", "Отмена")}${A(m, "confirm", c === "delete" ? "Да, удалить" : "Да, отключить")}</div><small>Это действие только с демонстрационными данными прототипа.</small>`,
      ));
  }
  return {
    render: $,
    register(config) { a.set(config.key, config); o(config.key); },
    hydrate: v,
    reset() {
      (t.clear(), a.clear(), s.clear(), (n = null));
    },
    savePosition(m) {
      s.set(m, window.scrollY);
    },
    restorePosition(m) {
      requestAnimationFrame(() => window.scrollTo(0, s.get(m) || 0));
    },
    input(m) {
      let c = m.target;
      if (!c.matches("[data-coll-control=q]")) return !1;
      let g = c.dataset.collKey,
        h = o(g);
      return (
        (h.q = c.value),
        (h.page = 1),
        h.selected.clear(),
        (h.feedback = null),
        I(g),
        !0
      );
    },
    change(m) {
      let c = m.target,
        g = c.dataset.collKey;
      if (!g) return !1;
      let h = o(g);
      if (c.hasAttribute("data-coll-select"))
        c.checked
          ? h.selected.add(c.dataset.collSelect)
          : h.selected.delete(c.dataset.collSelect);
      else if (c.hasAttribute("data-coll-page"))
        for (let y of le(g))
          c.checked ? h.selected.add(y.item.id) : h.selected.delete(y.item.id);
      else if (c.dataset.collControl) {
        let y = c.dataset.collControl;
        if (y === "q") return !0;
        ((h[y] = y === "size" ? Number(c.value) : c.value),
          (h.page = 1),
          ["archive", "status", "partnerType", "specialization", "city", "stage"].includes(y) &&
            (h.selected.clear(), (h.feedback = null)));
      } else return !1;
      return (I(g), !0);
    },
    click(m) {
      let c = m.target.closest("[data-coll-action],[data-coll-open],[data-coll-item-action]");
      if (!c) return !1;
      let g = c.dataset.collKey,
        h = o(g),
        y = a.get(g),
        q = c.dataset.collAction;
      if (!y) return true;
      if (q?.startsWith("clear-") && ["partnerType", "specialization", "city", "stage"].includes(q.slice(6))) {
        h[q.slice(6)] = ""; h.page = 1; h.selected.clear(); h.feedback = null; I(g); return true;
      }
      if (c.dataset.collItemAction) {
        const item = y.items.find((p) => p.id === c.dataset.collId && !p.deleted);
        if (!item) return true;
        const action = c.dataset.collItemAction === "archive" && item.archived ? "restore" : c.dataset.collItemAction;
        const reason = y.readOnly ? "Доступен только просмотр. Управление выполняет уполномоченный сотрудник." : e.canApply(y.type, item, action);
        if (reason) {
          e.modal("Действие недоступно", `<p class="notice">${l(reason)}</p>`);
          return true;
        }
        if (["archive", "restore", "delete"].includes(action)) ae(g, action, [item.id]);
        else e.itemAction(y.type, item, action, g);
        return true;
      }
      if (c.dataset.collOpen || q?.startsWith("open-")) {
        let j = c.dataset.collOpen || q.slice(5),
          S = y.items.find((p) => p.id === j);
        return (S && (s.set(g, window.scrollY), e.open(y.type, S, g)), !0);
      }
      return q === "confirm"
        ? (n?.key === g && F(g, n.action, [...n.ids]), !0)
        : q === "cancel"
          ? ((n = null), e.closeModal(), !0)
          : ["archive", "restore", "delete", "disable"].includes(q)
            ? (ae(g, q), !0)
            : ((q === "view-list" || q === "view-cards") &&
                (h.view = q.slice(5)),
              q === "clear" && h.selected.clear(),
              q === "select-all" &&
                (h.selected = new Set(te(g).map((j) => j.item.id))),
              q === "prev" && h.page--,
              q === "next" && h.page++,
              q === "reset" &&
                ((h.q = ""),
                (h.partnerType = ""), (h.specialization = ""), (h.city = ""), (h.stage = ""),
                (h.status = ""),
                (h.archive = "active"),
                (h.page = 1),
                h.selected.clear(),
                (h.feedback = null)),
              q === "seed"
                ? (e.seed(y.type),
                  (h.page = 1),
                  (h.feedback = {
                    title:
                      "Демонстрационный набор добавлен. Реальные данные не затронуты.",
                  }),
                  e.refresh(),
                  !0)
                : (I(g), !0));
    },
  };
}
var It = Object.entries({
    doors: "Двери",
    tiles: "Плитка",
    plumbing: "Сантехника",
    electrical: "Электротовары",
    flooring: "Напольные покрытия",
    paint: "Краска / ЛКМ",
    wallpaper: "Обои",
    lighting: "Освещение",
    furniture: "Мебель",
    kitchen: "Кухни",
    tools: "Инструменты",
    handles: "Фурнитура и замки",
    windows: "Окна",
    curtains: "Шторы",
    construction: "Стройматериалы",
    garden: "Сад и огород",
    heating: "Водоснабжение и отопление",
    bath_sauna: "Бани и сауны",
    pools: "Бассейны",
    textile: "Текстиль для дома",
    ceilings: "Потолки",
    decor: "Декор",
    gates: "Ворота",
    fireplaces: "Камины",
    smart_home: "Умный дом",
    climate: "Климат",
  }).map(([e, t]) => ({ id: e, label: t })),
  Et = Object.entries({
    tiles: "Плитка",
    flooring: "Напольные покрытия",
    doors: "Двери",
    plumbing: "Сантехника",
    electrical: "Электрика",
    painting: "Покраска и штукатурка",
    ceilings: "Потолки",
    demolition: "Демонтаж",
    design: "Дизайн интерьера",
    landscape: "Ландшафтный дизайн",
    appraisal: "Оценка недвижимости",
    planning: "Планирование",
    rough: "Черновые работы",
    engineering: "Инженерные работы",
    finishing: "Чистовая отделка",
    renovation: "Ремонт под ключ",
    safety: "Безопасность",
    kitchen: "Кухни и мебель",
    windows: "Окна и балконы",
    climate: "Кондиционирование",
    construction: "Строительство",
    furniture: "Сборка мебели",
  }).map(([e, t]) => ({ id: e, label: t })),
  ta = [
    "Диагностика",
    "Планирование",
    "Согласования",
    "Нулевой цикл",
    "Демонтаж",
    "Конструктив",
    "Оболочка дома",
    "Инженерия",
    "Черновая отделка",
    "Чистовая отделка",
    "Оборудование",
    "Приёмка",
  ].map((e, t) => ({ id: `L1-${t}`, label: e })),
  Le = { products: It, services: Et, stages: ta };
ensureSpecialistPresetDictionary(Le);
function Xe(e, t = !1) {
  return {
    ...e,
    products: t ? [] : e.products || [],
    services: e.services || [],
    stages: e.stages || [],
    primary: t && e.primary?.startsWith("products:") ? "" : e.primary || "",
  };
}
var Ie = (e) => [
  ...It.filter((t) => (e.products || []).includes(t.id)).map(
    (t) => `Товар: ${t.label}`,
  ),
  ...Et.filter((t) => (e.services || []).includes(t.id)).map(
    (t) => `Услуга: ${t.label}`,
  ),
  ...ta
    .filter((t) => (e.stages || []).includes(t.id))
    .map((t) => `Этап: ${t.label}`),
];
function Ee(
  e,
  {
    servicesOnly: t = e.querySelector("[data-direction-picker]")?.dataset
      .servicesOnly === "true",
  } = {},
) {
  let a = new FormData(e),
    s = {};
  for (let l of Object.keys(Le))
    s[l] =
      t && l === "products"
        ? []
        : a.getAll(l).filter((o) => Le[l].some((b) => b.id === o));
  let n = a.get("primary") || "";
  return (
    (s.primary = ["products", "services"].some((l) =>
      s[l].some((o) => `${l}:${o}` === n),
    )
      ? n
      : ""),
    s
  );
}
function Mt(e, t) {
  return (
    ["products", "services", "stages"]
      .flatMap((a) =>
        Le[a]
          .filter((s) => (e[a] || []).includes(s.id))
          .map((s) => {
            let n = `${a === "products" ? "Товар" : a === "stages" ? "Этап" : "Услуга"}: ${s.label}`;
            return `<button type="button" class="direction-chip" data-direction-remove="${a}:${s.id}" aria-label="Убрать ${t(n)}">${t(n)} <span aria-hidden="true">\xD7</span></button>`;
          }),
      )
      .join("") ||
    '<p class="small">Пока ничего не выбрано. Отметьте направления ниже.</p>'
  );
}
function At(e, t) {
  return (
    '<option value="">Без основного</option>' +
    ["products", "services"]
      .flatMap((a) =>
        Le[a]
          .filter((s) => (e[a] || []).includes(s.id))
          .map(
            (s) =>
              `<option value="${a}:${s.id}" ${e.primary === `${a}:${s.id}` ? "selected" : ""}>${a === "products" ? "Товар" : "Услуга"}: ${t(s.label)}</option>`,
          ),
      )
      .join("")
  );
}
function Ze(
  e,
  t,
  { catalog: a = !1, servicesOnly: s = !1, copyAvailable = false } = {},
) {
  return (
    (e = Xe(e, s)),
    `<div class="direction-picker" data-direction-picker data-services-only="${s}">
    <section class="direction-selection-summary"><div class="direction-selection-heading"><strong>Уже выбрано</strong><button type="button" class="btn direction-edit-link" data-direction-edit>Добавить / изменить</button></div>
    <div class="direction-chips" data-direction-chips aria-label="Выбранные направления">${Mt(e, t)}</div>
    <small>Отмеченные варианты показаны первыми в списке. Нажмите ×, чтобы убрать лишнее, или добавьте другие ниже.</small>
    ${a ? `<button type="button" class="btn direction-edit-link" data-catalog-action="copy-directions" ${copyAvailable ? "" : "disabled"}>Повторно взять из профиля</button>` : ""}</section>
    <p class="small">${s ? "Выберите работы и услуги, которые выполняете. Можно отметить несколько специализаций." : "Выберите товары, которые продаёте, и работы или услуги, которые выполняете. Можно указать одно направление или оба."}</p>
    <p class="notice">${navigatorExplanation}</p>
    <label class="field">Поиск по справочнику<input type="search" data-direction-search placeholder="Например: двери, плитка, электрика" autocomplete="off"></label>
    ${Object.keys(Le)
      .filter((n) => !s || n !== "products")
      .map(
        (
          n,
        ) => `<details class="direction-group" data-direction-group="${n}"><summary>${n === "products" ? "Товары" : n === "services" ? "Работы и услуги" : "На каких этапах вы полезны"} <span class="small" data-direction-count>${(e[n] || []).length} выбрано</span></summary>
      ${n === "stages" ? `<p class="small">Клиент выбирает партнёров на каждом этапе в навигаторе ремонта. Отметьте, на каких этапах вы выполняете работы или предлагаете товары. ${a ? "Для публикации обязателен хотя бы один этап; можно выбрать несколько." : "Можно несколько; рабочий профиль можно сохранить без этапов."}</p>` : ""}
      <div class="direction-options">${[...Le[n]]
        .sort(
          (first, second) =>
            Number((e[n] || []).includes(second.id)) -
            Number((e[n] || []).includes(first.id)),
        )
        .map(
          (l) =>
            `<label class="direction-option ${(e[n] || []).includes(l.id) ? "is-selected" : ""}" data-direction-option="${t((l.label + " " + l.id).toLocaleLowerCase("ru"))}"><input type="checkbox" name="${n}" value="${l.id}" ${(e[n] || []).includes(l.id) ? "checked" : ""}><span>${t(l.label)}</span></label>`,
        )
        .join(
          "",
        )}</div><p class="small" data-direction-empty hidden>Нет совпадений. Попробуйте другое название.</p>
      ${customDirectionForm(n, t)}
    </details>`,
      )
      .join("")}
    ${a ? "" : `<label class="field" data-direction-primary ${e.products?.length || e.services?.length ? "" : "hidden"}>Основное направление <span class="profile-field-status">Дополнительно</span><select name="primary">${At(e, t)}</select><small>Выберите из отмеченных направлений или оставьте \xABБез основного\xBB.</small></label>`}
  </div>`
  );
}
function sortDirectionOptions(picker) {
  const focused = document.activeElement;
  picker.querySelectorAll(".direction-options").forEach((list) => {
    const options = [...list.querySelectorAll("[data-direction-option]")];
    const group = list.closest("[data-direction-group]").dataset.directionGroup;
    const order = new Map(Le[group].map((item, index) => [item.id, index]));
    for (const label of options)
      label.classList.toggle(
        "is-selected",
        label.querySelector("input").checked,
      );
    options.sort(
      (a, b) =>
        Number(b.querySelector("input").checked) -
          Number(a.querySelector("input").checked) ||
        (order.get(a.querySelector("input").value) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.querySelector("input").value) ??
            Number.MAX_SAFE_INTEGER),
    );
    list.append(...options);
  });
  if (picker.contains(focused) && focused.matches("input[type=checkbox]"))
    focused.focus({ preventScroll: true });
}
function Ot(e, t) {
  let a = e.target.closest("[data-direction-picker]");
  if (!a) return !1;
  if (e.target.matches("[data-custom-direction]")) return !0;
  if (e.target.matches("[data-direction-search]")) {
    sortDirectionOptions(a);
    let l = e.target.value.trim().toLocaleLowerCase("ru");
    return (
      a.querySelectorAll("[data-direction-group]").forEach((o) => {
        (o.querySelectorAll("[data-direction-option]").forEach((b) => {
          b.hidden = !b.dataset.directionOption.includes(l);
        }),
          (o.querySelector("[data-direction-empty]").hidden = !!o.querySelector(
            "[data-direction-option]:not([hidden])",
          )),
          l && (o.open = !0));
      }),
      !0
    );
  }
  let s = Ee(a.closest("form"));
  sortDirectionOptions(a);
  if (e.target.matches("input[type=checkbox]") && e.target.checked)
    e.target.closest(".direction-options").scrollTop = 0;
  ((a.querySelector("[data-direction-chips]").innerHTML = Mt(s, t)),
    a.querySelectorAll("[data-direction-group]").forEach((l) => {
      l.querySelector("[data-direction-count]").textContent =
        `${s[l.dataset.directionGroup].length} выбрано`;
    }));
  let n = a.querySelector("[data-direction-primary]");
  return (
    n &&
      ((n.hidden = !(s.products.length || s.services.length)),
      (n.querySelector("select").innerHTML = At(s, t))),
    !1
  );
}
function Dt(e) {
  const edit = e.target.closest("[data-direction-edit]");
  if (edit) {
    const picker = edit.closest("[data-direction-picker]");
    const search = picker.querySelector("[data-direction-search]");
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    picker
      .querySelectorAll("[data-direction-group]")
      .forEach((group) => (group.open = true));
    search.focus({ preventScroll: true });
    search.scrollIntoView({ block: "center", behavior: "instant" });
    return !0;
  }
  const add = e.target.closest("[data-direction-add]");
  if (add) {
    const picker = add.closest("[data-direction-picker]");
    const group = add.dataset.directionAdd;
    const input = picker.querySelector(`[data-custom-direction="${group}"]`);
    const result = addDirection(Le, group, input.value);
    const status = picker.querySelector(`[data-direction-result="${group}"]`);
    if (result.error) {
      status.textContent = result.error;
      input.focus();
      return !0;
    }
    let checkbox = [...picker.querySelectorAll("input[type=checkbox]")].find(
      (el) => el.name === group && el.value === result.item.id,
    );
    if (!checkbox) {
      const label = document.createElement("label");
      label.className = "direction-option";
      label.dataset.directionOption = (
        result.item.label +
        " " +
        result.item.id
      ).toLocaleLowerCase("ru");
      checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = group;
      checkbox.value = result.item.id;
      const span = document.createElement("span");
      span.textContent = result.item.label;
      label.append(checkbox, span);
      picker
        .querySelector(`[data-direction-group="${group}"] .direction-options`)
        .append(label);
    }
    checkbox.checked = true;
    checkbox.closest("label").hidden = false;
    picker.querySelector(
      `[data-direction-group="${group}"] [data-direction-empty]`,
    ).hidden = true;
    checkbox.dispatchEvent(new Event("input", { bubbles: true }));
    input.value = "";
    status.textContent = result.created
      ? `«${result.item.label}» добавлено и выбрано в макете.`
      : `«${result.item.label}» уже есть в справочнике и выбрано.`;
    return !0;
  }
  let t = e.target.closest("[data-direction-remove]");
  if (!t) return !1;
  let [a, s] = t.dataset.directionRemove.split(":"),
    n = t.closest("[data-direction-picker]"),
    l = [...n.querySelectorAll("input[type=checkbox]")].find(
      (o) => o.name === a && o.value === s,
    );
  return (
    l &&
      ((l.checked = !1),
      l.dispatchEvent(new Event("input", { bubbles: !0 })),
      n.querySelector("[data-direction-search]").focus()),
    !0
  );
}
var et = {
    website: "Нет сайта",
    telegram: "Нет Telegram",
    publicEmail: "Нет email для клиентов",
    publicPhone: "Нет телефона для клиентов",
    channel: "Нет канала или страницы",
    contactEmail: "Нет email для связи",
    contactPhone: "Нет телефона для связи",
  },
  Me = (e, t) => e[`no_${t}`] === !0;
function tt(e, t, a) {
  let s = et[e];
  if (!s) return "";
  let n = Me(t, e);
  return `<label class="direction-option availability-choice"><input type="checkbox" name="no_${e}" data-no-field="${e}" ${n ? "checked" : ""}><span>${a(s)}</span></label><small data-absence-note="${e}" ${n ? "" : "hidden"}>Учтено. Можно добавить позже.</small>`;
}
function Nt(e) {
  let t = e.target.closest("[data-no-field]");
  if (!t) return;
  let a = t.closest("form"),
    s = t.dataset.noField;
  if (!Object.hasOwn(et, s)) return;
  let n = a.elements.namedItem(s);
  if (!n) return;
  ((n.disabled = t.checked), (n.hidden = t.checked));
  let l = a.querySelector(`[data-absence-note="${s}"]`);
  l && (l.hidden = !t.checked);
}
function Fe(e, { retainDraft: t = !1 } = {}) {
  let a = {};
  for (let s of Object.keys(et)) {
    let n = e.querySelector(`[data-no-field="${s}"]`);
    if (!n) continue;
    a[`no_${s}`] = n.checked;
    let l = String(e.elements.namedItem(s)?.value || "").trim();
    a[s] = n.checked && !t ? "" : l;
  }
  return a;
}
function Ae(e) {
  let t = { ...e };
  for (let a of Object.keys(et)) Me(t, a) && (t[a] = "");
  return t;
}
var Pe = {
  publicPhone: "Телефон",
  publicEmail: "Email",
  telegram: "Telegram",
  website: "Сайт с контактами",
};
function Tt(e, t) {
  return validContact(e, t);
}
function at(e) {
  let t = Ae(e),
    a = Object.keys(Pe);
  return {
    ready: a.some((s) => Tt(s, t[s])),
    invalid: a.filter((s) => String(t[s] || "").trim() && !Tt(s, t[s])),
  };
}
function Rt(e) {
  let t = e.escape,
    a = new Map(),
    s = () => ["store", "company"].includes(e.role()),
    n = () => e.role() === "specialist",
    l = () => e.organizationBranches?.() || [];
  const seed = () =>
    profileCatalogSeed(e.data(), { organization: s(), specialist: n() });
  function o() {
    if (!a.has(e.role())) {
      let v = seed();
      a.set(e.role(), {
        prepared: !0,
        step: "card",
        values: v,
        saved: structuredClone(v),
        status: "draft",
        dirty: !1,
        error: "",
        preview: !1,
        touched: {},
        savedTouched: {},
        prefillImported: new Set(
          Object.keys(v).filter((key) => hasCatalogValue(v[key])),
        ),
      });
    }
    let u = a.get(e.role());
    if (u.status === "draft") {
      // Fill newly available, untouched blanks, never overwrite edits or deliberate removal.
      for (const [key, value] of Object.entries(seed())) {
        if (
          !u.touched[key] &&
          !u.prefillImported.has(key) &&
          !Me(u.values, key) &&
          !hasCatalogValue(u.values[key]) &&
          hasCatalogValue(value)
        ) {
          u.values[key] = structuredClone(value);
          if (!hasCatalogValue(u.saved[key]))
            u.saved[key] = structuredClone(value);
          u.prefillImported.add(key);
        }
      }
    }
    return ((u.values = Xe(u.values, n())), (u.saved = Xe(u.saved, n())), u);
  }
  function b(u) {
    let $ = [];
    ((s()
      ? !u.publicName.trim()
      : u.publicName.trim().length < 2 ||
        u.publicName.trim() === "Пользователь") &&
      $.push({
        key: "publicName",
        step: "card",
        label: s() ? "Название организации" : "Публичное имя",
      }),
      !s() &&
        !u.city.trim() &&
        $.push({
          key: "city",
          step: "card",
          label: "Город",
        }),
      s() &&
        !l().length &&
        u.branchAddress.trim().length < 3 &&
        $.push({
          key: "branchAddress",
          step: "card",
          label: "Адрес первого филиала",
        }),
      (n()
        ? u.services.some((id) => Le.services.some((item) => item.id === id))
        : ["products", "services"].some((group) =>
            u[group].some((id) => Le[group].some((item) => item.id === id)),
          )) ||
        $.push({
          key: "directions",
          step: "directions",
          label: n()
            ? "Хотя бы одна категория работ или услуг"
            : "Хотя бы одна категория товаров или услуг",
        }),
      u.stages.some((id) => Le.stages.some((item) => item.id === id)) ||
        $.push({
          key: "stages",
          step: "directions",
          label: "Хотя бы один этап ремонта",
        }),
      at(u).ready ||
        $.push({
          key: "contact",
          step: "contacts",
          label: "Хотя бы один способ связи",
        }));
    for (let v of at(u).invalid)
      $.push({
        key: v,
        step: "contacts",
        label: `${Pe[v]}: ${contactError(v)}`,
      });
    return $;
  }
  function A(u) {
    let $ = b(u);
    return $.length
      ? `<p>Осталось заполнить:</p><div class="catalog-missing">${$.map((v) => `<button type="button" class="btn" data-catalog-action="fix" data-catalog-field="${v.key}">${t(v.label)} →</button>`).join("")}</div>`
      : '<p class="pill good">Обязательные поля заполнены</p>';
  }
  function x(u, $, v = "", I = !1, F = "text") {
    let ae = o().values,
      m = !I && Me(ae, u);
    const displayed = ["publicPhone", "contactPhone"].includes(u)
      ? formatPhoneForDisplay(ae[u])
      : ae[u] || "";
    return `<div class="profile-field-group"><label class="field" id="cat-${u}">${t($)} <span class="profile-field-status">${I ? "Для отправки на проверку" : Pe[u] ? "Хотя бы один на выбор" : "Дополнительно"}</span>${F === "textarea" ? `<textarea name="${u}" rows="3" maxlength="1200">${t(ae[u] || "")}</textarea>` : `<input name="${u}" type="${F}" value="${t(displayed)}" maxlength="200" ${m ? "disabled hidden" : ""}>`}<small>${t(v)}</small>${o().prefillImported.has(u) && !o().touched[u] && hasCatalogValue(ae[u]) ? '<small class="catalog-prefill-hint" data-catalog-prefill>Из сохранённого профиля. Можно изменить или удалить для публикации.</small>' : ""}</label>${I ? "" : tt(u, ae, t)}</div>`;
  }
  function te(submitted = false) {
    let u = Ae(o().values);
    return `<article class="catalog-demo-preview"><span class="pill">${submitted ? "Отправленная карточка" : "Предпросмотр"} \xB7 не опубликовано</span><div class="catalog-preview-identity">${u.image ? `<img src="${t(u.image)}" alt="Выбранное фото для карточки">` : '<span class="catalog-auto-icon" aria-label="Автоматическая иконка категории">R</span>'}<div><h3>${t(!s() && u.showFullName && e.data().name ? e.data().name : u.publicName || "Название не заполнено")}</h3><p class="small">${t(s() ? l()[0] || u.branchAddress || "Адрес не заполнен" : u.city || "Город не заполнен")}</p></div></div><div class="direction-chips">${
      Ie(u)
        .map(($) => `<span class="direction-chip">${t($)}</span>`)
        .join("") || '<span class="small">Направления пока не выбраны</span>'
    }</div>${u.description ? `<p class="catalog-description">${t(u.description)}</p>` : ""}${[
      "publicPhone",
      "publicEmail",
      "website",
      "telegram",
    ]
      .filter(($) => u[$])
      .map(
        ($) =>
          `<p class="small">${t({ publicPhone: "Телефон", publicEmail: "Email", website: "Сайт", telegram: "Telegram" }[$])}: ${t($ === "publicPhone" ? formatPhoneForDisplay(u[$]) : u[$])}</p>`,
      )
      .join(
        "",
      )}<small>Такой состав данных будет виден клиентам. В макете автоматическая иконка условная, загрузка и проверка выполняются только локально.</small></article>`;
  }
  function le() {
    if (["agent", "employee"].includes(e.role())) return "";
    let u = o(),
      $ = u.values,
      v = b($),
      I = u.status === "pending";
    if (I) return catalogPendingView(u.submittedPreview || te(true));
    return `<section class="stack production-catalog" data-profile-step="catalog"><section class="panel stack"><h2>Помогите новым клиентам найти вас</h2><span class="profile-step-state pill">${I ? "На проверке \xB7 демо" : u.dirty ? "Есть несохранённые изменения" : "Не опубликовано"}</span>
    <p><strong>Ваша персональная страница на remcard.ru.</strong> В каталоге её смогут увидеть все клиенты RemCard: узнать о вас, найти ${n() ? "нужные услуги" : "нужные товары и услуги"} и связаться с вами. Это возможность привлечь целевых клиентов.</p>
    <p class="small"><strong>Как разместиться:</strong> заполните карточку и отправьте на проверку. После одобрения страница появится в каталоге. Сохранение черновика само по себе её не публикует.</p>
    <small>Размещение добровольное, обращения не гарантированы. В прототипе показан только пример: данные на remcard.ru не отправляются.</small>
    </section>${
      I
        ? ""
        : `
    <form data-catalog-form class="stack" novalidate>
    <section class="panel stack" data-catalog-panel="card"><h2>Карточка партнёра</h2><p class="small">Помогите клиенту узнать вас и понять, с какой задачей к вам обратиться. Название и описание представляют вас без дополнительных объяснений.</p>
    ${x("publicName", s() ? "Публичное название организации" : "Публичное имя", s() ? "Привычное название магазина или компании." : "Например: Сергей \xB7 электромонтаж.", !0)}
    ${s() ? "" : `${x("city", "Город", "Город работы из основных данных; для карточки можно уточнить.", !0)}<label class="direction-option"><input type="checkbox" name="showFullName" ${$.showFullName ? "checked" : ""}>Показывать полное имя представителя в каталоге</label>`}
    ${
      s()
        ? l().length
          ? `<details class="direction-group"><summary>Филиалы уже добавлены (${l().length})</summary><p class="small">Повторно вводить адрес первого филиала не нужно. Адреса настраиваются отдельно от публичной карточки организации.</p><ul>${l()
              .map((F) => `<li>${t(F)}</li>`)
              .join("")}</ul></details>`
          : `<div class="catalog-demo-status"><strong>Филиал для модерации</strong><p class="small">Адрес первого филиала нужен только если филиалы пока не добавлены.</p>${x("branchAddress", "Адрес первого филиала", "Например: Краснодар, ул. Примерная, 12. Проверка адреса и карты в демо не подключена.", !0)}</div>`
        : ""
    }
    <label class="field">Логотип или фото <span class="profile-field-status">Дополнительно</span><input type="file" accept="image/png,image/jpeg,image/webp" data-catalog-image><small>Помогает узнать и запомнить вас. Можно обойтись без фото: будет иконка категории. В демо: PNG, JPEG или WebP до 5 МБ, только в памяти браузера.</small></label>
    ${$.image ? `<div class="row"><img class="catalog-upload-thumb" src="${t($.image)}" alt="Загруженное фото"><button class="btn ghost" type="button" data-catalog-action="remove-image">Удалить фото</button></div>` : ""}
    ${x("description", "Описание для каталога", e.role() === "store" ? "Например: двери и фурнитура, помощь с подбором, доставка." : e.role() === "company" ? "Например: материалы и монтаж для ремонта квартир и домов." : "Например: устанавливаю двери, помогаю с замером и подбором фурнитуры.", !1, "textarea")}
    </section>
    <section class="panel stack" data-catalog-panel="directions"><h2>Категории и этапы для каталога</h2><p class="notice">Для публикации обязательны хотя бы одна категория ${n() ? "работ или услуг" : "товаров или услуг"} и хотя бы один этап ремонта. Незавершённую карточку можно сохранить как черновик.</p>
    ${n() ? specialistPresetSection($, Le, t) : ""}
    ${Ze($, t, { catalog: !0, servicesOnly: n(), copyAvailable: Boolean((!n() && e.data().products?.length) || e.data().services?.length) })}
    ${categoryProposalSection(t, `catalog-${e.role()}`, { servicesOnly: n() })}
    ${stageProposalSection(t, `catalog-${e.role()}`)}
    </section>
    <section class="panel stack" data-catalog-panel="contacts"><h2>Публичные контакты</h2><p class="notice"><strong>Для публикации нужен хотя бы один способ связи.</strong> Проверьте подставленные контакты или добавьте телефон, Telegram, Email либо сайт, по которым клиент может с вами связаться.</p><small>Сохранённые контакты подставляются из вашего профиля. Можно изменить или убрать их только для каталога. После одобрения эти данные будут видны клиентам. Отметки «Нет…» не заменяют способ связи.</small>
    ${x("website", "Сайт с контактами", "Можно example.ru или https://example.ru — протокол добавим автоматически. На сайте должны быть контакты или форма обращения.", !1, "text")}${x("telegram", "Telegram (публичный)", "Укажите @username или t.me/username, по которому клиент сможет написать.")}${x("publicEmail", "Email для клиентов", "Для запроса, сметы или документов.", !1, "email")}${x("publicPhone", "Телефон для клиентов", "Введите 10 цифр номера или 11 цифр с начальной 8/7. Сохраним в формате +7 (XXX) XXX-XX-XX. Можно оставить пустым, если есть другой контакт.", !1, "tel")}
    </section>
    <section class="panel stack" data-catalog-panel="review"><h2>Предпросмотр карточки</h2><p class="small">Посмотрите карточку глазами клиента: всё ли понятно и нет ли данных, которые вы не хотите показывать публично.</p>
    <div data-catalog-readiness>${A($)}</div>
    ${te()}
    <p class="notice">Когда всё готово, нажмите «Отправить на публикацию». Карточка появится в каталоге после одобрения модератором. Сохранение черновика не публикует карточку.</p>
    </section>
    <p class="field-error" data-catalog-error role="alert">${t(u.error)}</p>
    <div class="catalog-footer"><div class="row">${Ke("Сохранить черновик", u.savedOnce && !u.dirty)}<button type="button" class="btn ghost" data-catalog-action="cancel">Отменить изменения</button></div><button type="button" class="btn primary" data-catalog-action="send" ${v.length ? "disabled" : ""}>Отправить на публикацию</button></div>${u.savedOnce && !u.dirty ? Je() : ""}
    <small>Демо. Черновик хранится только до обновления страницы.</small>
    </form>`
    }</section>`;
  }
  function re(u) {
    let $ = new FormData(u),
      v = o();
    for (let I of [
      "publicName",
      "city",
      "branchAddress",
      "description",
      "website",
      "telegram",
      "publicEmail",
      "publicPhone",
      "specialistKind",
      "specialistTitle",
    ])
      $.has(I) && (v.values[I] = normalizeContact(I, $.get(I)));
    ((v.values.showFullName = $.has("showFullName")),
      Object.assign(
        v.values,
        Ee(u, { servicesOnly: n() }),
        Fe(u, { retainDraft: !0 }),
      ),
      (v.dirty = !0),
      (v.error = ""),
      Ye(u),
      e.notice(""));
    for (const key of Object.keys(Pe))
      v.values[key] = normalizeContact(key, v.values[key]);
  }
  function K(u) {
    let $ =
      u === "stages"
        ? document.querySelector('[data-direction-group="stages"] summary')
        : u === "contact"
          ? document.querySelector(
              '[data-catalog-panel="contacts"] input:not(:disabled)',
            )
          : u === "directions"
            ? document.querySelector(
                "[data-catalog-form] [data-direction-search]",
              )
            : document.querySelector(`[data-catalog-form] [name="${u}"]`);
    if (u === "stages" && $) $.closest("details").open = true;
    ($?.focus(), $?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }
  function Q(u) {
    let $ = at(o().values).invalid[0];
    if ($)
      return (
        (o().step = "contacts"),
        (o().error = `${Pe[$]}: ${contactError($)}`),
        e.refresh(),
        K($),
        !1
      );
    let v = [...u.querySelectorAll("input[type=url],input[type=email]")].find(
      (I) => !I.checkValidity(),
    );
    return v
      ? ((o().step = "contacts"),
        (o().error = "Проверьте формат сайта или Email."),
        e.refresh(),
        K(v.name),
        !1)
      : !0;
  }
  return {
    render: le,
    wizard: {
      state: o,
      capture: re,
      missing: () => b(o().values),
      refresh: e.refresh,
      dictionary: Le,
    },
    statusLabel: () =>
      a.get(e.role())?.status === "pending"
        ? "Ожидает подтверждения \xB7 демо"
        : "Не опубликовано",
    input(u) {
      let $ = u.target.closest("[data-catalog-form]");
      if (!$) return !1;
      const state = o();
      const fieldName =
        u.target.name ||
        (u.target.matches("[data-catalog-image]") ? "image" : "");
      if (fieldName) {
        state.touched[fieldName] = true;
        if (fieldName.startsWith("no_"))
          state.touched[fieldName.slice(3)] = true;
        u.target
          .closest(".profile-field-group")
          ?.querySelector("[data-catalog-prefill]")
          ?.remove();
      }
      if (u.target.matches("[data-catalog-image]")) {
        let I = u.target.files?.[0],
          F = o();
        if (!I) return !0;
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(I.type) ||
          I.size > 5 * 1024 * 1024
        )
          return (
            (F.error = "Выберите PNG, JPEG или WebP до 5 МБ."),
            e.refresh(),
            !0
          );
        let ae = e.role(),
          m = new FileReader();
        return (
          (m.onload = () => {
            ((F.values.image = String(m.result)),
              (F.dirty = !0),
              (F.error = ""),
              e.role() === ae &&
                (e.refresh(),
                U("Фото добавлено в черновик. Сохраните изменения.", "info")));
          }),
          (m.onerror = () => {
            ((F.error = "Не удалось прочитать файл. Попробуйте другой."),
              e.role() === ae && e.refresh());
          }),
          m.readAsDataURL(I),
          !0
        );
      }
      re($);
      let v = $.closest("[data-profile-step]").querySelector(
        ".profile-step-state",
      );
      return (
        (v.textContent = "Есть несохранённые изменения"),
        ($.querySelector("[data-catalog-error]").textContent = ""),
        ($.querySelector('[data-catalog-action="send"]').disabled =
          b(o().values).length > 0),
        ($.querySelector("[data-catalog-readiness]").innerHTML = A(o().values)),
        !0
      );
    },
    submit(u) {
      if (!u.target.matches("[data-catalog-form]")) return !1;
      if ((u.preventDefault(), re(u.target), !Q(u.target))) return !0;
      let $ = o();
      return (
        ($.values = Ae($.values)),
        ($.saved = structuredClone($.values)),
        ($.savedTouched = { ...$.touched }),
        ($.dirty = !1),
        ($.savedOnce = !0),
        e.notice(
          "Черновик сохранён в макете. Отметки об отсутствии данных учтены.",
        ),
        e.refresh(),
        !0
      );
    },
    click(u) {
      let $ = u.target.closest("[data-catalog-action]");
      if (!$) return !1;
      let v = o(),
        I = $.dataset.catalogAction;
      if (
        (I === "prepare" &&
          ((v.values.publicName ||=
            e.data().organization || e.data().name || ""),
          (v.values.city ||= e.data().city || ""),
          (v.saved = structuredClone(v.values)),
          (v.prepared = !0),
          (v.step = "card")),
        I === "copy-directions" &&
          ((v.values.products = n() ? [] : [...(e.data().products || [])]),
          (v.values.services = [...(e.data().services || [])]),
          (v.values.stages = [...(e.data().stages || [])]),
          (v.touched.products = true),
          (v.touched.services = true),
          (v.touched.stages = true),
          (v.dirty = !0),
          e.notice(
            "Направления перенесены в черновик. Рабочий профиль не изменён.",
          )),
        I === "preview" && (v.preview = !v.preview),
        I === "remove-image" &&
          ((v.values.image = ""),
          (v.touched.image = true),
          (v.dirty = !0),
          U("Фото убрано из черновика. Сохраните изменения.", "info")),
        I === "cancel" &&
          ((v.values = structuredClone(v.saved)),
          (v.touched = { ...v.savedTouched }),
          (v.dirty = !1),
          (v.savedOnce = !1),
          (v.error = ""),
          U("Изменения отменены. Восстановлен сохранённый черновик.", "info")),
        I === "send")
      ) {
        let F = document.querySelector("[data-catalog-form]");
        if ((re(F), !Q(F))) return !0;
        if (b(v.values).length) return ((v.step = "review"), e.refresh(), !0);
        ((v.values = Ae(v.values)),
          (v.saved = structuredClone(v.values)),
          (v.savedTouched = { ...v.touched }),
          (v.dirty = !1),
          (v.submittedPreview = te(true)),
          (v.status = "pending"),
          e.notice(
            "Показан результат отправки на проверку. Реальные данные никуда не отправлены.",
          ));
      }
      return (
        e.refresh(),
        I === "send" &&
          v.status === "pending" &&
          (() => {
            const title = document.getElementById("catalog-pending-title");
            title?.focus({ preventScroll: true });
            document
              .querySelector(".catalog-pending-hero")
              ?.scrollIntoView({ block: "start", behavior: "instant" });
          })(),
        I === "fix" &&
          (() => {
            v.step =
              b(v.values).find((item) => item.key === $.dataset.catalogField)
                ?.step || "card";
            e.refresh();
            K($.dataset.catalogField);
          })(),
        !0
      );
    },
  };
}
var N = (e, t, a = "", s = {}) => ({ key: e, label: t, help: a, ...s }),
  mt = {
    agent: [
      N("name", "Ваше имя", "Так вы представлены клиентам и партнёрам."),
      N("city", "Город", "Помогает найти подходящих партнёров."),
    ],
    specialist: [
      N(
        "name",
        "Как к вам обращаться",
        "Имя в сертификатах и общении с партнёрами.",
      ),
      N("city", "Город работы", "Для поиска партнёров в вашем городе."),
    ],
    store: [
      N("name", "Имя представителя", "Кто ведёт кабинет магазина."),
      N(
        "organization",
        "Название организации",
        "Название магазина, отдельно от имени представителя.",
      ),
      N("city", "Город", "Для поиска и согласования сотрудничества."),
    ],
    company: [
      N("name", "Имя представителя", "Кто начинает работу в кабинете."),
      N(
        "organization",
        "Название организации",
        "Можно указать привычное коммерческое название.",
      ),
      N("city", "Город", "Остальные города добавляются по мере работы."),
    ],
    employee: [
      N(
        "name",
        "Ваши ФИО",
        "Чтобы коллеги узнали вас. Организация и права берутся из приглашения.",
      ),
    ],
  },
  pt = [
    {
      id: "activity",
      title: "Чем вы занимаетесь",
      why: "Укажите, что вы предлагаете и на каких этапах ремонта помогаете. Партнёры смогут найти вас по этим направлениям и рекомендовать клиентам с подходящим запросом.",
      when: "Чтобы партнёры находили и рекомендовали вас",
      visibility:
        "Для появления в поиске включите \xABПоказывать партнёрам в RemCard\xBB в блоке видимости. Это не публикует страницу в открытом каталоге и не назначает скидки.",
      fields: [],
      directions: !0,
    },
    {
      id: "geography",
      title: "Где вы работаете",
      why: "Партнёры поймут, в каких городах и районах вас рекомендовать и нужен ли клиенту выезд, визит по адресу или онлайн-услуга.",
      when: "Чтобы вас рекомендовали там, где вы работаете",
      visibility:
        "Заполните, если одного города недостаточно. Территории не заменяют точный адрес филиала.",
      fields: [
        N(
          "partnerWorkMode",
          "Формат работы",
          "Чтобы заранее было понятно, как получить вашу услугу или товар.",
          {
            options: [
              "Не указан",
              "По адресу",
              "На выезде",
              "По адресу и на выезде",
              "Онлайн",
            ],
          },
        ),
        N(
          "serviceArea",
          "Территории обслуживания",
          "Районы или города, где вы принимаете заказы. По одному в строке или через запятую.",
          { multiline: !0 },
        ),
      ],
    },
    {
      id: "contacts",
      title: "Контакт для сотрудничества",
      why: "Партнёр будет знать, с кем обсудить условия и куда обратиться. Можно указать только один удобный способ связи.",
      when: "Чтобы с вами могли обсудить сотрудничество",
      visibility:
        "Это контакты для партнёров, не для открытого каталога. Повторно подтверждать вход не нужно.",
      fields: [
        N(
          "contactPerson",
          "Контактное лицо",
          "К кому обратиться по сотрудничеству; можно пропустить, если это вы.",
        ),
        N(
          "contactPhone",
          "Телефон",
          "Если удобнее обсудить вопрос по телефону.",
          { type: "tel" },
        ),
        N(
          "contactEmail",
          "Email",
          "Если удобнее получать предложения письменно.",
          { type: "email" },
        ),
      ],
    },
    {
      id: "visibility",
      title: "Видимость для партнёров",
      why: "Показывать вас партнёрам разрешено по умолчанию. Для появления в поиске заполните основные данные и направления. Если не хотите появляться в поиске партнёров, снимите галочку и сохраните изменения.",
      when: "По умолчанию включена; для поиска нужны данные и направления",
      visibility:
        "Это поиск внутри партнёрской платформы, не публикация на remcard.ru. Открытый каталог настраивается отдельно. В макете реальный поиск не подключён.",
      fields: [],
      visibilityToggle: !0,
    },
  ],
  aa = {
    agent: [
      {
        id: "audience",
        title: "Кому вы рекомендуете",
        why: "При обсуждении условий партнёру проще понять вашу аудиторию и предложить подходящие товары или услуги. Для создания сертификата этот блок не нужен.",
        when: "Чтобы партнёр мог предложить условия для вашей аудитории",
        visibility: "В макете это черновик: информация никому не отправляется.",
        fields: [
          N(
            "audience",
            "Ваша аудитория",
            "Например: друзья, заказчики ремонта или подписчики о дизайне.",
          ),
          N(
            "channel",
            "Ссылка на канал или страницу",
            "Поможет показать аудиторию. Если рекомендуете лично, оставьте пустым.",
            { type: "url" },
          ),
        ],
      },
      {
        id: "contacts",
        title: "Контакт для связи",
        why: "Оставьте один удобный способ обсудить условия с партнёром. Если уже общаетесь напрямую, можно не заполнять.",
        when: "Чтобы с вами могли согласовать сотрудничество",
        visibility: "Не передаётся клиентам и партнёрам автоматически.",
        fields: [
          N(
            "contactPhone",
            "Телефон для связи",
            "Для обсуждения условий, не для повторного входа.",
            { type: "tel" },
          ),
          N(
            "contactEmail",
            "Email",
            "Для письменных предложений, если вам так удобнее.",
            { type: "email" },
          ),
        ],
      },
    ],
    specialist: pt,
    store: pt,
    company: pt,
    employee: [
      {
        id: "contacts",
        title: "Как связаться внутри команды",
        why: "Коллеги смогут связаться с вами по рабочему вопросу. Укажите один удобный контакт; если в команде уже есть способ связи, можно пропустить.",
        when: "Чтобы коллеги могли быстро уточнить рабочий вопрос",
        visibility:
          "Не публикуется в каталоге и не передаётся клиентам автоматически.",
        fields: [
          N(
            "contactPhone",
            "Рабочий телефон",
            "Для рабочих звонков, без повторного подтверждения входа.",
            { type: "tel" },
          ),
          N(
            "contactEmail",
            "Рабочий Email",
            "Для рабочих писем, если предпочитаете этот способ.",
            { type: "email" },
          ),
        ],
      },
    ],
  };
function xt(e) {
  let t = e.escape,
    a = new Map(),
    s = new Map(),
    n = new Set(),
    l = Rt(e),
    o = () => e.role(),
    b = () => e.data(),
    A = () => mt[o()],
    x = () => A().filter((p) => !String(b()[p.key] || "").trim()),
    te = () => [
      {
        id: "basics",
        title: "Основные данные",
        why:
          o() === "employee"
            ? "По имени коллеги узнают вас в команде. Организацию, должность и доступы повторно заполнять не нужно."
            : ["store", "company"].includes(o())
              ? "Название помогает узнать вашу организацию, имя показывает, кто её представляет, а город помогает подобрать партнёров рядом."
              : "По имени вас узнают в общении и сертификатах, а город поможет найти подходящих партнёров.",
        when:
          o() === "employee"
            ? "Чтобы коллеги узнавали вас в команде"
            : "Чтобы вас узнавали и находили партнёров рядом",
        visibility:
          o() === "employee"
            ? "Вход и согласия проходят отдельно. Эти данные не дают доступ без приглашения."
            : "Регистрация не подключает программы и не публикует вас в каталоге.",
        fields: A(),
        required: !0,
      },
      ...aa[o()].map((p) =>
        o() === "specialist" && p.id === "activity"
          ? {
              ...p,
              title: "Специализация и услуги",
              why: "Расскажите, в каких работах вы специализируетесь и на каких этапах ремонта помогаете. Так партнёры смогут найти вас и рекомендовать клиентам, которым нужен именно ваш опыт.",
            }
          : p,
      ),
    ],
    le = () => a.get(o()) || {},
    re = {
      agent: "Агент",
      specialist: "Специалист",
      store: "Магазин",
      company: "Компания",
      employee: "Сотрудник",
    },
    K = () => ["store", "company"].includes(o()),
    Q = () => ["specialist", "store", "company"].includes(o()),
    u = () => [
      ["overview", "Обзор"],
      ["basics", "Основные данные"],
      ...(Q() ? [["catalog", "Каталог RemCard"]] : []),
      ...(K()
        ? [
            ["branches", "Филиалы"],
            ["team", "Сотрудники"],
          ]
        : []),
      ...(!K() && qe() ? [["team", "Сотрудники"]] : []),
      ["notifications", "Уведомления"],
    ],
    $ = () => s.get(o()) || "overview",
    v = (p, f, w = !1) =>
      `<button class="btn ${w ? "primary" : ""}" type="button" data-profile-action="tab" data-profile-id="${p}">${f}</button>`;
  function I() {
    if (b().partnerSearchOptIn === !1)
      return '<p class="small" role="status">Поиск партнёрами выключен в макете.</p>';
    let p =
      o() === "specialist"
        ? b().services?.length
        : b().services?.length || b().products?.length;
    return x().length || !p
      ? '<p class="notice">Показ разрешён. Чтобы вас находили, заполните основные данные и направления. Начать работу в кабинете можно без публикации.</p>'
      : '<p class="small">Данные для поиска заполнены. На рабочем сайте фактическую видимость подтверждает сервер.</p>';
  }
  function F() {
    return `<section class="profile-user-id" aria-label="ID пользователя"><label class="field" for="profile-user-id">ID пользователя</label><div class="profile-id-row"><input id="profile-user-id" value="${t(e.userId())}" readonly aria-describedby="profile-id-help" autocomplete="off" spellcheck="false"><button class="btn" type="button" data-profile-action="copy-id" aria-label="Скопировать ID пользователя">Копировать</button></div><p class="small" id="profile-id-help">Для поиска вашего аккаунта в RemCard. Присваивается автоматически и не меняется при смене роли.</p><small>Демо-ID; поиск реальных пользователей не подключён.</small><p class="small" role="status" aria-live="polite" data-profile-copy-status></p></section>`;
  }
  function ae(p, f) {
    let w = { ...b(), ...le(f.id) },
      L = w[p.key] || "",
      M = !f.required && Me(w, p.key);
    return `<div class="profile-field-group"><label class="field"><span>${t(p.label)} <span class="profile-field-status">${f.required ? "\xB7 обязательно" : "\xB7 дополнительно"}</span></span>${p.options ? `<select name="${p.key}">${p.options.map((H) => `<option ${L === H ? "selected" : ""}>${t(H)}</option>`).join("")}</select>` : p.multiline ? `<textarea name="${p.key}" rows="3" maxlength="600">${t(L)}</textarea>` : `<input name="${p.key}" value="${t(L)}" type="${p.type || "text"}" maxlength="160" ${f.required ? "required" : ""} ${M ? "disabled hidden" : ""}>`}<small>${t(p.help)}</small></label>${f.required ? "" : tt(p.key, w, t)}</div>`;
  }
  function m(p) {
    let f = p.id === "basics",
      w = { ...b(), ...le() },
      L = Object.keys(le()).length > 0,
      M =
        f && K()
          ? [
              p.fields.find((oe) => oe.key === "name"),
              p.fields.find((oe) => oe.key === "city"),
              p.fields.find((oe) => oe.key === "organization"),
            ]
          : p.fields,
      H = `<label class="field">Тип ${o() === "employee" ? "аккаунта" : "партнёра"}<input value="${t(re[o()])}" readonly><small>Показан выбранный сценарий. Один аккаунт может совмещать личную деятельность и работу в команде.</small></label>`;
    return `<section class="panel profile-form-panel stack" data-profile-step="${p.id}"><h2>${t(p.title)}</h2><p class="small">${t(p.why)}</p>${f ? `<span class="pill ${x().length ? "" : "good"}">${x().length ? "Нужно заполнить" : "Готов к работе"}</span>` : ""}${M.map((oe) => (f && oe.key === "organization" ? H : "") + ae(oe, p)).join("")}${f ? `${K() ? "" : H}${F()}` : ""}
    ${p.directions ? Ze(w, t, { servicesOnly: o() === "specialist" }) : ""}
    ${p.visibilityToggle ? `<label class="direction-option"><input type="checkbox" name="partnerSearchOptIn" ${w.partnerSearchOptIn ? "checked" : ""}><span>Показывать партнёрам в RemCard</span></label>${L ? '<p class="small">Выбор изменён. Сохраните, чтобы применить.</p>' : I()}` : ""}
    <p class="small">${t(p.visibility)}</p></section>`;
  }
  function c() {
    return l.render();
  }
  function g() {
    return `<details class="panel profile-step" data-profile-step="work"><summary><span class="profile-step-num">→</span><span><strong>Что делать дальше</strong><small>Выбрать первое полезное действие в кабинете</small></span></summary><div class="stack profile-step-body"><ol class="profile-instructions">${(o() === "employee" ? ["Проверьте организацию, должность и область доступа ниже.", "Если всё верно, откройте рабочие разделы. Если нет — обратитесь к управляющему."] : o() === "agent" ? ["Найдите партнёра и посмотрите его общие условия.", "Получите и примите персональное предложение по категориям.", "Создайте сертификат и отправьте клиенту или подписчикам."] : o() === "specialist" ? ["Найдите партнёров для своих клиентов.", "Согласуйте условия и создайте сертификат.", "Собственное предложение и каталог заполните, когда захотите получать обращения."] : ["Выберите партнёров и согласуйте условия сотрудничества.", "Принимайте сертификаты покупателей или создавайте свои.", "Команду и дополнительные точки настраивайте по необходимости."]).map((f) => `<li>${t(f)}</li>`).join("")}</ol><div class="row">${e.workActions()}</div></div></details>`;
  }
  function h() {
    let p = b(),
      f = !x().length,
      w = K() ? p.organization : p.name,
      L = Ie({ ...p, products: o() === "specialist" ? [] : p.products }),
      M = o() === "employee" && !e.accessReady(),
      H = f ? (M ? "Нужно приглашение" : "Готов к работе") : "Нужно заполнить",
      oe = `<dl class="production-profile-facts"><div><dt>${K() ? "Представитель" : "Имя"}</dt><dd>${t(p.name || "Не указано")}</dd></div><div><dt>Статус заполнения</dt><dd><span class="pill ${f && !M ? "good" : ""}">${H}</span></dd></div>${
        Q()
          ? `<div><dt>Направления</dt><dd>${
              L.length
                ? `<div class="direction-chips">${L.slice(0, 3)
                    .map((dt) => `<span class="direction-chip">${t(dt)}</span>`)
                    .join("")}</div>${
                    L.length > 3
                      ? `<details><summary>Все направления (${L.length})</summary><ul>${L.slice(
                          3,
                        )
                          .map((dt) => `<li>${t(dt)}</li>`)
                          .join("")}</ul></details>`
                      : ""
                  }`
                : "Не выбраны"
            }</dd></div><div><dt>Поиск партнёров</dt><dd>${p.partnerSearchOptIn === !1 ? "Выключен" : f && L.length ? "Данные для поиска готовы" : "Нужны данные и направления"}</dd></div>`
          : `<div><dt>ID пользователя</dt><dd>${t(e.userId())}</dd></div><div><dt>Ваши задачи</dt><dd>${o() === "agent" ? "Сертификаты и бонусы" : "Работа по приглашению"}</dd></div>`
      }</dl>`,
      Qt = Q()
        ? "Данные для партнёрства; публикация в каталоге необязательна."
        : o() === "agent"
          ? "Ваши данные для сотрудничества и сертификатов."
          : "Личные данные отдельно от сведений работодателя.",
      Xt = `<section class="panel production-identity"><h2>${o() === "employee" ? "Личный профиль" : "Рабочий профиль"}</h2><div class="production-identity-row"><span class="production-avatar" aria-hidden="true">${t((w || re[o()]).slice(0, 2).toUpperCase())}</span><div><h3>${t(w || "Заполните профиль")}</h3><p class="small">${t(re[o()])}${p.city ? " \xB7 " + t(p.city) : ""}</p></div></div>${oe}<div class="production-panel-foot"><p class="small">${Qt}</p>${v("basics", "Изменить")}</div></section>`,
      Zt = Q()
        ? `<aside class="panel production-catalog-teaser"><span class="eyebrow">Каталог RemCard</span><h2>Пусть новые клиенты найдут вас</h2><p class="small">Персональная страница на remcard.ru: клиенты смогут найти ваши ${o() === "specialist" ? "услуги" : "товары и услуги"} и связаться с вами.</p><p class="small">Статус: ${t(l.statusLabel())}</p>${v("catalog", l.statusLabel() === "Не опубликовано" ? "Подготовить публикацию" : "Посмотреть карточку", !0)}</aside>`
        : `<aside class="panel stack"><h2>${o() === "agent" ? "Рекомендуйте и получайте бонусы" : "Ваш рабочий доступ"}</h2><p class="small">${o() === "agent" ? "Выбирайте партнёра, создавайте сертификат и делитесь с клиентами." : "Организацию, должность и доступы назначает работодатель. Не нужно регистрироваться заново как партнёр."}</p>${M ? '<button class="btn" data-profile-action="access">Как получить доступ</button>' : e.workActions()}</aside>`,
      ea = K()
        ? `<section class="panel production-shortcuts"><button data-profile-action="tab" data-profile-id="branches"><span><strong>Филиалы</strong><small>Адреса и данные ваших точек.</small></span><b>${e.organizationBranches().length}</b></button><button data-profile-action="tab" data-profile-id="team"><span><strong>Сотрудники</strong><small>Приглашения и доступы команды.</small></span><span aria-hidden="true">→</span></button></section>`
        : "";
    return `<div class="production-overview-grid">${Xt}${Zt}</div>${o() === "employee" ? e.staffContext() : ""}${ea}<section class="panel production-panel-foot"><p class="small">Настройте, куда приходят события кабинета.</p>${v("notifications", "Настройки уведомлений")}</section>${g()}`;
  }
  function y() {
    let p = Object.keys(le()).length > 0;
    return `<form data-profile-form="working" class="stack" novalidate>${te().map(m).join("")}<div class="profile-save-footer stack"><p class="field-error" role="alert" data-profile-error></p><span class="small" data-profile-dirty>${p ? "Есть несохранённые изменения" : ""}</span><div class="row">${Ke("Сохранить основные данные", n.has(o()) && !p)}<button class="btn ghost" type="button" data-profile-action="cancel">Отменить изменения</button></div>${n.has(o()) && !p ? Je() : ""}</div></form>`;
  }
  function q() {
    return `<aside class="production-profile-aside stack"><section class="panel stack"><h2>Подсказка</h2><p class="small">${o() === "employee" ? "Меняйте только свои личные данные. Рабочие сведения приходят из профиля работодателя." : o() === "agent" ? "Для старта достаточно имени и города. Контакты и аудитория заполняются по желанию." : "Рабочие данные сохраняются без модерации. Публикация в каталоге добровольна и настраивается отдельно."}</p><small>${Q() ? "Каталог: " + t(l.statusLabel()) : "Необязательные поля можно пропустить."}</small></section>${K() ? `<section class="panel stack"><h2>Организация</h2><strong>${t(b().organization || "Название не указано")}</strong><p class="small">Филиалов: ${e.organizationBranches().length}</p><p class="small">Название организации отдельно от имени представителя.</p></section>` : ""}</aside>`;
  }
  function j() {
    let p = $();
    u().some(([w]) => w === p) || (p = "overview");
    let f =
      p === "overview"
        ? h()
        : p === "basics"
          ? y()
          : p === "catalog"
            ? c()
            : p === "branches"
              ? `<section class="panel stack"><h2>Филиалы</h2><p class="small">Адреса, контакты и расписание точек остаются в разделе филиалов, как в рабочем кабинете.</p><details open class="optional"><summary>Ваши филиалы (${e.organizationBranches().length})</summary><div class="stack">${e
                  .organizationBranches()
                  .map(
                    (w, L) =>
                      `<article class="production-branch"><strong>${t(b().organization || re[o()])}</strong><p class="small">${t(w)}</p><button class="btn" data-profile-action="branch-info" data-profile-id="${L}">Посмотреть данные</button></article>`,
                  )
                  .join(
                    "",
                  )}</div></details><small>Адреса синтетические. Редактор филиалов рабочего сайта не заменяем и не дублируем.</small></section>`
              : p === "team"
                ? `<section class="panel stack"><h2>Команда и доступы</h2><p class="small">Приглашайте сотрудников и назначайте только нужные права. Организация и филиалы заполняются один раз.</p>${e.teamAction()}<small>В макете открыт существующий пример приглашения. Реальные сотрудники не загружаются.</small></section>`
                : '<section class="panel stack"><h2>Уведомления</h2><p class="small">Чтобы не пропускать приглашения, покупки и начисления. Каналы настраиваются отдельно от публичных контактов каталога.</p><div class="production-branch"><strong>В кабинете</strong><p class="small">События доступны в центре уведомлений рабочего сайта.</p></div><div class="production-branch"><strong>Telegram / MAX</strong><p class="small">Подключение к аккаунту и настройки доставки сохраняются в существующем кабинете. Боты к демо не подключены.</p></div></section>';
    if (p === "overview" || p === "basics") {
      f = renderProfileWizard(
        {
          role: o(),
          data: b(),
          directions: Le,
          userId: e.userId(),
          save: e.save,
          refresh: e.refresh,
          staffContext: e.staffContext,
          staffLinked: e.accessReady,
        },
        p,
      );
      if (p === "overview")
        f += renderBankDetails({
          role: o(),
          employerRole: () =>
            employeeEmployerRole() ||
            (o() === "employee" && e.accessReady() ? Y : null),
          canViewEmployerBank:
            o() === "employee" &&
            e.accessReady() &&
            ["ledger", "cash", "transfer"].some((a) => O(a)),
        });
    }
    if (p === "team" && ["company", "store"].includes(o())) {
      f =
        renderEmployerIdLookup({
          role: o(),
          data: b(),
          userId: e.userId(),
          branches: e.organizationBranches(),
          refresh: e.refresh,
        }) + f;
    }
    if (p === "team" && qe()) f += employeeInvitationsPanel();
    return `<div class="profile-guide production-profile" data-profile-tab="${p}"><nav class="production-profile-nav" aria-label="Разделы профиля"><div role="tablist">${u()
      .map(
        ([w, L]) =>
          `<button type="button" role="tab" id="profile-tab-${w}" aria-controls="profile-tab-panel" aria-selected="${p === w}" tabindex="${p === w ? 0 : -1}" data-profile-action="tab" data-profile-id="${w}">${L}</button>`,
      )
      .join(
        "",
      )}</div></nav><div id="profile-tab-panel" role="tabpanel" aria-labelledby="profile-tab-${p}" tabindex="-1">${e.branchContext?.() || ""}${p === "overview" ? f : `<div class="production-profile-grid"><div class="production-profile-main">${f}</div>${q()}</div>`}</div><p class="small production-demo-note">Демонстрационные данные, только до обновления страницы. Не вводите реальные персональные данные.</p></div>`;
  }
  function S(p) {
    (s.set(o(), "basics"), e.refresh());
    let f = document.querySelector(`[data-profile-step="${p}"]`);
    f &&
      (f.scrollIntoView({ block: "start", behavior: "smooth" }),
      (
        f.querySelector("input:not([readonly]),textarea") ||
        f.querySelector("button")
      )?.focus({ preventScroll: !0 }));
  }
  return {
    render: j,
    catalogWizard: l.wizard,
    selectTab(tab) {
      if (u().some(([id]) => id === tab)) s.set(o(), tab);
    },
    keydown(p) {
      let f = p.target.closest('[role="tab"][data-profile-action="tab"]');
      if (!f || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(p.key))
        return !1;
      p.preventDefault();
      let w = u(),
        L = w.findIndex(([H]) => H === f.dataset.profileId),
        M =
          p.key === "Home"
            ? 0
            : p.key === "End"
              ? w.length - 1
              : (L + (p.key === "ArrowRight" ? 1 : -1) + w.length) % w.length;
      return (
        s.set(o(), w[M][0]),
        e.refresh(),
        document.getElementById("profile-tab-" + w[M][0])?.focus(),
        !0
      );
    },
    input(p) {
      if ((Nt(p), Ot(p, t) || l.input(p))) return !0;
      let f = p.target.closest("[data-profile-form]");
      if (!f) return !1;
      (n.delete(o()), Ye(f), e.notice(""));
      let w = {
        ...Object.fromEntries(new FormData(f)),
        ...Fe(f, { retainDraft: !0 }),
      };
      return (
        Q() &&
          (Object.assign(w, Ee(f, { servicesOnly: o() === "specialist" })),
          (w.partnerSearchOptIn = new FormData(f).has("partnerSearchOptIn"))),
        a.set(o(), w),
        (f.querySelector("[data-profile-dirty]").textContent =
          "Есть несохранённые изменения"),
        !0
      );
    },
    submit(p) {
      if (l.submit(p)) return !0;
      let f = p.target;
      if (!f.matches("[data-profile-form]")) return !1;
      p.preventDefault();
      let w = {
        ...Object.fromEntries(
          [...new FormData(f)].map(([M, H]) => [M, String(H).trim()]),
        ),
        ...Fe(f),
      };
      Q() &&
        (Object.assign(w, Ee(f, { servicesOnly: o() === "specialist" })),
        (w.partnerSearchOptIn = new FormData(f).has("partnerSearchOptIn")));
      let L = te()
        .flatMap((M) => M.fields.map((H) => ({ ...H, required: M.required })))
        .find(
          (M) =>
            (M.required && !w[M.key]) ||
            (w[M.key] && !f.elements[M.key].checkValidity()),
        );
      return L
        ? ((f.querySelector("[data-profile-error]").textContent =
            `Проверьте поле \xAB${L.label}\xBB.`),
          f.elements[L.key].focus(),
          f.elements[L.key].scrollIntoView({ block: "center" }),
          !0)
        : (e.save(w),
          a.delete(o()),
          n.add(o()),
          e.notice("Основные данные сохранены. Ничего не опубликовано."),
          e.refresh(),
          !0);
    },
    click(p) {
      if (Dt(p) || l.click(p)) return !0;
      let f = p.target.closest("[data-profile-action]");
      if (!f) return !1;
      let w = f.dataset.profileAction,
        L = f.dataset.profileId;
      if (
        (w === "tab" &&
          u().some(([M]) => M === L) &&
          (s.set(o(), L),
          e.notice(""),
          e.refresh(),
          document
            .getElementById("profile-tab-panel")
            ?.focus({ preventScroll: !0 }),
          document
            .querySelector(".production-profile-nav")
            ?.scrollIntoView({ block: "start" })),
        w === "branch-info")
      ) {
        let M = e.organizationBranches()[Number(L)];
        M &&
          e.modal(
            "Данные филиала",
            `<p>${t(M)}</p><p class="small">На рабочем сайте здесь открывается существующая карточка филиала: адрес, контакты, расписание и публикация. В этом демо данные только для просмотра.</p>`,
          );
      }
      if (w === "copy-id") {
        let M = document.getElementById("profile-user-id"),
          H = document.querySelector("[data-profile-copy-status]");
        Qe(f, e.userId(), H, M);
      }
      return (
        w === "open" && S(L),
        w === "cancel" &&
          (a.delete(o()),
          n.delete(o()),
          e.refresh(),
          U("Изменения отменены. Восстановлены сохранённые данные.", "info")),
        w === "work" && e.work(),
        w === "access" && e.requestAccess(),
        w === "fix" && (e.close(), S(L)),
        !0
      );
    },
  };
}
function Ft() {
  return `<details class="optional"><summary>Что берём из действующего кабинета</summary><div class="stack" style="margin-top:16px">
  <p>Не создаём пять новых редакторов. Используем существующий профиль, каталог, филиалы и команду, меняя только нужные каждой роли блоки и подсказки.</p>
  <ul>
    <li><strong>Специалист:</strong> основные данные, услуги, этапы ремонта, формат и территория работы, контакты и отдельная карточка каталога. В новом сценарии выбирает только услуги.</li>
    <li><strong>Магазин:</strong> представитель отдельно от названия организации, товары и услуги, контакты, карточка каталога. Адрес, часы и контакты точки остаются в существующем разделе филиалов.</li>
    <li><strong>Компания:</strong> тот же профиль организации; филиалы и команда остаются отдельными готовыми разделами. Их данные не вводятся повторно.</li>
    <li><strong>Агент:</strong> имя и город из существующего профиля. Скрываем ненужные ему каталог, специализацию, филиалы и команду; не создаём второй аккаунт.</li>
    <li><strong>Сотрудник:</strong> личные данные своего аккаунта; организация, должность, права и разрешённые филиалы берутся из рабочего контекста работодателя. Текущий филиал не заменяет всю область доступа.</li>
  </ul>
  <p><strong>Сохраняем готовую логику:</strong> проверку прав на сервере, рабочие и публичные данные отдельно, сохранение черновика, модерацию, опубликованную версию и правки к ней, снятие с публикации, адресные переходы в профиль.</p>
  <p><strong>Новые требования макета:</strong> понятные статусы кнопок, отметки отсутствия данных, минимум один публичный контакт, включённый по умолчанию поиск с сохранением явного отказа, отдельный агентский сценарий. Эти изменения ещё не внедрены в рабочий сайт.</p>
  <small>Сверка кода: platform e245feea / navigator bf2081d89. При переносе Cursor должен проверить актуальный release и переиспользовать его компоненты/API. Скрытие поля не означает удаление ранее сохранённых данных. Макет не является новой базой данных или заменой серверных прав.</small>
  </div></details>`;
}
var z = document.querySelector("#app"),
  se = document.querySelector("#role-dialog"),
  r = (e) =>
    String(e ?? "").replace(
      /[&<>"']/g,
      (t) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[t],
    ),
  D = (e) => `<i data-lucide="${e}" aria-hidden="true"></i>`,
  d = (e, t, a = "", s = "") =>
    `<button type="button" class="btn ${a}" data-action="${t}" data-testid="${t.replaceAll(":", "-")}" ${s}>${e}</button>`,
  ee = {
    specialist: {
      label: "Специалист",
      icon: "hammer",
      desc: "Выполняю работы сам или с бригадой.",
      help: "Мастер, дизайнер, прораб, монтажник.",
      cta: "Создать сертификат",
      task: "Рекомендуйте проверенного партнёра",
      taskCopy: "Помогите заказчику выбрать товары или услуги для его проекта.",
      nav: [
        "home",
        "clients",
        "partners",
        "recommendations",
        "bonus",
        "scanner",
        "procurement",
        "care",
        "profile",
      ],
    },
    store: {
      label: "Магазин",
      icon: "store",
      desc: "Продаём товары в одной торговой точке.",
      help: "Материалы, оборудование, мебель.",
      cta: "Проверить сертификат",
      task: "Начните с продажи по рекомендации",
      taskCopy:
        "Проверьте сертификат клиента. Бонус начисляется только после подтверждения продажи.",
      nav: [
        "home",
        "clients",
        "recommendations",
        "partners",
        "scanner",
        "history",
        "settlements",
        "procurement",
        "care",
        "profile",
      ],
    },
    company: {
      label: "Компания",
      icon: "building-2",
      desc: "Управляю компанией, сетью или несколькими направлениями.",
      help: "Офис, филиалы, товары и услуги.",
      cta: "Пригласить сотрудника",
      task: "Соберите команду компании",
      taskCopy:
        "Назначьте понятные должности, права и подразделения. Коллеги увидят только свои рабочие задачи.",
      nav: [
        "home",
        "recommendations",
        "partners",
        "clients",
        "scanner",
        "history",
        "settlements",
        "team",
        "procurement",
        "care",
        "profile",
      ],
    },
    agent: {
      label: "Агент",
      icon: "send",
      desc: "Делюсь сертификатами и получаю бонусы.",
      help: "Рекомендую друзьям, клиентам и подписчикам.",
      cta: "Создать сертификат",
      task: "Создайте сертификат для клиента",
      taskCopy: "Выберите партнёра и поделитесь сертификатом.",
      nav: ["home", "clients", "bonus", "procurement", "care", "profile"],
    },
    employee: {
      label: "Сотрудник",
      icon: "badge-check",
      desc: "Работаю в команде магазина или компании.",
      help: "Вхожу по приглашению. Доступы определяет организация.",
      nav: [],
    },
  },
  Be = {
    wallet: ["Кошелёк", "wallet"],
    home: ["Главная", "house"],
    partners: ["Партнёры", "handshake"],
    clients: ["Клиенты", "users-round"],
    recommendations: ["Сертификаты", "ticket"],
    bonus: ["Мои бонусы", "wallet"],
    scanner: ["Сканер", "scan-line"],
    history: ["История", "history"],
    settlements: ["Взаиморасчёты", "receipt"],
    team: ["Сотрудники", "users"],
    procurement: ["Закупки", "package-search"],
    care: ["Забота", "heart-handshake"],
    profile: ["Профиль", "user-round"],
  },
  ht = {
    clients: "Клиенты и сертификаты",
    scan: "Сканирование",
    sale: "Продажа и начисление",
    own: "Свои операции",
    ledger: "Просмотр взаиморасчётов",
    cash: "Выдача наличных",
    transfer: "Фиксация перевода",
    catalog: "Каталог",
    terms: "Условия партнёрств",
    team: "Доступы сотрудников",
  },
  Se = {
    sales: {
      name: "Менеджер по продажам",
      keys: ["clients", "scan", "sale", "own"],
    },
    manager: {
      name: "Управляющий магазина",
      keys: [
        "clients",
        "scan",
        "sale",
        "own",
        "ledger",
        "catalog",
        "terms",
        "team",
      ],
    },
    cashier: {
      name: "Кассир магазина",
      keys: ["scan", "sale", "own"],
    },
    payout: {
      name: "Специалист по выплатам",
      keys: ["ledger", "cash", "transfer"],
    },
  },
  ye = [
    "ул. 40 лет Победы, 168",
    "Ростовское шоссе, 30/3",
    "ул. Красных Партизан, 235",
    "ул. Новороссийская, 216/5",
    "ул. Российская, 414",
    "ул. Исаева, 19",
  ],
  sa = "DEMO-104827",
  i = {
    role: "agent",
    screen: "welcome",
    page: "profile",
    theme: matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light",
    preset: "sales",
    permissions: new Set(Se.sales.keys),
    scope: "all",
    invite: "none",
    branch: 0,
    reviewOpen: !1,
    records: [],
    invitations: [],
    drafts: {},
    returnFocus: null,
    notice: "",
    lastExitScope: "current",
  },
  Pt = "",
  zt = 0;
Object.defineProperty(i, "notice", {
  get: () => Pt,
  set(e) {
    Pt = e;
    let t = ++zt;
    if (!e) {
      (Re(), z.querySelector('#main > .notice[role="status"]')?.remove());
      return;
    }
    queueMicrotask(() => {
      t === zt && U(e);
    });
  },
});
var Y = "company",
  Oe = () => i.drafts[Y] || {},
  ia = () => (Y === "store" ? ye.slice(0, 1) : ye);
Be.links = ["Приглашения", "link"];
var ue = () => !k() || (J() && O("terms")),
  qe = () => ["store", "company"].includes(i.role) || (J() && O("team")),
  na = () => [...i.records, ...i.invitations],
  B = (e) => na().find((t) => t.id === e),
  lt = (e) =>
    !e.disabled && !e.deleted && !e.accepted && e.negotiation !== "accepted",
  Vt = (e = i.role) => {
    let t = [
      {
        id: "client-anna",
        name: "Анна \xB7 демо",
        city: "Краснодар",
        phone: "",
        email: "",
        note: "Подбирает напольные покрытия для квартиры. Удобнее связаться вечером.",
        need: "Ремонт квартиры",
        purchases: [],
      },
      {
        id: "client-dmitry",
        name: "Дмитрий \xB7 демо",
        city: "Краснодар",
        phone: "",
        email: "",
        note: "Межкомнатные двери куплены. Обсудить установку.",
        need: "Двери для дома",
        purchases: [
          {
            id: "demo-purchase",
            date: "12.10.2026",
            partner: "Дом материалов",
            description: "Межкомнатные двери",
            amount: 28e3,
            status: "Подтверждена \xB7 демо",
          },
        ],
      },
    ];
    return (
      e === "agent" &&
        ((t[0].purchases = [
          {
            id: "agent-purchase-anna",
            date: "13.10.2026",
            partner: "Дом материалов",
            description: "Напольные покрытия",
            amount: 12e3,
            bonus: 600,
            certificateId: "demo-audience-certificate",
            certificateLabel: "Ремонт для подписчиков",
            status: "Покупка подтверждена \xB7 демо",
          },
        ]),
        Object.assign(t[1].purchases[0], {
          bonus: 1400,
          certificateId: "demo-audience-certificate",
          certificateLabel: "Ремонт для подписчиков",
        })),
      e === "store" &&
        ((t[0].purchases = [
          {
            id: "store-purchase-anna",
            date: "13.10.2026",
            partner: "Ваш магазин \xB7 демо",
            ownStore: !0,
            description: "Напольные покрытия",
            amount: 12e3,
            sourceName: "Мария \xB7 агент (демо)",
            certificateId: "external-store-certificate",
            certificateLabel: "Сертификат от Марии",
            status: "Подтверждена \xB7 демо",
          },
        ]),
        Object.assign(t[1].purchases[0], {
          partner: "Ваш магазин \xB7 демо",
          ownStore: !0,
          sourceName: "Самостоятельное обращение",
        })),
      ["agent", "store"].includes(e) &&
        t.push({
          id: "client-vera",
          name: "Вера \xB7 демо",
          city: "Краснодар",
          phone: "",
          email: "",
          note: "Уточнить размеры и пожелания.",
          need: "Выбирает двери",
          purchases: [],
        }),
      t
    );
  },
  ne = Vt(),
  vt = "",
  ge = null,
  he = (e) => ne.find((t) => t.id === e && !t.deleted),
  _e = (e) =>
    i.records.filter(
      (t) =>
        !t.deleted &&
        (t.clientId === e ||
          he(e)?.purchases.some((a) => a.certificateId === t.id)),
    ),
  pe = (e) => new Intl.NumberFormat("ru-RU").format(e) + " ₽",
  bt = (e) =>
    i.role === "store" ? e.purchases.filter((t) => t.ownStore) : e.purchases,
  He = (e) => bt(e).reduce((t, a) => t + (a.bonus || 0), 0),
  Wt = () => ne.reduce((e, t) => e + He(t), 0);
function yt() {
  i.role === "agent" &&
    i.records.push({
      id: "demo-audience-certificate",
      kind: "certificate",
      ...newCertificateIdentity(),
      name: "Ремонт для подписчиков \xB7 демо",
      partner: "Дом материалов",
      category: "Напольные покрытия, Двери",
      createdAt: "12.10.2026",
      clientId: null,
      usageMode: "once_per_partner",
      hasOperations: !0,
      terms: [
        {
          partnerId: "materials",
          partnerName: "Дом материалов",
          categoryId: "floor",
          categoryName: "Напольные покрытия",
          limit: 15,
          discount: 10,
          bonus: 5,
        },
        {
          partnerId: "materials",
          partnerName: "Дом материалов",
          categoryId: "doors",
          categoryName: "Двери",
          limit: 10,
          discount: 5,
          bonus: 5,
        },
      ],
    });
}
var Ce = (e, t) =>
  `${e} ${t[e % 100 >= 11 && e % 100 <= 14 ? 2 : e % 10 === 1 ? 0 : e % 10 >= 2 && e % 10 <= 4 ? 1 : 2]}`;
function gt(e = i.role) {
  ((ne = Vt(e)), (vt = ""), (ge = null), ce.reset());
}
function la() {
  let e = vt.trim().toLocaleLowerCase("ru"),
    t = ne.filter((a) =>
      `${a.name} ${a.phone} ${a.email} ${a.city} ${a.need}`
        .toLocaleLowerCase("ru")
        .includes(e),
    );
  return `<p class="small" role="status">Найдено клиентов: ${t.length}</p>${t.length ? t.map((a) => `<article class="client-row"><button class="client-identity" data-action="client-open:${a.id}"><span class="client-avatar">${r(a.name.slice(0, 1))}</span><span><strong>${r(a.name)}</strong><small>${r(a.need || "Задача пока не указана")} \xB7 ${r(a.city || "Город не указан")}</small></span></button><div class="client-row-meta"><span>${Ce(_e(a.id).length, ["сертификат", "сертификата", "сертификатов"])}</span><span>${Ce(a.purchases.length, ["покупка", "покупки", "покупок"])}</span>${d("Открыть", `client-open:${a.id}`, "ghost")}</div></article>`).join("") : `<section class="panel"><h3>Клиентов не найдено</h3><p class="muted">Попробуйте другое имя или добавьте клиента.</p>${d("Добавить клиента", "client-add", "primary")}</section>`}`;
}
function ra() {
  if (!Te().includes("clients"))
    return '<section class="panel"><h2>Нет доступа к клиентам</h2><p>Доступ назначает организация.</p></section>';
  let e = he(ge);
  ce.register({ key: "clients", type: "clients", items: ne, readOnly: k() && !O("clients") });
  if (["agent", "store"].includes(i.role)) return oa(e);
  if (!e)
    return `<div class="stack"><div>${d("Добавить клиента", "client-add", "primary")}</div>${ce.render({ key: "clients", type: "clients", items: ne, title: "Клиенты", empty: "Добавьте первого клиента. Для создания сертификата это необязательно." })}<p class="small">Контакты, заметки и история открываются в карточке клиента.</p></div>`;
  let t = _e(e.id),
    a = t.at(-1);
  return `<div class="stack">${d("← Все клиенты", "client-back", "ghost")}<section class="panel client-header"><div class="row"><span class="client-avatar large">${r(e.name.slice(0, 1))}</span><div><h2>${r(e.name)}</h2><p class="muted">${r(e.need || "Задача пока не указана")} \xB7 ${r(e.city || "Город не указан")}</p></div></div>${d("Изменить данные", `client-edit:${e.id}`)}</section>
    <div class="client-summary"><div><strong>${t.length}</strong><small>Сертификатов</small></div><div><strong>${e.purchases.length}</strong><small>Покупок</small></div><div><strong>${a ? r(a.createdAt) : "Нет"}</strong><small>Последний сертификат</small></div></div>
    <div class="two-col"><section class="panel stack"><h2>Контакты</h2><div><span class="eyebrow">Телефон</span><p>${r(e.phone || "Не указан")}</p></div><div><span class="eyebrow">Email</span><p>${r(e.email || "Не указан")}</p></div><small>Контакты не отправляются партнёрам автоматически.</small></section><section class="panel stack"><h2>Заметка о клиенте</h2><p class="client-note">${r(e.note || "Здесь можно записать задачу клиента и о чём договорились.")}</p>${d("Изменить заметку", `client-edit:${e.id}`, "ghost")}</section></div>
    <section class="stack"><div class="row between"><h2>Сертификаты клиента</h2>${d("Создать сертификат", `client-certificate:${e.id}`, "primary")}</div>${je(t, "Пока нет сертификатов для этого клиента. Созданный из этой карточки сертификат появится здесь автоматически.", "client-certificates-" + e.id, "certificates")}</section>
    <details class="panel fold-list" ${e.purchases.length ? "open" : ""}><summary>История покупок <span class="badge-count">${e.purchases.length}</span></summary>${e.purchases.length ? e.purchases.map((s) => `<article class="client-purchase"><div><strong>${r(s.description)}</strong><small>${r(s.partner)} \xB7 ${r(s.date)}</small></div><div><strong>${new Intl.NumberFormat("ru-RU").format(s.amount)} ₽</strong><span class="pill good">${r(s.status)}</span></div></article>`).join("") : '<p class="muted">Покупок пока нет. Здесь появятся дата, партнёр, товары или услуги, сумма и статус после подтверждения покупки.</p>'}<small>Создание или отправка сертификата сами по себе покупкой не считаются. В макете показаны только демонстрационные записи.</small></details></div>`;
}
function oa(e) {
  let t = i.role === "agent",
    a = t
      ? "Видны только покупки, связанные с вашими сертификатами, и ваши бонусы."
      : "Видны только покупки в вашем магазине. Покупки клиента у других партнёров не показываются.";
  if (!e)
    return `<div class="stack"><p class="muted">${t ? "Кому вы помогаете с выбором и какие бонусы приносят их покупки." : "Ваши покупатели, покупки и источник рекомендации."}</p><div>${d("Добавить клиента", "client-add", "primary")}</div>${ce.render({ key: "clients", type: "clients", items: ne, title: "Клиенты", empty: "Добавьте клиента, когда нужно сохранить имя или заметку." })}<details class="optional"><summary>Какие данные здесь видны?</summary><p class="small">${a} Контакты не передаются между участниками автоматически. Примеры полностью вымышлены.</p></details></div>`;
  let s = bt(e),
    n = _e(e.id),
    l = s.reduce((b, A) => b + A.amount, 0),
    o = [
      ...new Map(
        s.filter((b) => b.certificateId).map((b) => [b.certificateId, b]),
      ).values(),
    ];
  return `<div class="stack">${d("← Все клиенты", "client-back", "ghost")}<section class="panel client-header"><div class="row"><span class="client-avatar large">${r(e.name.slice(0, 1))}</span><div><h2>${r(e.name)}</h2><p class="muted">${r(e.need || "Задача не указана")} \xB7 ${r(e.city || "Город не указан")}</p></div></div>${d("Изменить данные", `client-edit:${e.id}`)}</section>
  <div class="client-summary"><div><strong>${t ? n.length : s.length}</strong><small>${t ? "Сертификатов" : "Покупок у вас"}</small></div><div><strong>${t ? s.length : pe(l)}</strong><small>${t ? "Покупок по сертификатам" : "Сумма покупок у вас"}</small></div><div><strong>${t ? pe(He(e)) : o.length}</strong><small>${t ? "Ваш бонус \xB7 начислено, демо" : "Использовано сертификатов"}</small></div></div>
  <section class="panel stack"><h2>Заметка</h2><p class="client-note">${r(e.note || "О чём договорились с клиентом?")}</p><div>${d("Изменить заметку", `client-edit:${e.id}`, "ghost")}</div><details class="optional"><summary>Контакты</summary><p>Телефон: ${r(e.phone || "Не указан")}</p><p>Email: ${r(e.email || "Не указан")}</p><small>Только введённые вами данные. Контакты не передаются автоматически.</small></details></section>
  ${t ? `<section class="stack"><div class="row between"><h2>Сертификаты клиента</h2>${d("Создать сертификат", `client-certificate:${e.id}`, "primary")}</div><p class="small">Сертификаты, созданные для клиента или использованные им. Один сертификат может использоваться несколькими клиентами.</p>${je(n, "Сертификатов пока нет.", "client-certificates-" + e.id, "certificates")}</section>` : ""}
  <details class="panel fold-list" open data-testid="client-purchases"><summary>${t ? "Покупки и ваши бонусы" : "Покупки в вашем магазине"} <span class="badge-count">${s.length}</span></summary>${s.length ? s.map((b) => `<article class="client-purchase"><div><strong>${r(b.description)}</strong><small>${r(b.date)} \xB7 ${r(b.partner)}</small><small>${t ? "Сертификат: " + r(b.certificateLabel || "Не указан") : "Источник: " + r(b.sourceName || "Не указан")}</small>${!t && b.certificateLabel ? `<small>Использован: ${r(b.certificateLabel)}</small>` : ""}</div><div><strong>${pe(b.amount)}</strong>${t ? `<small>Ваш бонус: ${pe(b.bonus || 0)}</small>` : ""}<span class="pill good">${r(b.status)}</span></div></article>`).join("") : `<p class="muted">${t ? "Пока нет подтверждённых покупок по вашим сертификатам." : "Покупок в вашем магазине пока нет."}</p>`}<small>${a} Отправка сертификата не считается покупкой.</small></details>
  ${t ? "" : `<details class="panel fold-list"><summary>Сертификаты, которые вы выдали клиенту <span class="badge-count">${n.length}</span></summary><div class="stack"><p class="small">Ваши рекомендации других партнёров, отдельно от сертификатов, с которыми клиент пришёл к вам.</p><div>${d("Создать сертификат", `client-certificate:${e.id}`)}</div>${je(n, "Вы ещё не выдавали этому клиенту сертификаты.", "client-certificates-" + e.id, "certificates")}</div></details>`}
  <p class="small">Демонстрационные данные. Покупки и бонусы не являются реальными операциями.</p></div>`;
}
function Bt(e) {
  if (!Te().includes("clients")) return;
  let t = he(e) || {
    name: "",
    city: "",
    phone: "",
    email: "",
    need: "",
    note: "",
  };
  E(
    e ? "Данные клиента" : "Добавить клиента",
    `<form id="client-form" data-id="${e || ""}" class="stack"><label class="field">Имя клиента *<input name="name" value="${r(t.name)}" required maxlength="100" placeholder="Как обращаться к клиенту"></label><label class="field">Задача \xB7 необязательно<input name="need" value="${r(t.need)}" maxlength="160" placeholder="Например, ремонт квартиры"></label><details class="optional" ${e ? "open" : ""}><summary>Контакты и заметка \xB7 необязательно</summary><div class="stack" style="margin-top:16px"><label class="field">Город<input name="city" value="${r(t.city)}" maxlength="100"></label><label class="field">Телефон<input name="phone" type="tel" value="${r(t.phone)}" maxlength="40"></label><label class="field">Email<input name="email" type="email" value="${r(t.email)}" maxlength="120"></label><label class="field">Заметка<textarea name="note" rows="3" maxlength="1000">${r(t.note)}</textarea></label></div></details><p class="small">В прототипе ничего не отправляется. Не вводите реальные персональные данные для публичной демонстрации.</p><button class="btn primary" type="submit">${e ? "Сохранить" : "Добавить клиента"}</button></form>`,
  );
}
var wt = (e) =>
    e.kind === "employee"
      ? "Приглашение сотрудника"
      : e.kind === "partner"
        ? "Приглашение партнёра"
        : "Сертификат RemCard",
  kt = (e) =>
    e.disabled
      ? e.kind === "certificate"
        ? "Сертификат отключён"
        : "Ссылка отключена"
      : e.hasOperations
        ? "Есть покупки"
        : e.accepted
          ? "Приглашение принято"
          : e.kind === "certificate"
            ? "Ожидает покупки"
            : e.negotiation === "accepted"
              ? "Условия согласованы"
              : e.negotiation === "offered"
                ? "Получено предложение партнёра"
                : e.negotiation === "changes_requested"
                  ? "Запрошены другие условия"
                  : e.kind === "partner"
                    ? "Ожидает предложения партнёра"
                    : "Ожидает принятия",
  k = () => i.role === "employee",
  me = () => {
    let e = k() ? ia() : ye;
    return i.scope === "office"
      ? []
      : i.scope === "one"
        ? e.slice(0, 1)
        : i.scope === "some"
          ? e.slice(0, 2)
          : e;
  },
  we = () => ["all", "office"].includes(i.scope) && (!k() || Y === "company"),
  St = () => {
    let e = me().length;
    return we()
      ? e
        ? `Головной офис и ${Ce(e, ["филиал", "филиала", "филиалов"])}`
        : "Головной офис"
      : e
        ? Ce(e, ["филиал", "филиала", "филиалов"])
        : "Нет назначенных филиалов";
  },
  O = (e) =>
    !k() ||
    (J() &&
      i.permissions.has(e) &&
      (!["scan", "sale"].includes(e) || me().length > 0)),
  rt = (e) =>
    (i.role === "agent" &&
      {
        home: "Сертификаты",
        recommendations: "Сертификаты",
        bonus: "Бонусы",
        profile: "Профиль",
      }[e]) ||
    Be[e][0],
  ot = () => ee[i.role].label,
  ie = () => ({
    ...(["specialist", "store", "company"].includes(i.role)
      ? { partnerSearchOptIn: !0 }
      : {}),
    ...(i.drafts[i.role] || {}),
  }),
  $e = () =>
    k()
      ? Oe().organization ||
        (Y === "store" ? "Магазин \xABПример\xBB" : "Компания \xABПример\xBB")
      : ie().organization ||
        (i.role === "store" ? "Мой магазин" : "Моя компания"),
  Ue = () => (k() || ["store", "company"].includes(i.role) ? $e() : ke()),
  ke = () => ie().name || "Алексей",
  J = () => k() && i.invite === "valid",
  ca = () => (i.theme === "dark" ? "Светлая тема" : "Тёмная тема"),
  da = () =>
    '<a class="brand" href="./roles.html" aria-label="RemCard: начало прототипа"><svg viewBox="0 0 36 36" role="img" aria-label="RemCard"><rect width="36" height="36" rx="10" fill="currentColor"/><path d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="var(--onaccent)" stroke-width="2.2" stroke-linejoin="round"/></svg><span>remcard<em>.</em><small>для партнёров</small></span></a>';
function Te() {
  if (!k()) {
    let a = [...ee[i.role].nav];
    return (
      i.role !== "agent" &&
        (ue() || qe()) &&
        a.splice(a.length - 1, 0, "links"),
      [...new Set([...a, "wallet", ...(ue() ? ["partners"] : [])])]
    );
  }
  if (!J()) return ["home", "profile"];
  let e = i.permissions,
    t = ["home"];
  return (
    ["clients", "scan", "sale", "terms"].some((a) => e.has(a)) &&
      t.push("partners"),
    e.has("clients") && t.push("clients", "recommendations"),
    (O("scan") || O("sale")) && t.push("scanner"),
    e.has("own") && t.push("history"),
    ["ledger", "cash", "transfer"].some((a) => e.has(a)) &&
      t.push("settlements"),
    e.has("team") && t.push("team"),
    (ue() || qe()) && t.push("links"),
    (e.has("terms") || e.has("catalog")) && t.push("procurement"),
    (e.has("terms") || e.has("catalog") || e.has("sale")) && t.push("care"),
    t.push("profile"),
    t.includes("settlements") &&
      t.push("wallet"),
    t
  );
}
function pa(e) {
  const items = [
    "home",
    "clients",
    "recommendations",
    "scanner",
    "partners",
    "wallet",
    ...(k() ? ["history"] : []),
    "team",
    "procurement",
    "care",
    "profile",
  ].filter((key) => e.includes(key));
  return items
    .map((key) => {
      const current =
        i.page === key ||
        (key === "wallet" &&
          ["bonus", "settlements"].includes(i.page)) ||
        (key === "partners" && i.page === "links" && !qe());
      const label = key === "links" ? "Приглашения сотрудников" : key === "history" && k() ? "Мои операции" : rt(key);
      return `<button class="nav-btn" data-action="nav:${key}" data-testid="nav-${key}" ${current ? 'aria-current="page"' : ""}>${D(Be[key][1])}${label}</button>`;
    })
    .join("");
}
function ma() {
  z.querySelectorAll("main section.panel").forEach((e) => {
    let t = [...e.children].filter((s) => s.classList.contains("action-line"));
    if (t.length <= 3) return;
    let a = document.createElement("details");
    ((a.className = "fold-list"),
      (a.innerHTML = `<summary>Ещё записи <span class="badge-count">${t.length - 3}</span></summary>`),
      t.slice(3).forEach((s) => a.append(s)),
      e.append(a));
  });
}
function certificateCard(e) {
  return renderCertificateCard(e, certificateQuickActions(e));
}
function certificateQuickActions(e) {
  return recordActionToolbar("certificates", e, null);
}
function recordActionToolbar(type, item, key, readOnly = false, showOpen = false, includeCoop = true) {
  const editable = !readOnly && !nt(type, item, "rename");
  if (!editable && !showOpen && !(includeCoop && type === "partners" && item.ready)) return "";
  const button = (icon, label, action, danger = false) => {
    const reason = action === "open" ? "" : nt(type, item, action === "archive" && item.archived ? "restore" : action) ||
      (action === "share" && ["certificates", "invitations"].includes(type) && !lt(item) ? "Ссылка неактивна или приглашение уже принято." : "");
    const destination = key
      ? `data-coll-key="${r(key)}" ${action === "open" ? `data-coll-open="${r(item.id)}"` : `data-coll-item-action="${action}" data-coll-id="${r(item.id)}"`}`
      : `data-action="link-${action}:${r(item.id)}"`;
    return `<button type="button" class="certificate-list-action ${action === "open" ? "is-open" : ""} ${danger ? "is-danger" : ""} ${reason ? "is-unavailable" : ""}" ${destination} data-testid="record-${action}-${r(item.id)}" aria-label="${label}" title="${r(reason ? `${label}: ${reason}` : label)}">${D(icon)}</button>`;
  };
  const coopAction =
    includeCoop && type === "partners" && item.ready
      ? `<div class="coop-list-actions">${coop.listActionHtml(item, { readOnly: !!readOnly })}</div>`
      : "";
  return `<div class="certificate-list-actions record-action-toolbar" role="group" aria-label="Действия с записью «${r(item.alias || item.name)}»">
    ${showOpen ? button("eye", "Открыть карточку", "open") : ""}
    ${editable ? button("share-2", "Поделиться", "share") + button("pencil", "Переименовать", "rename") + button(item.archived ? "archive-restore" : "archive", item.archived ? "Вернуть из архива" : "В архив", "archive") + button("trash-2", "Удалить", "delete", true) : ""}
  </div>${coopAction}`;
}
function showRecordShare(text, note = "Ничего не отправляется автоматически. В прототипе рабочая ссылка не создаётся.") {
  E("Поделиться", `<label class="field">Предпросмотр текста<textarea id="share-copy" rows="6" readonly>${r(text)}</textarea></label>${d("Скопировать текст", "copy-link-message", "primary")}<p class="small" id="copy-result" role="status">${r(note)}</p>`);
}
function openRecordUtility(type, item, action, key) {
  const reason = nt(type, item, action);
  if (reason) { E("Действие недоступно", `<p class="notice">${r(reason)}</p>`); return; }
  if (action === "rename") {
    if (["certificates", "invitations"].includes(type)) { ha(item.id, true); return; }
    E("Переименовать", `<form id="record-rename-form" class="stack"><label class="field">${type === "partners" ? "Название для себя" : "Имя клиента"}<input name="name" required maxlength="100" value="${r(item.alias || item.name)}"></label><p class="small">${type === "partners" ? "Меняется только название в вашем списке. Официальное название партнёра и условия сотрудничества не изменяются." : "Контакты, заметки, покупки и связанные сертификаты останутся без изменений."}</p><button type="submit" class="btn primary">Сохранить</button></form>`);
    document.querySelector("#record-rename-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = new FormData(event.currentTarget).get("name")?.trim();
      if (!name || item.deleted || nt(type, item, "rename")) return;
      if (type === "partners") item.alias = name;
      else item.name = name;
      _(); Ma(); U("Название сохранено в макете.");
    });
    return;
  }
  if (action !== "share") return;
  if (["certificates", "invitations"].includes(type)) {
    if (!lt(item)) {
      E("Нельзя поделиться", '<p class="notice">Ссылка неактивна или приглашение уже принято. Карточка и история остаются в кабинете.</p>');
      return;
    }
    const text = type === "certificates"
      ? `Скидочный сертификат RemCard\nКод: ${item.displayCode || "Не указан"}\n${(item.terms || []).map((offer) => `${offer.partnerName} · ${offer.categoryName}: скидка ${offer.discount}%`).join("\n")}\n${We(item)}.\n[Демонстрационный макет, рабочая ссылка не создаётся.]`
      : `Приглашение RemCard от ${Ue()}\n${item.kind === "employee" ? "В команду" : "К сотрудничеству"}: ${item.partner}\n${item.category || ""}\n[Демонстрационный макет, рабочая ссылка не создаётся.]`;
    showRecordShare(text);
    return;
  }
  if (type === "partners") {
    showRecordShare(`${item.name}\n${item.city || ""}\n${(item.topics || []).join(", ")}`, "Только общая информация о партнёре. Личное название, персональные скидки, бонусы и расчёты не включены. Ничего не отправляется автоматически.");
    return;
  }
  const fields = [["name", "Имя клиента", true], ["need", "Задача", true], ["city", "Город", false], ["phone", "Телефон", false], ["email", "Почта", false]];
  E("Поделиться карточкой клиента", `<p class="small">Выберите, что включить в текст. Контакты добавляются только по вашему выбору; заметки, покупки и финансы не передаются.</p><fieldset class="record-share-fields"><legend>Данные для отправки</legend>${fields.map(([field, label, checked]) => `<label class="check"><input type="checkbox" data-share-field="${field}" ${item[field] ? (checked ? "checked" : "") : "disabled"}><span>${label}${item[field] ? "" : ": не указано"}</span></label>`).join("")}</fieldset><label class="field">Предпросмотр<textarea id="share-copy" rows="5" readonly></textarea></label>${d("Скопировать выбранное", "copy-link-message", "primary")}<p class="small" id="copy-result" role="status">Демонстрационные данные. Ничего не отправляется автоматически.</p>`);
  const body = document.querySelector(".dialog-body");
  const update = () => {
    const chosen = fields.filter(([field]) => body.querySelector(`[data-share-field="${field}"]`).checked);
    body.querySelector("#share-copy").value = chosen.map(([field, label]) => `${label}: ${item[field]}`).join("\n");
    body.querySelector('[data-action="copy-link-message"]').disabled = !chosen.length;
  };
  body.addEventListener("change", update);
  update();
}
function ua(e, toolbar = "") {
  return `<article class="link-card ${e.kind === "certificate" ? "remcard-certificate" : ""} ${e.disabled ? "is-disabled" : ""}" data-link-id="${e.id}">
    <div class="row between"><span class="eyebrow">${e.kind === "certificate" ? "remcard \xB7 сертификат" : wt(e)}</span><span class="pill">${kt(e)}</span></div>
    <button class="card-title" data-action="link-open:${e.id}" data-testid="link-open-${e.id}">${r(e.name)}</button>
    <p>${r(e.partner)}${e.category && e.category !== e.name ? " \xB7 " + r(e.category) : ""}</p>
    ${e.kind === "certificate" ? `<p class="usage-caption">${D("ticket")}${We(e)}</p>` : ""}
    ${e.clientId && he(e.clientId) ? d("Клиент: " + r(he(e.clientId).name), `client-open:${e.clientId}`, "ghost") : ""}
    ${Jt(e)}
    <div class="certificate-bottom"><small>${"От " + r(e.kind === "certificate" ? ke() : Ue()) + " \xB7 демо"}</small>${d("Подробнее " + D("arrow-up-right"), `link-open:${e.id}`, "ghost")}</div>
    <div class="record-card-actions">${toolbar || recordActionToolbar(e.kind === "certificate" ? "certificates" : "invitations", e, null)}</div>
  </article>`;
}
function je(e, t, a = "certificates", s = "certificates") {
  return ce.render({
    key: a,
    type: s,
    items: e,
    empty: t,
    title: s === "invitations" ? "Приглашения" : "Сертификаты",
    seed: !a.startsWith("client-certificates-"),
  });
}
function fa() {
  return `<section class="panel hero-task"><div><h2>Создайте сертификат для клиента</h2><p class="muted">Клиент покупает у партнёра. Вы получаете бонус.</p></div>${d("Создать сертификат " + D("arrow-right"), "action:recommend", "primary")}</section>
    <div class="stats"><div class="stat"><span class="small">Мои сертификаты</span><strong>${i.records.filter((e) => !e.archived && !e.deleted).length}</strong><small>На основном экране</small></div><div class="stat"><span class="small">Начислено</span><strong>${pe(Wt())}</strong><small>За покупки клиентов \xB7 демо</small></div><div class="stat"><span class="small">Получено</span><strong>0 ₽</strong><small>Выплат в макете нет</small></div></div>
    ${je(i.records, "Выберите партнёра, создайте сертификат и отправьте клиенту.")}
    <details class="panel fold-list agent-invites"><summary>Приглашения партнёрам <span class="badge-count">${i.invitations.filter((e) => e.kind === "partner" && !e.deleted && !e.archived).length}</span></summary><div class="stack"><p class="small">Если нужного партнёра ещё нет, пригласите его и согласуйте условия.</p><div>${d("Пригласить партнёра", "new-link:partner")}</div>${je(
      i.invitations.filter((e) => e.kind === "partner"),
      "Вы ещё не приглашали партнёров.",
      "invitations",
      "invitations",
    )}</div></details>`;
}
var G = [
    {
      id: "materials",
      name: "Дом материалов",
      city: "Краснодар",
      categories: [
        {
          id: "floor",
          name: "Напольные покрытия",
          limit: 15,
        },
        { id: "doors", name: "Двери", limit: 10 },
        {
          id: "walls",
          name: "Отделка стен",
          limit: 8,
        },
      ],
    },
    {
      id: "interior",
      name: "Мастерская интерьера",
      city: "Краснодар",
      categories: [
        {
          id: "painting",
          name: "Малярные работы",
          limit: 12,
        },
        {
          id: "assembly",
          name: "Сборка мебели",
          limit: 7,
        },
      ],
    },
  ],
  P = [
    ...G.map((e) => ({
      ...e,
      type: e.id === "materials" ? "store" : "company",
      topics: e.categories.map((t) => t.name),
      ready: !0,
    })),
    {
      id: "light",
      name: "Студия света",
      city: "Краснодар",
      type: "store",
      topics: ["Освещение"],
    },
    {
      id: "tile",
      name: "Керамика Юг",
      city: "Анапа",
      type: "store",
      topics: ["Плитка"],
    },
    {
      id: "repair",
      name: "Ремонт и комфорт",
      city: "Краснодар",
      type: "company",
      topics: ["Ремонт"],
    },
    {
      id: "master",
      name: "Мастер дверей",
      city: "Новороссийск",
      type: "specialist",
      topics: ["Установка дверей"],
    },
    {
      id: "recommender",
      name: "Агент \xABРекомендации\xBB",
      city: "Краснодар",
      type: "agent",
      topics: ["Рекомендации"],
    },
  ];
P.forEach(
  (e) =>
    (e.generalTerms =
      e.type === "agent"
        ? []
        : e.categories
          ? e.categories.map((t) => ({ name: t.name, limit: t.limit }))
          : e.topics.map((t, a) => ({ name: t, limit: 10 + a * 2 }))),
);
function qt(e) {
  return `<details class="fold-list general-terms"><summary>Общие условия для агентов <span class="badge-count">${e.generalTerms.length}</span></summary>${e.generalTerms.length ? e.generalTerms.map((t) => `<div class="term-summary"><strong>${r(t.name)}</strong><span>Общий процент: <b>${t.limit}%</b></span></div>`).join("") : '<p class="small">Общие условия пока не опубликованы. Можно запросить персональное предложение.</p>'}<p class="small">Демоусловия. Это общий процент на скидку клиенту и бонус агенту, не гарантированный доход. Итоговые условия партнёр предложит после приглашения.</p></details>`;
}
var V = null;
function ga(e) {
  return e.kind !== "partner" || e.disabled
    ? ""
    : e.negotiation === "accepted"
      ? `<section class="notice"><strong>Ваши согласованные условия</strong>${_t(e.finalTerms)}<p>Партнёр доступен при создании сертификата. Сохранённые сертификаты не пересчитываются.</p></section>`
      : e.negotiation === "offered"
        ? `<section class="stack"><h3>Ваши персональные условия</h3>${_t(e.finalTerms)}${e.partnerMessage ? `<p class="notice">${r(e.partnerMessage)}</p>` : ""}<p class="small">После принятия вы сможете распределять этот процент между скидкой клиенту и своим бонусом.</p><div class="row">${d("Принять условия", `offer-accept:${e.id}`, "primary")}${d("Запросить другие условия", `offer-counter:${e.id}`)}</div></section>`
        : `<p class="notice">Ожидаем итоговое предложение партнёра по категориям. Общие условия ещё не являются вашей договорённостью.${e.counterMessage ? `<br>Ваш запрос: ${r(e.counterMessage)}` : ""}</p>`;
}
function _t(e) {
  return `<div class="offer-summary">${(e || []).map((t) => `<div class="term-summary"><strong>${r(t.name)}</strong><span>Скидка клиенту + бонус агенту: <b>${t.limit}%</b></span></div>`).join("")}<small>Акционные модели исключены. Начисление только после подтверждённой покупки.</small></div>`;
}
function st(e, t = !1) {
  let a = B(e);
  if (!a || a.disabled || a.deleted || a.negotiation === "accepted") return;
  if (!a.targetId && !a.previewRegistered) {
    De(e);
    return;
  }
  let s = P.find((l) => l.id === a.targetId);
  (t || !V || V.id !== e) &&
    (V = {
      id: e,
      rows: (a.finalTerms || s?.generalTerms || [{ name: "", limit: "" }]).map(
        (l) => ({ ...l }),
      ),
      message: a.partnerMessage || "",
    });
  let n = V;
  E(
    "Предложение агенту",
    `<span class="eyebrow">Демонстрация: кабинет партнёра</span><p>Вы показываете действие партнёра <strong>${r(a.partner)}</strong>, не редактируете условия от имени агента.</p><p class="small">Предложение для ${r(Ue())}. Укажите окончательный общий процент по каждой категории.</p>
    <form id="partner-offer-form" data-invite="${e}" class="stack" novalidate>${n.rows.map((l, o) => `<div class="offer-row"><label class="field">Категория<input data-offer-row="${o}" data-offer-field="name" value="${r(l.name)}" maxlength="100" placeholder="Например, плитка"></label><label class="field">Общий %<input type="number" data-offer-row="${o}" data-offer-field="limit" min="0" max="100" step="0.1" value="${r(l.limit)}"></label>${d("Убрать", `offer-remove:${o}`, "ghost", n.rows.length === 1 ? "disabled" : "")}</div>`).join("")}
    ${d("Добавить категорию", "offer-add", "ghost")}<label class="field">Пояснение агенту \xB7 необязательно<textarea id="offer-message" rows="2" maxlength="400">${r(n.message)}</textarea></label><p class="field-error" id="offer-error" role="alert"></p><p class="notice">Это персональное предложение. Оно не меняет общие условия для других агентов и начнёт действовать только после принятия агентом.</p><button type="submit" class="btn primary">Отправить демопредложение агенту</button></form>`,
  );
}
var de = { q: "", city: "", type: "", specialization: "", stage: "" },
  W = null,
  Ve = (e) =>
    i.invitations.find((t) => t.targetId === e && !t.disabled && !t.deleted);
function Ct() {
  return showcaseResults({ all: P, partners: filterDirectory(P, de, Le), state: de, dictionary: Le, typeLabels: Object.fromEntries(Object.entries(ee).map(([key, value]) => [key, value.label])), isInvited: Ve });
}
function paintDirectoryResults() {
  const root = document.querySelector("#directory-results");
  if (!root) return;
  root.innerHTML = Ct();
  be({ icons: ve });
}
function $t() {
  hubFindShell({ state: de, dictionary: Le, cities: [...new Set(P.map((e) => e.city))], typeLabels: Object.fromEntries(Object.entries(ee).map(([key, value]) => [key, value.label])), certReturn: !!Z, results: Ct });
}
function Ht(e, t = !1) {
  let a = P.find((s) => s.id === e);
  a &&
    E(
      a.name,
      `<span class="pill">${ee[a.type].label} \xB7 ${r(a.city)}</span><p>${r(a.topics.join(", "))}</p>${directoryFullDirections(a, Le, r)}${qt(a)}<p class="small">Демонстрационный профиль RemCard. Регистрация уже пройдена, повторно регистрироваться не нужно.</p>
    ${t ? `${a.ready ? '<p class="notice">У вас уже есть согласованные условия.</p>' : Ve(e) ? '<p class="notice">Приглашение ожидает ответа.</p>' : d("Предложить сотрудничество", `directory-invite:${e}`, "primary")}` : a.ready || Ve(e) ? '<p class="notice">Повторное приглашение не требуется.</p>' : `<form id="directory-invite-form" data-target="${e}" class="stack"><label class="field">Что предлагаете<input name="subject" required maxlength="160" value="Хочу рекомендовать ваши товары и услуги своим клиентам"></label><p class="notice">Приглашение адресовано этому профилю. Сотрудничество и условия требуют согласия партнёра.</p><button class="btn primary" type="submit">Отправить демоприглашение</button></form>`}
    ${d("Назад к поиску", "partner-hub", "ghost")}`,
    );
}
function De(e, t = "invite") {
  let a = B(e);
  if (!a || a.disabled || a.deleted) return;
  ((W ||= { id: e, type: "store", registered: !1 }),
    W.id !== e && (W = { id: e, type: "store", registered: !1 }));
  let s = W,
    n = recipientInvitationSummary({ invitation: a, sender: a.inviterName || Ue() });
  if (t === "registration") {
    let l = ["store", "company"].includes(s.type);
    E(
      "Обычная регистрация RemCard",
      `${n}<p class="notice">В рабочей версии здесь используется общий вход и регистрация. После них откроется то же приглашение.</p><form id="recipient-register-form" data-invite="${e}" class="stack">
      <label class="field">Как вы работаете<select id="recipient-type">${["store", "company", "specialist", "agent"].map((o) => `<option value="${o}" ${s.type === o ? "selected" : ""}>${ee[o].label}</option>`).join("")}</select></label>
      <label class="field">Ваше имя<input name="name" required maxlength="100" value="${r(s.name || "")}" placeholder="Демонстрационное имя"></label>
      ${l ? `<label class="field">Название ${s.type === "store" ? "магазина" : "компании"}<input name="organization" required maxlength="100" value="${r(s.organization || a.partner)}"></label>` : ""}
      <label class="field">Город<input name="city" required maxlength="100" value="${r(s.city || "")}"></label>
      <label class="check"><input name="consent" type="checkbox" required ${s.consent ? "checked" : ""}><span>Демонстрация обязательных согласий. Юридически значимое согласие не собирается.</span></label>
      <button class="btn primary" type="submit">Завершить деморегистрацию</button></form>`,
    );
    return;
  }
  E(
    "Приглашение к сотрудничеству",
    `${n}${s.registered ? `<p class="notice">Деморегистрация завершена. Вы вернулись к приглашению от ${r(Ue())} для ${r(a.partner)}.</p>${d("Готов обсудить условия", `recipient-interest:${e}`, "primary")}` : `<p class="muted">Зарегистрируйтесь как обычный партнёр RemCard или войдите в свой аккаунт. Приглашение сохранится.</p>${d("Войти или зарегистрироваться", `recipient-register:${e}`, "primary")}${d("У меня уже есть аккаунт \xB7 демо", `recipient-existing:${e}`, "ghost")}`}
    <small>Демонстрационный просмотр. Реальные уведомления не отправляются.</small>${d("Вернуться к карточке отправителя", `link-open:${e}`, "ghost")}`,
  );
}
var C = null,
  Z = !1;
function ut() {
  ((C ||= {
    step: 1,
    query: "",
    partners: [],
    categories: {},
    name: "",
    usageMode: "once_per_partner",
  }),
    ze());
}
var We = (e) =>
  e.usageMode === "multiple_per_partner"
    ? "Многоразовый у каждого партнёра"
    : "Одна покупка у каждого партнёра";
function Gt() {
  let e = C.query.trim().toLocaleLowerCase("ru"),
    t = G.filter((a) =>
      `${a.name} ${a.city} ${a.categories.map((s) => s.name).join(" ")}`
        .toLocaleLowerCase("ru")
        .includes(e),
    );
  return t.length
    ? t
        .map((a) => {
          const paused = coop.isPaused(a.id);
          return `<label class="partner-choice ${paused ? "is-paused" : ""}"><input type="checkbox" data-cert-partner="${a.id}" ${paused ? "disabled" : ""} ${!paused && C.partners.includes(a.id) ? "checked" : ""}><span><strong>${r(a.name)}</strong><small>${r(a.city)} \xB7 ${a.categories.map((s) => r(s.name)).join(", ")}</small><span class="pill ${paused ? "" : "good"}">${paused ? "Приостановлено · нельзя выбрать для нового сертификата" : "Условия согласованы · демо"}</span></span></label>`;
        })
        .join("")
    : '<div class="notice"><strong>Такого партнёра пока нет</strong><p>Пригласите знакомую компанию. После принятия приглашения и согласования условий она станет доступна для сертификата.</p></div>';
}
/** Decimal places from the written form of a percent (avoids float tails). */
function certPercentScale(value) {
  const str = String(value ?? "").trim();
  if (!str) return 0;
  if (/[eE]/.test(str)) {
    const n = Number(str);
    if (!Number.isFinite(n)) return 0;
    const normalized = String(n);
    if (/[eE]/.test(normalized)) return 12;
    const idx = normalized.indexOf(".");
    return idx < 0 ? 0 : normalized.length - idx - 1;
  }
  const idx = str.indexOf(".");
  return idx < 0 ? 0 : str.length - idx - 1;
}
/** Shared bonus = agreed limit − client discount; keeps accepted percent precision (no hard *100 round). */
function certBonusValue(limit, discount) {
  const l = Number(limit);
  const d = Number(discount);
  if (!Number.isFinite(l) || !Number.isFinite(d)) return NaN;
  const scale = 10 ** Math.max(certPercentScale(limit), certPercentScale(discount));
  return (Math.round(l * scale) - Math.round(d * scale)) / scale;
}
function certBonusDisplay(limit, discount) {
  const bonus = certBonusValue(limit, discount);
  if (!Number.isFinite(bonus)) return "—";
  return `${bonus}%`;
}
function certAgreedCategories(partnerId) {
  return coop.categoriesFor(partnerId);
}
function certCategoryById(categoryId) {
  if (!C?.partners?.length) return null;
  for (const partnerId of C.partners) {
    const cat = certAgreedCategories(partnerId).find((c) => c.id === categoryId);
    if (cat) return { ...cat, partnerId };
  }
  return null;
}
function Kt() {
  return G.filter((e) => C.partners.includes(e.id)).flatMap((e) =>
    certAgreedCategories(e.id)
      .filter((t) => C.categories[t.id]?.selected)
      .map((t) => ({
        partnerId: e.id,
        partnerName: e.name,
        categoryId: t.id,
        categoryName: t.name,
        limit: t.limit,
        discount: Number(C.categories[t.id].discount),
        raw: C.categories[t.id].discount,
      })),
  );
}
function Yt() {
  let e = Kt();
  return e.length
    ? e.some(
        (t) =>
          t.raw === "" ||
          !Number.isFinite(t.discount) ||
          t.discount < 0 ||
          t.discount > t.limit ||
          Math.abs(t.discount * 10 - Math.round(t.discount * 10)) > 1e-8,
      )
      ? "Укажите скидку от 0 до согласованного процента, с точностью до 0,1%."
      : ""
    : "Выберите хотя бы одну категорию.";
}
function Jt(e) {
  return e.terms?.length
    ? `<details class="fold-list certificate-terms"><summary>Скидки по категориям <span class="badge-count">${e.terms.length}</span></summary>${e.terms.map((t) => `<div class="term-summary"><strong>${r(t.categoryName)}</strong><small>${r(t.partnerName)}</small><span>Клиенту <b>${t.discount}%</b> \xB7 ваш бонус <b>${t.bonus}%</b></span></div>`).join("")}<small>Демонстрационные согласованные условия. Акционные модели исключены.</small></details>`
    : "";
}
function ze() {
  let e = C;
  e &&
    (e.step === 1
      ? E(
          "Создать сертификат",
          `<div class="steps"><span class="current"><b>1</b>Партнёры</span><span><b>2</b>Скидки</span></div>
      <p class="muted">Выберите одного или нескольких партнёров с уже согласованными условиями.</p>
      <label class="field">Найти партнёра<input id="cert-partner-search" type="search" value="${r(e.query)}" placeholder="Название, город, товар или услуга"></label>
      <div id="cert-partner-results" class="stack">${Gt()}</div>
      <div class="invite-inline"><div><strong>Нужен новый партнёр?</strong><small>Найдите его в RemCard или отправьте ссылку знакомому.</small></div>${d("Найти или пригласить", "cert-invite")}</div>
      ${
        i.invitations.some(
          (t) => t.kind === "partner" && !t.deleted && !t.disabled,
        )
          ? `<details class="fold-list"><summary>Ожидают согласования</summary>${i.invitations
              .filter((t) => t.kind === "partner" && !t.deleted && !t.disabled)
              .map(
                (t) =>
                  `<p class="small">${r(t.partner)} \xB7 ещё нельзя добавить в сертификат</p>`,
              )
              .join("")}</details>`
          : ""
      }
      <div class="form-footer"><small id="cert-selected-count">Выбрано: ${e.partners.length}</small>${d("Далее: скидки", "cert-next", "primary", e.partners.length ? "" : "disabled")}</div>
      <small>Все партнёры и проценты здесь демонстрационные.</small>`,
        )
      : E(
          "Скидки по категориям",
          `<div class="steps"><span><b>1</b>Партнёры</span><span class="current"><b>2</b>Скидки</span></div><p class="muted">Вы задаёте скидку клиенту. Остаток согласованного процента становится вашим бонусом после покупки.</p>
      <form id="certificate-builder-form" class="stack" novalidate>
      ${G.filter((t) => e.partners.includes(t.id))
        .map(
          (t) =>
            `<section class="category-group"><h3>${t.name}</h3>${certAgreedCategories(t.id)
              .map((a) => {
                let s = e.categories[a.id] || {
                  selected: !1,
                  discount: Math.min(5, a.limit),
                };
                return `<div class="category-allocation"><label class="check"><input type="checkbox" data-cert-category="${a.id}" ${s.selected ? "checked" : ""}><strong>${a.name}</strong></label><div class="allocation-fields"><div class="allocation-limit"><small>Согласовано</small><strong>${a.limit}%</strong></div><label class="field">Скидка клиенту, %<input type="number" inputmode="decimal" min="0" max="${a.limit}" step="0.1" data-cert-discount="${a.id}" value="${r(s.discount)}" ${s.selected ? "" : "disabled"}></label><div class="allocation-bonus"><small>Ваш бонус</small><strong data-cert-bonus="${a.id}">${s.selected ? certBonusDisplay(a.limit, s.discount) : "—"}</strong></div></div><div class="row"><small>Можно отдать клиенту весь процент.</small>${d("Всё клиенту", `cert-all:${a.id}`, "ghost", s.selected ? "" : "disabled")}</div></div>`;
              })
              .join("")}</section>`,
        )
        .join("")}
      <details class="optional" data-testid="certificate-usage"><summary>Использование: ${We(e)}</summary><div class="stack" style="margin-top:16px"><label class="check"><input type="radio" name="usageMode" value="once_per_partner" ${e.usageMode !== "multiple_per_partner" ? "checked" : ""}><span><strong>Одна покупка у каждого партнёра</strong><small style="display:block">По умолчанию. Все выбранные категории одного партнёра входят в одно использование.</small></span></label><label class="check"><input type="radio" name="usageMode" value="multiple_per_partner" ${e.usageMode === "multiple_per_partner" ? "checked" : ""}><span><strong>Многоразовый у каждого партнёра</strong><small style="display:block">Можно предъявлять при повторных покупках на условиях сертификата.</small></span></label><p class="small">Покупка у одного партнёра не закрывает доступ у остальных. Только подтверждённая покупка расходует использование, не просмотр и не сканирование.</p></div></details>
      ${
        Te().includes("clients")
          ? `<details class="optional" ${e.clientId ? "open" : ""}><summary>Клиент \xB7 необязательно</summary><label class="field"><span class="sr-only">Привязать к клиенту</span><select id="certificate-client"><option value="">Без привязки \xB7 для нескольких клиентов или подписчиков</option>${ne
              .filter((t) => !t.deleted)
              .map(
                (t) =>
                  `<option value="${t.id}" ${e.clientId === t.id ? "selected" : ""}>${r(t.name)}${t.archived ? " \xB7 в архиве" : ""}</option>`,
              )
              .join(
                "",
              )}</select></label><small>Можно не выбирать клиента. При использовании общая ссылка связывается с покупками разных получателей. Выбор клиента сохраняет связь в вашей карточке, но не передаёт его контакты.</small></details>`
          : ""
      }
      <details class="optional"><summary>Название для себя \xB7 необязательно</summary><label class="field"><span class="sr-only">Название сертификата</span><input id="cert-name" name="name" value="${r(e.name)}" placeholder="Например, ремонт для Анны" maxlength="100"></label></details>
      <div class="notice">Акционные модели не участвуют. Чтобы увеличить общий процент, сначала согласуйте новые условия с партнёром.</div>
      <p id="cert-error" class="field-error" role="alert"></p>
      <div class="form-footer">${d("Назад", "cert-back")}<button class="btn primary" type="submit" data-testid="create-certificate">Создать демосертификат</button></div></form>`,
        ));
}
function $a() {
  return `<section class="stack"><div class="row">${ue() ? d("Пригласить партнёра", "new-link:partner", "primary") : ""}${qe() ? d("Пригласить сотрудника", "new-link:employee") : ""}</div><p class="muted">Откройте запись, чтобы посмотреть детали и управлять ссылкой.</p>${je(
    i.invitations.filter((e) => (e.kind === "partner" ? ue() : qe())),
    "Пока нет приглашений. Создайте первое, когда будете готовы.",
    "invitations",
    "invitations",
  )}</section>`;
}
function Ne(e) {
  let t = B(e);
  if (!t) return;
  let a =
    t.kind === "certificate"
      ? ne.filter((s) => s.purchases.some((n) => n.certificateId === t.id))
      : [];
  E(
    wt(t),
    `${t.kind === "certificate" ? certificateCard(t) : ""}<span class="pill">${kt(t)}</span><h3>${r(t.name)}</h3>${t.kind === "partner" ? '<details class="fold-list"><summary>Детали приглашения</summary>' : ""}<dl class="link-facts"><div><dt>${t.kind === "employee" ? "Сотрудник" : "Партнёр"}</dt><dd>${r(t.partner)}</dd></div><div><dt>${t.kind === "employee" ? "Должность" : t.invitationMessage ? "Пригласительное сообщение" : "Направление"}</dt><dd>${r(t.invitationMessage || t.category || "Не указано")}</dd></div>${t.invitationMessage ? `<div><dt>Предлагаемые условия</dt><dd>${r(t.proposedTerms || "Пока не указаны")}</dd></div>` : ""}<div><dt>Создано</dt><dd>${r(t.createdAt)}</dd></div>${t.kind === "employee" ? "<div><dt>Область и права</dt><dd>Текущий рабочий филиал \xB7 просмотр клиентов. Выплаты и управление командой выключены.</dd></div>" : ""}</dl>${t.kind === "partner" ? "</details>" : ""}
    ${t.kind === "certificate" ? `<p class="notice">${We(t)}. Покупка у одного партнёра не закрывает доступ у остальных. Просмотр и сканирование не расходуют использование.</p>` : ""}
    ${Jt(t)}
    ${a.length ? `<details class="fold-list" data-testid="certificate-clients"><summary>Воспользовались: ${Ce(a.length, ["клиент", "клиента", "клиентов"])}</summary><div class="stack">${a.map((s) => d(r(s.name), `client-open:${s.id}`, "ghost")).join("")}</div><small>Один сертификат, отдельные покупки каждого клиента. Только демонстрационные связи.</small></details>` : ""}
    ${ga(t)}
    <div class="row">${lt(t) ? d("Поделиться", `link-share:${e}`, "primary") : ""}${d("Переименовать", `link-rename:${e}`)}${lt(t) ? d("Редактировать", `link-edit:${e}`) : ""}${d(t.archived ? "Вернуть из архива" : "В архив", `link-archive:${e}`)}</div>
    ${t.kind === "partner" && !t.targetId && !t.disabled ? d("Посмотреть путь получателя", `recipient-preview:${e}`, "ghost") : ""}
    ${t.kind === "partner" && !t.disabled && t.negotiation !== "accepted" ? `<details class="fold-list"><summary>Панель макета: ответить от имени партнёра</summary><p class="small">Только для демонстрации второй стороны. Агент в рабочем кабинете не сможет сам назначить себе условия партнёра.</p>${d("Показать предложение партнёра", `offer-partner:${e}`)}</details>` : ""}
    <details class="fold-list"><summary>Отключение и удаление</summary><p class="small">${t.kind === "employee" ? "Отключение приглашения не удаляет уже принятого сотрудника из команды." : t.kind === "partner" ? "Отключение приглашения не расторгает существующее партнёрство." : "Отключить сертификат: запретить новые использования, даже если клиент сохранил ссылку или QR. Покупки, начисленные бонусы и взаиморасчёты сохраняются. Архив только убирает карточку из активного списка и не отключает сертификат. При наличии операций отключение и удаление недоступны."}</p><div class="row">${t.disabled ? "" : d(t.kind === "certificate" ? "Отключить сертификат" : "Отключить ссылку", `link-disable:${e}`, "danger")}${d("Удалить", `link-delete:${e}`, "danger")}</div></details><small>Демо: настоящего адреса ссылки и операций на сервере нет.</small>`,
  );
  const body = se.querySelector(".dialog-body");
  const oldActions = body.querySelector(':scope > .row:has([data-action^="link-rename:"])');
  if (oldActions) oldActions.innerHTML = (t.kind === "certificate" ? "" : recordActionToolbar("invitations", t, null)) + (lt(t) ? d("Редактировать детали", `link-edit:${e}`, "ghost") : "");
  body.querySelectorAll(`[data-action="link-delete:${e}"]`).forEach((button) => {
    if (!button.closest(".rc-cert-management") && button.closest(".fold-list")) button.remove();
  });
  be({ icons: ve });
}
function ha(e, t) {
  let a = B(e);
  if (a && nt(a.kind === "certificate" ? "certificates" : "invitations", a, "rename")) return;
  a &&
    E(
      t ? "Переименовать" : "Редактировать детали",
      `<form id="link-edit-form" data-id="${e}" class="stack"><label class="field">Название для себя<input name="name" value="${r(a.name)}" required maxlength="100"></label><small>Название видно только вам и не меняет условия ссылки.</small>${t ? "" : `<label class="field">${a.kind === "employee" ? "ФИО сотрудника" : "Партнёр"}<input name="partner" value="${r(a.partner)}" required maxlength="100" ${a.kind === "certificate" ? "readonly" : ""}></label>${a.invitationMessage ? `<label class="field">Пригласительное сообщение<textarea name="invitationMessage" required maxlength="1000" rows="5">${r(a.invitationMessage)}</textarea></label>` : ""}<label class="field" ${a.invitationMessage ? 'style="display:none"' : ""}>${a.kind === "employee" ? "Должность" : "Что предлагаете / рекомендуете"}<input name="category" value="${r(a.category)}" required maxlength="100" ${a.kind === "certificate" ? "readonly" : ""}></label><p class="notice">${a.kind === "certificate" ? "Условия созданного сертификата не меняем задним числом. Для других условий создайте новый сертификат." : "В макете меняются только эти сведения. Права и условия принятого приглашения нельзя менять через старую ссылку."}</p>`}${a.invitationMessage ? `<label class="field">Предложение и условия сотрудничества<textarea name="proposedTerms" maxlength="2000" rows="6">${r(a.proposedTerms || "")}</textarea></label>` : ""}<button type="submit" class="btn primary">Сохранить</button></form>`,
    );
}
function it(e, t = !1) {
  if (!(e === "employee" ? !qe() : !ue())) {
    if (e === "partner" && !t) {
      $t();
      return;
    }
    if (e === "partner") { openPartnerInviteWizard({ certificateReturn: Z }); return; }
    (E(
      e === "employee" ? "Пригласить сотрудника" : "Пригласить партнёра",
      `<form id="link-create-form" data-kind="${e}" class="stack"><label class="field">${e === "employee" ? "ФИО сотрудника" : "Имя или название партнёра"}<input name="partner" required maxlength="100" placeholder="${e === "employee" ? "Например, Алексей Иванов" : "Например, Дом материалов"}"></label><label class="field">${e === "employee" ? "Должность" : "Предмет сотрудничества"}<input name="category" required maxlength="100" placeholder="${e === "employee" ? "Например, менеджер" : "Например, материалы для ремонта"}"></label><p class="notice">${e === "employee" ? "Демопример: текущий филиал, просмотр клиентов. Название должности не даёт прав на выплаты. Полный выбор прав остаётся в согласованном мастере приглашения." : "Демоприглашение к обсуждению сотрудничества. Само по себе не подключает программу и не согласует условия."}</p><button type="submit" class="btn primary">Создать демоприглашение</button></form>`,
    ),
      Z &&
        document
          .querySelector(".dialog-body")
          .insertAdjacentHTML(
            "beforeend",
            d("Вернуться к сертификату", "cert-return", "ghost"),
          ),
      e === "partner" &&
        document
          .querySelector(".dialog-body")
          .insertAdjacentHTML(
            "afterbegin",
            '<div class="segment invite-paths"><button type="button" aria-pressed="false" data-action="partner-hub">Найти в RemCard</button><button type="button" aria-pressed="true" data-action="external-partner">Пригласить по ссылке</button></div><p class="notice">Для знакомого, которого ещё нет на платформе. Он увидит ваше приглашение, пройдёт обычную регистрацию и вернётся к обсуждению сотрудничества.</p>',
          ));
  }
}
function va() {
  return `<div class="demo-top"><span>Интерактивный макет \xB7 только демонстрационные данные</span><nav class="demo-top-links" aria-label="Другие части прототипа"><a href="./legacy.html">Прежний прототип</a><a href="../index.html">Вход в прототип</a><a href="../client/index.html">Сайт для клиентов</a><a href="../admin/index.html">Кабинет администратора</a></nav></div>
 <header class="topbar">${da()}<div class="row">${d(D("bell"), "notifications", "icon", 'aria-label="Уведомления"')}${d(D(i.theme === "dark" ? "sun" : "moon"), "theme", "icon", `aria-label="${ca()}"`)}${i.screen === "cabinet" ? renderAccountMenu({ name: ke(), role: ot(), escape: r, icon: D }) : ""}</div></header>
 <div class="review-toolbar" aria-label="Навигация по макету"><span class="eyebrow">Режим просмотра</span><div class="segment">${["registration", "cabinet"].map((e, t) => `<button data-action="view:${e}" data-testid="view-${e}" aria-pressed="${t === 0 ? i.screen !== "cabinet" : i.screen === "cabinet"}">${t === 0 ? "Регистрация" : "Кабинет"}</button>`).join("")}</div><label>Сценарий<select data-control="role" data-testid="scenario-role" aria-label="Сценарий макета">${Object.entries(
   ee,
 )
   .map(
     ([e, t]) =>
       `<option value="${e}" ${i.role === e ? "selected" : ""}>${t.label}</option>`,
   )
   .join(
     "",
   )}</select></label>${i.screen === "cabinet" ? renderDatasetControl() : ""}${k() ? `<label>Работодатель \xB7 демосценарий<select data-control="employer" aria-label="Работодатель в демосценарии"><option value="company" ${Y === "company" ? "selected" : ""}>Компания</option><option value="store" ${Y === "store" ? "selected" : ""}>Магазин</option></select></label>` : ""}${d(D("list-checks") + " Поля и логика", "matrix", "ghost")}</div>`;
}
function ba() {
  return `<main id="main" class="registration" tabindex="-1"><div class="intro"><span class="eyebrow">Первый вход \xB7 шаг 1 из 2</span><h1>Как вы будете работать в RemCard?</h1><p class="muted">Настроим кабинет под ваши задачи. Не будем показывать всё сразу.</p></div><div class="role-grid">${Object.entries(
    ee,
  )
    .map(
      ([e, t]) =>
        `<button class="role-card" data-action="role:${e}" data-testid="choose-${e}" aria-pressed="${i.role === e}"><span class="role-icon">${D(t.icon)}</span><strong>${t.label}</strong><span class="desc">${t.desc}<br>${t.help}</span>${i.role === e ? `<span class="selection">${D("circle-check")}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}</div><div class="choice-footer"><small>Один аккаунт может совмещать личную деятельность и работу в команде.<br>Рабочие пространства и данные при этом разделены.</small>${d("Продолжить " + D("arrow-right"), "continue", "primary")}</div></main>`;
}
var fe = (e, t, a = "", s = !0, n = "") =>
  `<label class="field" for="field-${e}">${t}${s ? " *" : " \xB7 необязательно"}<input id="field-${e}" name="${e}" data-testid="field-${e}" value="${r(ie()[e] || "")}" placeholder="${r(a)}" ${s ? "required" : ""} maxlength="100" autocomplete="${e === "name" ? "name" : "off"}">${n ? `<small>${n}</small>` : ""}</label>`;
function ya() {
  if (!k())
    return (
      mt[i.role].map((t) => fe(t.key, t.label, "", !0, t.help)).join("") +
      (i.role === "agent"
        ? '<p class="small">Это всё для начала. Контакты, аудиторию и реквизиты можно дополнить позже в профиле.</p>'
        : '<p class="small">Это всё для начала. Дополнить профиль, настроить предложение и каталог можно позже, по шагам.</p>')
    );
  if (k())
    return `${fe("name", "ФИО", "Например, Алексей Иванов")}<div class="notice">Вход в аккаунт уже подтверждён. Телефон и мессенджер повторно не запрашиваем.</div>${i.invite === "valid" ? `<div class="notice accent"><span class="eyebrow">Данные из приглашения</span><h3>${r($e())}</h3><p>${r(Se[i.preset].name)}</p><p>${St()}</p><small>Должность и доступы назначены организацией, не выбираются при регистрации.</small></div><details class="optional"><summary>Что мне будет доступно</summary><ul class="list-clean">${[...i.permissions].map((t) => `<li>${D("check")}${ht[t]}</li>`).join("")}</ul></details>` : `<div class="notice ${["expired", "revoked"].includes(i.invite) ? "accent" : ""}"><strong>${i.invite === "expired" ? "Срок приглашения истёк" : i.invite === "revoked" ? "Приглашение отозвано" : "Нет приглашения?"}</strong><p>Попросите владельца или управляющего прислать ссылку. Выбор компании по названию не даёт доступа к её данным.</p></div><label class="field">Код приглашения \xB7 демо<input name="inviteCode" data-testid="invite-code" placeholder="Демонстрационный код TEAM-DEMO" value="${r(ie().inviteCode || "")}"><small>Реальные ссылки в этом макете не принимаются.</small></label>${d("Проверить демокод", "check-invite")}${d("Показать демоприглашение", "demo-invite", "ghost")}`}`;
  let e = fe(
    "name",
    i.role === "store" || i.role === "company"
      ? "ФИО представителя"
      : "Как к вам обращаться",
    "Например, Алексей Иванов",
  );
  return (
    ["store", "company"].includes(i.role) &&
      (e += fe(
        "organization",
        i.role === "store" ? "Название магазина" : "Название компании",
        i.role === "store"
          ? "Например, Дом материалов"
          : "Например, Компания Пример",
      )),
    (e += fe(
      "city",
      i.role === "agent" ? "Город работы / рекомендаций" : "Основной город",
      "Например, Краснодар",
    )),
    i.role === "agent" &&
      (e +=
        '<div class="notice accent"><strong>Профессия не требуется</strong><p>Можно рекомендовать товары и услуги друзьям, клиентам и подписчикам. Не нужны специализация, магазин и собственный каталог.</p></div>'),
    (e += `<details class="optional"><summary>Дополнить сейчас \xB7 необязательно</summary><div class="fields">${i.role === "agent" ? fe("audience", "Кому рекомендуете", "Друзьям, клиентам, подписчикам", !1) : i.role === "specialist" ? fe("specialization", "Специализация", "Например, электромонтаж", !1, "Можно добавить позже. Перед действием, где она нужна, покажем переход к этому полю.") : fe("directions", "Направления", "Например, материалы и ремонт", !1)}</div></details>`),
    e
  );
}
function wa() {
  return `<main id="main" class="registration" tabindex="-1"><div class="steps"><span>${D("check")} Выбор пути</span><span class="current"><b>2</b>${k() ? "Вход в команду" : "Ваши данные"}</span></div><div class="intro"><span class="eyebrow">${ot()}</span><h1>${k() ? "Подключитесь к своей команде" : "Только необходимое для начала"}</h1><p class="muted">${k() ? "Никакой регистрации магазина и публикации личного каталога." : "Регистрация не подключает программы и не публикует вас в каталоге."}</p></div><div class="form-layout"><form id="registration-form" class="panel" novalidate><h2>${k() ? "Данные сотрудника" : "Основная информация"}</h2><div class="fields">${ya()}<label class="check"><input type="checkbox" name="consent" data-testid="consent" ${ie().consent ? "checked" : ""}><span>Принимаю условия использования и ознакомлен с обработкой данных. <button type="button" class="linkbtn" data-action="consent-info">О документах</button></span></label><div class="field-error" role="alert" id="form-error"></div></div><div class="form-footer">${d("Назад", "back")}<button class="btn primary" type="submit" data-testid="finish-registration">${k() ? (i.invite === "valid" ? "Принять приглашение" : "Создать аккаунт без доступа") : "Открыть кабинет"} ${D("arrow-right")}</button></div><p class="privacy-note">Прототип: ничего не отправляем и не создаём в рабочей системе. Авторизация и документы здесь показаны условно.</p></form><aside class="panel"><span class="eyebrow">После первого входа</span><h2 style="margin-top:8px">${k() ? "Только ваша работа" : "Понятный следующий шаг"}</h2><ul class="list-clean">${(k() ? ["Организация, должность и подразделения из приглашения", "Только разрешённые разделы и действия", "Личные и рабочие данные отдельно"] : i.role === "agent" ? ["Партнёры и их условия", "Сертификаты и их статусы", "Ваши бонусы, без чужих взаиморасчётов"] : i.role === "specialist" ? ["Ваши клиенты и сертификаты", "Партнёры для совместной работы", "Направления и каталог позже"] : ["Рабочий профиль сразу", "Команда и точки по необходимости", "Каталог и программы только по вашему решению"]).map((e) => `<li>${D("check")}${e}</li>`).join("")}<div class="divider"></div><small>${k() ? "Нельзя назначить себе должность с расширенными правами или выбрать чужие филиалы." : "Реквизиты и дополнительные сведения запросим позже, перед конкретной операцией, если они действительно нужны."}</small></aside></div></main>`;
}
function ka() {
  return J()
    ? `<section class="context-bar" aria-label="Рабочая область"><div><div class="eyebrow">Область доступа</div><details><summary data-testid="scope-title">${St()}</summary><ul>${we() ? "<li>Головной офис</li>" : ""}${me()
        .map((e) => `<li>${r(e)}</li>`)
        .join("")}</ul></details></div>${
        me().length
          ? `<label class="field">Текущий рабочий филиал<select data-control="branch" data-testid="working-branch">${me()
              .map(
                (e, t) =>
                  `<option value="${t}" ${i.branch === t ? "selected" : ""}>${r(e)}</option>`,
              )
              .join("")}</select></label>`
          : `<span class="pill">${we() ? "Офисный контекст \xB7 без филиалов" : "Нет назначенного рабочего филиала"}</span>`
      }</section>`
    : "";
}
function Sa() {
  return O("sale") || O("scan")
    ? {
        title: "Проверьте сертификат клиента",
        copy: "Сканирование проверяет условия. Продажа начисляет бонус; выплата фиксируется отдельно.",
        cta: "Проверить сертификат",
        action: "action:scan",
      }
    : O("cash") || O("transfer")
      ? {
          title: "Зафиксируйте выполненную выплату",
          copy: "Покажем обязательства только доступных подразделений. Перевод в банке этот кабинет не выполняет.",
          cta: "Открыть взаиморасчёты",
          action: "nav:settlements",
        }
      : O("clients")
        ? {
            title: "Помогите клиенту с выбором",
            copy: "Партнёры организации и ваши сертификаты в одном рабочем пространстве.",
            cta: "Создать сертификат",
            action: "action:recommend",
          }
        : O("team")
          ? {
              title: "Команда вашего подразделения",
              copy: "Управление доступами только в назначенной области и не выше своих полномочий.",
              cta: "Открыть сотрудников",
              action: "nav:team",
            }
          : {
              title: "Ваши рабочие разделы готовы",
              copy: "Показываем только выданные вам возможности. Если чего-то не хватает, обратитесь к управляющему.",
              cta: "Посмотреть мои доступы",
              action: "nav:profile",
            };
}
function qa() {
  if (i.role === "agent") return fa();
  if (i.role === "agent")
    return `<section class="panel hero-task"><div><h2>Создайте сертификат для клиента</h2><p class="muted">Клиент покупает у партнёра. Вы получаете бонус.</p></div>${d("Создать сертификат " + D("arrow-right"), "action:recommend", "primary")}</section>
  <div class="stats"><div class="stat"><span class="small">Мои сертификаты</span><strong>${i.records.length}</strong><small>Создано в макете</small></div><div class="stat"><span class="small">Начислено</span><strong>0 ₽</strong><small>За покупки клиентов</small></div><div class="stat"><span class="small">Получено</span><strong>0 ₽</strong><small>Выплаченные бонусы</small></div></div>
  <section class="panel">${i.records.length ? `<h2>Мои сертификаты</h2>${i.records.map((a, s) => `<div class="action-line"><div><strong>${r(a.partner)}</strong><small>${r(a.category)}</small><span class="pill">Ожидает покупки \xB7 демо</span></div>${d("Поделиться", `share:${s}`)}</div>`).join("")}` : '<div class="row between"><h2>Как это работает</h2><span class="pill">3 простых шага</span></div><ol class="mini-steps"><li><b>1</b><div><strong>Выберите партнёра</strong><small style="display:block">Посмотрите условия и размер бонуса.</small></div></li><li><b>2</b><div><strong>Отправьте сертификат клиенту</strong><small style="display:block">Поделитесь ссылкой в привычном мессенджере.</small></div></li><li><b>3</b><div><strong>Получите бонус за покупку</strong><small style="display:block">Статус покупки и начисление появятся в кабинете.</small></div></li></ol>'}</section>`;
  if (k() && !J())
    return `<section class="panel empty">${D("mail-question")}<h2>${i.invite === "revoked" ? "Доступ к команде закрыт" : i.invite === "expired" ? "Нужно новое приглашение" : "Аккаунт готов. Осталось приглашение"}</h2><p class="muted">Компания ещё не предоставила доступ. Партнёры, продажи, выплаты и данные сотрудников вам пока не показываются.</p>${d("Как получить приглашение", "ask-invite", "primary")}<small>Не нужно повторно регистрироваться как магазин или партнёр.</small>${d("Ввести демокод приглашения", "enter-code", "ghost")}</section>`;
  let e = k()
      ? Sa()
      : {
          title: ee[i.role].task,
          copy: ee[i.role].taskCopy,
          cta: ee[i.role].cta,
          action:
            i.role === "company"
              ? "nav:team"
              : i.role === "store"
                ? "action:scan"
                : "action:recommend",
        },
    t =
      i.role === "agent" || i.role === "specialist"
        ? [
            [
              (i.role === "agent", "Сертификаты"),
              String(i.records.length),
              "Создано в макете",
            ],
            ["Начислено", "0 ₽", "За покупки клиентов"],
            ["Получено", "0 ₽", "Подтверждённые выплаты"],
          ]
        : k() && ["cash", "transfer", "ledger"].some((a) => O(a)) && !O("sale")
          ? [
              ["К выплате", "0 ₽", "Доступные подразделения"],
              ["Выплачено", "0 ₽", "За текущий период"],
              ["Операции", "0", "История сохранена"],
            ]
          : i.role === "company"
            ? [
                ["Филиалы", "1", "Можно добавить позже"],
                ["Сотрудники", "0", "Кроме владельца"],
                ["Партнёры", "2", "Демонстрационные"],
              ]
            : [
                ["Продажи сегодня", "0", "Текущий филиал"],
                ["Партнёры", "2", "Партнёры организации"],
                ["Мои операции", "0", "За сегодня"],
              ];
  return `<section class="panel hero-task"><div><h2>${e.title}</h2><p class="muted">${e.copy}</p></div>${d(e.cta + " " + D("arrow-up-right"), e.action, "primary")}</section><div class="stats">${t.map(([a, s, n]) => `<div class="stat"><span class="small">${a}</span><strong>${s}</strong><small>${n}</small></div>`).join("")}</div><div class="two-col"><section class="panel"><h2>${k() ? "Быстрые действия" : "С чего начать"}</h2>${
    (k()
      ? Te()
          .filter((a) => !["home", "profile"].includes(a))
          .slice(0, 3)
      : i.role === "agent" || i.role === "specialist"
        ? ["partners", "recommendations", "bonus"]
        : ["partners", "profile"]
    )
      .map(
        (a) =>
          `<div class="action-line"><div><h3>${rt(a)}</h3><small>${a === "partners" ? (k() ? "Партнёры вашей организации" : "Условия сотрудничества") : a === "profile" ? "Дополняйте по мере необходимости" : "Только относящиеся к вам данные"}</small></div>${d(D("arrow-right"), `nav:${a}`, "icon", `aria-label="Открыть ${rt(a)}"`)}</div>`,
      )
      .join("") || '<p class="muted">Рабочие действия пока не назначены.</p>'
  }</section><section class="panel"><h2>${k() ? "Вы работаете от имени компании" : "Ничего лишнего на старте"}</h2><p class="muted" style="margin-top:12px">${k() ? "Права и подразделения назначает управляющий. Название должности само по себе не открывает дополнительные возможности." : "Публикация в каталоге, дополнительные программы и подробное описание доступны позже. Начните с одного нужного действия."}</p><div class="divider"></div>${d(k() ? "Мои права и подразделения" : "Настроить профиль", "nav:profile", "ghost")}</section></div>`;
}
function Ca() {
  return compactPartnerCollection(ce.render({ key: "partners", type: "partners", readOnly: k() && !O("terms"), items: P.filter((e) => e.ready), title: "Партнёры", empty: "По этому отбору действующих партнёров нет. Измените или сбросьте фильтры; приглашения доступны в соседней вкладке." }));
}
function ja() {
  return Ge.render();
}
function legacyLa() {
  return i.page === "bonus" && i.role === "agent"
    ? `<div class="stack"><section class="panel stack"><h2>Ваши бонусы</h2><p class="muted">Только начисления по вашим сертификатам.</p><div class="client-summary"><div><strong>${pe(Wt())}</strong><small>Начислено \xB7 демо</small></div><div><strong>0 ₽</strong><small>Получено</small></div></div></section><section class="panel stack"><h2>За какие покупки</h2>${ne
        .filter((e) => He(e) > 0)
        .map(
          (e) =>
            `<div class="row between">${d(r(e.name), `client-open:${e.id}`, "ghost")}<strong>${pe(He(e))}</strong></div>`,
        )
        .join(
          "",
        )}<small>Синтетические примеры, не реальный баланс. Архивирование клиента не отменяет начисления.</small></section></div>`
    : i.page === "clients"
      ? ra()
      : i.page === "links"
        ? $a()
        : i.page === "recommendations"
          ? `<div class="stack"><p class="muted">Создавайте сертификаты для клиентов, делитесь ссылками и следите за их статусом.</p><div>${d("Создать сертификат", "action:recommend", "primary")}</div>${["store", "company"].includes(i.role) ? `<details class="optional"><summary>Клиент пришёл с сертификатом?</summary><p class="small">Не создавайте новый. Проверьте сертификат клиента перед оформлением покупки.</p>${d("Проверить сертификат", "action:scan", "ghost")}</details>` : ""}${je(i.records, "Пока нет сертификатов. Выберите партнёра и отправьте сертификат клиенту.")}</div>`
          : i.page === "recommendations" && i.role === "agent"
            ? `<section class="panel stack"><div class="row between"><h2>Мои сертификаты</h2>${d("Создать сертификат", "action:recommend", "primary")}</div>${i.records.length ? i.records.map((e, t) => `<div class="action-line"><div><strong>${r(e.partner)}</strong><small>${r(e.category)} \xB7 Демосертификат ${t + 1}</small><span class="pill">Ожидает покупки \xB7 демо</span></div>${d("Поделиться", `share:${t}`)}</div>`).join("") : '<p class="muted">Здесь будут сертификаты, которыми вы делитесь с клиентами, и их статусы.</p>'}</section>`
            : i.page === "home"
              ? qa()
              : i.page === "profile"
                ? ja()
                : i.page === "partners"
                  ? `${ue() ? `<div class="row" style="margin-bottom:20px">${d("Найти в RemCard", "new-link:partner")}${d("Мои приглашения", "nav:links", "ghost")}</div>` : ""}${Ca()}`
                  : i.page === "scanner"
                    ? `<section class="panel empty">${D("scan-line")}<h2>Проверка сертификата</h2><p class="muted">Проверьте условия до продажи. Сканирование само по себе не начисляет и не списывает бонусы.</p>${d("Открыть демонстрационный сертификат", "action:scan", "primary")}</section>`
                    : i.page === "settlements"
                      ? `<section class="panel stack"><h2>Взаиморасчёты ${k() ? "организации" : ""}</h2><p class="muted">Начисление при продаже и погашение при выплате являются разными операциями.</p><div class="notice">Нет демонстрационных обязательств к выплате.</div><div class="row">${O("cash") ? d("Пример выдачи наличных", "action:cash") : ""}${O("transfer") ? d("Пример фиксации перевода", "action:transfer") : ""}</div><small>${k() && !O("cash") && !O("transfer") ? "Вам доступен только просмотр. Права на выплаты не назначены." : "Перевод выполняется вне RemCard. Здесь фиксируется только уже выполненная выплата."}</small></section>`
                      : i.page === "team"
                        ? `<section class="panel stack"><h2>${k() ? "Команда доступных подразделений" : "Сотрудники компании"}</h2><p class="muted">Произвольная должность + отдельные права + один, несколько филиалов или офис.</p>${d("Посмотреть пример приглашения", "action:team", "primary")}<small>Сотрудник не может выдать больше прав, чем имеет сам. Удаление из всей организации доступно владельцу.</small></section>`
                        : i.page === "recommendations"
                          ? `<section class="panel stack"><div class="row between"><h2>${k() ? "Рабочие сертификаты" : "Мои сертификаты"}</h2>${d("Создать сертификат", "action:recommend", "primary")}</div>${i.records.length ? i.records.map((e, t) => `<div class="action-line"><div><strong>Демосертификат ${t + 1}</strong><small>${r(e.partner)} \xB7 ${r(e.category)}</small></div><span class="pill">Черновик макета</span></div>`).join("") : '<p class="muted">Пока нет сертификатов. Начните с выбора партнёра и условий.</p>'}</section>`
                          : `<section class="panel empty">${D(Be[i.page][1])}<h2>${i.page === "bonus" ? "Ваши бонусы" : i.page === "clients" ? "Ваши клиенты" : "История операций"}</h2><p class="muted">${i.page === "bonus" ? "Начисления и выплаты появятся после покупок по вашим сертификатам. Финансы чужих организаций здесь не показываются." : i.page === "clients" ? "Здесь появятся клиенты, с которыми вы работаете в выбранном пространстве." : "Здесь появятся разрешённые вам операции в текущем рабочем контексте."}</p>${i.page === "clients" ? d("Создать сертификат", "action:recommend", "primary") : ""}</section>`;
}
function employeeInvitationsPanel() {
  if (!qe()) return "";
  return `<section class="panel stack" data-testid="employee-invitations-panel"><h2>Приглашения сотрудников</h2><p class="small">${k() ? "Создавайте приглашения в рамках назначенных вам подразделений и прав." : "Создайте ссылку-приглашение или найдите самостоятельно зарегистрированного сотрудника по ID в блоке выше."}</p><div>${d("Пригласить сотрудника по ссылке", "new-link:employee", "primary")}</div>${je(
    i.invitations.filter((e) => e.kind === "employee"),
    "Пока нет приглашений сотрудников.",
    "invitations",
    "invitations",
  )}</section>`;
}
function La() {
  const config = {
    role: i.role,
    refresh: R,
    canCash: () => O("cash"),
    canTransfer: () => O("transfer"),
    employerRole: () => employeeEmployerRole() || (k() && J() ? Y : null),
    canViewEmployerBank:
      k() && J() && ["ledger", "cash", "transfer"].some((a) => O(a)),
  };
  if (i.page === "clients") return renderClientAppeals(clientAppealsConfig());
  if (i.screen === "cabinet" && emptyStateActive(emptyStates_page()) && i.page !== "clients") {
    const emptyHtml = renderEmptyState({ page: emptyStates_page(), role: i.role, employerRole: employeeEmployerRole() || (k() && J() ? Y : null) });
    if (emptyHtml) return emptyHtml;
  }
  if (i.page === "care") return renderCareSection(careConfig());
  if (i.page === "procurement") return renderProcurementSection(careConfig());
  if (i.page === "home" && !(k() && !J())) return legacyLa() + procurementHomeTeaser(careConfig()) + careHomeTeaser(careConfig());
  if (i.page === "profile") return ja();
  if (i.page === "links" && qe())
    return `<section class="stack"><div>${d("Пригласить сотрудника", "new-link:employee")}</div>${je(
      i.invitations.filter((e) => e.kind === "employee"),
      "Пока нет приглашений сотрудников.",
      "invitations",
      "invitations",
    )}</section>`;
  if (i.page === "partners" || (i.page === "links" && !qe())) {
    if (i.page === "links") {
      showPartnerInvitations(i.role);
      markOutgoingFocus();
      i.page = "partners";
    }
    return renderPartnersRedesign({
      ...config,
      partners: P.filter((e) => e.ready),
      invitations: i.invitations.filter((e) => e.kind === "partner" && !e.disabled && !e.deleted),
      canManage: ue(),
      employee: k(),
      offerPanel: ga,
      outgoingList: () => je(i.invitations.filter((e) => e.kind === "partner"), "Нет отправленных приглашений. Пригласите партнёра, когда будете готовы.", "invitations", "invitations"),
      pending: i.invitations.filter(
        (e) =>
          e.kind === "partner" &&
          !e.disabled &&
          !e.deleted &&
          !e.archived &&
          e.negotiation !== "accepted",
      ).length,
      active: Ca,
      outgoing: () =>
        `<section class="panel stack"><div>${ue() ? d("Пригласить партнёра", "new-link:partner", "primary") : ""}</div>${je(
          i.invitations.filter((e) => e.kind === "partner"),
          "Нет отправленных приглашений. Пригласите партнёра, когда будете готовы.",
          "invitations",
          "invitations",
        )}</section>`,
    });
  }
  if (
    i.page === "wallet" ||
    ["bonus", "settlements"].includes(i.page)
  ) {
    if (i.page !== "wallet") {
      showWalletSection(i.role, i.page);
      i.page = "wallet";
    }
    const allowed = k()
      ? Te().filter((key) => ["bonus", "settlements", "history"].includes(key))
      : ["bonus", "settlements", "history"];
    const transactions =
      i.role === "agent"
        ? ne.flatMap((client) =>
            client.purchases
              .filter((purchase) => purchase.bonus > 0)
              .map((purchase) => ({
                id: purchase.id,
                type: "credits",
                title: "Бонус за покупку",
                partner: purchase.partner,
                date: purchase.date,
                amount: purchase.bonus,
                description: purchase.description,
                status: purchase.status,
              })),
          )
        : [];
    return renderWallet({
      ...config,
      allowed,
      transactions,
      bonusTotal: i.role === "agent" ? pe(Wt()) : "",
      clientPurchaseLedgerRows: (direction) => clientPurchaseLedgerRows(config, direction),
      refreshClientPurchaseLedger: () => refreshClientPurchaseLedgerForWallet(),
      legacy: (page) => {
        const previous = i.page;
        i.page = page;
        try {
          return legacyLa();
        } finally {
          i.page = previous;
        }
      },
    });
  }
  return legacyLa();
}
function careConfig() {
  return {
    key: `${i.role}:${i.role === "employee" ? employeeEmployerRole() || Y : "self"}`,
    role: i.role,
    icon: D,
    readOnly: k() && !O("terms"),
    profile: () => ({ ...(k() ? Oe() : ie()), dict: Le }),
  };
}
function clientAppealsConfig() {
  return {
    key: `${i.role}:${i.role === "employee" ? employeeEmployerRole() || Y : "self"}`,
    role: i.role,
    icon: D,
    readOnly: k() && !O("clients"),
    profile: () => ({ ...(k() ? Oe() : ie()), dict: Le }),
    openProfile: () => {
      i.page = "profile";
      R();
    },
  };
}
function Ia() {
  let e = Te();
  if (i.page === "links" && qe()) {
    i.page = "profile";
    Ge.selectTab("team");
  }
  return (
    e.includes(i.page) || (i.page = "home"),
    `<div class="shell"><aside class="sidebar"><div class="workspace"><span class="eyebrow">${k() ? "Рабочее пространство" : "Ваше пространство"}</span><strong>${k() ? (J() ? r($e()) : "Ожидает приглашения") : ["store", "company"].includes(i.role) ? r($e()) : r(ke())}</strong><small>${k() ? (J() ? Se[i.preset].name : "Сотрудник") : ot()}</small></div><nav aria-label="Рабочие разделы">${pa(e)}</nav><div class="bottom"><small>Основное под рукой.<br>Дополнительные разделы в \xABЕщё\xBB.</small></div></aside><main id="main" class="content" tabindex="-1"><div class="page-header">${i.page === "clients" ? clientAppealsSubpageBack(clientAppealsConfig()) : ""}<div><span class="eyebrow">${k() ? (J() ? r($e()) : "Вход в команду") : ot()}</span><h1>${i.page === "home" ? (k() ? "Ваш рабочий день" : i.role === "agent" ? "Сертификаты" : "Ваш кабинет") : i.page === "care" ? "Забота RemCard" : i.page === "procurement" ? "Закупки" : i.page === "clients" ? `${clientAppealsPageTitle(clientAppealsConfig())}${clientAppealsHeaderPill(clientAppealsConfig()) ? `<span class="ca-title-pill">${clientAppealsHeaderPill(clientAppealsConfig())}</span>` : ""}` : rt(i.page)}</h1><p class="muted">${i.page === "care" ? "Сервисы для клиентов и консалтинг для вас." : i.page === "procurement" ? "Поставщики, свободные ниши и заказы для вашего бизнеса." : i.page === "clients" ? clientAppealsPageMuted(clientAppealsConfig()) : k() ? (J() ? Se[i.preset].name : "Остался один шаг до работы в команде") : i.role === "agent" ? "Рекомендуйте. Делитесь. Получайте бонусы." : "Начните с того, что нужно вам сегодня."}</p></div>${emptyHeaderPill(emptyStates_page()) || '<span class="pill">Демо</span>'}</div>${ka()}${i.notice ? `<p class="notice accent" role="status" style="margin-bottom:24px">${r(i.notice)}</p>` : ""}${La()}</main></div>`
  );
}
function Ea() {
  let e =
    k() && Y === "store"
      ? [["all", "Магазин \xB7 1 филиал"]]
      : [
          ["all", "6 филиалов и головной офис"],
          ["some", "2 филиала"],
          ["one", "1 филиал"],
          ["office", "Только головной офис"],
        ];
  return `<details class="review-details" ${i.reviewOpen ? "open" : ""} id="review"><summary>Панель макета: проверить права сотрудника и состояния приглашения</summary><div class="notice" style="margin-top:16px">Это инструменты проверки прототипа, не элементы регистрации сотрудника. В рабочем кабинете сотрудник не сможет менять себе права.</div><div class="review-grid"><div class="stack"><label class="field">Пример должности<select data-control="preset" data-testid="employee-preset">${Object.entries(
    Se,
  )
    .map(
      ([t, a]) =>
        `<option value="${t}" ${i.preset === t ? "selected" : ""}>${a.name}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">Состояние приглашения<select data-control="invite" data-testid="invite-state">${[
    ["valid", "Действующее"],
    ["none", "Нет приглашения"],
    ["expired", "Истекло"],
    ["revoked", "Отозвано"],
  ]
    .map(
      ([t, a]) =>
        `<option value="${t}" ${i.invite === t ? "selected" : ""}>${a}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">Назначенная область<select data-control="scope" data-testid="assigned-scope">${e.map(([t, a]) => `<option value="${t}" ${i.scope === t ? "selected" : ""}>${a}</option>`).join("")}</select></label></div><div class="review-perms"><h3>Права независимы от названия должности</h3><div class="permissions" style="margin-top:16px">${Object.entries(
    ht,
  )
    .map(
      ([t, a]) =>
        `<label class="check"><input type="checkbox" data-permission="${t}" data-testid="permission-${t}" ${i.permissions.has(t) ? "checked" : ""}>${a}</label>`,
    )
    .join(
      "",
    )}</div><small>Право выплаты включает просмотр взаиморасчётов. Выключение просмотра снимает оба права выплаты.</small></div></div></details>`;
}
function Ut(e, t) {
  if (e === "clients" && ["agent", "store"].includes(i.role)) {
    let a = bt(t),
      s = i.role === "agent",
      n = a.at(-1);
    return {
      name: t.name,
      detail: s
        ? `${Ce(_e(t.id).length, ["сертификат", "сертификата", "сертификатов"])} \xB7 ваш бонус ${pe(He(t))}`
        : n
          ? `Последняя покупка ${n.date} \xB7 ${pe(n.amount)} \xB7 ${n.sourceName || "Источник не указан"}`
          : "Покупок у вас пока нет",
      status: a.length ? "Есть покупки" : "Пока без покупок",
      caption: t.need || t.city || "",
      search: [
        t.phone,
        t.email,
        t.city,
        t.note,
        ...a.map((l) => l.sourceName || l.partner),
      ].join(" "),
    };
  }
  return e === "clients"
    ? {
        name: t.name,
        detail:
          [t.city, t.need].filter(Boolean).join(" \xB7 ") ||
          "Добавьте задачу в карточке",
        status: t.purchases.length ? "Есть покупки" : "Без покупок",
        caption: Ce(_e(t.id).length, [
          "сертификат",
          "сертификата",
          "сертификатов",
        ]),
        search: [t.phone, t.email, t.note].join(" "),
      }
    : e === "partners"
      ? {
          name: t.alias || t.name,
          detail: [t.city, ...t.topics].join(" \xB7 "),
          status: coop.decoratePartnerStatus(
            t,
            t.ready ? "Условия согласованы" : "Ожидает ответа",
          ),
          caption: ee[t.type].label,
        }
      : {
          name: t.name,
          detail: [t.partner, t.category].filter(Boolean).join(" \xB7 "),
          status: t.hasOperations ? "Есть покупки" : kt(t),
          caption:
            e === "certificates"
              ? [t.displayCode, t.createdAt].filter(Boolean).join(" · ")
              : wt(t),
          search: t.clientId ? he(t.clientId)?.name : "",
        };
}
function nt(e, t, a) {
  return k() &&
    !(e === "partners"
      ? O("terms")
      : e === "invitations"
        ? t.kind === "employee"
          ? qe()
          : ue()
        : O("clients"))
    ? "Нет права на это действие. Обратитесь к управляющему."
    : e === "partners" && ["delete", "disable"].includes(a)
      ? "Партнёрство нельзя удалить из списка. Используйте архив."
      : a === "delete" &&
          e === "clients" &&
          (t.purchases.length || i.records.some((s) => s.clientId === t.id))
        ? "Есть покупки или связанные сертификаты. Доступен архив, история сохраняется."
        : ["delete", "disable"].includes(a) && t.hasOperations
          ? "Есть покупки или обязательства. Используйте архив."
          : a === "disable" && (t.negotiation === "accepted" || t.accepted)
            ? "Приглашение уже принято. Управляйте сотрудничеством или сотрудником отдельно."
            : "";
}
function Ma() {
  if (ge && (!he(ge) || he(ge).archived)) ge = null;
  let e = window.scrollY,
    t = [...z.querySelectorAll("details[open]")]
      .filter((a) => a.id || a.classList.contains("agent-invites"))
      .map((a) => (a.id ? "#" + a.id : ".agent-invites"));
  (R(),
    t.forEach((a) => {
      let s = z.querySelector(a);
      s && (s.open = !0);
    }),
    window.scrollTo(0, e));
}
function Aa(e) {
  let t =
    e === "clients"
      ? ne
      : e === "certificates"
        ? i.records
        : e === "invitations"
          ? i.invitations
          : P;
  if (!t.some((a) => a.id.startsWith("bulk-" + e + "-")))
    for (let a = 1; a <= 80; a++) {
      let s = String(a).padStart(2, "0"),
        n = `bulk-${e}-${s}`,
        l = { id: n, demoFailOnce: a === 80, createdAt: "13.10.2026" };
      if (
        (e === "clients" &&
          t.push({
            ...l,
            name: `Клиент ${s} \xB7 демо`,
            city: a % 2 ? "Краснодар" : "Анапа",
            need: a % 2 ? "Ремонт квартиры" : "Двери для дома",
            phone: "",
            email: "",
            note: "Вымышленная запись для проверки макета.",
            purchases:
              a === 1 && i.role !== "agent"
                ? [
                    {
                      id: "bulk-purchase",
                      date: "13.10.2026",
                      partner:
                        i.role === "store"
                          ? "Ваш магазин \xB7 демо"
                          : "Дом материалов",
                      ownStore: i.role === "store",
                      sourceName: "Самостоятельное обращение",
                      description: "Покупка \xB7 демо",
                      amount: 1e3,
                      status: "Подтверждена \xB7 демо",
                    },
                  ]
                : [],
          }),
        e === "certificates" &&
          t.push({
            ...l,
            kind: "certificate",
            ...newCertificateIdentity(),
            name: `Сертификат ${s} \xB7 демо`,
            partner: "Дом материалов",
            category: a % 2 ? "Двери" : "Напольные покрытия",
            usageMode: "once_per_partner",
            hasOperations: a === 1,
            terms: [
              {
                partnerId: "materials",
                partnerName: "Дом материалов",
                categoryId: a % 2 ? "doors" : "floor",
                categoryName: a % 2 ? "Двери" : "Напольные покрытия",
                limit: a % 2 ? 10 : 15,
                discount: 5,
                bonus: a % 2 ? 5 : 10,
              },
            ],
          }),
        e === "invitations")
      ) {
        let o = qe() && (!ue() || a % 2 === 0);
        t.push({
          ...l,
          kind: o ? "employee" : "partner",
          name: `Приглашение ${s} \xB7 демо`,
          partner: o ? `Сотрудник ${s} \xB7 демо` : `Демопартнёр ${s}`,
          category: o
            ? "Менеджер по продажам"
            : "Сотрудничество по сертификатам",
          negotiation: !o && a === 1 ? "accepted" : "waiting",
          accepted: o && a === 2,
          finalTerms: !o && a === 1 ? [{ name: "Двери", limit: 10 }] : void 0,
        });
      }
      if (e === "partners") {
        let o = [
          {
            id: n + "-doors",
            name: "Двери",
            limit: 10,
          },
        ];
        (t.push({
          ...l,
          name: `Партнёр ${s} \xB7 демо`,
          city: a % 2 ? "Краснодар" : "Анапа",
          type: "store",
          topics: ["Двери"],
          products: ["doors"], services: [], stages: ["L1-9"],
          ready: !0,
          categories: o,
          generalTerms: [{ name: "Двери", limit: 10 }],
        }),
          G.push({
            id: n,
            name: `Партнёр ${s} \xB7 демо`,
            city: a % 2 ? "Краснодар" : "Анапа",
            categories: o,
          }));
      }
    }
}
function Oa(e, t, a) {
  if (e === "clients") {
    ((ge = t.id), (i.page = "clients"), (i.notice = ""), T());
    return;
  }
  if (e !== "partners") {
    Ne(t.id);
    return;
  }
  let s = i.invitations.find(
      (l) =>
        l.targetId === t.id &&
        !l.deleted &&
        !l.disabled &&
        l.negotiation !== "accepted",
    ),
    n = G.find((l) => l.id === t.id);
  E(
    t.name,
    `<p class="muted">${r(t.city)} \xB7 ${r(t.topics.join(", "))}</p><span class="pill">${r(coop.decoratePartnerStatus(t, t.ready ? "Условия согласованы" : "Ожидает ответа"))}</span>${n ? `<section class="stack"><h3>Ваши условия по категориям</h3>${(t.ready ? coop.ensure(t.id).agreed : n.categories).map((l) => `<div class="term-summary"><strong>${r(l.name)}</strong><span>Скидка + бонус: <b>${l.limit}%</b></span></div>`).join("")}<small>Общий процент распределяется при создании сертификата.</small></section>` : s ? d("Посмотреть приглашение", `link-open:${s.id}`) : ""}${t.ready ? coop.cardBlockHtml(t) : ""}${qt(t)}${O("clients") && t.ready && !coop.isPaused(t.id) ? d("Создать сертификат", "action:recommend", "primary") : ""}${t.ready && coop.isPaused(t.id) ? '<p class="notice">Партнёр на паузе: новый сертификат недоступен. Старые записи и ссылки просмотра сохраняются.</p>' : ""}<p class="small">Архив в списке не меняет эти условия и доступность партнёра в сертификате. Пауза сотрудничества независима от архива.</p>`,
  );
  se.querySelector(".dialog-body").insertAdjacentHTML("beforeend", `<div class="record-card-actions">${recordActionToolbar("partners", t, a, k() && !O("terms"), false, false)}</div>`);
  if (!k() || O("ledger"))
    se.querySelector(".dialog-body").insertAdjacentHTML("beforeend", settlementPartnerSummary({ role: i.role, employerRole: () => employeeEmployerRole() || (k() && J() ? Y : null) }, t.id) + d("Взаиморасчёты с партнёром", `partner-ledger:${t.id}`, "primary"));
  be({ icons: ve });
  coop.onPartnerOpened?.(t.id);
}
var emptyStates = createEmptyStates({ refresh: () => T() });
var emptyStates_page = () => (i.page === "links" && qe() ? "team" : i.page);
var Ge = xt({
    escape: r,
    role: () => i.role,
    data: ie,
    organizationBranches: () =>
      i.role === "store" ? ye.slice(0, 1) : i.role === "company" ? ye : [],
    branchContext: () =>
      ["store", "company"].includes(i.role)
        ? `<label class="production-branch-context">Текущий рабочий филиал<select data-control="branch" aria-label="Текущий рабочий филиал">${(i.role === "store" ? ye.slice(0, 1) : ye).map((e, t) => `<option value="${t}" ${t === (i.role === "store" ? 0 : i.branch) ? "selected" : ""}>${r(ie().organization || ot())} \xB7 ${r(e)}</option>`).join("")}</select></label>`
        : "",
    userId: () => sa,
    save: (e) => {
      i.drafts[i.role] = { ...ie(), ...e };
    },
    refresh: R,
    notice: (e) => {
      i.notice = e;
    },
    modal: E,
    close: _,
    accessReady: () => !k() || J(),
    requestAccess: () =>
      E(
        "Доступ к организации",
        "<p>Попросите владельца или управляющего прислать действующее приглашение. При истёкшем или отозванном приглашении нужна новая ссылка.</p><small>Самостоятельное заполнение должности или профиля не даёт прав организации.</small>",
      ),
    work: () => {
      ((i.page = "home"), (i.notice = ""), T());
    },
    workActions: () =>
      k()
        ? d("Открыть рабочие разделы", "nav:home", "primary")
        : d("Найти партнёра", "partner-hub", "primary") +
          d("Создать сертификат", "action:recommend"),
    teamAction: () =>
      d("Посмотреть пример приглашения", "action:team", "primary"),
    staffContext: () =>
      `<section class="panel stack" data-testid="staff-employer-profile"><span class="eyebrow">Из профиля работодателя \xB7 только просмотр</span><h2>Ваша работа в команде</h2>${
        J()
          ? `<dl class="staff-employer-facts"><div><dt>Организация</dt><dd>${r($e())}</dd></div><div><dt>Город</dt><dd>${r(Oe().city || "Не указан организацией")}</dd></div><div><dt>Ваша должность</dt><dd>${r(Se[i.preset].name)}</dd></div><div><dt>Область доступа</dt><dd>${r(St())}</dd></div><div><dt>Текущий филиал</dt><dd>${r(me()[i.branch] || (we() ? "Головной офис" : "Не назначен"))}</dd></div></dl><p class="small">Название, город и рабочие контакты берутся из профиля ${Y === "store" ? "магазина" : "компании"}. Должность и права назначаются сотруднику отдельно. Повторно заполнять профиль работодателя не нужно.</p><details class="optional"><summary>Об организации</summary><div class="stack"><p>Контакт для сотрудничества: ${r(Oe().contactPerson || "Не указан")}</p><p>Телефон: ${r(Oe().contactPhone || "Не указан")}</p><p>Email: ${r(Oe().contactEmail || "Не указан")}</p><div class="direction-chips">${
              Ie(Oe())
                .map((e) => `<span class="direction-chip">${r(e)}</span>`)
                .join("") ||
              '<span class="small">Направления пока не заполнены организацией.</span>'
            }</div></div></details><details class="optional"><summary>Доступные подразделения (${me().length}${we() ? " + офис" : ""})</summary><ul>${we() ? "<li>Головной офис</li>" : ""}${me()
              .map((e) => `<li>${r(e)}</li>`)
              .join(
                "",
              )}</ul><small>Только назначенные подразделения, а не вся сеть по умолчанию.</small></details><details class="optional" data-testid="my-permissions"><summary>Ваши разрешения</summary><ul>${
              [...i.permissions]
                .filter(O)
                .map((e) => `<li>${r(ht[e])}</li>`)
                .join("") || "<li>Права пока не назначены</li>"
            }</ul></details>${d("Попросить изменить доступ", "ask-access")}<small>В демо изменения сохранённых рабочих данных в сценарии \xAB${Y === "store" ? "Магазин" : "Компания"}\xBB отражаются здесь. Каталог работодателя и его личные данные не копируются в профиль сотрудника.</small>`
          : `<p class="notice">${i.invite === "expired" ? "Срок приглашения истёк." : i.invite === "revoked" ? "Приглашение отозвано." : "Нет действующего приглашения."} Данные работодателя доступны только после принятия действующего приглашения.</p>${d("Как получить доступ", "ask-access")}`
      }</section>`,
  }),
  ce = Lt({
    escape: r,
    describe: Ut,
    canApply: nt,
    seed: Aa,
    afterPaint: () => be({ icons: ve }),
    modal: E,
    closeModal: () => {
      se.open && _();
    },
    refresh: Ma,
    open: Oa,
    rowActions: recordActionToolbar,
    itemAction: openRecordUtility,
    card: (e, t, a, readOnly) => {
      const toolbar = recordActionToolbar(e, t, a, readOnly);
      if (e === "certificates" || e === "invitations") return ua(t, toolbar);
      let s = Ut(e, t);
      return `<article class="link-card"><span class="pill">${r(s.status)}</span><button class="card-title" data-coll-key="${r(a)}" data-coll-open="${r(t.id)}">${r(s.name)}</button><p>${r(s.detail)}</p><small>${r(s.caption)}</small><div class="record-card-actions">${toolbar}</div></article>`;
    },
  });
function R() {
  if (
    ((document.documentElement.dataset.theme = i.theme),
    (z.innerHTML =
      va() +
      (i.screen === "signed-out"
        ? renderSignedOut({ all: i.lastExitScope === "all", icon: D })
        : isEntryScreen(i.screen) ? renderEntry(i.screen, { role: i.role, roleLabel: ot(), name: ie().name || "", draft: ie(), employeeInvited: i.invite === "valid", employerName: $e(), escape: r })
        : i.screen === "choose" ? ba() : i.screen === "form" ? wa() : Ia()) +
      Ea()),
    z.classList.toggle(
      "has-production-profile",
      i.screen === "cabinet" && i.page === "profile",
    ),
    ma(),
    ce.hydrate(),
    hydrateMobileNavigation({
      openDialog: E,
      closeDialog: _,
      icon: D,
      contextKey: `${i.role}:${i.role === "employee" ? employeeEmployerRole() || Y : "self"}`,
      refresh: R,
      report: (message) => U(message, "success"),
    }),
    hydrateCareServices({ key: () => careConfig().key, refresh: R, notify: (m) => U(m, "success") }),
    hydrateProcurement({ key: () => careConfig().key, refresh: R, notify: (m, t) => U(m, t || "success"), openDialog: E, closeDialog: _ }),
    hydrateClientAppeals({
      config: () => clientAppealsConfig(),
      refresh: R,
      notify: (m, t) => U(m, t || "success"),
      clearNotice: () => {
        i.notice = "";
        Re();
      },
    }),
    hydrateCabinet({ role: i.role, allowed: k() ? Te().filter((key) => ["bonus", "settlements", "history"].includes(key)) : ["bonus", "settlements", "history"], refresh: R, canCash: () => O("cash"), canTransfer: () => O("transfer"), employerRole: () => employeeEmployerRole() || (k() && J() ? Y : null) }),
    i.page === "profile" && i.screen === "cabinet")
  ) {
    hydrateProfileWizards();
    hydrateStageProposals(Le);
    hydrateCatalogWizard(Ge.catalogWizard);
    let a = z.querySelector(".page-header .muted");
    a &&
      (a.textContent = k()
        ? "Личные данные и работа в команде вашей организации."
        : i.role === "agent"
          ? "Ваши данные для партнёрства, сертификатов и получения бонусов."
          : "Рабочие данные для партнёрства и добровольная публикация в каталоге RemCard.");
    let s = z.querySelector(".page-header .eyebrow");
    (s && (s.textContent = k() ? "Профиль сотрудника" : "Профиль партнёра"),
      z.querySelector('#main > .notice[role="status"]')?.remove());
    let n = z.querySelector("#main > .context-bar");
    n && z.querySelector("#profile-tab-panel")?.prepend(n);
    z.querySelector("#main")?.insertAdjacentHTML("beforeend",
      renderPartnerTypeSettings({ role: i.role }) + renderProfileSessionActions({ icon: D }));
    hydratePartnerTypeSettings({
      role: i.role,
      accountId: sa,
      escape: r,
      openDialog: E,
      closeDialog: _,
      hasUnsavedChanges: () => profileHasUnsavedChanges(i.role),
      apply: (target) => {
        const personal = {};
        for (const key of ["name", "city", "contactPhone", "contactEmail", "contactTelegram", "contactMax"]) {
          if (ie()[key] !== undefined) personal[key] = ie()[key];
        }
        i.drafts[target] = { ...i.drafts[target], ...personal };
        syncProfileIdentity(target, personal);
        i.role = target;
        if (["store", "company"].includes(target)) Y = target;
        i.branch = 0;
        i.page = "profile";
        i.screen = "cabinet";
        R();
        z.querySelector('[data-profile-action="tab"][data-profile-id="overview"]')?.click();
        z.querySelector('[data-testid="partner-type-settings"]')?.scrollIntoView({ block: "nearest" });
        z.querySelector('[data-testid="partner-type-open"]')?.focus({ preventScroll: true });
      },
    });
  }
  if (i.page === "clients" && i.screen === "cabinet") {
    const client = he(ge), header = z.querySelector(".client-header");
    if (client && header) {
      header.querySelector('[data-action^="client-edit:"]')?.remove();
      header.insertAdjacentHTML("beforeend", `<div class="record-card-actions">${recordActionToolbar("clients", client, "clients", k() && !O("clients"))}</div>`);
    }
    const muted = z.querySelector(".page-header .muted");
    if (muted) muted.textContent = clientAppealsPageMuted(clientAppealsConfig());
  }
  hydrateEntry({ root: z, state: i, render: () => {
    if (["store", "company"].includes(i.role)) Y = i.role;
    T();
  }, dialog: E });
  hydrateAccountSession({
    icon: D,
    openDialog: E,
    closeDialog: _,
    signOut: (scope) => {
      if (se.open) _();
      i.lastExitScope = scope;
      i.screen = "signed-out";
      i.notice = "";
      T();
    },
    signIn: () => {
      entryState.returning = true;
      entryState.registering = false;
      i.screen = "entry-login";
      T();
    },
  });
  let e = i.invitations.filter(
      (a) =>
        a.negotiation === "offered" && !a.disabled && !a.deleted && !a.archived,
    ),
    t = z.querySelector(".agent-invites");
  (t &&
    e.length &&
    ((t.open = !0),
    t
      .querySelector("summary")
      .insertAdjacentHTML(
        "beforeend",
        `<span class="pill accent">Предложения: ${e.length}</span>`,
      )),
    z.querySelector("#review")?.addEventListener("toggle", (a) => {
      i.reviewOpen = a.target.open;
    }),
    be({ icons: ve }));
}
document.addEventListener("keydown", (e) => Ge.keydown(e));
document.addEventListener("remcard:mobile-icons", () => be({ icons: ve }));
function ct() {
  let e = document.querySelector("#registration-form");
  if (e) {
    let t = new FormData(e);
    i.drafts[i.role] = {
      ...ie(),
      ...Object.fromEntries(t),
      consent: entryState.accepted || t.has("consent"),
    };
  }
}
function T() {
  (R(),
    document.querySelector("#main")?.focus({ preventScroll: !0 }),
    window.scrollTo(0, 0));
}
function E(e, t) {
  se.classList.remove("hub-wide", "pr-invite-dialog");
  ((i.returnFocus = document.activeElement),
    (se.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${r(e)}</h2>${d(D("x"), "close-dialog", "icon", 'aria-label="Закрыть"')}</div><div class="dialog-body">${t}</div>`),
    be({ icons: ve }),
    se.showModal(),
    (se.scrollTop = 0));
  hydrateCertificateCard(se);
  coop?.afterModalOpen?.();
}
function newCertificateIdentity() {
  const role = i.role === "employee" ? employeeEmployerRole() || Y : i.role;
  return certificateIdentity({
    role,
    name: Ue(),
    actorRole: i.role,
    city: ie().city || "Город не указан",
  });
}
function _() {
  (se.close(), i.returnFocus?.isConnected && i.returnFocus.focus());
}
function closeRoleDialog() {
  // In-page discard confirm for dirty cooperation draft (no system dialogs)
  if (cooperationHasUnsavedDraft()) {
    requestClose();
    return;
  }
  _();
}
se.addEventListener(
  "close",
  () => {
    if (i.returnFocus?.isConnected) i.returnFocus.focus({ preventScroll: true });
  },
);
se.addEventListener("cancel", (event) => {
  // Escape while dirty/confirm: coop Escape keydown guard handles non-cancelable
  // CloseWatcher closes; still preventDefault whenever the event allows it.
  const protect =
    cooperationHasUnsavedDraft() || !!se.querySelector(".coop-discard-confirm");
  if (!protect) return;
  if (event.cancelable) {
    event.preventDefault();
    requestClose();
  }
});
function ft() {
  return `<small>Макет \xB7 ${k() ? r($e()) : r(ke())}${J() ? " \xB7 " + r(me()[i.branch] || (we() ? "Головной офис" : "Нет филиала")) : ""}. Данные не отправляются.</small>`;
}
var Da = () =>
  '<div class="table-wrap"><table><thead><tr><th>Путь</th><th>Для начала</th><th>Позже / не нужно</th></tr></thead><tbody><tr><td>Специалист</td><td>Имя, город</td><td>Специализация позже, каталог добровольно</td></tr><tr><td>Магазин</td><td>Представитель, название, город</td><td>Адрес, направления, команда по задаче</td></tr><tr><td>Компания</td><td>Представитель, название, город</td><td>Филиалы и сотрудники по мере работы</td></tr><tr><td>Агент</td><td>Имя, город</td><td>Без специализации, каталога и магазина</td></tr><tr><td>Сотрудник</td><td>ФИО, действующее приглашение для рабочего доступа</td><td>Компания, должность, права и область из приглашения</td></tr></tbody></table></div><p class="small">Общее: подтверждённый вход и обязательные согласия. Программы не обязательны для регистрации. Сотрудник является отдельным путём входа, а не типом самостоятельного партнёра в базе.</p><p class="small">Весь макет использует условные данные. Проверки доступа при реализации должны выполняться на сервере, а не только скрытием меню.</p>';
document.addEventListener("input", (e) => {
  if (coop.handleInput(e)) return;
  if (!Ge.input(e) && !ce.input(e)) {
    if (
      (e.target.closest("#registration-form") && ct(),
      e.target.id === "client-search" &&
        ((vt = e.target.value),
        (document.querySelector("#client-list").innerHTML = la()),
        be({ icons: ve })),
      e.target.dataset.offerField &&
        V &&
        (V.rows[Number(e.target.dataset.offerRow)][
          e.target.dataset.offerField
        ] = e.target.value),
      e.target.id === "offer-message" && V && (V.message = e.target.value),
      e.target.id === "directory-query" &&
        ((de.q = e.target.value),
        paintDirectoryResults()),
      e.target.closest("#recipient-register-form"))
    ) {
      let t = e.target.closest("form"),
        a = new FormData(t);
      Object.assign(W, Object.fromEntries(a), { consent: a.has("consent") });
    }
    if (
      (e.target.id === "cert-partner-search" &&
        ((C.query = e.target.value),
        (document.querySelector("#cert-partner-results").innerHTML = Gt())),
      e.target.id === "cert-name" && (C.name = e.target.value),
      e.target.dataset.certDiscount)
    ) {
      let t = e.target.dataset.certDiscount;
      C.categories[t].discount = e.target.value;
      let a = certCategoryById(t),
        s = Number(e.target.value),
        n =
          !!a &&
          e.target.value !== "" &&
          Number.isFinite(s) &&
          s >= 0 &&
          s <= a.limit &&
          Math.abs(s * 10 - Math.round(s * 10)) <= 1e-8;
      (e.target.setAttribute("aria-invalid", String(!n)),
        (document.querySelector(`[data-cert-bonus="${t}"]`).textContent = n
          ? certBonusDisplay(a.limit, s)
          : "Проверьте скидку"),
        (document.querySelector("#cert-error").textContent = Yt()));
    }
  }
});
document.addEventListener("change", (e) => {
  if (ce.change(e) || emptyStates.change(e)) return;
  let t = e.target.dataset.control,
    a = e.target.dataset.permission;
  if (
    ((t === "preset" || t === "invite" || a) &&
      i.role !== "employee" &&
      (gt("employee"),
      (i.records = []),
      (i.invitations = []),
      (C = null),
      (Z = !1),
      G.splice(2),
      P.splice(7),
      P.forEach((s) => {
        ((s.ready = ["materials", "interior"].includes(s.id)),
          (s.archived = !1));
      })),
    ct(),
    e.target.id === "certificate-client" &&
      C &&
      (C.clientId = e.target.value || null),
    e.target.dataset.directoryFilter &&
      ((de[e.target.dataset.directoryFilter] = e.target.value),
      paintDirectoryResults()),
    e.target.id === "recipient-type" &&
      ((W.type = e.target.value), De(W.id, "registration")),
    e.target.name === "usageMode" &&
      C &&
      ((C.usageMode = e.target.value),
      (document.querySelector(
        '[data-testid="certificate-usage"]>summary',
      ).textContent = "Использование: " + We(C))),
    e.target.dataset.certPartner)
  ) {
    let s = e.target.dataset.certPartner,
      n = G.find((l) => l.id === s);
    (e.target.checked
      ? (C.partners.push(s),
        certAgreedCategories(s).forEach(
          (l) =>
            (C.categories[l.id] ||= {
              selected: !0,
              discount: Math.min(5, l.limit),
            }),
        ))
      : (C.partners = C.partners.filter((l) => l !== s)),
      (document.querySelector("#cert-selected-count").textContent =
        `Выбрано: ${C.partners.length}`),
      (document.querySelector('[data-action="cert-next"]').disabled =
        !C.partners.length));
  }
  if (e.target.dataset.certCategory) {
    let s = se.scrollTop;
    ((C.categories[e.target.dataset.certCategory].selected = e.target.checked),
      ze(),
      (se.scrollTop = s));
  }
  (t === "role" &&
    (["company", "store"].includes(i.role) && (Y = i.role),
    e.target.value === "employee" &&
      ((i.branch = 0), Y === "store" && (i.scope = "all")),
    gt(e.target.value),
    G.splice(2),
    P.splice(7),
    P.forEach((s) => {
      ((s.ready = ["materials", "interior"].includes(s.id)), (s.archived = !1));
    }),
    (C = null),
    (Z = !1),
    (i.role = e.target.value),
    (i.page = i.page === "profile" ? "profile" : "home"),
    (i.notice = ""),
    ["choose", "form"].includes(i.screen) && (i.screen = "choose"),
    (i.records = []),
    yt(),
    (i.invitations = []),
    T()),
    t === "employer" &&
      ((Y = e.target.value === "store" ? "store" : "company"),
      (i.branch = 0),
      Y === "store" && (i.scope = "all"),
      R()),
    t === "preset" &&
      ((i.role = "employee"),
      (i.preset = e.target.value),
      (i.permissions = new Set(Se[i.preset].keys)),
      (i.invite = "valid"),
      (i.page = "home"),
      (i.notice = ""),
      R()),
    t === "invite" &&
      ((i.role = "employee"),
      (i.invite = e.target.value),
      (i.page = "home"),
      (i.notice = ""),
      R()),
    t === "scope" &&
      ((i.scope = e.target.value), (i.branch = 0), (i.notice = ""), R()),
    t === "branch" &&
      ((i.branch = Number(e.target.value)),
      (i.notice =
        "Рабочий филиал изменён в макете. Общая область доступа осталась прежней."),
      R()),
    a &&
      ((i.role = "employee"),
      (i.invite = "valid"),
      e.target.checked ? i.permissions.add(a) : i.permissions.delete(a),
      e.target.checked &&
        ["cash", "transfer"].includes(a) &&
        i.permissions.add("ledger"),
      a === "ledger" &&
        !e.target.checked &&
        (i.permissions.delete("cash"), i.permissions.delete("transfer")),
      (i.notice = ""),
      R()));
});
document.addEventListener("click", (e) => {
  if (Ge.click(e) || ce.click(e) || emptyStates.click(e)) return;
  coop.captureTriggerFromEvent?.(e);
  if (coop.handleClick(e)) return;
  let t = e.target.closest("[data-action]");
  if (!t) return;
  let [a, s] = t.dataset.action.split(":");
  if (a === "partner-ledger" && (!k() || O("ledger"))) {
    const partner = P.find((partner) => partner.id === s);
    if (!partner) return;
    openSettlementPartner({ role: i.role, employerRole: () => employeeEmployerRole() || (k() && J() ? Y : null) }, s, partner.name);
    showWalletSection(i.role, "settlements");
    if (se.open) _();
    i.page = "wallet";
    T();
    document.querySelector("[data-testid=settlement-demo] h2")?.scrollIntoView({ block: "start", behavior: "auto" });
    return;
  }
  if (
    (ct(),
    a === "client-add" &&
      Te().includes("clients") &&
      (se.open && _(),
      (ge = null),
      primeClientAppealsView(clientAppealsConfig(), "manual"),
      (i.page = "clients"),
      (i.screen = "cabinet"),
      (i.notice = ""),
      T()),
    a === "client-edit" && Bt(s),
    a === "client-open" &&
      Te().includes("clients") &&
      (se.open && _(),
      (ge = null),
      openClientAppealFromLegacy(s, { config: () => clientAppealsConfig(), refresh: R }, he(s)?.name),
      (i.page = "clients"),
      (i.screen = "cabinet"),
      (i.notice = ""),
      T()),
    a === "client-back" &&
      ((ge = null),
      (i.page = "clients"),
      (i.notice = ""),
      T(),
      ce.restorePosition("clients")),
    a === "client-certificate" &&
      ((C ||= {
        step: 1,
        query: "",
        partners: [],
        categories: {},
        name: "",
        usageMode: "once_per_partner",
      }),
      (C.clientId = s),
      ut()),
    a === "offer-partner" && st(s, !0),
    a === "offer-add" && (V.rows.push({ name: "", limit: "" }), st(V.id)),
    a === "offer-remove" &&
      V.rows.length > 1 &&
      (V.rows.splice(Number(s), 1), st(V.id)),
    a === "offer-counter")
  ) {
    let n = B(s);
    if (!n || n.negotiation !== "offered") return;
    E(
      "Запросить другие условия",
      `<form id="offer-counter-form" data-invite="${s}" class="stack"><label class="field">Что хотите обсудить<textarea name="message" required maxlength="400" rows="3" placeholder="Например, другой процент по категории"></textarea></label><button type="submit" class="btn primary">Передать демозапрос партнёру</button></form>`,
    );
  }
  if (a === "offer-accept") {
    let n = B(s);
    if (
      !n ||
      n.disabled ||
      n.deleted ||
      n.negotiation !== "offered" ||
      !n.finalTerms?.length
    )
      return;
    n.negotiation = "accepted";
    let l = n.targetId || "external-" + n.id,
      o = n.finalTerms.map((A, x) => ({
        id: l + "-" + x,
        name: A.name,
        limit: A.limit,
      }));
    G.some((A) => A.id === l) ||
      G.push({
        id: l,
        name: n.partner,
        city: n.recipientCity || "Краснодар",
        categories: o,
      });
    let b = P.find((A) => A.id === l);
    (b
      ? (b.ready = !0)
      : P.push({
          id: l,
          name: n.partner,
          city: n.recipientCity || "Краснодар",
          type: n.recipientType || "company",
          topics: o.map((A) => A.name),
          generalTerms: [],
          ready: !0,
        }),
      _(),
      R(),
      Ne(s),
      U("Условия приняты в макете. Партнёр доступен для сертификатов."));
  }
  if (a === "directory-clear" && ["specialization", "stage", "city", "type", "q"].includes(s)) {
    de[s] = "";
    const control = s === "q" ? document.querySelector("#directory-query") : document.querySelector(`[data-directory-filter="${s}"]`);
    if (control) control.value = "";
    paintDirectoryResults();
  }
  if (a === "directory-chip") {
    const [key, raw] = s.split("=");
    const value = raw.replace("|", ":");
    de[key] = de[key] === value ? "" : value;
    if (key === "stage") { de.specialization = ""; const field = document.querySelector(`[data-directory-filter="specialization"]`); if (field) field.value = ""; }
    const control = document.querySelector(`[data-directory-filter="${key}"]`);
    if (control) control.value = de[key];
    paintDirectoryResults();
    if (window.innerWidth <= 760) { const nav = document.querySelector(".pr-navigator"); if (nav) nav.open = false; }
  }
  if (
    (a === "partner-hub" && $t(),
    a === "partner-hub-choose" && hubChoose(),
    a === "partner-zone" && scrollToZone(s),
    a === "external-partner" && it("partner", !0),
    a === "directory-detail" && Ht(s, !0),
    a === "directory-invite" && Ht(s),
    a === "directory-reset" &&
      ((de = { q: "", city: "", type: "", specialization: "", stage: "" }), $t()),
    a === "recipient-preview" && ((W = null), De(s)),
    a === "recipient-register" && De(s, "registration"),
    a === "recipient-existing")
  ) {
    ((!W || W.id !== s) && (W = { id: s, type: "store" }), (W.registered = !0));
    let n = B(s);
    (n && (n.previewRegistered = !0), De(s));
  }
  if (a === "recipient-interest") {
    let n = B(s);
    if (!n || n.disabled || n.deleted) return;
    ((n.previewInterest = !0), st(s, !0));
  }
  if (
    (a === "cert-next" && C.partners.length && ((C.step = 2), ze()),
    a === "cert-back" && ((C.step = 1), ze()),
    a === "cert-all")
  ) {
    let n = se.scrollTop,
      l = certCategoryById(s);
    if (!l) return;
    // Existing 0.1% discount policy: do not set a value the form cannot accept
    if (Math.abs(l.limit * 10 - Math.round(l.limit * 10)) > 1e-8) {
      const manual = Math.floor(l.limit * 10) / 10;
      const err = document.querySelector("#cert-error");
      if (err) {
        err.textContent = `«Всё клиенту» недоступно для лимита ${l.limit}%: скидка задаётся с шагом 0,1%. Введите вручную, например ${manual}.`;
      }
      return;
    }
    ((C.categories[s].discount = l.limit), ze(), (se.scrollTop = n));
  }
  if (
    (a === "cert-invite" && ((Z = !0), it("partner")),
    a === "cert-return" && ((Z = !1), ut()),
    a === "new-link" && ((Z = !1), it(s)),
    a === "link-open" && Ne(s),
    (a === "link-rename" || a === "link-edit") && ha(s, a === "link-rename"),
    a === "link-archive")
  ) {
    let n = B(s);
    if (
      !n ||
      nt(
        n.kind === "certificate" ? "certificates" : "invitations",
        n,
        n.archived ? "restore" : "archive",
      )
    )
      return;
    ((n.archived = !n.archived),
      (i.notice = n.archived
        ? "Перемещено в архив. Ссылка не отключена."
        : "Карточка возвращена из архива."),
      _(),
      T());
  }
  if (a === "link-delete" || a === "link-disable") {
    let n = B(s);
    if (!n) return;
    let l = a === "link-delete",
      o = nt(
        n.kind === "certificate" ? "certificates" : "invitations",
        n,
        l ? "delete" : "disable",
      );
    if (o) {
      E(
        "Действие недоступно",
        `<p class="notice">${r(o)}</p>${d("Вернуться к карточке", `link-open:${s}`)}`,
      );
      return;
    }
    E(
      l
        ? "Удалить карточку и ссылку?"
        : n.kind === "certificate"
          ? "Отключить сертификат?"
          : "Отключить ссылку?",
      `<h3>${r(n.name)}</h3><p>${l ? "Карточка будет удалена из вашего списка." : n.kind === "certificate" ? "Новые покупки по этому сертификату будут недоступны, в том числе по ранее отправленной ссылке или сохранённому QR. Карточка и история останутся в кабинете." : "Карточка останется, но воспользоваться ссылкой больше нельзя."}</p><p class="notice">${n.kind === "employee" ? "Принятый сотрудник не будет удалён из команды. Его доступ изменяется отдельно в разделе \xABСотрудники\xBB." : n.kind === "partner" ? "Существующее партнёрство, условия и взаиморасчёты сохраняются." : "Покупки, начисления и выплаты не удаляются. При наличии операций действие заблокировано. Архив не отключает сертификат, а только скрывает его из активного списка."}</p><div class="row">${d("Отмена", `link-open:${s}`)}${d(l ? "Да, удалить" : n.kind === "certificate" ? "Запретить новые использования" : "Да, отключить", `${l ? "confirm-delete" : "confirm-disable"}:${s}`, "danger")}</div><small>В этом макете действие затронет только демонстрационную карточку.</small>`,
    );
  }
  if (a === "confirm-delete" || a === "confirm-disable") {
    let n = B(s);
    if (
      !n ||
      nt(
        n.kind === "certificate" ? "certificates" : "invitations",
        n,
        a === "confirm-delete" ? "delete" : "disable",
      )
    )
      return;
    (n.negotiation !== "accepted" && !n.accepted && (n.disabled = !0),
      a === "confirm-delete" && (n.deleted = !0),
      (i.notice =
        a === "confirm-delete"
          ? "Демонстрационная карточка удалена. История операций не затронута."
          : n.kind === "certificate"
            ? "Демосертификат отключён. Новые использования запрещены, история сохранена."
            : "Демонстрационная ссылка отключена."),
      _(),
      T());
  }
  if (a === "link-share") {
    let n = B(s);
    if (!n) return;
    if (!lt(n) || nt(n.kind === "certificate" ? "certificates" : "invitations", n, "share")) {
      E("Нельзя поделиться", '<p class="notice">Ссылка неактивна, приглашение уже принято или у вас нет права на это действие. История сохранена.</p>');
      return;
    }
    let l =
      n.kind === "certificate"
        ? `Здравствуйте! ${n.issuerNameSnapshot || ke()} рекомендует вам: ${n.partner}.
Код сертификата: ${n.displayCode || "не указан"}.
${
  n.terms?.length
    ? n.terms.map(
        (o) => `${o.partnerName} \xB7 ${o.categoryName}: скидка ${o.discount}%`,
      ).join(`
`)
    : n.category
}
${We(n)}. Покупка у одного партнёра не закрывает доступ у остальных.
Откройте сертификат, чтобы посмотреть предложение и условия покупки. Акционные модели исключены.`
        : n.kind === "employee"
          ? `Здравствуйте! ${ke()} приглашает вас в команду ${$e()} на должность \xAB${n.category}\xBB.
Откройте приглашение, войдите в RemCard и подтвердите присоединение. Ваши доступы уже указаны в приглашении.`
          : n.invitationMessage || `Здравствуйте! Приглашение для ${n.partner} от ${Ue()}.
Предлагаю сотрудничество в RemCard: ${n.category}.
${n.targetId ? "Откройте приглашение в своём кабинете, чтобы обсудить условия." : "По ссылке посмотрите приглашение, войдите или пройдите обычную регистрацию RemCard. После входа вы вернётесь к этому предложению."}`;
    E(
      "Поделиться",
      `<label class="field">Готовый текст<textarea id="share-copy" rows="7" readonly>${r(l)}${n.proposedTerms ? `\n\nПредлагаемые условия:\n${r(n.proposedTerms)}\nУсловия требуют согласования обеими сторонами.` : ""}

[Здесь будет ссылка. Сейчас это демонстрационный макет.]</textarea></label>${d("Скопировать текст", "copy-link-message", "primary")}<p class="small" id="copy-result" role="status">Настоящая ссылка в макете не создаётся.</p>${Z ? d("Вернуться к сертификату", "cert-return", "ghost") : ""}`,
    );
  }
  if (a === "copy-link-message") {
    let n = document.querySelector("#share-copy");
    Qe(
      document.querySelector('[data-action="copy-link-message"]'),
      n.value,
      document.querySelector("#copy-result"),
      n,
    );
  }
  if (a === "theme") {
    let n = [...z.querySelectorAll(".profile-guide details")].map(
      (l) => l.open,
    );
    ((i.theme = i.theme === "dark" ? "light" : "dark"),
      R(),
      z.querySelectorAll(".profile-guide details").forEach((l, o) => {
        o < n.length && (l.open = n[o]);
      }));
  }
  if (a === "role") {
    if (entryState.registering) entryState.chosen = true;
    (i.role !== s && gt(s),
      i.role !== s &&
        (G.splice(2),
        P.splice(7),
        P.forEach((l) => {
          ((l.ready = ["materials", "interior"].includes(l.id)),
            (l.archived = !1));
        })));
    let n = i.role !== s;
    (n && ((i.records = []), (i.invitations = []), (C = null), (Z = !1)),
      (i.role = s),
      n && yt(),
      (i.notice = ""),
      R());
  }
  if (
    (a === "continue" && ((i.screen = entryState.registering ? "entry-data" : "form"), (entryState.dataStep = 0), T()),
    a === "back" && ((i.screen = "choose"), T()),
    a === "view" &&
      ((i.screen = s === "cabinet" ? "cabinet" : "welcome"),
      s !== "cabinet" && (entryState.returning = false, entryState.accepted = false, entryState.invite = false, entryState.registering = false),
      (i.page = "home"),
      (i.notice = ""),
      T()),
    a === "nav" &&
      (s === "clients" && (ge = null, resetClientAppealsNav(clientAppealsConfig())),
      (i.page = s),
      (i.notice = ""),
      ["bonus", "settlements"].includes(s) &&
        (showWalletSection(i.role, s), (i.page = "wallet")),
      s === "links" &&
        !qe() &&
        (showPartnerInvitations(i.role), (i.page = "partners")),
      s === "links" && qe() && (Ge.selectTab("team"), (i.page = "profile")),
      T()),
    a === "edit-profile" && ((i.screen = "form"), T()),
    a === "demo-invite" && ((i.invite = "valid"), R()),
    a === "enter-code" && ((i.screen = "form"), T()),
    a === "check-invite" &&
      (ie().inviteCode?.trim() === "TEAM-DEMO"
        ? ((i.invite = "valid"), R())
        : (document.querySelector("#form-error").textContent =
            "Демокод не найден. Для проверки используйте TEAM-DEMO.")),
    a === "close-dialog" && closeRoleDialog(),
    a === "share")
  ) {
    let n = i.records[Number(s)];
    n &&
      E(
        "Поделиться сертификатом",
        `<p>Готовый текст для клиента:</p><label class="field">Текст приглашения<textarea id="share-copy" rows="5" readonly>Здравствуйте! ${r(ke())} рекомендует вам \xAB${r(n.partner)}\xBB: ${r(n.category)}.
В рабочей версии здесь будет ссылка на ваш сертификат.
Это демонстрационный пример, не действующий сертификат.</textarea></label>${d("Выделить текст для копирования", "select-share", "primary")}<small>В макете нет реальной ссылки. После реализации здесь будут \xABСкопировать\xBB и системное \xABПоделиться\xBB.</small>`,
      );
  }
  if (
    (a === "select-share" &&
      (document.querySelector("#share-copy").select(),
      (document.querySelector("#live").textContent =
        "Текст выделен. Скопируйте привычным способом.")),
    a === "matrix" && E("Пять путей, минимум полей", Da() + Ft()),
    a === "consent-info" &&
      E(
        "Документы при первом входе",
        '<p>В рабочей версии здесь будут ссылки на действующие условия и документы об обработке данных. Согласия фиксируются отдельно от выбора типа деятельности.</p><p class="notice">В этом макете документы не подписываются, юридически значимое согласие не собирается.</p>',
      ),
    a === "notifications")
  ) {
    let n = i.invitations.filter(
      (l) => l.negotiation === "offered" && !l.disabled && !l.deleted,
    );
    E(
      "Уведомления",
      n.length
        ? n
            .map(
              (l) =>
                `<div class="notice"><strong>${r(l.partner)}</strong><p>Получено персональное предложение по категориям.</p>${d("Посмотреть условия", `link-open:${l.id}`)}</div>`,
            )
            .join("")
        : '<div class="notice">Новых демонстрационных уведомлений нет.</div><p class="small">Показываются только относящиеся к вам события.</p>',
    );
  }
  (a === "ask-invite" &&
    E(
      "Попросите приглашение",
      '<p>Отправьте владельцу или управляющему такой текст:</p><blockquote class="notice">Здравствуйте! Я создал аккаунт RemCard как сотрудник. Пришлите, пожалуйста, приглашение в команду с моей должностью и нужными подразделениями.</blockquote><p class="small">Текст можно выделить и скопировать. Без действующего приглашения данные организации недоступны.</p>',
    ),
    a === "ask-access" &&
      E(
        "Доступ назначает организация",
        "<p>Обратитесь к владельцу или управляющему и назовите нужную задачу и подразделения. Самостоятельно менять себе права сотрудник не может.</p>",
      ),
    a === "later" &&
      E(
        "Дополняйте профиль по задаче",
        `<ul class="list-clean">${(i.role === "specialist" ? ["Специализация и направления работы.", "Описание и фото для добровольной публикации в каталоге."] : i.role === "store" ? ["Адрес и направления магазина.", "Приглашения сотрудников, если работаете с командой.", "Условия сотрудничества и добровольный каталог."] : ["Филиалы и рабочие адреса.", "Сотрудники, должности и разрешения.", "Направления, условия сотрудничества и добровольный каталог."]).map((n) => `<li>${n}</li>`).join("")}</ul><p class="notice">Заполняется по мере необходимости, не при регистрации.</p>`,
      ),
    a === "action" &&
      (s === "recommend" && ut(),
      s === "scan" &&
        E(
          "Демонстрационный сертификат",
          `<span class="pill good">Условия найдены \xB7 демо</span><h3>Дом материалов</h3><p>Материалы для ремонта \xB7 бонус партнёру 5%</p><p class="notice">Сканирование ничего не начисляет. Для начисления нужно отдельно оформить продажу.</p>${O("sale") ? d("Посмотреть оформление продажи", "sale-example", "primary") : '<p class="small">Право оформления продажи вам не назначено.</p>'}${ft()}`,
        ),
      (s === "cash" || s === "transfer") &&
        E(
          s === "cash"
            ? "Фиксация выдачи наличных"
            : "Фиксация выполненного перевода",
          `<p>Выберите существующее обязательство, проверьте получателя и сумму. ${s === "transfer" ? "Сначала выполните перевод вне кабинета, затем зафиксируйте факт." : "Подтверждайте только после фактической выдачи денег."}</p><div class="notice">В демо нет обязательств. Ничего не списано; платёж в банк не отправляется.</div>${ft()}`,
        ),
      (s === "terms" || s === "view-terms") &&
        E(
          s === "terms" ? "Изменение условий" : "Действующие условия",
          `<p>Материалы для ремонта: бонус партнёру 5%.</p><p class="notice">${s === "terms" ? "Новые условия вступают в силу после согласования с другой стороной. Здесь показан только макет, запрос не отправлен." : "Просмотр условий не даёт права их менять."}</p>${ft()}`,
        ),
      s === "team" && it("employee")),
    a === "sale-example" &&
      (_(),
      E(
        "Продажа и начисление",
        '<p>Здесь сотрудник с правом продажи проверит сертификат, укажет сумму покупки и подтвердит начисление бонуса.</p><p class="notice">Это описание следующего шага. Продажа не создана и бонус не начислен.</p>',
      )));
});
document.addEventListener("submit", (e) => {
  if (!Ge.submit(e)) {
    if (e.target.id === "client-form") {
      e.preventDefault();
      let t = new FormData(e.target);
      if (!String(t.get("name")).trim()) return;
      let s = he(e.target.dataset.id) || {
        id: crypto.randomUUID(),
        purchases: [],
      };
      for (let n of ["name", "city", "phone", "email", "need", "note"])
        s[n] = String(t.get(n) || "").trim();
      (he(s.id) || ne.push(s),
        (ge = s.id),
        (i.page = "clients"),
        (i.notice = e.target.dataset.id
          ? "Данные клиента сохранены в макете."
          : "Клиент добавлен в макете."),
        _(),
        T());
      return;
    }
    if (e.target.id === "partner-offer-form") {
      e.preventDefault();
      let t = B(e.target.dataset.invite),
        a = V;
      if (!t || t.disabled || t.deleted || t.negotiation === "accepted") return;
      let s = a.rows.every(
          (l) =>
            String(l.name).trim() &&
            l.limit !== "" &&
            Number.isFinite(Number(l.limit)) &&
            Number(l.limit) >= 0 &&
            Number(l.limit) <= 100 &&
            Math.abs(Number(l.limit) * 10 - Math.round(Number(l.limit) * 10)) <
              1e-8,
        ),
        n = a.rows.map((l) => l.name.trim().toLocaleLowerCase("ru"));
      if (!s || new Set(n).size !== n.length) {
        document.querySelector("#offer-error").textContent =
          "Укажите разные категории и процент от 0 до 100 с точностью до 0,1%.";
        return;
      }
      ((t.finalTerms = a.rows.map((l) => ({
        name: l.name.trim(),
        limit: Number(l.limit),
      }))),
        (t.partnerMessage = a.message.trim()),
        (t.negotiation = "offered"),
        _(),
        R(),
        Ne(t.id),
        U(
          "Предложение подготовлено в макете. Реальное сообщение не отправлялось.",
        ));
      return;
    }
    if (e.target.id === "offer-counter-form") {
      e.preventDefault();
      let t = B(e.target.dataset.invite),
        a = String(new FormData(e.target).get("message")).trim();
      if (!t || !a) return;
      ((t.counterMessage = a),
        (t.negotiation = "changes_requested"),
        _(),
        R(),
        Ne(t.id),
        U(
          "Запрос на изменение условий сохранён в макете. Реальное сообщение не отправлялось.",
        ));
      return;
    }
    if (e.target.id === "recipient-register-form") {
      e.preventDefault();
      let t = new FormData(e.target);
      if (
        !String(t.get("name")).trim() ||
        !String(t.get("city")).trim() ||
        !t.has("consent")
      )
        return;
      Object.assign(W, Object.fromEntries(t), { registered: !0 });
      let a = B(e.target.dataset.invite);
      (a &&
        ((a.previewRegistered = !0),
        (a.recipientCity = String(t.get("city")).trim()),
        (a.recipientType = W.type)),
        De(e.target.dataset.invite));
      return;
    }
    if (e.target.id === "directory-invite-form") {
      e.preventDefault();
      let t = P.find((n) => n.id === e.target.dataset.target),
        a = new FormData(e.target);
      if (!t || t.ready || Ve(t.id) || !String(a.get("subject")).trim()) return;
      let s = crypto.randomUUID();
      (i.invitations.push({
        id: s,
        kind: "partner",
        targetId: t.id,
        name: t.name,
        partner: t.name,
        category: String(a.get("subject")).trim(),
        createdAt: new Date().toLocaleDateString("ru-RU"),
      }),
        (i.page = "partners"),
        showPartnerInvitations(i.role),
        _(),
        T(),
        E(
          "Приглашение подготовлено",
          `<h3>${t.name}</h3><p>Демонстрационное приглашение адресовано выбранному профилю RemCard. Партнёр увидит предложение в кабинете, повторная регистрация не нужна.</p><span class="pill">Ожидает ответа \xB7 демо</span><div class="row">${d("Карточка приглашения", `link-open:${s}`)}${d("Назад к поиску", "partner-hub", "ghost")}${Z ? d("Вернуться к сертификату", "cert-return", "primary") : ""}</div><small>Реальное уведомление не отправлялось.</small>`,
        ));
      return;
    }
    if (e.target.id === "certificate-builder-form") {
      e.preventDefault();
      let t = Yt();
      if (t) {
        ((document.querySelector("#cert-error").textContent = t),
          document
            .querySelector("#cert-error")
            .scrollIntoView({ block: "nearest" }));
        return;
      }
      let a = Kt(),
        createdId = crypto.randomUUID();
      (i.records.push({
        id: createdId,
        kind: "certificate",
        ...newCertificateIdentity(),
        name: C.name.trim() || "Сертификат для клиента",
        clientId: C.clientId || null,
        partner: [...new Set(a.map((s) => s.partnerName))].join(", "),
        category: a.map((s) => s.categoryName).join(", "),
        createdAt: new Date().toLocaleDateString("ru-RU"),
        usageMode: C.usageMode || "once_per_partner",
        terms: a.map(({ raw: s, ...n }) => ({
          ...n,
          bonus: certBonusValue(n.limit, n.discount),
        })),
      }),
        (C = null),
        (Z = !1),
        (i.page = i.role === "agent" ? "home" : "recommendations"),
        (i.notice =
          "Демосертификат создан. Выбранные партнёры и скидки сохранены в карточке."),
        _(),
        T(),
        Ne(createdId));
      return;
    }
    if (e.target.id === "link-create-form") {
      e.preventDefault();
      let t = new FormData(e.target),
        a = e.target.dataset.kind,
        s = String(t.get("partner")).trim(),
        n = String(t.get("category")).trim();
      if (!s || !n) return;
      let l = crypto.randomUUID();
      (i.invitations.push({
        id: l,
        kind: a,
        name: s,
        partner: s,
        category: n,
        ...(a === "partner" && t.get("invitationMessage") ? { invitationMessage: String(t.get("invitationMessage")).trim(), proposedTerms: String(t.get("proposedTerms") || "").trim(), inviterName: Ue() } : {}),
        createdAt: new Date().toLocaleDateString("ru-RU"),
      }),
        (i.page = a === "employee" ? "profile" : "partners"),
        a === "employee" && Ge.selectTab("team"),
        a === "partner" && showPartnerInvitations(i.role),
        (i.notice =
          a === "employee"
            ? "Демоприглашение сотрудника создано. Доступ появится после принятия приглашения."
            : "Демоприглашение создано. Партнёр станет доступен после согласования условий."),
        _(),
        T(),
        a === "partner" && showPartnerInviteReady({ id: l, partner: s, subject: String(t.get("invitationMessage") || n), proposedTerms: String(t.get("proposedTerms") || ""), certificateReturn: Z }));
      return;
    }
    if (e.target.id === "link-edit-form") {
      e.preventDefault();
      let t = B(e.target.dataset.id),
        a = new FormData(e.target);
      if (!t || nt(t.kind === "certificate" ? "certificates" : "invitations", t, "rename") || !String(a.get("name")).trim()) return;
      if (t.kind !== "certificate" && a.has("partner")) {
        if (
          !String(a.get("partner")).trim() ||
          !String(a.get("category")).trim()
        )
          return;
        ((t.partner = String(a.get("partner")).trim()),
          (t.category = String(a.get("category")).trim()));
        if (t.invitationMessage && a.has("invitationMessage")) {
          const message = String(a.get("invitationMessage")).trim();
          if (!message) return;
          t.invitationMessage = message;
          t.proposedTerms = String(a.get("proposedTerms") || "").trim();
        }
      }
      ((t.name = String(a.get("name")).trim()),
        _(),
        Ma(),
        Ne(t.id),
        U("Изменения сохранены в карточке."));
      return;
    }
    if (e.target.id === "agent-profile") {
      e.preventDefault();
      let t = new FormData(e.target);
      if (!String(t.get("name")).trim() || !String(t.get("city")).trim())
        return;
      ((i.drafts.agent = { ...i.drafts.agent, ...Object.fromEntries(t) }),
        (i.notice = "Сохранено в макете."),
        R());
      return;
    }
    if (e.target.id === "registration-form") {
      (e.preventDefault(), ct());
      let t = e.target,
        a = [...t.querySelectorAll("[required]")].find((s) => !s.value.trim());
      if (a) {
        ((document.querySelector("#form-error").textContent =
          "Заполните обязательное поле."),
          a.focus());
        return;
      }
      if (!ie().consent) {
        ((document.querySelector("#form-error").textContent =
          "Подтвердите ознакомление с условиями для продолжения макета."),
          t.elements.consent.focus());
        return;
      }
      ((i.screen = !entryState.accepted ? "cabinet" : "entry-ready"),
        (i.page = "home"),
        (i.notice =
          k() && i.invite === "valid"
            ? "Демоприглашение принято. Показаны только назначенные возможности."
            : ""),
        T());
    }
    if (e.target.id === "recommend-form") {
      e.preventDefault();
      let t = new FormData(e.target);
      if (!String(t.get("category")).trim()) return;
      (i.records.push({
        id: crypto.randomUUID(),
        kind: "certificate",
        ...newCertificateIdentity(),
        name: String(t.get("category")),
        partner: t.get("partner"),
        category: t.get("category"),
        createdAt: new Date().toLocaleDateString("ru-RU"),
      }),
        _(),
        (i.page = i.role === "agent" ? "home" : "recommendations"),
        (i.notice =
          i.role === "agent"
            ? "Демосертификат создан. Нажмите \xABПоделиться\xBB, чтобы посмотреть текст для клиента."
            : "Демочерновик сохранён только в этом просмотре. Ссылка никому не отправлена."),
        T());
    }
  }
});
initPartnersRedesign({ E, d, D, r, se, getRole: () => i.role, getDirectory: () => P });
var coop = initCooperationControls({
  escape: r,
  button: d,
  icon: D,
  modal: E,
  close: _,
  refresh: () => {
    Ma();
    T();
  },
  notice: (message) => U(message),
  getPartner: (id) => P.find((partner) => partner.id === id),
  getCatalogPartner: (id) => G.find((partner) => partner.id === id),
  getRole: () => i.role,
  getScreen: () => i.screen,
  getEmployerRole: () => employeeEmployerRole() || (k() && J() ? Y : null),
  getDialog: () => se,
  clearReturnFocus: () => {
    i.returnFocus = null;
  },
  canManageTerms: () => ue(),
  onPaused: (partnerId) => {
    if (C?.partners?.includes(partnerId)) {
      C.partners = C.partners.filter((id) => id !== partnerId);
    }
  },
  openPartner: (partner) => {
    Oa("partners", partner, "partners");
    coop.onPartnerOpened?.(partner.id);
  },
});

initializeEntry(i);
if (["store", "company"].includes(i.role)) Y = i.role;
(function clientAppealsDeepLink() {
  const q = new URLSearchParams(location.search);
  if (q.get("open") !== "clients") return;
  const role = q.get("role");
  if (role && ["store", "company", "agent", "specialist", "employee"].includes(role)) i.role = role;
  i.screen = "cabinet";
  i.page = "clients";
})();
yt();
R();
