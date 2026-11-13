import { CLIENTS_CONTRACT_BLOCKERS } from "@/lib/clients-parity/contracts";
import styles from "../observer/observer.module.css";

const receivingBlocker = CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-RECEIVING-APPEALS");

export function ReceivingAppealsBlocked() {
  return (
    <section
      className={styles.blocked}
      data-testid="ca-receiving-appeals-blocked"
      aria-labelledby="ca-receiving-blocked-title"
    >
      <h2 id="ca-receiving-blocked-title">Клиенты у меня</h2>
      <p>
        Принимающий список обращений, KPI, массовые действия и воронка требуют серверного контракта{" "}
        <strong>{receivingBlocker?.id ?? "BLK-RECEIVING-APPEALS"}</strong>.
      </p>
      {receivingBlocker ? (
        <ul>
          {receivingBlocker.missingApi.map((route) => (
            <li key={route}>{route}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
