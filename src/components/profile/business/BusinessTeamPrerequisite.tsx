"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import styles from "../ProfileEditor.module.css";

type Props = {
  partnerType: BusinessProfilePartnerType;
  onGoToBasics: () => void;
};

export function BusinessTeamPrerequisite({ partnerType, onGoToBasics }: Props) {
  const label = partnerType === "STORE" ? "магазина" : "компании";
  return (
    <Panel title="Сотрудники" hint="Команда организации открывается после основных данных.">
      <p className={styles.lead}>
        Сначала сохраните основные данные {label}. После создания организации здесь появятся
        филиалы, сотрудники и приглашения — не SOLO-команда мастера.
      </p>
      <div className={styles.actions}>
        <Button type="button" data-testid="business-team-go-basics" onClick={onGoToBasics}>
          Перейти к основным данным
        </Button>
      </div>
    </Panel>
  );
}
