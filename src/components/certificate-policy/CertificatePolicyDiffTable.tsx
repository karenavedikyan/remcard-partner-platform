import type { ReactNode } from "react";
import type { CertificatePolicyDiffRow } from "@/lib/certificate-policy/diff";
import styles from "./certificate-policy.module.css";

type Props = {
  title: string;
  rows: CertificatePolicyDiffRow[];
  testId?: string;
  actions?: ReactNode;
};

export function CertificatePolicyDiffTable({
  title,
  rows,
  testId = "cp-pending",
  actions,
}: Props) {
  if (!rows.length && !actions) return null;
  return (
    <section className={styles.cpPending} data-testid={testId}>
      <h3>{title}</h3>
      {rows.length > 0 ? (
        <table className={styles.cpDiff}>
          <thead>
            <tr>
              <th scope="col">Условие</th>
              <th scope="col">Сейчас</th>
              <th scope="col">Новое</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.current}</td>
                <td>{row.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {actions ? <div className={styles.cpActions}>{actions}</div> : null}
    </section>
  );
}