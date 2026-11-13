"use client";

import {
  isReceivingSettingsMaterialized,
  type ReceivingPartnerSettings,
} from "@/lib/clients-parity/receiving-appeals-api";

/** prototype renderSettingsInline — persisted via POST working-stages. */
export type WorkingStagesEditorProps = {
  settings: ReceivingPartnerSettings;
  disabled?: boolean;
  onSave?: (next: ReceivingPartnerSettings) => void;
};

export function WorkingStagesEditor({ settings, disabled = true, onSave }: WorkingStagesEditorProps) {
  return (
    <section data-testid="ca-receiving-working-stages-editor" aria-label="Этапы и причины">
      <p className="muted">
        {isReceivingSettingsMaterialized(settings)
          ? `Рабочих этапов: ${settings.workingStages.length}; причин отказа: ${settings.refusalReasons.length}.`
          : "Этапы и причины отсутствуют на сервере — ожидается K8 settings storage, не локальные константы."}
        {" "}
        Сохранение {disabled || !onSave ? "недоступно" : "доступно"} до контракта K8/K1.
      </p>
    </section>
  );
}
