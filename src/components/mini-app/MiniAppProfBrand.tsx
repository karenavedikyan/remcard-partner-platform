import styles from "./mini-app.module.css";

type Props = { variant?: "default" | "onDark" };

export function MiniAppProfBrand({ variant = "default" }: Props) {
  return (
    <div
      className={variant === "onDark" ? `${styles.profBrand} ${styles.profBrandOnDark}` : styles.profBrand}
      data-testid="mini-app-brand"
    >
      <span className={styles.profBrandIcon} aria-hidden="true">
        <svg viewBox="0 0 36 36" width="32" height="32" role="img" aria-label="">
          <rect width="36" height="36" rx="8" fill="currentColor" />
          <path
            d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={styles.profBrandText}>RemCard PROF</span>
    </div>
  );
}