"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { getFocusableElements, handleDialogTabKey } from "@/lib/dialog-focus";

export type PartnerTypeSettingsDialogStep = "unsaved" | "choose" | "setup";

export function usePartnerTypeSettingsDialogTrap(
  active: boolean,
  step: PartnerTypeSettingsDialogStep | null,
  onEscape: () => void,
  blockEscape: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openedRef = useRef(false);
  const blockEscapeRef = useRef(blockEscape);
  const onEscapeRef = useRef(onEscape);
  const stepRef = useRef(step);
  blockEscapeRef.current = blockEscape;
  onEscapeRef.current = onEscape;
  stepRef.current = step;

  useEffect(() => {
    if (!active) {
      openedRef.current = false;
      return undefined;
    }
    if (!openedRef.current) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      openedRef.current = true;
    }
    return () => {
      if (!openedRef.current) return;
      openedRef.current = false;
      const restore = restoreFocusRef.current;
      queueMicrotask(() => restore?.focus?.());
    };
  }, [active]);

  const focusWithinDialog = () => {
    const root = containerRef.current;
    if (!root) return;
    const focusables = getFocusableElements(root);
    const currentStep = stepRef.current;
    const preferred =
      currentStep === "setup"
        ? root.querySelector<HTMLElement>('[data-testid="partner-type-setup-publicName"]')
        : currentStep === "choose"
          ? root.querySelector<HTMLElement>('input[type="radio"]')
          : null;
    const target =
      preferred && focusables.includes(preferred) ? preferred : focusables[0];
    if (target) {
      target.focus();
      return;
    }
    if (!root.hasAttribute("tabindex")) {
      root.tabIndex = -1;
    }
    root.focus();
  };

  useLayoutEffect(() => {
    if (!active || !step) return;
    queueMicrotask(() => focusWithinDialog());
  }, [active, step, blockEscape]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root) return;

      if (event.key === "Escape") {
        if (blockEscapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key === "Tab") {
        handleDialogTabKey(event, root);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = containerRef.current;
      if (!root) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      focusWithinDialog();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [active]);

  return containerRef;
}
