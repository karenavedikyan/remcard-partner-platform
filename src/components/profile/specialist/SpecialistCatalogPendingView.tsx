"use client";

import Link from "next/link";
import { CatalogPublicationPreview } from "../CatalogPublicationPreview";
import type { ProProfileResponse } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile-save";
import styles from "./SpecialistCatalogPending.module.css";

type Props = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
};

export function SpecialistCatalogPendingView({ profile, draft }: Props) {
  return (
    <div className={styles.root} data-testid="specialist-catalog-pending">
      <section className={styles.hero} aria-labelledby="catalog-pending-title">
        <span className={styles.kicker}>Публикация в каталоге</span>
        <h2 id="catalog-pending-title" className={styles.title}>
          Заявка отправлена
        </h2>
        <span className={styles.waitPill}>
          <span aria-hidden="true" />
          Ожидает подтверждения
        </span>
        <p className={styles.intro}>
          Карточка передана на модерацию. Сейчас она <strong>ещё не опубликована</strong> и не
          видна клиентам в каталоге.
        </p>
        <div className={styles.nextStep}>
          <strong>Что делать дальше?</strong>
          <p>
            Дождитесь решения модератора. Повторно отправлять заявку не нужно. После одобрения
            карточка появится в каталоге.
          </p>
        </div>
      </section>

      <section className={styles.progressPanel} aria-label="Ход заявки">
      <ol className={styles.progress} aria-label="Статус публикации">
        <li data-state="done">
          <span>1</span>
          <div>
            <strong>Заявка отправлена</strong>
            <p className={styles.intro}>Данные карточки сохранены</p>
          </div>
        </li>
        <li data-state="current" aria-current="step">
          <span>2</span>
          <div>
            <strong>Ожидает подтверждения</strong>
            <p className={styles.intro}>Ожидаем решения модератора</p>
          </div>
        </li>
        <li data-state="future">
          <span>3</span>
          <div>
            <strong>Публикация в каталоге</strong>
            <p className={styles.intro}>После одобрения</p>
          </div>
        </li>
      </ol>
      </section>

      <details className={styles.submitted}>
        <summary>Посмотреть отправленную карточку</summary>
        <CatalogPublicationPreview profile={profile} draft={draft} />
      </details>

      <div className={styles.actions}>
        <Link href="/profile?section=basics" className={styles.btn}>
          Вернуться к профилю
        </Link>
      </div>
    </div>
  );
}
