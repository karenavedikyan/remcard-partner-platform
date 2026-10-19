# SPECIALIST-PARTNERS-IMPLEMENT-01.1 — delivery

| Field | Value |
| --- | --- |
| Code SHA | `4e2167599b6dd64548ddd76e7a2e5f7765e67c9e` |
| Evidence SHA | (this commit) |
| BUILD_ID | `8VtmePfhFX9WiWt-geeXq` |
| Branch | `fix/r06-profile-catalog-prefill-01` |
| Runner | `R06_IMPLEMENT_01_1=1` → `scripts/r06-partners-shared-01-1.mjs` |
| Manifest | `SPECIALIST-PARTNERS-IMPLEMENT-01-1.json` |

## What the user can do now

- **Bulk archive / restore** with a persistent outcome banner (including when the active list becomes empty after archive), separate success vs failed IDs, retry for failures only, double-click guard, and selection cleared on filter/tab/segment changes without wiping the last outcome.
- **Link invite** via real POST payload (role, terms, note, general fallback): explanatory copy, success only after API 200, errors keep input, copy with clipboard fallback; MOCK flow UI → POST → displayed link → copy.
- **Find / search** error surface with retry (inherited 01 checks).
- **Rename (personal alias)** PATCH with reverted proxy rules — runner pins `NEXT_PUBLIC_APP_URL` to the same loopback port as the dev server (no proxy hostname hack).

## Prototype alignment (touched surfaces)

- Hub modals: width/focus-visible on close and path tabs; link panel defers section title to modal heading; invite copy and created-link block.
- Specialist captures: desktop list, inv in/out, find/link; mobile 375 list/find/link + one dark 375 list pair; 320 geometry no overflow (see manifest).
- Shared: `AgentPartnerBulkBar`, `AgentPartnerHubModal` styles, `PartnerPersonalAliasDialog` focus ring, `PartnerLinkInvitePanel`.

## Checks (this run)

| Area | Result |
| --- | --- |
| Unit (vitest partners + rules) | PASS |
| Proxy (`remcard-proxy.test.ts`) | PASS (26) |
| Functional MOCK | 31/31 PASS (incl. bulk_outcome_visible, bulk_retry_success, link_invite_create, alias patch=200) |
| Agent shell / search role | PASS |
| geometry320 | PASS (no overflow) |

Build: production dist `.next-r06-specialist-partners-implement-01-1` with `NEXT_PUBLIC_APP_URL=http://127.0.0.1:30720` aligned to runner port (proxy origin check). Runner used `R06_SKIP_BUILD=1` with existing dist after final `npm run build` on code tip.

## Representative screenshots

- `impl-specialist-active-list-1440-light.png`
- `impl-specialist-find-1440-light.png` / `impl-specialist-link-1440-light.png`
- `impl-specialist-active-375-375-light.png` / `impl-specialist-active-375-dark-375-dark.png`
- `impl-specialist-find-375-375-light.png` / `impl-specialist-link-375-375-light.png`

## Backend gaps (not closed)

1. **«Удалить из списка»** (personal remove) — no dedicated contract; only personal alias + list archive preference in navigator. Do not fake-delete.
2. **Prototype “имя + предмет сотрудничества”** on link invite — production API expects `intendedPartnerType`, `terms[]`, optional `note`, and general-terms confirmation when categories are empty; there is no separate “subject of cooperation” field beyond note/terms. Demo-only naming cannot be mapped without backend/schema change.
3. **Dedicated rename/details capture** in 01.1 matrix — alias dialog exercised functionally; no separate ref/impl rename pair in this evidence set.

## Reverted / not done

- `remcard-proxy.ts` / test restored to `4e38659` loopback `parsed.host` behavior.
- No PR, merge, deploy, backend, or env/lockfile changes per task scope.
