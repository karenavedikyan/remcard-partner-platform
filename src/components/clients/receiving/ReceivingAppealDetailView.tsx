"use client";

import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import styles from "../observer/observer.module.css";
import {
  ReceivingAppealHistory,
  type ReceivingAppealHistoryEntry,
} from "./ReceivingAppealHistory";

/** K1 receiving appeal card — server DTO when R3/R7 routes exist (P2 matrix). */
export type ReceivingAppealDetailDto = {
  id: string;
  clientName: string;
  clientContact?: string | null;
  interest?: string | null;
  stageId: string;
  stageLabel: string;
  certificateId?: string | null;
  referrerPartnerName?: string | null;
  sourceLabel?: string | null;
  updatedAt: string;
};

export type ReceivingAppealDetailReady = {
  status: "ready";
  appeal: ReceivingAppealDetailDto;
  history: ReceivingAppealHistoryEntry[];
  /** When true, CRM stage/notes actions stay disabled (observer must never write). */
  readOnly?: boolean;
};

export type ReceivingAppealDetailProps = {
  onBack: () => void;
} & (
  | ReceivingAppealDetailReady
  | { status: "missing"; appealId?: string }
  | { status: "error"; message: string; onRetry?: () => void }
);

export function ReceivingAppealDetailView(props: ReceivingAppealDetailProps) {
  const { onBack } = props;

  return (
    <div className={styles.section} data-testid="ca-receiving-appeal-detail">
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="receiving:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        ← К списку клиентов
      </button>

      {props.status === "missing" ? (
        <section className={styles.blocked} data-testid="ca-receiving-appeal-missing">
          <h2>Обращение не найдено</h2>
          <p className={styles.mutedSmall}>
            {props.appealId
              ? `Обращение «${props.appealId}» недоступно в текущем списке.`
              : "Обращение недоступно в текущем списке."}
          </p>
        </section>
      ) : null}

      {props.status === "error" ? (
        <section className={styles.blocked} data-testid="ca-receiving-appeal-error">
          <h2>Данные обращения недоступны</h2>
          <p className={styles.mutedSmall}>{props.message}</p>
          {props.onRetry ? (
            <button type="button" className={styles.ghostBtn} onClick={props.onRetry}>
              Повторить
            </button>
          ) : null}
        </section>
      ) : null}

      {props.status === "ready" ? (
        <>
          <header className={styles.partnerPageHead}>
            <h2 id="ca-receiving-appeal-title">{props.appeal.clientName}</h2>
            <p className={styles.mutedSmall}>
              Этап: <strong>{props.appeal.stageLabel}</strong>
              {props.readOnly ? " · только просмотр" : ""}
            </p>
          </header>
          <dl className={styles.detailGrid} aria-labelledby="ca-receiving-appeal-title">
            <div>
              <dt>Обращение</dt>
              <dd>
                <code data-testid="ca-receiving-appeal-id">{props.appeal.id}</code>
              </dd>
            </div>
            <div>
              <dt>Контакт</dt>
              <dd>{props.appeal.clientContact?.trim() || "Контакт не указан"}</dd>
            </div>
            <div>
              <dt>Запрос</dt>
              <dd>{props.appeal.interest?.trim() || "—"}</dd>
            </div>
            <div>
              <dt>Источник</dt>
              <dd>{props.appeal.sourceLabel?.trim() || "—"}</dd>
            </div>
            <div>
              <dt>Сертификат</dt>
              <dd>{props.appeal.certificateId?.trim() || "—"}</dd>
            </div>
            <div>
              <dt>Направил</dt>
              <dd>{props.appeal.referrerPartnerName?.trim() || "—"}</dd>
            </div>
            <div>
              <dt>Обновлено</dt>
              <dd>
                <time dateTime={props.appeal.updatedAt}>
                  {formatObserverDateTime(props.appeal.updatedAt)}
                </time>
              </dd>
            </div>
          </dl>
          <ReceivingAppealHistory
            entries={props.history}
            projection="receiving-full"
            emptyLabel="В истории пока нет записей."
          />
          {props.readOnly ? (
            <p className={styles.mutedSmall} data-testid="ca-receiving-appeal-readonly">
              Изменение этапа и внутренние заметки недоступны в режиме наблюдения.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
