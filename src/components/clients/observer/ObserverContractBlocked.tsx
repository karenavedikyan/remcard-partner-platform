import styles from "./observer.module.css";

type Props = {
  title: string;
  blockerId: string;
  message: string;
  missingRoutes: string[];
  testId?: string;
  titleId?: string;
};

export function ObserverContractBlocked({
  title,
  blockerId,
  message,
  missingRoutes,
  testId = "clients-parity-contract-blocked",
  titleId = "clients-parity-blocked-title",
}: Props) {
  return (
    <section
      className={styles.blocked}
      data-testid={testId}
      aria-labelledby={titleId}
    >
      <h2 id={titleId}>{title}</h2>
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
