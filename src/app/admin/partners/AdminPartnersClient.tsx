"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./AdminPartners.module.css";
import type { PartnerRegistryFacets } from "@/lib/prof-admin-management-api";
import {
  applyPartnerLifecycle,
  fetchPartnerRegistry,
  previewPartnerLifecycle,
  type PartnerRegistryItem,
} from "@/lib/prof-admin-partners-api";
import { AdminPartnersMetricsBar } from "./AdminPartnersMetricsBar";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

export function AdminPartnersClient() {
  const [items, setItems] = useState<PartnerRegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<PartnerRegistryFacets | null>(null);
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
        setFacets(data.facets ?? null);
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
    <div className={styles.registry}>
      <div className={styles.heading}>
      <h1>Партнёры (реестр)</h1>
      <p>Показано на странице: {items.length}</p>
      </div>
      <AdminPartnersMetricsBar
        facets={facets}
        matchedTotal={total}
        partnerType={partnerType}
        registration={registration}
        catalog={catalog}
        archived={archived}
        onPartnerType={setPartnerType}
        onRegistration={setRegistration}
        onCatalog={setCatalog}
        onArchived={setArchived}
      />
      <div className={styles.filters}>
        <label className={styles.field}>Поиск партнёров
        <input
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Поиск партнёров"
        />
        </label>
        <label className={styles.field}>Регистрация
        <select
          value={registration}
          onChange={(e) => setRegistration(e.target.value)}
          aria-label="Регистрация"
        >
          <option value="">Все</option>
          <option value="active">Активный</option>
          <option value="demo">Демо</option>
        </select>
        </label>
        <label className={styles.field}>Тип партнёра
        <select aria-label="Тип партнёра" value={partnerType} onChange={e => setPartnerType(e.target.value)}>
          <option value="">Все типы партнёров</option><option value="AGENT">Агент</option><option value="MASTER">Специалист</option><option value="STORE">Магазин</option><option value="COMPANY">Компания</option>
        </select>
        </label>
        <label className={styles.field}>Город<input aria-label="Город" placeholder="Например, Краснодар" value={city} onChange={e => setCity(e.target.value)} /></label>
        <label className={styles.field}>Видимость в каталоге
        <select aria-label="Видимость в каталоге" value={catalog} onChange={e => setCatalog(e.target.value)}>
          <option value="">Вся видимость</option><option value="visible">Виден в каталоге</option><option value="hidden">Скрыт администратором</option><option value="not_public">Не виден в каталоге</option>
        </select>
        </label>
        <label className={styles.field}>Архив
        <select aria-label="Архив" value={archived} onChange={e => setArchived(e.target.value)}>
          <option value="">Все профили</option><option value="false">Не архивные</option><option value="true">В архиве</option>
        </select>
        </label>
        <div className={styles.filterActions}><Button variant="secondary" onClick={() => void loadPage(null, false)}>
          Обновить
        </Button></div>
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {loading ? <p role="status">Загрузка…</p> : null}
      <div className={styles.tableWrap}><table className={styles.table} aria-label="Реестр партнёров" aria-busy={loading}>
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
          {items.map((row) => {
            const publicLinks = (row.publicCatalogLinks ?? []).filter(link => /^\/(partner\/|catalog\/org\/|catalog\/branch\/)/.test(link.path));
            return (
            <Fragment key={row.id}><tr>
              <td data-label="Имя">{row.displayName ?? row.id}</td>
              <td data-label="Тип">{row.partnerKind ? ({agent:"Агент",specialist:"Специалист",store:"Магазин",company:"Компания"}[row.partnerKind]) : ({MASTER:"Специалист",STORE:"Магазин",COMPANY:"Компания",AGENT:"Агент"}[row.partnerType ?? ""] ?? "Не указан")}</td>
              <td data-label="Город / организация">{row.city ?? "—"}<br />{row.organizationName}</td>
              <td data-label="Регистрация"><span className={`${styles.badge} ${row.registrationLabel === "ACTIVE" ? styles.visible : ""}`}>{row.registrationLabel === "ACTIVE" ? "Активный" : "Демо"}</span></td>
              <td data-label="Видимость на remcard.ru"><span className={`${styles.badge} ${!row.lifecycle?.projectArchivedAt && !row.lifecycle?.catalogHiddenAt && row.catalogVisibility === "VISIBLE" ? styles.visible : styles.inactive}`}>{row.lifecycle?.projectArchivedAt ? "В архиве" : row.lifecycle?.catalogHiddenAt ? "Скрыт" : row.catalogVisibility === "VISIBLE" ? "Виден в каталоге" : "Не опубликован"}</span>
                <div className={styles.publicLinks}>{publicLinks.slice(0,1).map(link => <a key={link.path} href={`https://remcard.ru${link.path}`} target="_blank" rel="noopener noreferrer">На remcard.ru: {link.label}</a>)}
                  {publicLinks.length > 1 && <details className={styles.moreLinks}><summary>Ещё карточки: {publicLinks.length - 1}</summary><div className={styles.publicLinks}>{publicLinks.slice(1).map(link => <a key={link.path} href={`https://remcard.ru${link.path}`} target="_blank" rel="noopener noreferrer">На remcard.ru: {link.label}</a>)}</div></details>}
                </div>
              </td>
              <td data-label="Профиль и действия">
                <div className={styles.profileLinks}>
                <a href={`/admin/moderation/partners/${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer">Открыть профиль</a>
                {row.organizations?.map(org => <div key={org.id}><a href={`/admin/moderation/organizations/${encodeURIComponent(org.id)}`} target="_blank" rel="noopener noreferrer">Профиль организации: {org.name}</a></div>)}
                </div>
                <div className={styles.actions}><Button variant="secondary" aria-expanded={selected?.id === row.id} onClick={() => selectPartner(row)}>
                  Действия
                </Button><Button variant="secondary" onClick={() => selectPartner(row)} className={styles.danger}>Удалить</Button></div>
              </td>
            </tr>{selected?.id === row.id && <tr className={styles.managementRow}><td colSpan={6}>
              <div role="region" aria-label={`Управление партнёром ${row.displayName ?? row.id}`} className={styles.management}>
                <h2>{selected.displayName}</h2>
                <p>Удаление обратимое: можно убрать карточки из каталога или архивировать профиль. История сохраняется, клиентский аккаунт не удаляется.</p>
                <label className={styles.field}>Причина изменения<textarea aria-label="Причина" rows={3} placeholder="Причина" value={reason} onChange={e => {setReason(e.target.value);cancelPreview();}} /></label>
                {pendingPreview && <div role="dialog" aria-label="Подтверждение изменения" className={styles.confirmation}>
                  <p>{[...pendingPreview.effects,...pendingPreview.warnings].join(" ")}</p>
                  <div className={styles.actions}><Button disabled={isApplying} onClick={() => void confirmApply()}>{isApplying ? "Применение…" : "Подтвердить"}</Button>
                  <Button variant="secondary" disabled={isApplying} onClick={cancelPreview}>Отмена</Button></div>
                </div>}
                {!pendingPreview && <div className={styles.actions}>
                  <Button variant="secondary" className={styles.danger} onClick={() => void requestPreview("hide_catalog")}>Убрать из каталога</Button>
                  <Button variant="secondary" onClick={() => void requestPreview("publish_catalog")}>Вернуть в каталог</Button>
                  <Button variant="secondary" className={styles.danger} onClick={() => void requestPreview("archive_project")}>В архив проекта</Button>
                  <Button variant="secondary" onClick={() => void requestPreview("restore_project")}>Восстановить профиль</Button>
                </div>}
                <Button variant="text" className={styles.close} disabled={isApplying} onClick={() => {setSelected(null);cancelPreview();}}>Закрыть</Button>
              </div>
            </td></tr>}</Fragment>
          );})}
        </tbody>
      </table>{!loading && !error && items.length === 0 && <p className={styles.empty}>Партнёры не найдены. Измените условия поиска.</p>}</div>
      {nextCursor ? (
        <Button
          variant="secondary"
          aria-label="Загрузить ещё"
          disabled={loadingMore}
          onClick={() => void loadPage(nextCursor, true)}
          className={styles.loadMore}
        >
          {loadingMore ? "Загрузка…" : "Загрузить ещё"}
        </Button>
      ) : null}
    </div>
  );
}
