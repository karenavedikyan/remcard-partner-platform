# STORE-COMPANY-PROFILE-PARITY-02.4

Git tips at turn start (remote facts):

| Repo | HEAD |
|------|------|
| remcard-partner-platform (F) | `7113b5cbca8ca6e4f5d455c7a55a18c5d294662c` |
| remcard-navigator (B) | `c88f63231e1da6981af3e47b237ddf5552ca7228` |

Reviewer comparison bases (this turn): F `b520f5529964c71676010ca2b3b28e5fa9bb713e`, B `59c073f2b567bd311e1bbe67a5e4fa398f630e5e`.

## ПРИНЯТО (не переделывать)

- Turn 02.3 `mergeOrgCatalogDraftMeta` / shallow `catalogTouched` fix on B (`route.patch.catalog-meta.test.ts`, 8 cases).

## Выполнено (02.4)

### Каталог: контекст филиала (F)

- `OrganizationCatalogPublicBranchSelector` — owner GET `/api/pro/organization`, PATCH `publicCatalogBranchId` only, GET profile reload; без PATCH `Branch.city`.
- Селектор над карточкой «Подключение к каталогу»; на вкладке каталога скрыт глобальный `ProfileBranchContextSwitcher` (рабочий контекст ≠ публичный pin).
- Шаг 1: «Карточка партнёра», copy ref (публичное название, «Для отправки на проверку», helper); без поля «Город» при `branchCount > 0`; accordion «Филиалы уже добавлены (N)».
- `persistCatalogDraftOnly`: `navigatorStageIds` на org PATCH; pin `publicCatalogBranchId` при сохранении без неявной перезаписи города филиала при смене селектора.

### Legacy aside (F)

- `ProfileEditor`: aside «Подсказка» / «Организация» скрыт только для business catalog tab (`businessOrgCatalogUi && catalog`).

### Направления / этапы (F + B, draft-контракт)

- `OrganizationCatalogWizard`: wired `ProfileDirectionsPicker` stages; step-2 copy ref; client validation + `catalogMissingForSubmit` для org.
- B: `OrgCatalogDraftPayload.navigatorStageIds` в JSON meta; PATCH merge; GET profile `organization.publicNavigatorStageIds`; submit validation `validateOrgCatalogForModeration`.
- F: `orgCatalogNavigatorStageIdsFromProfile`, отдельное состояние от User `catalogNavigatorStageIds` (без fallback рабочих stages).

### Тесты

- F: `profile-save.org-catalog-city` (+ pin/stages/no branch PATCH), `profile-org-catalog-stages-hydration`, pending org section props.
- B: `route.patch.catalog-meta` (+ navigatorStageIds merge, 9 cases).

### Сборки / полный F vitest

- F `npm run build`: OK.
- B `npm run build`: OK.
- F full vitest: **479 pass / 9 fail** (baseline 9 unchanged).

## Blocked / частичный контракт (этапы org → live)

- В `Organization` нет live-колонки для этапов каталога; `buildOrgApproveUpdate` не переносит `navigatorStageIds` в опубликованные поля — фильтрация публичного каталога по этапам для STORE/COMPANY после approve **не завершена**.
- Минимальное согласованное расширение (вне этого turn): live storage + approve mapping + публичный read path (без обхода модерации).

## Visual / manifest (02.4)

- Код UI закоммичен отдельно от артефактов; полный ref+impl manifest с покадровой provenance — **отложен** на commit артефактов после smoke capture (prototype path из turn spec, без registration wait).

## SHA после коммитов 02.4

| Repo | Tip |
|------|-----|
| remcard-partner-platform (F) | `647b556c076351f4ab8b5181a33cfc8eec5ba20a` |
| remcard-navigator (B) | `9f61abe4ad5614c22c9ad1c2f5e63774830c56b6` |
