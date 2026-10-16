"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

type Stat = {
  label: string;
  value: string;
  caption: string;
};

type Props = {
  variant: "certificates" | "clients";
  certificateActiveCount?: number;
  clientsIntro?: boolean;
};

export function AgentR03PageIntro({ variant, certificateActiveCount }: Props) {
  if (variant === "clients") {
    return (
      <p className={styles.pageIntroMuted}>
        Кому вы помогаете с выбором и какие сертификаты связаны с клиентами.
      </p>
    );
  }

  const stats: Stat[] = [
    {
      label: "Мои сертификаты",
      value:
        certificateActiveCount != null && !Number.isNaN(certificateActiveCount)
          ? String(certificateActiveCount)
          : "—",
      caption: "Активные в кабинете",
    },
    {
      label: "Начислено",
      value: "—",
      caption: "Данные пока недоступны",
    },
    {
      label: "Получено",
      value: "—",
      caption: "Данные пока недоступны",
    },
  ];

  return (
    <>
      <section className={styles.heroTask} data-testid="agent-r03-hero-task">
        <div>
          <h2>Создайте сертификат для клиента</h2>
          <p className={styles.muted}>
            Клиент покупает у партнёра по вашей рекомендации.
          </p>
        </div>
        <Link href="/certificates/new" className={styles.heroCta}>
          <Button>
            Создать сертификат →
          </Button>
        </Link>
      </section>
      <div className={styles.statsRow} data-testid="agent-r03-stat-cards">
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statLabel}>{stat.label}</span>
            <strong className={styles.statValue}>{stat.value}</strong>
            <small className={styles.statCaption}>{stat.caption}</small>
          </div>
        ))}
      </div>
    </>
  );
}
