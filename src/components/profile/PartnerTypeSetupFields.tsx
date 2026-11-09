"use client";

import { ProfileDirectionsPicker } from "@/components/profile/ProfileDirectionsPicker";
import type { PartnerKindUi } from "@/lib/partner-kind-ui";
import styles from "./PartnerTypeSettings.module.css";

export type PartnerTypeSetupFormValue = {
  publicName: string;
  city: string;
  serviceSpecializationIds: string[];
  productCategoryIds: string[];
  organizationName: string;
};

export type PartnerTypeSetupCopyMode = "switch" | "recovery";

type Props = {
  targetKind: PartnerKindUi;
  value: PartnerTypeSetupFormValue;
  fieldErrors?: Record<string, string>;
  organizationNameReadOnly?: boolean;
  copyMode?: PartnerTypeSetupCopyMode;
  disabled?: boolean;
  onChange: (next: PartnerTypeSetupFormValue) => void;
};

const SETUP_LEAD: Record<PartnerTypeSetupCopyMode, string> = {
  recovery:
    "Проверьте данные профиля для текущего типа. Можно отредактировать — сохраним после подтверждения.",
  switch:
    "Проверьте данные нового профиля. Можно отредактировать — сохраним вместе со сменой типа.",
};

export function PartnerTypeSetupFields({
  targetKind,
  value,
  fieldErrors,
  organizationNameReadOnly = false,
  copyMode = "switch",
  disabled = false,
  onChange,
}: Props) {
  const showOrg = targetKind === "store" || targetKind === "company";
  const showDirections = targetKind === "specialist" || showOrg;

  return (
    <fieldset
      className={styles.setupFields}
      disabled={disabled}
      aria-label="Данные профиля для выбранного типа"
      data-testid="partner-type-setup-fields"
      data-partner-type-setup-copy={copyMode}
    >
      <p className={styles.setupLead}>{SETUP_LEAD[copyMode]}</p>
      <label className={styles.setupField}>
        <span>{showOrg ? "Имя представителя" : "Публичное имя"}</span>
        <input
          data-testid="partner-type-setup-publicName"
          value={value.publicName}
          onChange={(e) => onChange({ ...value, publicName: e.target.value })}
          autoComplete="name"
        />
        {fieldErrors?.publicName ? (
          <span className={styles.fieldError} role="alert">
            {fieldErrors.publicName}
          </span>
        ) : null}
      </label>
      {showOrg ? (
        <label className={styles.setupField}>
          <span>Название организации</span>
          <input
            data-testid="partner-type-setup-organizationName"
            value={value.organizationName}
            readOnly={organizationNameReadOnly}
            aria-readonly={organizationNameReadOnly || undefined}
            onChange={(e) => onChange({ ...value, organizationName: e.target.value })}
          />
          {organizationNameReadOnly ? (
            <span className={styles.optionDesc}>
              После публикации каталога название меняет только поддержка.
            </span>
          ) : null}
          {fieldErrors?.organizationName ? (
            <span className={styles.fieldError} role="alert">
              {fieldErrors.organizationName}
            </span>
          ) : null}
        </label>
      ) : null}
      <label className={styles.setupField}>
        <span>Город</span>
        <input
          data-testid="partner-type-setup-city"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          autoComplete="address-level2"
        />
        {fieldErrors?.city ? (
          <span className={styles.fieldError} role="alert">
            {fieldErrors.city}
          </span>
        ) : null}
      </label>
      {showDirections ? (
        <div className={styles.setupPicker}>
          <ProfileDirectionsPicker
            productCategoryIds={
              targetKind === "specialist" ? [] : value.productCategoryIds
            }
            serviceSpecializationIds={value.serviceSpecializationIds}
            navigatorStageIds={[]}
            primaryDirection={null}
            specialistMode={targetKind === "specialist"}
            businessTabbedPick={showOrg}
            omitLead
            omitNavigatorStagesAndPrimary
            disabled={disabled}
            tileLayout={targetKind === "specialist"}
            onChangeProducts={(ids) => onChange({ ...value, productCategoryIds: ids })}
            onChangeServices={(ids) => onChange({ ...value, serviceSpecializationIds: ids })}
            onChangeStages={() => {}}
            onChangePrimary={() => {}}
          />
          {fieldErrors?.serviceSpecializationIds ? (
            <span className={styles.fieldError} role="alert">
              {fieldErrors.serviceSpecializationIds}
            </span>
          ) : null}
          {fieldErrors?.tradeDirections ? (
            <span className={styles.fieldError} role="alert">
              {fieldErrors.tradeDirections}
            </span>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
