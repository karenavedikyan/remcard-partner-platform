"use client";

import { useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import { parseLinkInviteListPayload, type LinkInviteListRow } from "@/lib/link-invite-list";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconCopy, MiniIconExternal } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  partnersSearchUrl: string;
  onBack: () => void;
  /** Dev fixture flows only — skips network link-invite fetch. */
  fixtureInviteLink?: string | null;
};

function pickCopyableInvite(items: LinkInviteListRow[]): string | null {
  const row = items.find((i) => i.canCopyLink && i.previewPath);
  if (!row?.previewPath) return null;
  return `${getAppUrl()}${row.previewPath}`;
}

export function MiniAppInvitePartner({ partnersSearchUrl, onBack, fixtureInviteLink }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyOk, setCopyOk] = useState(false);

  useEffect(() => {
    if (fixtureInviteLink) {
      setLink(fixtureInviteLink);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const raw = await remcardFetch<unknown>("/api/partnership/link-invite");
        const parsed = parseLinkInviteListPayload(raw);
        const rows = parsed
          ? [...parsed.list.active.items, ...parsed.list.archive.items]
          : [];
        const url = pickCopyableInvite(rows);
        if (!cancelled) {
          if (url) setLink(url);
          else {
            setError(
              "Нет активной ссылки для копирования. Создайте приглашение в разделе «Партнёры» полного кабинета.",
            );
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError ? caught.message : "Не удалось получить ссылку",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixtureInviteLink]);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyOk(true);
    } catch {
      setCopyOk(false);
      setError("Не удалось скопировать ссылку");
    }
  }

  return (
    <MiniAppSubpage
      title="Пригласить партнёра"
      lead="Отправьте ссылку коллеге. Он откроет приглашение в RemCard."
      onBack={onBack}
    >
      {loading ? <p>Загрузка…</p> : null}
      {error ? (
        <p className={styles.scanBad} role="alert">
          {error}
        </p>
      ) : null}
      {link ? (
        <>
          <label className={styles.fieldLabel} htmlFor="mini-invite-link">
            Ссылка
          </label>
          <input
            id="mini-invite-link"
            className={styles.readOnlyField}
            readOnly
            value={link}
            data-testid="mini-invite-link"
          />
          <button type="button" className={styles.primaryBtn} onClick={() => void copyLink()}>
            <MiniIconCopy />
            {copyOk ? "Скопировано" : "Скопировать ссылку"}
          </button>
        </>
      ) : null}
      <p className={styles.footnote}>
        Ссылку отправляете вы сами — мини-приложение не рассылает сообщения.
      </p>
      <a className={styles.secondaryBtn} href={partnersSearchUrl} target="_blank" rel="noreferrer">
        <MiniIconExternal />
        Поиск в полном кабинете
      </a>
    </MiniAppSubpage>
  );
}