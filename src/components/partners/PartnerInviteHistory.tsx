"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import styles from "./PartnerInviteHistory.module.css";

export type InviteHistoryRow = {
  id: string; status: string; title: string; subtitle?: string;
  createdAt: string; expiresAt: string; acceptedAt?: string | null;
  acceptedName?: string | null; canRecover?: boolean; author: boolean; canDiscuss?: boolean;
};
type Props = {
  kind: "terms" | "discussion"; rows: InviteHistoryRow[];
  onChanged: () => Promise<void>; onOpenDiscussion?: (id: string) => void;
  highlightedId?: string; highlightedRef?: Ref<HTMLLIElement>;
};
const labels: Record<string, string> = {
  PENDING: "Ожидает принятия", ACCEPTED: "Принято", JOINED: "Присоединились",
  REVOKED: "Отозвано", EXPIRED: "Срок истёк",
};
function date(value: string) {
  return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow",
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function PartnerInviteHistory({ kind, rows, onChanged, onOpenDiscussion, highlightedId, highlightedRef }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"archive" | string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shown, setShown] = useState<{ id: string; url: string; repeated: boolean } | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const visible = rows.filter(row => !hidden.includes(row.id));
  const own = visible.filter(row => row.author);
  const ids = selected.filter(id => own.some(row => row.id === id));
  const allSelected = own.length > 0 && ids.length === own.length;
  const base = `/api/partnership/${kind === "terms" ? "link-invite" : "discussion-invite"}`;

  async function run(operation: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setNotice("");
    try { await operation(); }
    catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : "Не удалось выполнить действие"); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  async function showLink(id: string, repeated = false) {
    const result = await remcardFetch<{ ok: boolean; previewPath: string }>(`${base}/${encodeURIComponent(id)}/link`,
      { method: repeated ? "POST" : "GET" });
    if (!result.ok || !/^\/invite\/(?:discussion\/)?[\w-]+$/.test(result.previewPath)) throw new Error("Не удалось получить ссылку");
    if (!mounted.current) return;
    setShown({ id, url: `${getAppUrl()}${result.previewPath}`, repeated });
    setConfirm(null);
    if (repeated) await onChanged();
  }
  async function archive() {
    const saved = [...ids];
    const result = await remcardFetch<{ ok: boolean }>(base, { method: "PATCH", body: { action: "archive", ids: saved } });
    if (!result.ok) throw new Error("Удаление из списка не подтверждено");
    if (!mounted.current) return;
    setHidden(prev => [...prev, ...saved]); setSelected([]); setConfirm(null);
    if (shown && saved.includes(shown.id)) setShown(null);
    setNotice("Записи удалены из списка. Партнёрства и начисления сохранены.");
    await onChanged();
  }
  async function revoke(id: string) {
    const result = await remcardFetch<{ ok: boolean }>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!result.ok) throw new Error("Отзыв ссылки не подтверждён");
    if (!mounted.current) return;
    setConfirm(null); setShown(prev => prev?.id === id ? null : prev);
    setNotice("Ссылка отозвана и больше не действует.");
    await onChanged();
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); if (mounted.current) setNotice("Ссылка скопирована"); }
    catch { if (mounted.current) setNotice("Не удалось скопировать автоматически. Выделите адрес в поле и скопируйте вручную."); }
  }

  return <div className={styles.history} aria-busy={busy}>
    {own.length ? <div className={styles.toolbar}>
      <label className={styles.select}><input type="checkbox" checked={allSelected} disabled={busy}
        onChange={() => { setSelected(allSelected ? [] : own.map(row => row.id)); setConfirm(null); }} />Выбрать все</label>
      <span className={styles.meta}>Выбрано: {ids.length}</span>
      <Button variant="secondary" disabled={!ids.length || busy} onClick={() => setConfirm("archive")}>Удалить из списка</Button>
    </div> : null}
    {confirm === "archive" ? <div className={styles.confirm} role="group" aria-label="Подтверждение удаления из списка">
      <p>Удалить выбранные записи ({ids.length}) из вашего списка? Партнёрства и начисления сохранятся. Непринятые ссылки продолжат действовать: для отмены используйте «Отозвать».</p>
      <div className={styles.actions}>
        <Button disabled={busy || !ids.length} onClick={() => void run(archive)}>Удалить выбранные ({ids.length})</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Отмена</Button>
      </div>
    </div> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {!visible.length ? <p className={styles.meta}>В списке пока нет ссылок.</p> : <ul className={styles.list} data-testid={kind === "discussion" ? "discussion-invite-list" : "link-invite-history-list"}>
      {visible.map(row => {
        const active = highlightedId === row.id;
        const pending = row.status === "PENDING";
        return <li key={row.id} className={styles.row} ref={active ? highlightedRef : undefined}
          data-highlighted={active ? "true" : undefined} data-testid={active ? "discussion-invite-card-active" : undefined}>
          <div className={styles.summary}>
            {row.author ? <input type="checkbox" aria-label={`Выбрать ссылку: ${row.acceptedName || row.title}`}
              disabled={busy} checked={ids.includes(row.id)} onChange={() => {
                setSelected(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id]); setConfirm(null);
              }} /> : null}
            <div className={styles.identity}>
              <strong>{row.acceptedName || row.title}</strong>
              <span className={styles.meta}>{row.acceptedName ? row.title : row.subtitle}</span>
            </div>
            <span className={styles.status} data-accepted={row.status === "ACCEPTED" || row.status === "JOINED" ? "true" : "false"}>{labels[row.status] || row.status}</span>
          </div>
          <div className={styles.details}>
            <span>Создано {date(row.createdAt)}</span>
            <span>{row.acceptedAt ? `${kind === "terms" ? "Принято" : "Присоединились"} ${date(row.acceptedAt)}` : `Действует до ${date(row.expiresAt)}`}</span>
          </div>
          <div className={styles.actions}>
            {row.author && pending ? <>
              <Button variant="text" disabled={busy} onClick={() => row.canRecover
                ? void run(() => showLink(row.id)) : setConfirm(`repeat:${row.id}`)}>
                {row.canRecover ? "Показать ссылку" : "Создать повторную ссылку"}
              </Button>
              <Button variant="text" disabled={busy} onClick={() => setConfirm(`revoke:${row.id}`)}>Отозвать</Button>
            </> : null}
            {row.canDiscuss && onOpenDiscussion ? <Button variant="text" onClick={() => onOpenDiscussion(row.id)}>Открыть обсуждение</Button> : null}
          </div>
          {confirm === `repeat:${row.id}` ? <div className={styles.confirm}>
            <p>У старого приглашения сохранён только необратимый хеш. Создать новую ссылку с теми же условиями? Ранее отправленная ссылка останется действующей.</p>
            <div className={styles.actions}>
              <Button disabled={busy} onClick={() => void run(() => showLink(row.id, true))}>Создать повторную</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Отмена</Button>
            </div>
          </div> : null}
          {confirm === `revoke:${row.id}` ? <div className={styles.confirm}>
            <p>Отозвать приглашение? По отправленной ссылке больше нельзя будет присоединиться.</p>
            <div className={styles.actions}>
              <Button disabled={busy} onClick={() => void run(() => revoke(row.id))}>Подтвердить отзыв</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Отмена</Button>
            </div>
          </div> : null}
          {shown?.id === row.id ? <div className={styles.link}>
            <label>{shown.repeated ? "Новая ссылка для повторной отправки" : "Ссылка для повторной отправки"}
              <input readOnly value={shown.url} onFocus={event => event.currentTarget.select()} />
            </label>
            <Button variant="secondary" disabled={busy} onClick={() => void copy(shown.url)}>Скопировать ссылку</Button>
          </div> : null}
        </li>;
      })}
    </ul>}
  </div>;
}
