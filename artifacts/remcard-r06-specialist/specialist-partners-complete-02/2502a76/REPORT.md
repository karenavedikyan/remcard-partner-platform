# SPECIALIST-PARTNERS-COMPLETE-02.1 — evidence

| Item | Value |
|------|--------|
| Frontend code SHA | `2502a76` (`fix/r06-profile-catalog-prefill-01`) |
| Backend code SHA | `8b7ef220` (`feat/specialist-partners-complete-02`) |
| BUILD_ID | `dImcMGwUg_qxE0oK4FsDL` (`npm run build` PASS) |
| Production pins | frontend `f0730dc`, backend `9a5bced` (unchanged) |

## Blockers resolved

| Check | Result |
|-------|--------|
| `npm run build` (Button `forwardRef`) | **PASS** |
| BFF `isAllowedProxyRoute` discussion-invite (5 routes + GET context, join excluded) | **PASS** (`remcard-proxy-r06-tail.test.ts`) |

## Product flow (mapping)

1. **Create** — `POST /api/partnership/discussion-invite` → token + preview URL; panel lists via `GET`.
2. **Revoke** — author `DELETE /api/partnership/discussion-invite/:id` (PENDING only); panel wired.
3. **Preview** — `GET .../public/:token` with optional session; `resolvePublicDiscussionPreview` → `UNAVAILABLE` for non-participants on JOINED.
4. **Join** — `POST .../join` → `ACCEPTED` + `joinedByUserId`; **no** Partnership; `redirectPath` `/partners?discussion=:id`.
5. **Context** — `GET .../discussion-invite/:id` → counterparty user id + `canProposeTerms`.
6. **Negotiation** — PartnersHub banner → `PartnerInviteDialog` with `targetUserId = counterpartyUserId` (standard `POST /api/partnership/invite`).

## Hide / list contract

- `GET /api/partnership/list?listVisibility=active|archive|hidden` filters on server; response includes `listCounts`.
- Invitations segment still loads full list (no `listVisibility` param) so new incoming offers are not hidden by old `hiddenAt`.

## Tests run

| Suite | Result |
|-------|--------|
| Frontend `npm run build` | PASS |
| `remcard-proxy-r06-tail.test.ts` | PASS (3) |
| `partners-hub-presentation.test.ts` (+ discussion mapping) | PASS (8) |
| Backend `partnershipDiscussionInvitePublicView.test.ts` | PASS |
| Backend `partnershipListVisibility.test.ts` | PASS |
| Backend `partnershipComplete02.integration.test.ts` (no-DB rules) | PASS |
| PG integration (`partnershipComplete02` todos) | **NOT_RUN** (no isolated prof test DB confirmed this run) |
| Full visual matrix / Playwright MOCK runner | **NOT_RUN** (this evidence commit; mock BFF updated) |

## Visual snapshots

Prior COMPLETE-02 captures at `bf550f9` remain; refreshed ref/impl captures for 02.1 UI deltas **NOT_RUN** in this turn (build + unit/BFF + flow wiring verified).
