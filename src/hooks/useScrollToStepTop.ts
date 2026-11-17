"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Attribute marking the step title that receives focus after a step change. */
export const STEP_HEADING_ATTR = "data-step-heading";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A field inside the step already has focus (the user started typing): do not steal it. */
function userIsEditingInside(root: HTMLElement): boolean {
  const active = document.activeElement;
  if (!active || !root.contains(active)) return false;
  return active.matches("input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true]");
}

/**
 * Scrolls `root` so its top sits under the sticky header (the offset comes from the
 * `scroll-margin-top` of the element, see `[data-step-scroll-root]` in globals.css) and moves
 * focus to the step heading without a second scroll.
 */
export function scrollStepRootToTop(root: HTMLElement): void {
  if (typeof root.scrollIntoView === "function") {
    root.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }
  const heading = root.querySelector<HTMLElement>(`[${STEP_HEADING_ATTR}]`);
  if (heading && !userIsEditingInside(root)) {
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

/** Brings a status/alert message into view with the minimum scroll. */
export function scrollMessageIntoView(el: HTMLElement | null | undefined): void {
  if (!el || typeof el.scrollIntoView !== "function") return;
  el.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/**
 * Scrolls to the top of a wizard/section card whenever `stepKey` changes (never on first render).
 * The scroll runs in `requestAnimationFrame`, i.e. after the new step has been rendered.
 * `null`/`undefined` means "not ready yet" (e.g. still loading): the move out of that state is not a step change.
 */
export function useScrollToStepTop(
  ref: RefObject<HTMLElement | null>,
  stepKey: string | number | null | undefined,
): void {
  const previousKey = useRef(stepKey);
  useEffect(() => {
    const before = previousKey.current;
    if (Object.is(before, stepKey)) return;
    previousKey.current = stepKey;
    if (before == null || stepKey == null) return;
    const frame = requestAnimationFrame(() => {
      const root = ref.current;
      if (root) scrollStepRootToTop(root);
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, stepKey]);
}

/** Keeps a freshly shown status/alert message visible (e.g. after «Сохранить»). */
export function useScrollMessageIntoView(
  ref: RefObject<HTMLElement | null>,
  message: unknown,
): void {
  useEffect(() => {
    if (!message) return;
    const frame = requestAnimationFrame(() => scrollMessageIntoView(ref.current));
    return () => cancelAnimationFrame(frame);
  }, [ref, message]);
}

/**
 * Keeps the active tab of a horizontally scrollable tab strip in view
 * (`aria-selected="true"` / `aria-current` marks it). Runs on mount and when `activeKey` changes.
 */
export function useScrollActiveTabIntoView(
  ref: RefObject<HTMLElement | null>,
  activeKey: string | number | null | undefined,
): void {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const active = ref.current?.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-current="page"], [aria-current="true"]',
      );
      if (active && typeof active.scrollIntoView === "function") {
        active.scrollIntoView({ inline: "center", block: "nearest" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, activeKey]);
}
