"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { InviteStep } from "@/lib/invite-presentation";
import styles from "./InviteLanding.module.css";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const FLOW_ICONS: ReactNode[] = [
  <svg key="certificate" {...iconProps}>
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
    <path d="m10 14 4-4" />
  </svg>,
  <svg key="purchase" {...iconProps}>
    <path d="M6 8h12l-1 12H7Z" />
    <path d="M9 8V7a3 3 0 0 1 6 0v1" />
  </svg>,
  <svg key="reward" {...iconProps}>
    <circle cx="12" cy="12" r="8" />
    <path d="M10 16V8h2.5a2.25 2.25 0 0 1 0 4.5H9m0 2h4" />
  </svg>,
];

export function InviteFlow({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className={styles.how} data-testid="invite-flow">
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ol className={styles.flow}>
        {items.map((item, index) => (
          <li key={item}>
            {FLOW_ICONS[index] ?? null}
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InviteSteps({
  steps,
  current,
}: {
  steps: readonly InviteStep[];
  /** 1-based number of the step the visitor has to do now; 0 when it is unknown. */
  current: number;
}) {
  return (
    <ol className={styles.stepList} data-testid="invite-steps">
      {steps.map((step, index) => {
        const number = index + 1;
        const state = number < current ? "done" : number === current ? "current" : "todo";
        return (
          <li key={step.title} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className={styles.stepNum} aria-hidden="true">
              {state === "done" ? "✓" : number}
            </span>
            <div>
              <strong>
                {step.title}
                {state === "done" ? <span className={styles.srOnly}> — выполнено</span> : null}
              </strong>
              {state === "done" ? null : <small>{step.hint}</small>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * True while the observed block is scrolled out of the viewport. Stays false where
 * IntersectionObserver is missing, so the page never shows a duplicate action by default.
 */
export function useOffscreen<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setOffscreen(Boolean(entry) && !entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  });

  return [ref, offscreen];
}

/** Mobile-only bar with the current primary action while the main button is out of view. */
export function InviteDock({ visible, children }: { visible: boolean; children: ReactNode }) {
  if (!visible) return null;
  return (
    <div className={styles.dock} data-testid="invite-dock">
      {children}
    </div>
  );
}
