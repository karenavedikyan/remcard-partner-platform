import styles from "./BrandMark.module.css";

type BrandMarkProps = {
  className?: string;
  showSubtitle?: boolean;
};

export function BrandMark({ className, showSubtitle = true }: BrandMarkProps) {
  return (
    <div className={`${styles.brand} ${className ?? ""}`}>
      <svg
        role="img"
        aria-label="RemCard"
        viewBox="0 0 36 36"
        width="36"
        height="36"
        className={styles.logo}
      >
        <rect width="36" height="36" rx="10" fill="currentColor" />
        <path
          d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.wordmark}>
        remcard<span className={styles.dot}>.</span>
        {showSubtitle ? <small className={styles.subtitle}>для партнёров</small> : null}
      </span>
    </div>
  );
}
