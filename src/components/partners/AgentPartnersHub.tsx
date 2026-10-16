"use client";

import { useState } from "react";
import { PartnersHub, type PartnersHubProps } from "./PartnersHub";
import styles from "./AgentPartnersHub.module.css";

type Segment = "active" | "invitations";
type Panel = "list" | "find" | "link";

export function AgentPartnersHub(props: Omit<PartnersHubProps, "variant">) {
  const [segment, setSegment] = useState<Segment>("active");
  const [panel, setPanel] = useState<Panel>("list");

  return (
    <div className={styles.shell} data-testid="agent-r04-partners">
      {panel === "list" ? (
        <>
          <p className={styles.lead}>
            Действующие партнёры и приглашения разделены как в эталоне. Архив скрывает запись только у
            вас, не отменяя договор.
          </p>
          <div className={styles.segmentRow} role="tablist" aria-label="Раздел партнёров">
            <button
              type="button"
              role="tab"
              aria-selected={segment === "active"}
              className={segment === "active" ? styles.segmentActive : styles.segment}
              onClick={() => setSegment("active")}
            >
              Действующие
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={segment === "invitations"}
              className={segment === "invitations" ? styles.segmentActive : styles.segment}
              onClick={() => setSegment("invitations")}
            >
              Приглашения
            </button>
          </div>
          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryAction} onClick={() => setPanel("find")}>
              Найти в RemCard
            </button>
            <button type="button" className={styles.ghostAction} onClick={() => setPanel("link")}>
              Пригласить по ссылке
            </button>
          </div>
        </>
      ) : (
        <div className={styles.actionRow}>
          <button type="button" className={styles.ghostAction} onClick={() => setPanel("list")}>
            ← К списку партнёров
          </button>
        </div>
      )}

      <PartnersHub
        {...props}
        variant="agent-r04"
        agentSegment={panel === "list" ? segment : undefined}
        forcedTab={panel === "list" ? "list" : panel}
        defaultSearchRole="agent"
      />
    </div>
  );
}
