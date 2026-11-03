import type { CabinetLoadingHeading } from "@/lib/cabinet-loading-copy";
import styles from "./CabinetPageLoadingSkeleton.module.css";

type CabinetPageLoadingSkeletonProps = CabinetLoadingHeading;

export function CabinetPageLoadingSkeleton({
  eyebrow,
  title,
  description,
}: CabinetPageLoadingSkeletonProps) {
  return (
    <div
      className={styles.root}
      role="status"
      aria-busy="true"
      aria-label={`Загрузка раздела «${title}»`}
      data-testid="cabinet-page-loading-skeleton"
    >
      <header className={styles.heading}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : (
          <p className={styles.descriptionHidden} aria-hidden>
            .
          </p>
        )}
      </header>
      <div className={styles.grid} aria-hidden>
        <div className={`${styles.block} ${styles.blockWide} ${styles.blockShimmer}`} />
        <div className={`${styles.block} ${styles.blockShimmer}`} />
        <div className={`${styles.block} ${styles.blockShimmer}`} />
        <div className={`${styles.block} ${styles.blockShimmer}`} />
      </div>
    </div>
  );
}
