import styles from "./observer.module.css";

type Props = {
  title: string;
  blockerId: string;
  message: string;
  missingRoutes: string[];
};

export function ObserverContractBlocked({ title, blockerId, message, missingRoutes }: Props) {
  return (
    <section
      className={styles.blocked}
      data-testid="clients-parity-contract-blocked"
      aria-labelledby="clients-parity-blocked-title"
    >
      <h2 id="clients-parity-blocked-title">{title}</h2>
      <p>
        <strong>{blockerId}</strong> — {message}
      </p>
      {missingRoutes.length > 0 ? (
        <ul>
          {missingRoutes.map((route) => (
            <li key={route}>{route}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
