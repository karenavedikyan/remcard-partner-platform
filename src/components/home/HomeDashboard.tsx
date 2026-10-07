import Link from "next/link";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { partnershipNeedsMyResponse } from "@/lib/partnership-rules";
import type { AuthUser, Partnership } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./HomeDashboard.module.css";

type HomeDashboardProps = {
  user: AuthUser;
  partnerships: Partnership[];
  incomingCount: number;
};

const QUICK_ACTIONS = [
  {
    href: "/partners",
    number: "01",
    title: "Партнёры",
    text: "Пригласите магазин или специалиста и согласуйте условия сотрудничества.",
  },
  {
    href: "/recommendations",
    number: "02",
    title: "Рекомендации",
    text: "Создайте документ со скидкой для клиента — с QR, ссылкой и PDF.",
  },
  {
    href: "/scanner",
    number: "03",
    title: "Сканер",
    text: "Примите покупку по QR или коду и подтвердите сумму на месте.",
  },
  {
    href: "/settlements",
    number: "04",
    title: "Взаиморасчёты",
    text: "Посмотрите, кто кому должен, и откройте связанные начисления.",
  },
] as const;

function partnerTitle(partnership: Partnership, meId: string) {
  const partner = partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser;
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

export function HomeDashboard({ user, partnerships, incomingCount }: HomeDashboardProps) {
  const activeCount = partnerships.filter((item) => item.status === "ACTIVE").length;
  const waiting = partnerships.filter((item) => partnershipNeedsMyResponse(item, user.id!));
  const displayName = user.displayName?.trim() || "Партнёр RemCard";

  return (
    <div className={styles.grid}>
      <section className={styles.welcomeCard}>
        <div>
          <span className={styles.darkEyebrow}>RemCard PROF</span>
          <h2 className={styles.welcomeTitle}>Здравствуйте, {displayName}</h2>
          <p className={styles.welcomeLead}>
            Начните с партнёров и рекомендаций, принимайте покупки через сканер и следите за
            взаиморасчётами — всё в одном кабинете.
          </p>
          <Link href="/profile" className={styles.profileLink}>
            Открыть профиль →
          </Link>
        </div>
      </section>

      <div className={styles.overviewStrip}>
        <div>
          <span>Активные партнёрства</span>
          <strong>{activeCount}</strong>
          <small>{activeCount === 1 ? "партнёрство" : "партнёрств"}</small>
        </div>
        <div>
          <span>Ждут решения</span>
          <strong>{incomingCount}</strong>
          <small>{incomingCount > 0 ? "приглашения или условия" : "новых запросов нет"}</small>
        </div>
        <div>
          <span>Быстрый переход</span>
          <strong>
            <Link href="/history">История</Link>
          </strong>
          <small>покупки и начисления</small>
        </div>
      </div>

      <section>
        <div className={styles.sectionTitle}>
          <div>
            <h2>Что сделать дальше</h2>
            <p>Выберите раздел — все пункты уже работают с вашими данными.</p>
          </div>
        </div>
        <div className={styles.intentGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className={styles.intentItem}>
              <span className={styles.intentNumber}>{action.number}</span>
              <strong>{action.title}</strong>
              <p>{action.text}</p>
              <span className={styles.intentLink}>Перейти →</span>
            </Link>
          ))}
        </div>
      </section>

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
          <Link href="/partners" className={styles.partnersCta}>
            Открыть партнёров →
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}
