"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  buildCounterpartyProfileView,
  counterpartyContactKindLabel,
} from "@/lib/partners/build-counterparty-profile-view";
import type { Partnership } from "@/lib/types";
import styles from "./CounterpartyProfile.module.css";

type Props = {
  partnership: Partnership;
  listPrincipalId: string;
};

const EMPTY_DIRECTION = "Не указано";

function ChipList({ items, emptyCopy }: { items: string[]; emptyCopy: string }) {
  if (!items.length) {
    return <p className={styles.muted}>{emptyCopy}</p>;
  }
  return (
    <div className={styles.chips}>
      {items.map((item) => (
        <span key={item} className={styles.chip}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function CounterpartyProfile({ partnership, listPrincipalId }: Props) {
  const view = buildCounterpartyProfileView(partnership, listPrincipalId);
  const inputId = useId();
  const idInputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<"" | "ok" | "fail">("");

  const copyPublicId = useCallback(async () => {
    if (!view.publicId) return;
    setCopyStatus("");
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(view.publicId);
      setCopyStatus("ok");
    } catch {
      setCopyStatus("fail");
      const field = idInputRef.current;
      if (field) {
        field.focus();
        field.select();
      }
    }
  }, [view.publicId]);

  const idFieldValue = view.publicId ?? "ID недоступен";

  return (
    <div className={styles.root} data-testid="counterparty-profile">
      <section className={styles.summary} data-testid="pw-summary">
        <div className={styles.summaryHeader}>
          <div className={styles.avatar} aria-hidden={Boolean(view.photoUrl)}>
            {view.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.photoUrl} alt="" />
            ) : (
              view.avatarInitials
            )}
          </div>
          <div className={styles.identity}>
            <span className={styles.kicker}>{view.typeLabel}</span>
            <p className={styles.summaryName}>{view.displayName}</p>
            <p className={styles.cityMuted}>{view.cityLine}</p>
            {view.organizationLine ? (
              <p className={styles.metaLine}>
                Официально: <strong>{view.organizationLine}</strong>
              </p>
            ) : null}
            {view.personalAliasLine ? (
              <p className={styles.metaLine}>
                Временное имя (видно только вам): <strong>{view.personalAliasLine}</strong>
              </p>
            ) : null}
          </div>
          <span className={styles.status}>{view.cooperationStatusLabel}</span>
        </div>
        <div className={styles.summaryId}>
          <label htmlFor={inputId}>ID партнёра</label>
          <div className={styles.idRow}>
            <input
              ref={idInputRef}
              id={inputId}
              className={styles.idInput}
              type="text"
              readOnly
              value={idFieldValue}
              data-testid="counterparty-profile-public-id"
              aria-label="ID партнёра"
            />
            <Button
              type="button"
              variant="secondary"
              className={styles.copyBtn}
              disabled={!view.publicId}
              onClick={() => void copyPublicId()}
              data-testid="counterparty-profile-copy-id"
            >
              Копировать
            </Button>
          </div>
          <p
            className={`${styles.copyStatus} ${copyStatus === "ok" ? styles.copyStatusOk : ""}`}
            role="status"
            aria-live="polite"
            data-testid="counterparty-profile-copy-status"
          >
            {copyStatus === "ok"
              ? "ID скопирован"
              : copyStatus === "fail"
                ? "Не удалось скопировать — выделите ID и скопируйте вручную"
                : ""}
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="cp-about">
        <h3 id="cp-about">О партнёре</h3>
        <p className={view.about.mode === "no-contract" ? styles.muted : undefined}>{view.about.text}</p>
      </section>

      <section className={styles.section} aria-labelledby="cp-directions">
        <h3 id="cp-directions">Направления работы</h3>
        <p className={styles.directionLabel}>Товары</p>
        <ChipList items={view.products} emptyCopy={EMPTY_DIRECTION} />
        <p className={styles.directionLabel}>Услуги</p>
        <ChipList items={view.services} emptyCopy={EMPTY_DIRECTION} />
        <p className={styles.directionLabel}>Этапы ремонта</p>
        <ChipList items={view.renovationStages} emptyCopy={EMPTY_DIRECTION} />
      </section>

      <section className={styles.section} aria-labelledby="cp-geo">
        <h3 id="cp-geo">География</h3>
        {view.geography.mode === "no-contract" ? (
          <p className={styles.muted}>Нет данных для отображения</p>
        ) : view.geography.items.length ? (
          <ul>
            {view.geography.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>Не указано</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="cp-contact">
        <h3 id="cp-contact">Контакт для сотрудничества</h3>
        {view.contact.mode === "no-contract" ? (
          <p className={styles.muted}>Нет данных для отображения</p>
        ) : view.contact.mode === "partner-empty" ? (
          <p className={styles.muted}>Партнёр пока не добавил контакт для сотрудничества.</p>
        ) : (
          <ul>
            {view.contact.lines.map((line) => (
              <li key={`${line.kind}-${line.value}`}>
                <strong>{counterpartyContactKindLabel(line.kind)}:</strong> {line.value}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={`${styles.section} ${styles.cooperation}`}
        aria-labelledby="cp-coop"
        data-testid="counterparty-profile-cooperation"
      >
        <h3 id="cp-coop">Ваше сотрудничество</h3>
        <ul>
          <li>С {view.cooperationSince}</li>
          <li>{view.cooperationTermsSummary}</li>
        </ul>
      </section>
    </div>
  );
}
