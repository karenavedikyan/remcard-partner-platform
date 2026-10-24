# STORE-COMPANY-CATALOG-PREFILL-TRANSITION-01

Дата: 24.10.2026. Агент: `bc-6cb74748-26bd-44fd-ae54-da856527f81b`.

## Статус

**READY FOR REVIEW** (frontend-only). Browser smoke (desktop/mobile после перехода и reload) **не выполнялся** — в cloud VM нет изолированного browser runner для `dev-fixture` без отдельного поднятия dev-сервера и сценария; покрытие — component/integration tests на реальном `ProfileEditor` + `OrganizationCatalogWizard`.

## Воспроизведённая причина

1. **`workingProfileCatalogSeed` / город:** выражение `(u.catalogCity ?? u.city ?? "").trim()` не подставляло рабочий `user.city`, когда `catalogCity === ""` (пустая строка — не `null`/`undefined`). Для STORE/COMPANY форма каталога берёт `organization.publicCatalogCity`; при пустом org-городе seed оставался пустым → merge не заполнял поле города в wizard.
2. **`ProfileEditor` / этапы:** prefill-effect обновлял только `catalogNavigatorStageIds`, тогда как `OrganizationCatalogWizard` для org-сущности получает `catalogStageIds={orgCatalogNavigatorStageIds}` — сохранённые рабочие этапы не попадали в UI каталога.
3. **`applyProfile` / повторный seed:** после save/GET `catalogPrefillAppliedKeyRef` сохранял старый ключ → при том же `catalogPrefillSourceKey` effect пропускал merge, хотя `applyProfile` уже сбросил catalog-slice с GET (пустой org draft).

## Таблица source → поле каталога → control

| Источник GET (рабочий / org) | Поле seed / draft | Control в `OrganizationCatalogWizard` |
|------------------------------|-------------------|----------------------------------------|
| `organization.name` | `catalogPublicName` / `organizationName` | `#oc-public-name` (`catalog-public-name`) |
| `user.city` при пустом `organization.publicCatalogCity` и не-touched | `catalogCity` | `#oc-city` (`catalog-city-input`, без филиалов) |
| `workingProfile.effectiveProductCategoryIds` | `storeCategories` | `ProfileDirectionsPicker` → товары |
| `workingProfile.effectiveServiceSpecializationIds` | `specializations` | `ProfileDirectionsPicker` → услуги |
| `workingProfile.effectiveNavigatorStageIds` | `navigatorStageIds` → **org** state | `ProfileDirectionsPicker` → этапы |
| `workingProfile.partnershipContactPhone` / `user.publicPhone` | `publicPhone` | `AgentPhoneField` (шаг «Контакты») |
| `workingProfile.partnershipContactEmail` / `user.publicEmail` | `publicEmail` | email input |
| `organization.website` / `organization.telegram` (STORE/COMPANY) | `website`, `telegram` | поля шага оформления |
| `organization.logoUrl` / описание org | только при наличии в GET | не расширяли scope |

Имя представителя (`user.displayName`) не подменяет название организации — без изменений.

## Diff scope (frontend-only)

- `src/lib/specialist-r06/catalog-prefill.ts` — город seed для user/org.
- `src/components/profile/ProfileEditor.tsx` — sync `orgCatalogNavigatorStageIds` при prefill; сброс `catalogPrefillAppliedKeyRef` в `applyProfile`.
- Tests: `catalog-prefill.test.ts`, `ProfileEditor.catalog-prefill-transition.test.tsx`.

Backend **не менялся**.

## Базы

| Репозиторий | База задачи | Final SHA (после фикса) |
|-------------|-------------|-------------------------|
| remcard-partner-platform | `6a70eb1bdce37ddda86f4004ecc725a40807a5d2` (release/prof-v1-20261007) | `9e6595e3` (branch `fix/store-company-catalog-prefill-transition-01`) |
| remcard-navigator | `15b296352c3a82691682e665a250e306b3f06db9` | без изменений |

Production SAVE-02: backend deployment active, не затрагивался.

## Проверки

```bash
cd remcard-partner-platform
npm run test:component -- \
  src/lib/specialist-r06/catalog-prefill.test.ts \
  src/components/profile/ProfileEditor.catalog-prefill-transition.test.tsx
# 15 passed

npx tsc --noEmit
# exit 0

npm run build
# exit 0
```

Существующие: `profile-org-catalog-roundtrip.test.ts`, `OrganizationCatalogWizard.stages.test.tsx` — без регрессий в прогоне roundtrip.

## Минимальный будущий выпуск

**Frontend-only:** один commit/SHA на `fix/store-company-catalog-prefill-transition-01` от `6a70eb1b…`. Backend release не требуется.

## PR / deploy

Не выполнялись (по ограничениям задачи).
