"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function usePartnerTypeSettingsDialogTrap(
  active: boolean,
  onEscape: () => void,
  blockEscape: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const root = containerRef.current;
    if (!root) return;

    const focusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );

    const focusInitial = () => {
      const preferred = root.querySelector<HTMLElement>(
        '[data-testid="partner-type-setup-publicName"], [data-testid="partner-type-open"], input[type="radio"]',
      );
      (preferred ?? focusables()[0])?.focus();
    };

    queueMicrotask(() => focusInitial());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !blockEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusables();
      if (!nodes.length) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof Node) || root.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      focusables()[0]?.focus();
    };

    root.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [active, blockEscape, onEscape]);

  return containerRef;
}
