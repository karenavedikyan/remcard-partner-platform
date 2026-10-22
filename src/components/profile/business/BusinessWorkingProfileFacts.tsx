import {
  businessWorkingProfileDirectionLabels,
  businessWorkingProfileFactRows,
  type BusinessFactRow,
} from "@/lib/business-profile/wizard-facts";
import type { BusinessWizardCopy } from "@/lib/business-profile/wizard-copy";
import type { ProfileDraft } from "@/lib/profile-save";
import styles from "../agent/AgentProfileWizard.module.css";
import stepStyles from "../specialist/SpecialistWorkingProfileWizard.module.css";

type Props = {
  draft: ProfileDraft;
  copy: BusinessWizardCopy;
  labelByKey?: Map<string, string>;
  areasText?: string;
  directionsHeading?: string;
  testId?: string;
};

export function BusinessWorkingProfileFacts({
  draft,
  copy,
  labelByKey,
  areasText,
  directionsHeading,
  testId = "business-review-facts",
}: Props) {
  const rows: BusinessFactRow[] = businessWorkingProfileFactRows(draft, copy, {
    labelByKey,
    areasText,
  });
  const directionLabels = businessWorkingProfileDirectionLabels(draft, labelByKey);

  return (
    <>
      <dl className={stepStyles.reviewFacts} data-testid={testId}>
        {rows.map((row) => (
          <div key={row.term}>
            <dt>{row.term}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className={stepStyles.reviewDirections}>
        <strong>{directionsHeading ?? copy.steps[1]}</strong>
        <div className={stepStyles.reviewChipRow}>
          {directionLabels.length ? (
            directionLabels.map((label) => (
              <span key={label} className={stepStyles.reviewChip}>
                {label}
              </span>
            ))
          ) : (
            <span className={styles.intro}>Можно добавить позже</span>
          )}
        </div>
      </div>
    </>
  );
}
