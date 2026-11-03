"use client";

import { profileEmptyCopy, type ProfileEmptyRole } from "./profile-empty-copy";
import { ProfileEmptyIcon } from "./ProfileEmptyIcons";
import styles from "./ProfileSectionEmptyState.module.css";

type Props = {
  role: ProfileEmptyRole;
  onStartFill: () => void;
};

export function ProfileSectionEmptyState({ role, onStartFill }: Props) {
  const copy = profileEmptyCopy(role);

  return (
    <section
      className={styles.root}
      data-testid="empty-state"
      data-es-page="profile"
      aria-labelledby="profile-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden>
          <ProfileEmptyIcon name="user" className={styles.heroIcon} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 className={styles.title} id="profile-empty-title">
            {copy.title}
          </h2>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              data-testid="profile-empty-start"
              onClick={onStartFill}
            >
              {copy.ctaLabel}
            </button>
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => (
          <li className={styles.step} key={step.title}>
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIcoWrap}>
              <ProfileEmptyIcon name={step.icon} className={styles.stepIco} />
            </span>
            <div>
              <strong className={styles.stepTitle}>{step.title}</strong>
              <small className={styles.stepNote}>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.foot}>
        <span>Раздел заполнится сам, когда появятся первые данные.</span>
      </div>
    </section>
  );
}
