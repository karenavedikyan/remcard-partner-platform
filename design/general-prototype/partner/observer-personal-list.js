// Personal organisation of demo referrals. Never mutates partner appeals or ledger.
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const BUCKETS = { active: "Активные", archived: "Архив", trash: "Корзина" };

export function observerPersonalState(workspace) {
  return workspace.observerPersonal ||= {
    meta: {}, selected: [], bucket: "active", layout: "partners",
    panel: null, lastChange: null, notice: "",
  };
}

export function observerPersonalMeta(workspace, id) {
  return observerPersonalState(workspace).meta[id] || {};
}

export function observerPersonalBucket(workspace, row) {
  return observerPersonalMeta(workspace, row.id).bucket || "active";
}

export function clearObserverPersonalSelection(workspace) {
  const p = observerPersonalState(workspace);
  p.selected = [];
  p.panel = null;
}

export function renderObserverPersonalRow(workspace, row, { partnerName, status, date }) {
  const p = observerPersonalState(workspace), m = p.meta[row.id] || {};
  const name = m.alias || row.clientName;
  return `<div class="ca-personal-row" data-personal-row="${escapeHtml(row.id)}" data-selected="${p.selected.includes(row.id)}">
    <label class="ca-personal-check"><input type="checkbox" data-observer-id="${escapeHtml(row.id)}" ${p.selected.includes(row.id) ? "checked" : ""} aria-label="Выбрать: ${escapeHtml(name)}"></label>
    <button type="button" class="ca-personal-open" data-testid="ca-observer-client-row" data-ca-action="observer:client:${escapeHtml(row.id)}">
      <strong>${escapeHtml(name)}</strong>
      ${m.alias && m.alias !== row.clientName ? `<span class="small muted">У партнёра: ${escapeHtml(row.clientName)}</span>` : ""}
      <span class="small muted">${escapeHtml(partnerName)} · ${escapeHtml(row.interest || row.certificateId || "")}</span>
      ${m.tag ? `<span class="ca-personal-tag">${escapeHtml(m.tag)}</span>` : ""}
      ${m.note ? `<span class="small ca-personal-note">${escapeHtml(m.note)}</span>` : ""}
    </button>
    <div class="ca-personal-status">${status}<time class="small muted">${escapeHtml(date)}</time></div>
    ${p.bucket !== "trash" ? `<button type="button" class="btn ghost small-btn" data-observer-action="edit:${escapeHtml(row.id)}" aria-label="Редактировать личную запись: ${escapeHtml(name)}">Изменить</button>` : ""}
  </div>`;
}

export function renderObserverPersonalTools(workspace, visible, base, { showLayout = true } = {}) {
  const p = observerPersonalState(workspace);
  const visibleIds = new Set(visible.map(a => a.id));
  p.selected = p.selected.filter(id => visibleIds.has(id));
  const n = p.selected.length;
  const counts = Object.fromEntries(Object.keys(BUCKETS).map(bucket =>
    [bucket, base.filter(a => observerPersonalBucket(workspace, a) === bucket).length]));
  let panel = "";
  if (p.panel?.kind === "move") {
    const trash = p.panel.target === "trash";
    panel = `<section class="panel ca-personal-confirm" role="region" aria-label="Подтверждение действия">
      <h3>${trash ? "Удалить только из своего списка?" : "Перенести в архив?"}</h3>
      <p>Выбрано записей: ${p.panel.ids.length}. ${trash ? "Они попадут в вашу корзину, откуда их можно восстановить." : "Они останутся доступны во вкладке «Архив»."} Данные, статусы и покупки у партнёров не изменятся.</p>
      <div class="ca-personal-actions"><button type="button" class="btn ghost" data-observer-action="cancel">Отмена</button><button type="button" class="btn primary" data-observer-action="confirm">${trash ? "Удалить у себя" : "В архив"}</button></div>
    </section>`;
  } else if (p.panel?.kind === "edit") {
    const ids = p.panel.ids, single = ids.length === 1;
    const row = base.find(a => a.id === ids[0]), m = p.meta[ids[0]] || {};
    panel = `<form class="panel ca-personal-edit" data-observer-personal-edit>
      <h3>${single ? "Личная запись о клиенте" : `Метка для ${ids.length} записей`}</h3>
      <p class="small muted">Видно только вам. ${single ? "Исходное имя, контакты и статус у партнёра не меняются." : "Метка заменится у выбранных записей. Имена и заметки останутся прежними."}</p>
      ${single ? `<label class="field">Имя для себя<input name="alias" maxlength="100" value="${escapeHtml(m.alias || row?.clientName || "")}"></label>` : ""}
      <label class="field">${single ? "Метка" : "Общая метка"}<input name="tag" maxlength="40" value="${escapeHtml(single ? m.tag || "" : "")}" placeholder="Например: связаться в пятницу"></label>
      ${single ? `<label class="field">Личная заметка<textarea name="note" rows="3" maxlength="1000">${escapeHtml(m.note || "")}</textarea></label>` : `<p class="small muted">Пустое поле удалит метку у выбранных записей.</p>`}
      <div class="ca-personal-actions"><button type="button" class="btn ghost" data-observer-action="cancel">Отмена</button><button type="submit" class="btn primary">${single ? "Сохранить для себя" : `Применить к ${ids.length} записям`}</button></div>
    </form>`;
  }
  return `<section class="ca-observer-tools" data-testid="ca-observer-personal-tools" aria-label="Управление своим списком">
    <div class="ca-personal-top">
      <div class="ca-personal-buckets" role="group" aria-label="Ваш список">${Object.entries(BUCKETS).map(([bucket, label]) => `<button type="button" class="btn ghost small-btn" data-observer-action="bucket:${bucket}" aria-pressed="${p.bucket === bucket}">${label} <span>${counts[bucket]}</span></button>`).join("")}</div>
      ${showLayout ? `<div class="ca-personal-layout" role="group" aria-label="Вид списка"><button type="button" class="btn ghost small-btn" data-observer-action="layout:partners" aria-pressed="${p.layout === "partners"}">По партнёрам</button><button type="button" class="btn ghost small-btn" data-observer-action="layout:list" aria-pressed="${p.layout === "list"}">Списком</button></div>` : ""}
    </div>
    <p class="small muted ca-personal-scope">Личные списки и заметки не меняют данные партнёров. Демо: изменения до обновления страницы.</p>
    </section>
    <div class="ca-personal-toolbar">
      <label class="ca-personal-check"><input type="checkbox" data-observer-select-all ${visible.length && n === visible.length ? "checked" : ""} ${visible.length ? "" : "disabled"}>Все найденные (${visible.length})</label>
      <strong class="small" role="status">Выбрано: ${n}</strong>
      ${n ? `<div class="ca-personal-actions">
        ${p.bucket !== "trash" ? `<button type="button" class="btn ghost small-btn" data-observer-action="edit">Редактировать</button>` : ""}
        ${p.bucket === "active" ? `<button type="button" class="btn ghost small-btn" data-observer-action="move:archived">В архив</button>` : `<button type="button" class="btn ghost small-btn" data-observer-action="restore">Восстановить</button>`}
        ${p.bucket !== "trash" ? `<button type="button" class="btn ghost small-btn" data-observer-action="move:trash">Удалить у себя</button>` : ""}
        <button type="button" class="btn ghost small-btn" data-observer-action="clear">Снять выбор</button>
      </div>` : `<span class="small muted">Выберите клиента, группу партнёра или все найденные записи.</span>`}
    </div>
    ${p.notice ? `<div class="ca-personal-notice" role="status"><span>${escapeHtml(p.notice)}</span>${p.lastChange ? `<button type="button" class="btn ghost small-btn" data-observer-action="undo">Отменить действие</button>` : ""}</div>` : ""}
    ${panel}`;
}

export function hydrateObserverPersonal(root, workspace, { visibleRows, baseRows, refresh }) {
  if (!root.querySelector("[data-testid=ca-observer-personal-tools]") || root.dataset.observerPersonalBound) return;
  root.dataset.observerPersonalBound = "1";
  const p = observerPersonalState(workspace);
  const editForm = root.querySelector("[data-observer-personal-edit]");
  if (editForm) {
    editForm.scrollIntoView({ block: "nearest" });
    editForm.querySelector("input")?.focus({ preventScroll: true });
  }
  const currentIds = () => new Set(visibleRows().map(a => a.id));
  function apply(ids, mutate, notice) {
    const allowed = currentIds();
    ids = ids.filter(id => allowed.has(id));
    if (!ids.length) return;
    p.lastChange = Object.fromEntries(ids.map(id => [id, p.meta[id] ? { ...p.meta[id] } : null]));
    ids.forEach(id => { p.meta[id] = mutate({ ...(p.meta[id] || {}) }); });
    p.panel = null;
    p.selected = [];
    p.notice = `${notice}: ${ids.length}.`;
    refresh();
  }
  root.querySelector("[data-observer-select-all]")?.setAttribute("aria-checked",
    p.selected.length && p.selected.length < visibleRows().length ? "mixed" : String(!!p.selected.length));
  const all = root.querySelector("[data-observer-select-all]");
  if (all) all.indeterminate = p.selected.length > 0 && p.selected.length < visibleRows().length;
  root.querySelectorAll("[data-observer-group]").forEach(input => {
    const ids = visibleRows().filter(a => a.receivingPartnerId === input.dataset.observerGroup).map(a => a.id);
    const n = ids.filter(id => p.selected.includes(id)).length;
    input.checked = !!ids.length && n === ids.length;
    input.indeterminate = n > 0 && n < ids.length;
  });
  root.addEventListener("change", e => {
    const input = e.target, visible = visibleRows();
    let ids;
    if (input.matches("[data-observer-id]")) ids = [input.dataset.observerId];
    else if (input.matches("[data-observer-select-all]")) ids = visible.map(a => a.id);
    else if (input.matches("[data-observer-group]")) ids = visible.filter(a => a.receivingPartnerId === input.dataset.observerGroup).map(a => a.id);
    else return;
    const selected = new Set(p.selected), allowed = currentIds();
    ids.filter(id => allowed.has(id)).forEach(id => input.checked ? selected.add(id) : selected.delete(id));
    p.selected = [...selected];
    p.panel = null;
    refresh();
  });
  root.addEventListener("click", e => {
    const button = e.target.closest("[data-observer-action]");
    if (!button || !root.contains(button)) return;
    const [action, value] = button.dataset.observerAction.split(":");
    const ids = p.selected.filter(id => currentIds().has(id));
    if (action === "bucket" && Object.hasOwn(BUCKETS, value)) {
      p.bucket = value; clearObserverPersonalSelection(workspace);
    } else if (action === "layout") {
      p.layout = value === "list" ? "list" : "partners"; p.panel = null;
    } else if (action === "clear") {
      clearObserverPersonalSelection(workspace);
    } else if (action === "cancel") {
      p.panel = null;
    } else if (action === "edit" && p.bucket !== "trash") {
      const editIds = value ? [value].filter(id => currentIds().has(id)) : ids;
      if (!editIds.length) return;
      p.panel = { kind: "edit", ids: editIds };
    } else if (action === "move" && ids.length && ["archived", "trash"].includes(value)) {
      p.panel = { kind: "move", target: value, ids: [...ids] };
    } else if (action === "confirm" && p.panel?.kind === "move") {
      const target = p.panel.target;
      apply(p.panel.ids, m => ({ ...m, bucket: target,
        beforeTrash: target === "trash" ? m.bucket || "active" : m.beforeTrash }),
      target === "trash" ? "Удалено только у вас" : "Перенесено в архив");
      return;
    } else if (action === "restore" && ids.length) {
      apply(ids, m => ({ ...m, bucket: m.bucket === "trash" ? m.beforeTrash || "active" : "active" }), "Восстановлено");
      return;
    } else if (action === "undo" && p.lastChange) {
      const ownedIds = new Set(baseRows().map(a => a.id));
      for (const [id, previous] of Object.entries(p.lastChange)) {
        if (!ownedIds.has(id)) continue;
        if (previous) p.meta[id] = previous;
        else delete p.meta[id];
      }
      p.lastChange = null; p.notice = "Последнее действие отменено.";
      clearObserverPersonalSelection(workspace);
    } else return;
    refresh();
  });
  root.addEventListener("submit", e => {
    if (!e.target.matches("[data-observer-personal-edit]")) return;
    e.preventDefault();
    if (p.panel?.kind !== "edit") return;
    const data = new FormData(e.target), ids = p.panel.ids;
    const tag = String(data.get("tag") || "").trim().slice(0, 40);
    apply(ids, m => ids.length === 1
      ? { ...m, tag, alias: String(data.get("alias") || "").trim().slice(0, 100), note: String(data.get("note") || "").trim().slice(0, 1000) }
      : { ...m, tag }, "Личные данные сохранены");
  });
}
