"use client";

import { useState } from "react";
import {
  BRANCH_CONTACT_KINDS,
  type BranchContactsForm,
  type OrgPublicContactRow,
  orgContactsToSelectable,
} from "@/lib/branch-public-contacts";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileEditor.module.css";

const CONTACT_LABELS: Record<string, string> = {
  telegram: "Telegram",
  max: "MAX",
  vk: "VK",
  yandex: "Яндекс",
  phone: "Телефон",
  email: "Email",
  site: "Сайт",
  whatsapp: "WhatsApp",
};

type ProfileBranchContactsSectionProps = {
  form: BranchContactsForm;
  orgContacts: OrgPublicContactRow[];
  disabled?: boolean;
  onChange: (next: BranchContactsForm) => void;
};

export function ProfileBranchContactsSection({
  form,
  orgContacts,
  disabled,
  onChange,
}: ProfileBranchContactsSectionProps) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const selectable = orgContactsToSelectable(orgContacts);

  function toggleChannel(kind: (typeof BRANCH_CONTACT_KINDS)[number], active: boolean) {
    onChange({
      ...form,
      [kind]: { ...form[kind], isActive: active },
    });
  }

  function confirmCopy() {
    const next = { ...form };
    for (const kind of selected) {
      const row = selectable.find((r) => r.type === kind);
      if (!row?.value?.trim()) continue;
      if (!BRANCH_CONTACT_KINDS.includes(kind as (typeof BRANCH_CONTACT_KINDS)[number])) continue;
      next[kind as (typeof BRANCH_CONTACT_KINDS)[number]] = {
        isActive: true,
        value: row.value.trim(),
      };
    }
    onChange(next);
    setCopyOpen(false);
    setSelected([]);
  }

  return (
    <div className={styles.fields}>
      <p className={styles.hint}>
        Публичные контакты филиала. Очистка канала означает отсутствие контакта, без подстановки
        контактов организации.
      </p>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => setCopyOpen(true)}>
          Заполнить из профиля организации
        </Button>
      </div>
      {copyOpen ? (
        <div className={styles.bannerWarn}>
          <p>Выберите каналы для копии. Это снимок — дальнейшие изменения организации не затронут филиал.</p>
          {selectable.length === 0 ? (
            <p>У организации пока нет публичных контактов — заполните вручную в каталоге организации или здесь.</p>
          ) : (
            <ul className={styles.notesList}>
              {selectable.map((row) => (
                <li key={row.type}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(row.type)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, row.type]
                            : prev.filter((t) => t !== row.type),
                        )
                      }
                    />{" "}
                    {CONTACT_LABELS[row.type] ?? row.type}: {row.value}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.actions}>
            <Button type="button" disabled={!selected.length} onClick={confirmCopy}>
              Скопировать выбранные
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCopyOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}
      {BRANCH_CONTACT_KINDS.map((kind) => (
        <div key={kind}>
          <label className={styles.hint}>
            <input
              type="checkbox"
              checked={form[kind].isActive}
              disabled={disabled}
              onChange={(e) => toggleChannel(kind, e.target.checked)}
            />
            {CONTACT_LABELS[kind]}
          </label>
          {form[kind].isActive ? (
            <TextField
              label={`Значение (${CONTACT_LABELS[kind]})`}
              value={form[kind].value}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...form, [kind]: { ...form[kind], value: e.target.value } })
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
