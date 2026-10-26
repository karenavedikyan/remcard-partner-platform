"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import { parsePoolPercentInput } from "@/lib/parse-pool-percent";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SelectField, TextField } from "@/components/ui/FormField";
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
  const [taxonomyState, setTaxonomyState] = useState<"loading" | "ready" | "error">("loading");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [pickCategory, setPickCategory] = useState("");
  const [pickPercent, setPickPercent] = useState("");
  const [editPercents, setEditPercents] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<{ limits?: OrgLimitRow[] }>("/api/pro/limits/org");
      const next = data.limits ?? [];
      setLimits(next);
      setEditPercents(
        Object.fromEntries(
          next.map((row) => [
            row.category,
            row.poolPercent == null ? "" : String(row.poolPercent),
          ]),
        ),
      );
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить условия");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadTaxonomy = useCallback(() => {
    setTaxonomyState("loading");
    setTaxonomyError("");
    void fetchPartnerTaxonomy()
      .then((tax) => {
        const keys = [
          ...tax.products.map((p) => p.id),
          ...tax.services.map((s) => s.id),
        ];
        setCategoryKeys([...new Set(keys.filter(Boolean))].sort());
        setTaxonomyState("ready");
      })
      .catch((caught) => {
        setTaxonomyError(
          caught instanceof Error ? caught.message : "Не удалось загрузить справочник категорий",
        );
        setTaxonomyState("error");
      });
  }, []);

  useEffect(() => {
    void reload();
    reloadTaxonomy();
  }, [reload, reloadTaxonomy]);

  const unusedCategories = useMemo(() => {
    const used = new Set(limits.map((l) => l.category));
    return categoryKeys.filter((k) => !used.has(k));
  }, [categoryKeys, limits]);

  async function saveCategory(category: string, categoryLabelText: string, percentRaw: string) {
    const parsed = parsePoolPercentInput(percentRaw);
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    await remcardFetch("/api/pro/limits/org", {
      method: "POST",
      body: {
        category,
        categoryLabel: categoryLabelText,
        poolPercent: parsed.value,
      },
    });
    return true;
  }

  async function saveNew() {
    if (!canEdit || saving) return;
    const category = pickCategory.trim();
    if (!category) {
      setError("Выберите категорию");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const ok = await saveCategory(category, categoryLabel(category), pickPercent);
      if (!ok) return;
      setPickCategory("");
      setPickPercent("");
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function saveExisting(category: string) {
    if (!canEdit || saving) return;
    setSaving(true);
    setError("");
    try {
      const row = limits.find((l) => l.category === category);
      const ok = await saveCategory(
        category,
        row?.categoryLabel || categoryLabel(category),
        editPercents[category] ?? "",
      );
      if (!ok) return;
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

  const formBlocked = taxonomyState === "error" && categoryKeys.length === 0;

  return (
    <div className={styles.root}>
      <Panel compact>
        <p className={styles.lead} data-testid="agent-general-terms-lead">
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
        {taxonomyState === "error" ? (
          <p className={styles.error} role="alert">
            {taxonomyError}{" "}
            <button type="button" className={styles.retry} onClick={() => reloadTaxonomy()}>
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
                  <td>
                    {canEdit ? (
                      <TextField
                        label="Общий %"
                        type="text"
                        inputMode="decimal"
                        value={editPercents[row.category] ?? ""}
                        onChange={(event) =>
                          setEditPercents((prev) => ({
                            ...prev,
                            [row.category]: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      `${row.poolPercent ?? "—"}%`
                    )}
                  </td>
                  {canEdit ? (
                    <td className={styles.rowActions}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => void saveExisting(row.category)}
                      >
                        Сохранить
                      </Button>
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
          <h3 className={styles.subheading}>Добавить категорию</h3>
          {formBlocked ? (
            <p className={styles.muted}>
              Справочник категорий недоступен — добавление временно заблокировано.
            </p>
          ) : (
            <>
              <div className={styles.formRow}>
                <div className={styles.selectField}>
                  <SelectField
                    label="Категория"
                    data-testid="agent-general-terms-category-select"
                    value={pickCategory}
                    disabled={taxonomyState !== "ready"}
                    onChange={(event) => setPickCategory(event.target.value)}
                  >
                    <option value="">—</option>
                    {unusedCategories.map((key) => (
                      <option key={key} value={key}>
                        {categoryLabel(key)}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <TextField
                  label="Общий процент"
                  type="text"
                  inputMode="decimal"
                  value={pickPercent}
                  onChange={(event) => setPickPercent(event.target.value)}
                  hint="Допустима запись 12,5"
                />
              </div>
              <Button type="button" disabled={saving || formBlocked} onClick={() => void saveNew()}>
                {saving ? "Сохранение…" : "Добавить"}
              </Button>
            </>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
