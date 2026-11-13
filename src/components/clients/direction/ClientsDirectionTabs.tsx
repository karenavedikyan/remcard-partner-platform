"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";

const TAB_ORDER: ClientsParityDirection[] = ["incoming", "at-partners"];

type Props = {
  direction: ClientsParityDirection;
  onDirectionChange: (direction: ClientsParityDirection) => void;
};

export function ClientsDirectionTabs({ direction, onDirectionChange }: Props) {
  const incomingRef = useRef<HTMLButtonElement>(null);
  const atPartnersRef = useRef<HTMLButtonElement>(null);

  const focusTab = useCallback(
    (next: ClientsParityDirection) => {
      onDirectionChange(next);
      queueMicrotask(() => {
        const target = next === "incoming" ? incomingRef.current : atPartnersRef.current;
        target?.focus();
      });
    },
    [onDirectionChange],
  );

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, current: ClientsParityDirection) => {
      const index = TAB_ORDER.indexOf(current);
      if (index < 0) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusTab(TAB_ORDER[(index + 1) % TAB_ORDER.length]!);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusTab(TAB_ORDER[(index + TAB_ORDER.length - 1) % TAB_ORDER.length]!);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusTab("incoming");
      } else if (event.key === "End") {
        event.preventDefault();
        focusTab("at-partners");
      }
    },
    [focusTab],
  );

  return (
    <div
      className="ca-tabs wallet-direction__tabs ca-preview-directions"
      role="tablist"
      data-testid="ca-clients-directions"
      aria-label="Направление клиентов"
    >
      <button
        ref={incomingRef}
        type="button"
        id="ca-clients-tab-incoming"
        className={`wallet-direction__tab${direction === "incoming" ? " is-active" : ""}`}
        role="tab"
        aria-selected={direction === "incoming"}
        aria-controls="ca-clients-panel-incoming"
        tabIndex={direction === "incoming" ? 0 : -1}
        data-ca-action="direction:incoming"
        onClick={() => focusTab("incoming")}
        onKeyDown={(event) => onTabKeyDown(event, "incoming")}
      >
        Клиенты у меня
      </button>
      <button
        ref={atPartnersRef}
        type="button"
        id="ca-clients-tab-at-partners"
        className={`wallet-direction__tab${direction === "at-partners" ? " is-active" : ""}`}
        role="tab"
        aria-selected={direction === "at-partners"}
        aria-controls="ca-clients-panel-at-partners"
        tabIndex={direction === "at-partners" ? 0 : -1}
        data-ca-action="direction:at-partners"
        onClick={() => focusTab("at-partners")}
        onKeyDown={(event) => onTabKeyDown(event, "at-partners")}
      >
        Мои клиенты у партнёров
      </button>
    </div>
  );
}
