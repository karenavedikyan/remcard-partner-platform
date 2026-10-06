import styles from "./PageHeading.module.css";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <header className={styles.heading}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
