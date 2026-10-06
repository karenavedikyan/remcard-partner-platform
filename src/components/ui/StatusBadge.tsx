import styles from "./StatusBadge.module.css";

type StatusBadgeProps = {
  label: string;
  tone: "active" | "pending" | "declined" | "neutral";
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}
