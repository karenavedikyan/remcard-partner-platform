"use client";

import type { BranchPreviewModel } from "@/lib/branch-catalog-preview";
import { Panel } from "@/components/ui/Panel";
import styles from "./ProfileEditor.module.css";

export function BranchCatalogPublicationPreview({ model }: { model: BranchPreviewModel }) {
  return (
    <Panel title="Предпросмотр публикации филиала">
      <div data-testid="branch-public-preview">
        <p>
          <strong>{model.title}</strong>
        </p>
        <p>
          {model.city}, {model.address}
        </p>
        {model.workingHours ? <p>Часы: {model.workingHours}</p> : null}
        {model.description ? <p>{model.description}</p> : null}
        {model.productLabels.length ? (
          <p className={styles.hint}>Товары: {model.productLabels.join(", ")}</p>
        ) : null}
        {model.serviceLabels.length ? (
          <p className={styles.hint}>Услуги: {model.serviceLabels.join(", ")}</p>
        ) : null}
        {model.contactLines.length ? (
          <ul className={styles.notesList}>
            {model.contactLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}
