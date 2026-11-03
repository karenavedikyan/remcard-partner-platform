import { Button } from "@/components/ui/Button";
import { TEAM_NEW_PARTNER_EMPTY_COPY } from "@/lib/team-new-partner-empty-copy";
import { OnboardingStepItem } from "@/components/onboarding-step/OnboardingStepItem";
import styles from "./TeamSectionNewPartnerEmpty.module.css";
import { teamNewPartnerEmptyStepAction } from "./team-step-actions";
import {
  EmptyStateIconMapPin,
  EmptyStateIconSend,
  EmptyStateIconShield,
  EmptyStateIconUsers,
} from "./TeamSectionNewPartnerEmptyIcons";

const STEP_ICONS = {
  send: EmptyStateIconSend,
  shield: EmptyStateIconShield,
  mapPin: EmptyStateIconMapPin,
} as const;

type Props = {
  onInvite?: () => void;
};

export function TeamSectionNewPartnerEmpty({ onInvite }: Props) {
  const copy = TEAM_NEW_PARTNER_EMPTY_COPY;

  return (
    <section
      className={styles.root}
      data-testid="empty-state"
      data-es-page="team"
      aria-labelledby="team-new-partner-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden="true">
          <EmptyStateIconUsers className={styles.heroIcon} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 id="team-new-partner-empty-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.lead}>{copy.lead}</p>
          {onInvite ? (
            <div className={styles.actions}>
              <Button type="button" data-testid="team-new-partner-empty-cta" onClick={onInvite}>
                {copy.ctaLabel}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => {
          const StepIcon = STEP_ICONS[step.icon];
          const action = teamNewPartnerEmptyStepAction(step, {
            canInvite: Boolean(onInvite),
          });
          return (
            <li key={step.title} className={styles.step}>
              <OnboardingStepItem
                index={index}
                title={step.title}
                note={step.note}
                action={action}
                handlers={{ onInvite }}
                stepNumClassName={styles.stepNum}
                iconWrapClassName={styles.stepIcoWrap}
                iconSlot={<StepIcon className={styles.stepIco} />}
              />
            </li>
          );
        })}
      </ol>
      <div className={styles.foot}>
        <span>{copy.footnote}</span>
      </div>
    </section>
  );
}
