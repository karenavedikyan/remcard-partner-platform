import Link from "next/link";
import { homeEmptyCopy, type HomeEmptyRole } from "@/lib/home-empty/copy";
import { HomeEmptyIcon } from "./HomeEmptyIcon";
import styles from "./PartnerHomeEmptyState.module.css";

type PartnerHomeEmptyStateProps = {
  role: HomeEmptyRole;
};

export function PartnerHomeEmptyState({ role }: PartnerHomeEmptyStateProps) {
  const copy = homeEmptyCopy(role);

  return (
    <section className={styles.root} data-testid="empty-state" data-es-page="home">
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden="true">
          <HomeEmptyIcon name={copy.icon} className={styles.artIcon} large />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 className={styles.title}>{copy.title}</h2>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions}>
            <Link
              href={copy.primaryCta.href}
              className={styles.primaryLink}
              data-testid={copy.primaryCta.testId}
            >
              {copy.primaryCta.label}
            </Link>
            {copy.secondaryCta ? (
              <Link
                href={copy.secondaryCta.href}
                className={styles.ghostLink}
                data-testid={copy.secondaryCta.testId}
              >
                {copy.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => (
          <li className={styles.step} key={step.title}>
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIconWrap}>
              <HomeEmptyIcon name={step.icon} className={styles.stepIcon} />
            </span>
            <div>
              <strong className={styles.stepTitle}>{step.title}</strong>
              <small className={styles.stepNote}>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        Раздел заполнится сам, когда появятся первые данные.
      </p>
    </section>
  );
}
