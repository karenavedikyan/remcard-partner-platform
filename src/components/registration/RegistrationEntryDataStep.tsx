"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { REGISTRATION_KIND_LABELS, type RegistrationKind } from "@/lib/registration/types";
import entryStyles from "./registration-entry.module.css";

const AGENT_ROADMAP = [
  "Найти партнёра",
  "Создать сертификат",
  "Поделиться с клиентом",
];

type FieldKey = "name" | "city";

type Props = {
  kind: RegistrationKind;
  field: FieldKey;
  stepIndex: number;
  stepTotal: number;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onChangeType: () => void;
};

const FIELD_COPY: Record<
  FieldKey,
  { title: string; label: string; placeholder: string; help: string; autoComplete: string }
> = {
  name: {
    title: "Как к вам обращаться?",
    label: "Ваше имя",
    placeholder: "Например, Анна",
    help: "Так вас будут видеть клиенты и партнёры.",
    autoComplete: "name",
  },
  city: {
    title: "В каком городе вы работаете?",
    label: "Город",
    placeholder: "Например, Краснодар",
    help: "Подберём партнёров рядом с вами. Город можно изменить позже.",
    autoComplete: "address-level2",
  },
};

export function RegistrationEntryDataStep({
  kind,
  field,
  stepIndex,
  stepTotal,
  value,
  error,
  onChange,
  onBack,
  onSubmit,
  onChangeType,
}: Props) {
  const copy = FIELD_COPY[field];
  const roleLabel = REGISTRATION_KIND_LABELS[kind]?.title ?? "Агент";
  const isLast = stepIndex >= stepTotal - 1;

  return (
    <>
      <div className={entryStyles.entryRoleContext}>
        <span className={entryStyles.rolePill}>{roleLabel}</span>
        <span className={entryStyles.roleContextNote}>Регистрация партнёра</span>
        <Button type="button" variant="secondary" className={entryStyles.changeTypeBtn} onClick={onChangeType}>
          Изменить тип
        </Button>
      </div>
      <div className={entryStyles.formLayout}>
        <section className={entryStyles.panel}>
          <div className={entryStyles.panelHeaderRow}>
            <span className={entryStyles.eyebrow}>
              Ваши данные · шаг {stepIndex + 1} из {stepTotal}
            </span>
            <span className={entryStyles.stepHint}>Обязательный шаг</span>
          </div>
          <div className={entryStyles.dataTrack} aria-hidden="true">
            {Array.from({ length: stepTotal }, (_, n) => (
              <span key={n} className={n <= stepIndex ? entryStyles.done : undefined} />
            ))}
          </div>
          <h1 className={entryStyles.questionTitle}>{copy.title}</h1>
          <form
            className={entryStyles.panel}
            style={{ padding: 0, border: "none" }}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <TextField
              label={`${copy.label} *`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={copy.placeholder}
              autoComplete={copy.autoComplete}
              maxLength={120}
              aria-describedby="entry-data-help entry-data-error"
            />
            <p id="entry-data-help" className={entryStyles.fieldHelp}>
              {copy.help}
            </p>
            {error ? (
              <p id="entry-data-error" className={entryStyles.fieldHelp} role="alert" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            ) : null}
            <div className={entryStyles.formFooter}>
              <Button type="button" variant="secondary" onClick={onBack}>
                Назад
              </Button>
              <Button type="submit">{isLast ? "К подтверждению" : "Продолжить"}</Button>
            </div>
          </form>
        </section>
        <aside className={entryStyles.panel}>
          <span className={entryStyles.eyebrow}>{roleLabel}</span>
          <h2 className={entryStyles.companionTitle}>Без лишних вопросов на старте</h2>
          <p className={entryStyles.companionIntro}>
            Для старта агенту достаточно имени и города.
          </p>
          <ol className={entryStyles.roadmap}>
            {AGENT_ROADMAP.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className={entryStyles.companionLater}>
            Аудиторию, контакты и реквизиты можно дополнить позже в профиле.
          </p>
        </aside>
      </div>
    </>
  );
}
