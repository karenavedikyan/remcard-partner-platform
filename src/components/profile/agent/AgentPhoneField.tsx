"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import {
  CONTACT_PHONE_ERROR,
  canonicalizeRuContactPhone,
  formatPhoneForDisplay,
  sanitizePhoneTyping,
} from "@/lib/contact-phone-display";

export type AgentPhoneFieldHandle = {
  /** Commits focused draft to parent; returns value that would be saved. */
  commitPending: () => string;
};

type AgentPhoneFieldProps = {
  value: string;
  disabled?: boolean;
  error?: string;
  onChange: (next: string) => void;
  wrapperClassName?: string;
  helperText?: string;
};

function commitDraftValue(draft: string, value: string, focused: boolean): string {
  const source = focused ? draft : value;
  const trimmed = source.trim();
  if (!trimmed) return "";
  const canonical = canonicalizeRuContactPhone(trimmed);
  return canonical || trimmed;
}

export const AgentPhoneField = forwardRef<AgentPhoneFieldHandle, AgentPhoneFieldProps>(
  function AgentPhoneField(
    { value, disabled, error, onChange, wrapperClassName, helperText },
    ref,
  ) {
    const inputId = useId();
    const helperId = `${inputId}-helper`;
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState("");

    useEffect(() => {
      if (!focused) setDraft("");
    }, [value, focused]);

    const displayValue = focused
      ? draft
      : formatPhoneForDisplay(value) || value || "";

    const commitDraft = useCallback(() => {
      const next = commitDraftValue(draft, value, focused);
      onChange(next);
      return next;
    }, [draft, focused, onChange, value]);

    useImperativeHandle(ref, () => ({ commitPending: commitDraft }), [commitDraft]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      commitDraft();
    }, [commitDraft]);

    const helper =
      helperText ??
      `${CONTACT_PHONE_ERROR} Можно оставить пустым.`;

    return (
      <div className={wrapperClassName}>
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
          aria-invalid={error ? true : undefined}
          aria-describedby={helperId}
          onFocus={() => {
            setFocused(true);
            setDraft(formatPhoneForDisplay(value) || value || "");
          }}
          onChange={(e) => setDraft(sanitizePhoneTyping(e.target.value))}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitDraft();
            }
          }}
        />
        <small id={helperId}>{error || helper}</small>
      </div>
    );
  },
);
