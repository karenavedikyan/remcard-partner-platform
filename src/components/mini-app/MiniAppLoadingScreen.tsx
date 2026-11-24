import styles from "./mini-app.module.css";

/** What is being prepared while the mini-cabinet opens; shown one at a time. */
export const MINI_APP_LOADING_LINES = [
  "Считаем начисления и баланс",
  "Собираем сертификаты клиентов",
  "Обновляем список партнёров",
] as const;

/** Mini-cabinet opening screen: brand mark, a plain phrase and what is being prepared. */
export function MiniAppLoadingScreen() {
  return (
    <div className={styles.shell} data-testid="mini-app-loading">
      <div className={styles.miniLoad} role="status">
        <span className={styles.miniLoadMark} aria-hidden="true">
          <svg viewBox="0 0 36 36" width="68" height="68" focusable="false">
            <rect width="36" height="36" rx="8" fill="currentColor" />
            <path
              className={styles.miniLoadHouse}
              pathLength={1}
              d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <p className={styles.miniLoadBrand}>RemCard PROF</p>
        <h1 className={styles.miniLoadTitle}>Готовим ваши данные к&nbsp;просмотру</h1>
        <p className={styles.miniLoadLines} aria-hidden="true">
          {MINI_APP_LOADING_LINES.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
        <span className={styles.miniLoadBar} aria-hidden="true">
          <i />
        </span>
      </div>
    </div>
  );
}
