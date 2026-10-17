"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RegistrationPublicShell } from "./RegistrationPublicShell";
import styles from "./partner-welcome.module.css";

type ExampleId = "store-specialist" | "specialist-store" | "agent-company";

const EXAMPLES: Record<
  ExampleId,
  {
    tab: string;
    title: string;
    fromLabel: string;
    fromName: string;
    toLabel: string;
    toName: string;
  }
> = {
  "store-specialist": {
    tab: "Магазин → специалист",
    title: "Клиенту нужен монтаж после покупки",
    fromLabel: "Магазин",
    fromName: "Пример · материалы",
    toLabel: "Специалист",
    toName: "Пример · монтаж",
  },
  "specialist-store": {
    tab: "Специалист → магазин",
    title: "Клиенту нужны материалы для работ",
    fromLabel: "Специалист",
    fromName: "Пример · ремонт",
    toLabel: "Магазин",
    toName: "Пример · снабжение",
  },
  "agent-company": {
    tab: "Агент → компания",
    title: "Клиенту нужен подрядчик под объект",
    fromLabel: "Агент",
    fromName: "Пример · рекомендация",
    toLabel: "Компания",
    toName: "Пример · подряд",
  },
};

const EXAMPLE_ORDER: ExampleId[] = ["store-specialist", "specialist-store", "agent-company"];

export function PartnerWelcome() {
  const [exampleId, setExampleId] = useState<ExampleId>("store-specialist");
  const example = useMemo(() => EXAMPLES[exampleId], [exampleId]);

  return (
    <RegistrationPublicShell loginHref="/login">
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="welcome-title">
          <div className={styles.copy}>
            <p className={styles.kicker}>RemCard · Для партнёров</p>
            <h1 id="welcome-title">
              <span className={styles.headingMain}>Обмениваемся клиентами,</span>
              <span className={styles.headingAccent}>которым нужен ремонт</span>
              <span className={styles.headingRest}>и всё для него</span>
            </h1>
            <p className={styles.description}>
              Знакомим наших клиентов с партнёрами RemCard.
              <br />
              Помогаем каждому найти своё.
            </p>
            <p className={styles.target}>Только целевые клиенты.</p>
            <div className={styles.action}>
              <Link href="/join" className={styles.primaryBtn}>
                Присоединяйся
              </Link>
              <span>
                Уже работаете с RemCard?
                <br />
                <Link href="/login">Войдите в кабинет</Link>
              </span>
            </div>
          </div>
          <div className={styles.visual}>
            <figure className={styles.photo}>
              <Image
                src="/assets/registration/partner-home.webp"
                alt=""
                width={640}
                height={344}
                priority
                className={styles.photoImg}
              />
              <figcaption>Иллюстрация · ремонт и партнёрство</figcaption>
            </figure>
            <div className={styles.example} aria-live="polite">
              <div className={styles.exampleTop}>
                <span>Пример</span>
                <span className={styles.exampleLabel}>Не реальная сделка</span>
              </div>
              <div className={styles.exampleTabs} role="tablist" aria-label="Примеры передачи клиента">
                {EXAMPLE_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={exampleId === id}
                    className={styles.exampleTab}
                    onClick={() => setExampleId(id)}
                  >
                    {EXAMPLES[id].tab}
                  </button>
                ))}
              </div>
              <h2>{example.title}</h2>
              <div className={styles.route}>
                <div>
                  <small>{example.fromLabel}</small>
                  <strong>{example.fromName}</strong>
                </div>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12h12m0 0-4-4m4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <div>
                  <small>{example.toLabel}</small>
                  <strong>{example.toName}</strong>
                </div>
              </div>
              <p className={styles.exampleMore}>
                Партнёры рекомендуют друг друга, когда клиенту нужен следующий шаг ремонта.
              </p>
            </div>
          </div>
        </section>
        <section className={styles.reciprocity} aria-labelledby="reciprocity-title">
          <h2 id="reciprocity-title">
            Взаимные рекомендации <span>без лишнего шума</span>
          </h2>
          <p>Клиент приходит с задачей — партнёры помогают закрыть её своим профилем и условиями.</p>
          <Link href="/join" className={styles.textAction}>
            Выбрать тип партнёра
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h14m0 0-6-6m6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </section>
      </div>
    </RegistrationPublicShell>
  );
}
