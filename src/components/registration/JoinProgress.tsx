import styles from "./registration-join.module.css";

const STAGES = [
  { id: "types", label: "Тип партнёра" },
  { id: "data", label: "Ваши данные" },
  { id: "auth", label: "Подтверждение" },
  { id: "done", label: "Кабинет" },
] as const;

export type JoinProgressStage = (typeof STAGES)[number]["id"];

export function JoinProgress({
  current,
  layout = "wizard",
}: {
  current: JoinProgressStage;
  /** Types registration page matches frozen prototype progress layout. */
  layout?: "wizard" | "typesRegistration" | "dataRegistration";
}) {
  const currentIndex = STAGES.findIndex((s) => s.id === current);
  const listClass =
    layout === "typesRegistration"
      ? `${styles.entryProgress} ${styles.entryProgressTypesRegistration}`
      : layout === "dataRegistration"
        ? `${styles.entryProgress} ${styles.entryProgressDataRegistration}`
        : styles.entryProgress;
  return (
    <ol className={listClass} aria-label="Этапы регистрации">
      {STAGES.map((stage, index) => (
        <li key={stage.id} aria-current={index === currentIndex ? "step" : undefined}>
          <span>{index + 1}</span>
          {stage.label}
        </li>
      ))}
    </ol>
  );
}
