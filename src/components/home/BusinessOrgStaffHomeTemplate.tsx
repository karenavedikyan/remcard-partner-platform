"use client";

import Link from "next/link";
import { businessHomeCopy, type BusinessHomePartnerType } from "@/lib/business-home/copy";
import { IconArrowRight } from "@/components/layout/ThemeIcons";
import styles from "./SpecialistHomeDashboard.module.css";

/** Shared store/company home chrome without owner metrics or profile onboarding calls. */
export function BusinessOrgStaffHomeTemplate({
  partnerType,
}: {
  partnerType: BusinessHomePartnerType;
}) {
  const copy = businessHomeCopy(partnerType);

  return (
    <div className={styles.grid} data-testid="business-org-staff-home-template">
      <section className={styles.heroTask} aria-labelledby="business-staff-home-hero">
        <div>
          <h2 id="business-staff-home-hero">{copy.heroTitle}</h2>
          <p className={styles.heroLead}>
            Рабочее пространство организации. Доступные действия зависят от вашей роли.
          </p>
        </div>
        <Link href={copy.heroHref} className={styles.primaryCtaLink}>
          {copy.heroCta}
        </Link>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <h2>Разделы</h2>
          <Link href="/clients" className={styles.actionLine} aria-label="Клиенты">
            <div>
              <h3>Клиенты</h3>
              <small>По правам вашей роли</small>
            </div>
            <span className={styles.iconBtn} aria-hidden="true">
              <IconArrowRight width={20} height={20} />
            </span>
          </Link>
          <Link href="/scanner" className={styles.actionLine} aria-label="Сканер">
            <div>
              <h3>Сканер</h3>
              <small>Операции в точке</small>
            </div>
            <span className={styles.iconBtn} aria-hidden="true">
              <IconArrowRight width={20} height={20} />
            </span>
          </Link>
          <Link href="/partners" className={styles.actionLine} aria-label="Партнёры">
            <div>
              <h3>Партнёры</h3>
              <small>Условия сотрудничества</small>
            </div>
            <span className={styles.iconBtn} aria-hidden="true">
              <IconArrowRight width={20} height={20} />
            </span>
          </Link>
        </section>

        <section className={styles.panel}>
          <h2>Ограничения</h2>
          <p className={styles.deferredCopy}>
            Настройки организации, выплаты и управление сотрудниками доступны владельцу. Если раздел
            недоступен, сервер вернёт ошибку доступа — данные других пользователей не показываются.
          </p>
        </section>
      </div>
    </div>
  );
}
