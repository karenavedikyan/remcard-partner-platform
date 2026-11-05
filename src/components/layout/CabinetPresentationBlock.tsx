"use client";

import { useRouter } from "next/navigation";
import { SessionGate } from "@/components/auth/SessionGate";
import { Button } from "@/components/ui/Button";
import styles from "@/components/agent-r03/agent-r03.module.css";
import type { CabinetPresentationBlock } from "@/lib/cabinet-presentation/access-block";

export function CabinetPresentationBlockView({
  block,
}: {
  block: Exclude<CabinetPresentationBlock, { blocked: false }>;
}) {
  const router = useRouter();

  if (block.kind === "session") {
    return <SessionGate reason="session" returnTo={block.returnTo} />;
  }

  return (
    <main
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 720,
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <div className={styles.errorBlock} data-testid={`cabinet-presentation-block-${block.kind}`}>
        <p role="alert">{block.message}</p>
        <Button
          variant="secondary"
          onClick={() => {
            if (block.kind === "transient") {
              router.refresh();
              return;
            }
            router.push(block.returnTo);
          }}
        >
          {block.kind === "transient" ? "Повторить" : "На главную"}
        </Button>
      </div>
    </main>
  );
}
