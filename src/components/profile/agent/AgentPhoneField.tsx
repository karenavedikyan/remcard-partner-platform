"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  CONTACT_PHONE_ERROR,
  canonicalizeRuContactPhone,
  formatPhoneForDisplay,
  sanitizePhoneTyping,
} from "@/lib/contact-phone-display";

type AgentPhoneFieldProps = {
  value: string;
  disabled?: boolean;
  error?: string;
  onChange: (next: string) => void;
};

export function AgentPhoneField({ value, disabled, error, onChange }: AgentPhoneFieldProps) {
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focused) setDraft("");
  }, [value, focused]);

  const displayValue = focused
    ? draft
    : formatPhoneForDisplay(value) || value || "";

  const handleBlur = useCallback(() => {
    setFocused(false);
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const canonical = canonicalizeRuContactPhone(trimmed);
    if (canonical) onChange(canonical);
    else onChange(trimmed);
  }, [draft, onChange]);

  return (
    <div>
      <label htmlFor={inputId}>Телефон</label>
      <input
        id={inputId}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={displayValue}
        placeholder="+7 (___) ___-__-__"
        disabled={disabled}
        data-testid="agent-profile-input-phone"
        onFocus={() => {
          setFocused(true);
          setDraft(formatPhoneForDisplay(value) || value || "");
        }}
        onChange={(e) => setDraft(sanitizePhoneTyping(e.target.value))}
        onBlur={handleBlur}
      />
      <small>{error || `${CONTACT_PHONE_ERROR} Можно оставить пустым.`}</small>
    </div>
  );
}
