import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./FormField.module.css";

type BaseProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

export function TextField({
  label,
  hint,
  error,
  required,
  id,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className={styles.field} htmlFor={fieldId}>
      <span className={styles.label}>
        {label}
        {required ? <span className={styles.required}> *</span> : null}
      </span>
      <input id={fieldId} className={styles.input} aria-invalid={Boolean(error)} {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  id,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className={styles.field} htmlFor={fieldId}>
      <span className={styles.label}>
        {label}
        {required ? <span className={styles.required}> *</span> : null}
      </span>
      <textarea id={fieldId} className={styles.textarea} aria-invalid={Boolean(error)} {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  id,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className={styles.field} htmlFor={fieldId}>
      <span className={styles.label}>
        {label}
        {required ? <span className={styles.required}> *</span> : null}
      </span>
      <select id={fieldId} className={styles.select} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
