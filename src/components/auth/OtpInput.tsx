"use client";

import { useCallback, useId, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import styles from "./auth.module.css";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

const DIGITS = 6;

function normalizeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, DIGITS);
}

export function OtpInput({ value, onChange, disabled, "aria-label": ariaLabel }: OtpInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (next: string) => {
      onChange(normalizeDigits(next));
    },
    [onChange],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && value.length === DIGITS) {
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    handleChange(pasted);
  };

  return (
    <div className={styles.otpWrap}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        Код из бота
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.otpInput}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={DIGITS}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? "Шестизначный код из Telegram-бота"}
        placeholder="000000"
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <p className={styles.otpHint}>6 цифр, ведущие нули сохраняются</p>
    </div>
  );
}
