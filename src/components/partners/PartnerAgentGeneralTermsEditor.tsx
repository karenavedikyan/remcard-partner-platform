"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import styles from "./PartnerAgentGeneralTermsEditor.module.css";

type OrgLimitRow = {
  id: string;
  category: string;
  categoryLabel: string;
  poolPercent: number | null;
};

type PartnerAgentGeneralTermsEditorProps = {
  canEdit: boolean;
  readOnlyReason?: string;
};

export function PartnerAgentGeneralTermsEditor({
  canEdit,
  readOnlyReason,
}: PartnerAgentGeneralTermsEditorProps) {
  const [limits, setLimits] = useState<OrgLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryKeys, setCategoryKeys] = useState<string[]>([]);
  const [pickCategory, setPickCategory] = useState("");
  const [pickPercent, setPickPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<{ limits?: OrgLimitRow[] }>("/api/pro/limits/org");
      setLimits(data.limits ?? []);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить условия");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    void fetchPartnerTaxonomy()
      .then((tax) => {
        const keys = [
          ...tax.products.map((p) => p.id),
          ...tax.services.map((s) => s.id),
          ...tax.stages.map((s) => s.id),
        ];
        setCategoryKeys([...new Set(keys.filter(Boolean))].sort());
      })
      .catch(() => {
        /* taxonomy optional for display */
      });
  }, [reload]);

  const unusedCategories = useMemo(() => {
    const used = new Set(limits.map((l) => l.category));
    return categoryKeys.filter((k) => !used.has(k));
  }, [categoryKeys, limits]);

  async function saveNew() {
    if (!canEdit || saving) return;
    const category = pickCategory.trim();
    const value = Number(pickPercent);
    if (!category) {
      setError("Выберите категорию");
      return;
    }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("Общий процент должен быть от 0 до 100");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await remcardFetch("/api/pro/limits/org", {
        method: "POST",
        body: {
          category,
          categoryLabel: categoryLabel(category),
          poolPercent: value,
        },
      });
      setPickCategory("");
      setPickPercent("");
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category: string) {
    if (!canEdit || saving) return;
    setSaving(true);
    setError("");
    try {
      await remcardFetch("/api/pro/limits/org", {
        method: "DELETE",
        body: { category },
      });
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось удалить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.root}>
      <Panel compact>
        <p className={styles.lead}>
          Эти условия видны агентам в RemCard до отправки запроса на сотрудничество. Они применяются к
          новым обсуждениям и не меняют уже принятые персональные условия и выпущенные сертификаты.
        </p>
        {!canEdit && readOnlyReason ? (
          <p className={styles.muted}>{readOnlyReason}</p>
        ) : null}
        {loading ? <p className={styles.muted}>Загрузка…</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}{" "}
            <button type="button" className={styles.retry} onClick={() => void reload()}>
              Повторить
            </button>
          </p>
        ) : null}
        {!loading && limits.length === 0 ? (
          <p className={styles.muted}>Опубликованных категорий пока нет.</p>
        ) : null}
        {!loading && limits.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Категория</th>
                <th>Общий %</th>
                {canEdit ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {limits.map((row) => (
                <tr key={row.id}>
                  <td>{row.categoryLabel || categoryLabel(row.category)}</td>
                  <td>{row.poolPercent ?? "—"}%</td>
                  {canEdit ? (
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => void removeCategory(row.category)}
                      >
                        Удалить
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>

      {canEdit ? (
        <Panel compact>
          <h3 className={styles.subheading}>Добавить или обновить категорию</h3>
          <div className={styles.formRow}>
            <label className={styles.selectLabel}>
              Категория
              <select
                className={styles.select}
                value={pickCategory}
                onChange={(event) => setPickCategory(event.target.value)}
              >
                <option value="">—</option>
                {unusedCategories.map((key) => (
                  <option key={key} value={key}>
                    {categoryLabel(key)}
                  </option>
                ))}
                {pickCategory && !unusedCategories.includes(pickCategory) ? (
                  <option value={pickCategory}>{categoryLabel(pickCategory)}</option>
                ) : null}
              </select>
            </label>
            <TextField
              label="Общий процент"
              type="number"
              min={0}
              max={100}
              value={pickPercent}
              onChange={(event) => setPickPercent(event.target.value)}
              hint="Скидка клиенту + бонус агенту в пределах этого пула"
            />
          </div>
          <Button type="button" disabled={saving} onClick={() => void saveNew()}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </Panel>
      ) : null}
    </div>
  );
}
