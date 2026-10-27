"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  applyPartnerLifecycle,
  fetchPartnerRegistry,
  previewPartnerLifecycle,
  type PartnerRegistryItem,
} from "@/lib/prof-admin-partners-api";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

export function AdminPartnersClient() {
  const [items, setItems] = useState<PartnerRegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [registration, setRegistration] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [city, setCity] = useState("");
  const [catalog, setCatalog] = useState("");
  const [archived, setArchived] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartnerRegistryItem | null>(null);
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [reason, setReason] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const loadVersion = useRef(0);

  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const version = ++loadVersion.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (registration) params.set("registration", registration);
        if (partnerType) params.set("partnerType", partnerType);
        if (city.trim()) params.set("city", city.trim());
        if (catalog === "visible") params.set("catalogHidden", "false");
        if (catalog === "hidden") params.set("catalogHidden", "true");
        if (catalog === "not_public") params.set("catalogVisibility", "not_public");
        if (archived) params.set("projectArchived", archived);
        if (cursor) params.set("cursor", cursor);
        const data = await fetchPartnerRegistry(params);
        if (version !== loadVersion.current) return;
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setNextCursor(data.nextCursor);
      } catch (e) {
        if (version === loadVersion.current) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (version === loadVersion.current) { setLoading(false); setLoadingMore(false); }
      }
    },
    [q, registration, partnerType, city, catalog, archived],
  );

  useEffect(() => {
    setItems([]);
    setSelected(null);
    setPendingPreview(null);
    setNextCursor(null);
    void loadPage(null, false);
  }, [loadPage]);

  async function requestPreview(action: string) {
    if (!selected) return;
    setError(null);
    if (!reason.trim()) {
      setError("Укажите причину перед получением preview");
      return;
    }
    try {
      const preview = await previewPartnerLifecycle(selected.id, action);
      setPendingPreview({
        action, effects: preview.preview.effects, warnings: preview.preview.warnings,
        confirmToken: preview.preview.confirmToken,
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка проверки"); }
  }

  async function confirmApply() {
    if (!selected || !pendingPreview || isApplying) return;
    setError(null);
    setIsApplying(true);
    try {
      await applyPartnerLifecycle(
        selected.id,
        pendingPreview.action,
        reason.trim(),
        pendingPreview.confirmToken,
      );
      setPendingPreview(null);
      setReason("");
      setSelected(null);
      await loadPage(null, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка применения");
    } finally {
      setIsApplying(false);
    }
  }

  function cancelPreview() {
    setPendingPreview(null);
  }
  function selectPartner(row: PartnerRegistryItem) {
    setSelected(row); setPendingPreview(null); setReason(""); setError(null);
  }

  return (
    <div>
      <h1>Партнёры (реестр)</h1>
      <p>
        Всего по фильтру: {total}. Показано: {items.length}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Поиск партнёров"
        />
        <select
          value={registration}
          onChange={(e) => setRegistration(e.target.value)}
          aria-label="Регистрация"
        >
          <option value="">Все</option>
          <option value="active">Активный</option>
          <option value="demo">Демо</option>
        </select>
        <select aria-label="Тип партнёра" value={partnerType} onChange={e => setPartnerType(e.target.value)}>
          <option value="">Все типы партнёров</option><option value="AGENT">Агент</option><option value="MASTER">Специалист</option><option value="STORE">Магазин</option><option value="COMPANY">Компания</option>
        </select>
        <input aria-label="Город" placeholder="Город" value={city} onChange={e => setCity(e.target.value)} />
        <select aria-label="Видимость в каталоге" value={catalog} onChange={e => setCatalog(e.target.value)}>
          <option value="">Вся видимость</option><option value="visible">Виден в каталоге</option><option value="hidden">Скрыт администратором</option><option value="not_public">Не виден в каталоге</option>
        </select>
        <select aria-label="Архив" value={archived} onChange={e => setArchived(e.target.value)}>
          <option value="">Все профили</option><option value="false">Не архивные</option><option value="true">В архиве</option>
        </select>
        <button type="button" onClick={() => void loadPage(null, false)}>
          Обновить
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Тип</th>
            <th>Город / организация</th>
            <th>Регистрация</th>
            <th>Видимость на remcard.ru</th>
            <th>Профиль и действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <Fragment key={row.id}><tr>
              <td>{row.displayName ?? row.id}</td>
              <td>{row.partnerKind ? ({agent:"Агент",specialist:"Специалист",store:"Магазин",company:"Компания"}[row.partnerKind]) : ({MASTER:"Специалист",STORE:"Магазин",COMPANY:"Компания",AGENT:"Агент"}[row.partnerType ?? ""] ?? "Не указан")}</td>
              <td>{row.city ?? "—"}<br />{row.organizationName}</td>
              <td>{row.registrationLabel === "ACTIVE" ? "Активный" : "Демо"}</td>
              <td>{row.lifecycle?.projectArchivedAt ? "В архиве" : row.lifecycle?.catalogHiddenAt ? "Скрыт" : row.catalogVisibility === "VISIBLE" ? "Виден в каталоге" : "Не опубликован"}
                {row.publicCatalogLinks?.map(link => /^\/(partner\/|catalog\/org\/|catalog\/branch\/)/.test(link.path) && <div key={link.path}><a href={`https://remcard.ru${link.path}`} target="_blank" rel="noopener noreferrer">На remcard.ru: {link.label}</a></div>)}
              </td>
              <td>
                <a href={`/admin/moderation/partners/${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer">Открыть профиль</a>
                {row.organizations?.map(org => <div key={org.id}><a href={`/admin/moderation/organizations/${encodeURIComponent(org.id)}`} target="_blank" rel="noopener noreferrer">Профиль организации: {org.name}</a></div>)}
                <div style={{display:"flex",gap:8,marginTop:8}}><button type="button" aria-expanded={selected?.id === row.id} onClick={() => selectPartner(row)}>
                  Действия
                </button><button type="button" onClick={() => selectPartner(row)} style={{color:"var(--danger, #b91c1c)"}}>Удалить</button></div>
              </td>
            </tr>{selected?.id === row.id && <tr><td colSpan={6}>
              <div role="region" aria-label={`Управление партнёром ${row.displayName ?? row.id}`} style={{padding:"1rem",border:"1px solid var(--border)"}}>
                <h2>{selected.displayName}</h2>
                <p>Удаление обратимое: можно убрать карточки из каталога или архивировать профиль. История сохраняется, клиентский аккаунт не удаляется.</p>
                <textarea aria-label="Причина" rows={3} placeholder="Причина" value={reason} onChange={e => {setReason(e.target.value);cancelPreview();}} style={{width:"100%"}} />
                {pendingPreview && <div role="dialog" aria-label="Подтверждение изменения">
                  <p>{[...pendingPreview.effects,...pendingPreview.warnings].join(" ")}</p>
                  <button type="button" disabled={isApplying} onClick={() => void confirmApply()}>{isApplying ? "Применение…" : "Подтвердить"}</button>
                  <button type="button" disabled={isApplying} onClick={cancelPreview}>Отмена</button>
                </div>}
                {!pendingPreview && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button type="button" onClick={() => void requestPreview("hide_catalog")}>Убрать из каталога</button>
                  <button type="button" onClick={() => void requestPreview("publish_catalog")}>Вернуть в каталог</button>
                  <button type="button" onClick={() => void requestPreview("archive_project")}>В архив проекта</button>
                  <button type="button" onClick={() => void requestPreview("restore_project")}>Восстановить профиль</button>
                </div>}
                <button type="button" disabled={isApplying} onClick={() => {setSelected(null);cancelPreview();}}>Закрыть</button>
              </div>
            </td></tr>}</Fragment>
          ))}
        </tbody>
      </table>
      {nextCursor ? (
        <button
          type="button"
          aria-label="Загрузить ещё"
          disabled={loadingMore}
          onClick={() => void loadPage(nextCursor, true)}
          style={{ marginTop: "1rem" }}
        >
          {loadingMore ? "Загрузка…" : "Загрузить ещё"}
        </button>
      ) : null}
    </div>
  );
}
