"use client";

import type { ClientsParityDirection } from "@/lib/clients-parity/types";

type Props = {
  direction: ClientsParityDirection;
  onDirectionChange: (direction: ClientsParityDirection) => void;
};

export function ClientsDirectionTabs({ direction, onDirectionChange }: Props) {
  return (
    <div
      className="ca-tabs wallet-direction__tabs ca-preview-directions"
      role="tablist"
      data-testid="ca-clients-directions"
      aria-label="Направление клиентов"
    >
      <button
        type="button"
        className={`wallet-direction__tab${direction === "incoming" ? " is-active" : ""}`}
        role="tab"
        aria-selected={direction === "incoming"}
        data-ca-action="direction:incoming"
        onClick={() => onDirectionChange("incoming")}
      >
        Клиенты у меня
      </button>
      <button
        type="button"
        className={`wallet-direction__tab${direction === "at-partners" ? " is-active" : ""}`}
        role="tab"
        aria-selected={direction === "at-partners"}
        data-ca-action="direction:at-partners"
        onClick={() => onDirectionChange("at-partners")}
      >
        Мои клиенты у партнёров
      </button>
    </div>
  );
}
