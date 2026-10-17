"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buildJoinHref } from "@/lib/registration/draft";
import { RegistrationPublicShell } from "./RegistrationPublicShell";
import styles from "./partner-welcome.module.css";

type ExampleId = "store" | "specialist" | "agent";

const EXAMPLES: Record<
  ExampleId,
  {
    tab: string;
    title: string;
    fromSmall: string;
    from: string;
    need: string;
    to: string;
    more: string;
  }
> = {
  store: {
    tab: "Магазин",
    title: "Клиент выбрал плитку",
    fromSmall: "Уже с вами",
    from: "Ваш магазин",
    need: "Нужен мастер по укладке",
    to: "Специалист RemCard",
    more: "А дальше: сантехника, свет, мебель",
  },
  specialist: {
    tab: "Специалист",
    title: "Клиент начинает ремонт",
    fromSmall: "Уже с вами",
    from: "Ваша команда",
    need: "Нужны материалы для работы",
    to: "Магазин RemCard",
    more: "А дальше: двери, кухня, техника",
  },
  agent: {
    tab: "Агент",
    title: "Клиент получил ключи",
    fromSmall: "Уже с вами",
    from: "Ваша рекомендация",
    need: "Нужна команда для ремонта",
    to: "Компания RemCard",
    more: "А дальше: отделка, материалы, мебель",
  },
};

const EXAMPLE_ORDER: ExampleId[] = ["store", "specialist", "agent"];

type Props = {
  inviteToken?: string | null;
  returnTo?: string | null;
};

export function PartnerWelcome({ inviteToken, returnTo }: Props) {
  const [exampleId, setExampleId] = useState<ExampleId>("store");
  const example = useMemo(() => EXAMPLES[exampleId], [exampleId]);
  const joinHref = buildJoinHref({ invite: inviteToken, returnTo });

  return (
    <RegistrationPublicShell loginHref="/login">
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="welcome-title">
          <div className={styles.copy}>
            <p className={styles.kicker}>Для тех, кто помогает с ремонтом</p>
            <h1 id="welcome-title">
              <span className={styles.headingMain}>
                Обмениваемся<span className={styles.headingAccent}> клиентами,</span>
              </span>
              <span className={styles.headingRest}>
                которым нужен ремонт
                <br />
                и всё для него
              </span>
            </h1>
            <p className={styles.description}>
              Знакомим наших клиентов с партнёрами RemCard.
              <br />
              Помогаем каждому найти своё.
            </p>
            <p className={styles.target}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Только целевые клиенты.
            </p>
            <div className={styles.action}>
              <Link href={joinHref} className={styles.primaryBtn}>
                Присоединяйся
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
              <span>
                Сначала выберем, какой тип
                <br />
                партнёрства подходит вам
              </span>
            </div>
          </div>
          <div className={styles.visual}>
            <figure className={styles.photo}>
              <Image
                src="/assets/registration/partner-home.webp"
                alt="Иллюстрация уютной квартиры: ремонт объединяет работу разных партнёров"
                width={640}
                height={344}
                priority
                className={styles.photoImg}
              />
              <figcaption>Один клиент. Несколько задач.</figcaption>
            </figure>
            <div className={styles.example} aria-live="polite">
              <div className={styles.exampleTop}>
                <span>Посмотрите на примере</span>
                <span className={styles.exampleLabel}>Пример</span>
              </div>
              <div className={styles.exampleTabs} role="tablist" aria-label="Примеры партнёрства">
                {EXAMPLE_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`welcome-tab-${id}`}
                    aria-selected={exampleId === id}
                    aria-controls="welcome-example-panel"
                    className={styles.exampleTab}
                    onClick={() => setExampleId(id)}
                  >
                    {EXAMPLES[id].tab}
                  </button>
                ))}
              </div>
              <h2 id="welcome-example-panel" role="tabpanel" aria-labelledby={`welcome-tab-${exampleId}`}>
                {example.title}
              </h2>
              <div className={styles.route}>
                <div>
                  <small>{example.fromSmall}</small>
                  <strong>{example.from}</strong>
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
                  <small>{example.need}</small>
                  <strong>{example.to}</strong>
                </div>
              </div>
              <p className={styles.exampleMore}>{example.more}</p>
            </div>
          </div>
        </section>
        <section className={styles.reciprocity} aria-label="Как работает партнёрство">
          <h2>
            Вы рекомендуете партнёров.
            <br />
            <span>Партнёры рекомендуют вас.</span>
          </h2>
          <p>
            Клиентам проще найти нужное.
            <br />
            Партнёрам проще найти своих клиентов.
          </p>
          <Link href={joinHref} className={styles.textAction}>
            Найти своё место в RemCard
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 17L17 7m0 0H9m8 0v8"
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
