# PARTNERS-SHARED-PROTOTYPE-01.1 — сдача

## Code

- **Branch:** `fix/r06-profile-catalog-prefill-01`
- **Code SHA:** `7818ba6ebd685aae476538936216e830392b0a34`
- **Baseline evidence (01):** `18e25907f1b4d6d33097e5e12bfebd16a54c43fd`
- **Prior code (01):** `e11cba2138eb3d0d1e4bdae1a98d5fe9187eecfd`

### Серверный допуск (исправление)

`resolvePartnersHubPresentation`: shared specialist shell только при `r06.featureEnabled && r06.eligible`. Агент — при `r04.featureEnabled && r04.eligible` с `defaultSearchRole="agent"`. Отрицательный / missing eligible, выключенный флаг, r04 без eligible → legacy. Unit: `partners-hub-presentation.test.ts` (agent priority, eligible specialist, r04 flag без r04 eligible → specialist, r06 eligible=false, gate off/null, без agent defaultSearchRole на legacy).

## Сборка и runtime

- **Tracked tree перед сборкой:** чистое (`treeDirtyBeforeBuild: false`)
- **sourceTreeDigest:** `7adc459851518851ef937ab04d3c32ea8167bf5d`
- **BUILD_ID:** `u-jVW1xOmV5gTZxLqWdCr` (`.next-r06-partners-shared-01-1`, `R06_FORCE_BUILD=1`, одна сборка)
- **runtimeVerified:** specialist / agent / ineligible = expected BUILD_ID (probe до stop server)

## Unit / rules

| Suite | Result |
|-------|--------|
| vitest (presentation, PartnersHub, agent-r04 filters/row/icons) | PASS (18) |
| `npx tsx --test src/lib/partnership-rules.test.ts` | PASS (20) |

## Functional MOCK (`PARTNERS-SHARED-01-1.json`)

- **PASS:** 24 / **FAIL:** 0
- Ineligible → legacy shell, legacy find tab
- Specialist/agent → shared shell, audience, search `role=pro` / `role=agent`, active/incoming/outgoing, list/cards, deeplink hub=link, search error + retry (mock call count)
- **preferences PATCH/GET/UI:** NOT_RUN (контракт navigator PRO + participation; employee-права не выдаются)

## Ref / impl captures (ограниченная матрица 01.1)

- **refProto SHA256:** `382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d`
- Все пары 01.1: **CAPTURED**, `refError: null`
- Find vs link: разные SHA256 ref (`ref-specialist-find-1440` ≠ `ref-specialist-link-1440`); assert вкладки и `#role-dialog` сегментов
- **geometry320:** overflowPage false

## Визуальные остатки

Pixel 1:1 и косметика **не** входят в 01.1. Исторические dark/card из 01 не перепривязаны к этому BUILD_ID. Общий visualPass по полной матрице 01 не заявляется.

## Вне scope

STORE/COMPANY не подключались. Production pin без выпуска. PR/merge/deploy/backend/deps не выполнялись.
