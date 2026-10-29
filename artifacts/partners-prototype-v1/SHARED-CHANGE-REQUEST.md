# SHARED-CHANGE-REQUEST — partners-prototype-v1

Независимый patch в shared-файлы **не коммитился** как «чужая» правка типов/auth. Ниже — necessary tooling + API gaps.

## 1. `vitest.config.ts` (tooling)

**Path:** `vitest.config.ts`  
**Rationale:** include owned unit tests under `src/lib/partners-prototype-v1/*.test.ts` (vitest include allowlist).  
**Patch proposal:** add:

```ts
"src/lib/partners-prototype-v1/invite-wizard-state.test.ts",
"src/lib/partners-prototype-v1/repair-path.test.ts",
"src/lib/partners-prototype-v1/partner-kind-adapter.test.ts",
"src/lib/partners-prototype-v1/published-terms.test.ts",
```

*(В task-ветке уже добавлено для прогона; Computer может принять как scoped tooling.)*

## 2. Backend search facets (navigator)

**Path (backend):** partnership search handler / DTO  
**Frontend types (shared — не править молча):** `src/lib/types.ts` → `PartnerSearchResponse`

**Rationale:** витрина «Путь ремонта» требует счётчики по **полному** matching set (этапы/товары/услуги/total). Сейчас ответ — только `partners` + cursor. Page length запрещён как total.

**Patch proposal:**

```ts
// types.ts (shared)
export type PartnerSearchFacets = {
  total: number;
  stages: Record<string, number>;
  products: Record<string, number>;
  services: Record<string, number>;
};
export type PartnerSearchResponse = {
  partners: PartnerSearchResult[];
  nextCursor?: string | null;
  hasMore?: boolean;
  facets?: PartnerSearchFacets | null;
};
```

Backend: при `GET /api/partnership/search` считать facets по тому же filter set, что и выдача (не по текущей странице). Absent facets ≠ zeros.

Frontend adapter уже готов: `adaptDiscoveryFacets` / `PartnerFindVitrine`.

## 3. Published terms on search card (optional)

**Path:** `PartnerSearchResult` (+ search serializer)  
**Rationale:** wizard должен подставлять **реальные** опубликованные проценты получателя. Сейчас категорийные ID есть, процентов нет → `requestTerms: true` без выдуманных %.

**Proposal:**

```ts
publishedTerms?: Array<{
  category: string;
  categoryLabel?: string;
  storePercent: number;
  isExcluded?: boolean;
}>;
```

## 4. Type-unify dependency

Не merge `feat/partner-primary-kind-unify-20261029`. Локальный adapter `adaptPartnerPrimaryKind` использует `isPureAgentActivities`. После принятия type-unify — тонкая замена на `resolvePartnerKindUi` внутри adapter, без параллельной модели.

## Не трогать

- `src/lib/types.ts` / auth / registration / profile helpers — только через этот request  
- Staff invites, global nav, Prisma, migrations
