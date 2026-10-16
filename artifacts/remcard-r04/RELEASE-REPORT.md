# RemCard R04.2 — Agent Partners visual pass

## HEAD (after push)

| Repo | Branch | HEAD |
|------|--------|------|
| remcard-partner-platform | `cursor/r04-agent-partners-b3e3` | see `TEST-RESULTS.json` → `platformHead` |
| remcard-navigator | `cursor/r04-agent-partners-b3e3` | see `TEST-RESULTS.json` → `navigatorHead` |

## R04.2 UI (platform)

- Distinct **list** (desktop table + mobile rows) vs **cards** grid (`AgentPartnerCollection`).
- Hub: tabs «Мои партнёры / Приглашения», **Входящие / Отправленные**, single CTA «Найти или пригласить партнёра», modal/drawer with find/link tabs.
- Compact toolbar order aligned to ref; stage/city in «Ещё фильтры»; working list filters preserved.
- Stable parity seed: «Дом материалов», «Мастерская интерьера», incoming/outgoing **INVITED** fixtures.

## Acceptance

| Layer | Artifact | Result |
|-------|----------|--------|
| Functional + BFF | `TEST-RESULTS.json` | disposable stack, seed, filters, modal shots, incoming accept → ACTIVE, R03 create partner field |
| Captured | `screenshots/impl-r04-*`, `ref-r04-*` | 8 pairs + extras |
| Geometry | `PARITY-VISUAL.json` | bounds + mode distinction |
| Visual review | `PARITY-MATRIX.md` | **not** 1:1 PASS (`visualParityOk: false`) |

```bash
cd remcard-partner-platform && pnpm run build   # exit 0
cd remcard-navigator && npm run build           # exit 0
cd remcard-partner-platform && pnpm exec vitest run src/components/partners/PartnersHub.test.tsx src/lib/agent-r04/partner-filters.test.ts
set -a && source /tmp/admin-test-local-stack/runtime.env && set +a
cd remcard-partner-platform && node scripts/r04-browser-acceptance.mjs
cd remcard-partner-platform && node scripts/r04-ui-parity-visual.mjs
```

**Status:** READY_FOR_REVIEW — functional/geometry green; visual parity requires human compare of impl/ref PNGs.

No merge, deploy, production DB, or R05.
