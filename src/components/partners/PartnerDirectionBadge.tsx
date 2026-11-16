"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  /**
   * The card clips its content, so the explanation is rendered in a body-level layer and positioned
   * against the viewport: below the marker when it fits, otherwise above, never past the edges.
   */
  const place = useCallback(() => {
    const button = buttonRef.current;
    const tooltip = tooltipRef.current;
    if (!button || !tooltip) return;
    const margin = 8;
    const rect = button.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const width = Math.min(tooltip.offsetWidth, vw - margin * 2);
    const height = tooltip.scrollHeight;
    const left = Math.max(margin, Math.min(rect.left, vw - width - margin));
    const below = vh - rect.bottom - margin;
    const above = rect.top - margin;
    const placeBelow = height <= below || below >= above;
    const room = placeBelow ? below : above;
    const shown = Math.min(height, room);
    const top = placeBelow ? rect.bottom + 4 : rect.top - shown - 4;
    setPlacement({ top: Math.max(margin, top), left, maxHeight: Math.max(room, 80) });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) || tooltipRef.current?.contains(event.target)) return;
      setOpen(false);
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
        ref={buttonRef}
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
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              id={id}
              className={styles.tooltip}
              data-testid="partner-direction-tooltip"
              style={{
                top: placement?.top ?? 0,
                left: placement?.left ?? 0,
                maxHeight: placement?.maxHeight,
                visibility: placement ? "visible" : "hidden",
              }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <strong>{label}</strong>
              <span>{description}</span>
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
