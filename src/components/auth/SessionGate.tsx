import styles from "./SessionGate.module.css";

const REASONS: Record<string, string> = {
  session: "Сессия не найдена или истекла.",
  blocked: "Аккаунт заблокирован.",
  role: "Кабинет доступен только партнёрам PROF.",
};

type SessionGateProps = {
  reason?: string;
};

export function SessionGate({ reason }: SessionGateProps) {
  const message = reason ? REASONS[reason] ?? "Требуется авторизация." : "Требуется авторизация.";

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="gate-title">
        <span className={styles.eyebrow}>RemCard PROF · M2</span>
        <h1 id="gate-title">Нужна сессия партнёра</h1>
        <p>{message}</p>
        <p className={styles.notice} role="status">
          Для локальной проверки используйте fixture-сессию через тестовый инструмент (см.{" "}
          <code>docs/local-dev/README.md</code>). Публичный вход через бота в M2 не подключён —
          перед запуском будет переиспользован механизм основного сайта.
        </p>
      </section>
    </main>
  );
}
