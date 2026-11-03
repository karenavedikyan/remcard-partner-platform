import styles from "./SpecialistHomeDashboard.module.css";
import skeletonStyles from "./HomeSupplementalProbeSkeleton.module.css";

type HomeSupplementalProbeSkeletonProps = {
  statLabels: readonly [string, string, string];
};

export function HomeSupplementalProbeSkeleton({
  statLabels,
}: HomeSupplementalProbeSkeletonProps) {
  return (
    <div
      data-testid="home-supplemental-skeleton"
      aria-busy="true"
      aria-live="polite"
      className={skeletonStyles.root}
    >
      <div className={styles.stats}>
        {statLabels.map((label) => (
          <div className={styles.stat} key={label}>
            <span className={styles.statLabel}>{label}</span>
            <strong className={styles.statValue}>…</strong>
          </div>
        ))}
      </div>
      <div className={styles.twoCol} aria-hidden="true">
        <div className={`${styles.panel} ${skeletonStyles.panelPlaceholder}`} />
        <div className={`${styles.panel} ${skeletonStyles.panelPlaceholder}`} />
      </div>
    </div>
  );
}
