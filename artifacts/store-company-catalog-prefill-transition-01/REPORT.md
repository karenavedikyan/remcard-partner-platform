# STORE-COMPANY-CATALOG-PREFILL-TRANSITION-01 (acceptance closure)

Дата: 24.10.2026. Агент: `bc-6cb74748-26bd-44fd-ae54-da856527f81b`.

## Статус

**READY FOR REVIEW** (frontend-only). Изолированный browser smoke (desktop/mobile после перехода и reload) **не выполнялся** — в среде агента нет подключённого browser runner для dev-fixture; доказательства — component/integration tests на реальном `ProfileEditor`, `BusinessWorkingProfileWizard`, `OrganizationCatalogWizard` со stateful API double.

## Подтверждённые причины (без переписывания решения)

1. **Город seed:** пустая строка `catalogCity` / отсутствие org `publicCatalogCity` — рабочий `user.city` через `||`, без подмешивания `user.catalogCity` в org-карточку (backend GET: org city = `publicCatalogCity` с филиала, не user catalogCity).
2. **Этапы org:** prefill сравнивал merged stages с **user** `catalogNavigatorStageIds`; при совпадении user draft с seed org `orgCatalogNavigatorStageIds` не обновлялся.
3. **applyProfile:** ref prefill блокировал повторный merge после GET с тем же source key.

## Дополнительные правки приёмки

| # | Изменение |
|---|-----------|
| 1 | `ProfileEditor`: обновление org stages по `orgCatalogNavigatorStageIds`, не внутри user-only ветки |
| 2 | `catalog-prefill.ts`: org city = `publicCatalogCity \|\| workingCity` (без user `catalogCity`) |
| 3 | Regression: user `catalogDraft.navigatorStageIds` совпадает с working seed, org stages пуст → UI org wizard |
| 4 | Integration: SAVE-02-based `prof-test-org-transport.fixture.ts` + `catalog-prefill-org-transport.fixture.ts`, real `persistWorkingProfileDraft` / `persistCatalogDraftOnly` |
| 5 | Сценарии STORE/COMPANY: save basics → tab catalog; edit/clear catalog → save → GET → remount; working change не затирает catalog; dirty tab switch; org website/TG на шаге контактов |

## Таблица source → control

| GET source | Catalog field | Control |
|------------|---------------|---------|
| `organization.name` | card name | `catalog-public-name` |
| `organization.publicCatalogCity` then `user.city` | city | `catalog-city-input` (no branches) |
| `workingProfile.effective*Ids` | products/services/stages | `ProfileDirectionsPicker` in org wizard |
| `organization.website` / `organization.telegram` | site/TG | step 2 «Сайт с контактами» / Telegram |
| `workingProfile.partnershipContact*` → public contacts | phone/email | `AgentPhoneField`, email input |

## Diff scope

- `src/lib/specialist-r06/catalog-prefill.ts`
- `src/components/profile/ProfileEditor.tsx`
- `src/lib/prof-test-org-transport.fixture.ts` (from SAVE-02 ref, reused)
- `src/lib/catalog-prefill-org-transport.fixture.ts`
- `src/lib/specialist-r06/catalog-prefill.test.ts`
- `src/components/profile/ProfileEditor.catalog-prefill-transition.test.tsx`

Backend: **без изменений** (`15b296352c3a82691682e665a250e306b3f06db9`).

## Проверки (финальный прогон)

```bash
cd remcard-partner-platform
npm run test:component -- \
  src/lib/specialist-r06/catalog-prefill.test.ts \
  src/components/profile/ProfileEditor.catalog-prefill-transition.test.tsx \
  src/lib/profile-org-catalog-roundtrip.test.ts \
  src/components/profile/ProfileEditor.business-catalog.test.tsx
# Test Files 4 passed, Tests 35 passed

npx tsc --noEmit   # exit 0
npm run build      # exit 0
```

## SHA

| | |
|--|--|
| Frontend base (release/prof-v1-20261007) | `6a70eb1bdce37ddda86f4004ecc725a40807a5d2` |
| Code fix (branch tip after this turn) | *(commit after push)* |
| Backend (unchanged) | `15b296352c3a82691682e665a250e306b3f06db9` |

## Минимальный выпуск

Frontend-only: ветка `fix/store-company-catalog-prefill-transition-01`. PR/merge/deploy не выполнялись.

## Не проверено

- Изолированный browser smoke (desktop/mobile) после UI-перехода и reload.
