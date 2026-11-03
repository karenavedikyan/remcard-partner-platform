"use client";

import { profileEmptyCopy, type ProfileEmptyRole } from "./profile-empty-copy";
import { profileEmptyStepAction } from "./profile-step-actions";
import { ProfileEmptyIcon } from "./ProfileEmptyIcons";
import { OnboardingStepItem } from "@/components/onboarding-step/OnboardingStepItem";
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
            <OnboardingStepItem
              index={index}
              title={step.title}
              note={step.note}
              action={profileEmptyStepAction(step, role)}
              handlers={{ onStartFill }}
              stepNumClassName={styles.stepNum}
              iconWrapClassName={styles.stepIcoWrap}
              titleClassName={styles.stepTitle}
              noteClassName={styles.stepNote}
              iconSlot={<ProfileEmptyIcon name={step.icon} className={styles.stepIco} />}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
