"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import styles from "../ProfileEditor.module.css";

type Props = {
  partnerType: BusinessProfilePartnerType;
  onGoToBasics: () => void;
};

export function BusinessCatalogPrerequisite({ partnerType, onGoToBasics }: Props) {
  const label = partnerType === "STORE" ? "магазина" : "компании";
  return (
    <Panel
      title="Подключение к каталогу"
      hint="Публикация добровольна и отделена от рабочего профиля."
    >
      <p className={styles.lead}>
        Сначала сохраните основные данные {label}: название, представителя и город. После этого
        можно подготовить публичную карточку организации и отправить её на проверку.
      </p>
      <div className={styles.actions}>
        <Button type="button" data-testid="business-catalog-go-basics" onClick={onGoToBasics}>
          Перейти к основным данным
        </Button>
      </div>
    </Panel>
  );
}
