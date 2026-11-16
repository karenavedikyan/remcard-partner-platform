"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./PartnerDirectionBadge.module.css";

type Props = {
  glyph: string;
  label: string;
  description: string;
  pending?: boolean;
  testId?: string;
};

/**
 * Direction marker with an accessible explanation. The tooltip opens on hover, focus and tap,
 * closes on Escape or an outside tap, and is linked through aria-describedby.
 */
export function PartnerDirectionBadge({ glyph, label, description, pending = false, testId }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={styles.root}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`${styles.badge} ${pending ? styles.pending : ""}`}
        aria-label={`${label}. ${pending ? "Пока не действует" : ""}`.trim()}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        data-testid={testId ?? "partner-direction-badge"}
        data-direction-glyph={glyph}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
      {open ? (
        <span role="tooltip" id={id} className={styles.tooltip} data-testid="partner-direction-tooltip">
          <strong>{label}</strong>
          <span>{description}</span>
        </span>
      ) : null}
    </span>
  );
}
