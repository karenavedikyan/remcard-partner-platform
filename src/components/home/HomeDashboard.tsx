import Link from "next/link";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import type { AuthUser, Partnership } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./HomeDashboard.module.css";

type HomeDashboardProps = {
  user: AuthUser;
  partnerships: Partnership[];
  incomingCount: number;
};

function partnerTitle(partnership: Partnership, meId: string) {
  const partner = partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser;
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

export function HomeDashboard({ user, partnerships, incomingCount }: HomeDashboardProps) {
  const activeCount = partnerships.filter((item) => item.status === "ACTIVE").length;
  const waiting = partnerships.filter(
    (item) =>
      (item.status === "INVITED" || item.status === "PENDING") &&
      item.initiatedBy !== user.id,
  );

  return (
    <div className={styles.grid}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Моя главная</span>
        <h1>{user.displayName ?? "Кабинет партнёра"}</h1>
        <p>
          Управляйте профилем и партнёрствами через существующий backend RemCard. Финансовые
          операции и программы будут добавлены на следующих этапах.
        </p>
      </section>

      <div className={styles.cards}>
        <Link href="/profile" className={styles.cardLink}>
          <Panel title="Профиль" className={styles.card}>
            <p>Обновите город, описание и контакты для клиентов.</p>
            <div className={styles.cardAction}>Открыть профиль →</div>
          </Panel>
        </Link>
        <Link href="/partners" className={styles.cardLink}>
          <Panel title="Партнёры" className={styles.card}>
            <p>
              Активных партнёрств: {activeCount}.{" "}
              {incomingCount > 0 ? `Ждут решения: ${incomingCount}.` : "Новых приглашений нет."}
            </p>
            <div className={styles.cardAction}>Открыть партнёров →</div>
          </Panel>
        </Link>
        <Panel title="Следующие этапы" className={styles.card}>
          <p>Сертификаты, сканер и взаиморасчёты будут перенесены после M2.</p>
        </Panel>
      </div>

      {waiting.length > 0 ? (
        <Panel title="Требует внимания">
          <div className={styles.list}>
            {waiting.slice(0, 5).map((partnership) => (
              <div key={partnership.id} className={styles.listItem}>
                <div>
                  <strong>{partnerTitle(partnership, user.id!)}</strong>
                  <p>Партнёрство ждёт вашего решения</p>
                </div>
                <StatusBadge
                  label={PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status}
                  tone={partnershipStatusTone(partnership.status)}
                />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
