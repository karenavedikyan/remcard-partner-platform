import { getRemcardApiBaseUrl } from "@/lib/api-client";
import { appConfig } from "@/lib/config";
import { getAuthMeServer } from "@/lib/remcard-server";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type HealthRow = {
  label: string;
  value: string;
};

async function loadHealthRows(): Promise<{
  rows: HealthRow[];
  authError?: string;
}> {
  const rows: HealthRow[] = [
    { label: "Кабинет", value: appConfig.appUrl },
    { label: "Backend API", value: getRemcardApiBaseUrl() },
    { label: "Режим", value: "M1 — технический стартовый экран" },
  ];

  const auth = await getAuthMeServer();
  if (auth.ok) {
    rows.push({
      label: "Сессия",
      value: auth.data.user ? `userId ${auth.data.user.id}` : "не авторизован",
    });
  } else {
    rows.push({ label: "Сессия", value: "ошибка проверки" });
    return { rows, authError: `HTTP ${auth.status}: ${auth.message}` };
  }

  return { rows };
}

export default async function HomePage() {
  const { rows, authError } = await loadHealthRows();

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="start-title">
        <span className={styles.eyebrow}>RemCard PROF · M1</span>
        <h1 id="start-title">Кабинет партнёра</h1>
        <p>
          Минимальная локальная основа подключена к существующему backend
          RemCard через серверный BFF-прокси. Финансовые действия, демо-балансы
          и фоновые cron не выполняются.
        </p>

        <ul className={styles.statusList}>
          {rows.map((row) => (
            <li key={row.label}>
              <span className={styles.label}>{row.label}</span>
              <span className={styles.value}>{row.value}</span>
            </li>
          ))}
        </ul>

        {authError ? (
          <p className={styles.notice} role="status">
            Проверка сессии через BFF не завершилась: {authError}. Полная
            интеграция входа требует тестовых учётных данных и согласованных
            настроек cookie/callback на backend.
          </p>
        ) : (
          <p className={styles.notice} role="status">
            Это технический экран M1. Экраны PROF, покупки и начисления будут
            добавлены на следующих этапах после подтверждения интеграции с
            backend.
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" disabled>
            Вход (M2)
          </Button>
          <Button variant="secondary" disabled>
            Регистрация (M2)
          </Button>
        </div>
      </section>
    </main>
  );
}
