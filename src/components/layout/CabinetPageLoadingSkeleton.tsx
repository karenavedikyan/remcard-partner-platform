import type { CabinetLoadingHeading } from "@/lib/cabinet-loading-copy";
import styles from "./CabinetPageLoadingSkeleton.module.css";

type CabinetPageLoadingSkeletonProps = CabinetLoadingHeading;

export function CabinetPageHeadingPlaceholder() {
  return (
    <header
      className={styles.heading}
      aria-hidden
      data-testid="cabinet-page-heading-placeholder"
    >
      <span className={styles.headingBarEyebrow} />
      <span className={styles.headingBarTitle} />
      <span className={styles.headingBarDescription} />
    </header>
  );
}

export function CabinetPageLoadingSkeletonBody() {
  return (
    <div className={styles.grid} aria-hidden data-testid="cabinet-page-loading-body">
      <div className={`${styles.block} ${styles.blockWide} ${styles.blockShimmer}`} />
      <div className={`${styles.block} ${styles.blockShimmer}`} />
      <div className={`${styles.block} ${styles.blockShimmer}`} />
      <div className={`${styles.block} ${styles.blockShimmer}`} />
    </div>
  );
}

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
      <CabinetPageLoadingSkeletonBody />
    </div>
  );
}

/** Detail/new routes: reserved heading block + body shimmer (no list-page title). */
export function CabinetPageDetailLoadingSkeleton() {
  return (
    <div
      className={styles.root}
      role="status"
      aria-busy="true"
      aria-label="Загрузка страницы"
      data-testid="cabinet-page-detail-loading-skeleton"
    >
      <CabinetPageHeadingPlaceholder />
      <CabinetPageLoadingSkeletonBody />
    </div>
  );
}
