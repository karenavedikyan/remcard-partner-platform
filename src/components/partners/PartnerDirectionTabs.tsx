"use client";

import { useRef, type KeyboardEvent } from "react";
import type { DirectionTabCopy } from "@/lib/partner-directions/direction";
import type { PartnershipDirection } from "@/lib/types";
import styles from "./PartnerDirectionTabs.module.css";

type Props = {
  value: PartnershipDirection;
  onChange: (direction: PartnershipDirection) => void;
  copy: DirectionTabCopy;
  panelId: string;
};

const ORDER: PartnershipDirection[] = ["incoming", "outgoing"];

export function partnerDirectionTabId(direction: PartnershipDirection): string {
  return `partner-direction-tab-${direction}`;
}

export function PartnerDirectionTabs({ value, onChange, copy, panelId }: Props) {
  const refs = useRef<Record<PartnershipDirection, HTMLButtonElement | null>>({
    incoming: null,
    outgoing: null,
  });

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, direction: PartnershipDirection) {
    const index = ORDER.indexOf(direction);
    let next: PartnershipDirection | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = ORDER[(index + 1) % ORDER.length];
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = ORDER[(index + ORDER.length - 1) % ORDER.length];
    else if (event.key === "Home") next = ORDER[0];
    else if (event.key === "End") next = ORDER[ORDER.length - 1];
    if (!next) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div className={styles.root} role="tablist" aria-label={copy.ariaLabel} data-testid="partner-direction-tabs">
      {ORDER.map((direction) => {
        const selected = value === direction;
        return (
          <button
            key={direction}
            ref={(node) => {
              refs.current[direction] = node;
            }}
            type="button"
            role="tab"
            id={partnerDirectionTabId(direction)}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            data-testid={`partner-direction-tab-${direction}`}
            title={direction === "incoming" ? copy.incomingHint : copy.outgoingHint}
            onClick={() => onChange(direction)}
            onKeyDown={(event) => onKeyDown(event, direction)}
          >
            <span className={styles.label}>{direction === "incoming" ? copy.incoming : copy.outgoing}</span>
          </button>
        );
      })}
    </div>
  );
}
