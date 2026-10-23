# STORE-COMPANY-PROFILE-PARITY-02.5

Tips at turn start:

| Repo | HEAD |
|------|------|
| F | `647b556c076351f4ab8b5181a33cfc8eec5ba20a` |
| B | `9f61abe4ad5614c22c9ad1c2f5e63774830c56b6` |

## Исправлено / подтверждено

### Pin филиала без потери локального черновика (F)

- `applyOrganizationCatalogBranchPin` в `ProfileEditor`: обновляет только `publicCatalogBranchId` / `publicCatalogCity` / `branchCount` при том же `user.id` и `organization.id`; иначе полный `applyProfile`.
- Регрессии STORE + COMPANY в `ProfileEditor.business-catalog.test.tsx` (реальный editor + selector + remcardFetch).

### Этапы в business catalog UI (F)

- `ProfileDirectionsPicker`: блок этапов при `catalogMode && businessTabbedPick` (без изменения optional stages в рабочем профиле).
- `OrganizationCatalogWizard`: `catalogGroupedDetails`; тест wizard step2 + «Далее» с реальным picker.

### Guards draft stages (B)

- PENDING: PATCH `navigatorStageIds` → **409**, без `organization.update` (в т.ч. mixed pin+stages).
- `normalizeOrgCatalogNavigatorStageIds`: пустые/невалидные id отбрасываются; `['']` → `[]`.
- Submit: `validateOrgCatalogForModeration` считает только валидные taxonomy ids.

### Селектор филиала (F)

- Только `isActive !== false` в options; ошибка загрузки / нет active — видимый alert, не silent null.

## Blocker (live contract)

См. `LIVE-CONTRACT-ORG-STAGES.md` — предложение колонки `Organization.catalogNavigatorStageIds` + approve/GET/public read. **Не реализовано** в 02.5. Stages **не готовы к выпуску** как live-поведение.

## Visual / manifest (02.4 carryover)

Парные ref+impl captures и полный manifest — отдельный artifact commit после smoke (code SHA vs render SHA). См. tip после artifact commit ниже.

## Проверки

- F targeted regressions: business-catalog, wizard stages, directions picker — pass.
- F full vitest: **485 pass / 9 fail** (baseline 9).
- B: PATCH meta **12** cases + orgCatalogNavigatorStages unit — pass.
- F/B `npm run build`: OK.

## Tips после коммита 02.5

| Repo | Tip |
|------|-----|
| F | `0a073cfe74ad325ff713a6a53677ad5e62d144bd` (code); `cdcc19064135e6d5e995db946f5b46f3911847ad` (feature commit без REPORT) |
| B | `a677ae90c61f6212057b0e8f693530bce19811ce` |

Visual artifact commit: **pending** (impl/ref manifest отдельно от code tip выше).
