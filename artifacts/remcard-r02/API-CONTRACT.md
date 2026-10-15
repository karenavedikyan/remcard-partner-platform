# R02 API contract (prof backend)

All routes require `remcard-token` session and PRO cabinet access unless noted.

## Gate

- Env: `PROF_R02_AGENT_PROFILE_ENABLED` (`1` / `true` / `yes`). Default off.

## Eligibility

- `resolvePrincipalAgentBusiness`: user not blocked, `partnerActivities` contains `AGENT`, principal agent wallet (`employedView === false`, `agentSubjectId === userId`).

## Endpoints

| Method | Path | Body | Success |
|--------|------|------|---------|
| GET | `/api/pro/agent-profile/status` | — | `{ featureEnabled, hasAgentActivity, eligible, profileComplete, userId }` |
| GET | `/api/pro/agent-profile/draft` | — | `{ step, version, payload, profileComplete }` |
| PATCH | `/api/pro/agent-profile/draft` | `{ expectedVersion, expectedEpoch, step?, fromStep?, mode: save\|advance, payload }` | `{ version, draftEpoch, payload }`; `409` + `keepLocal` |
| POST | `/api/pro/agent-profile/finish` | `{ expectedVersion, expectedEpoch }` | `{ ok, profileComplete }`; field errors `400` |
| POST | `/api/pro/agent-profile/enable-activity` | `{}` | R02-only: adds `AGENT` with owner/staff guards; no role/partnerType change |
| POST | `/api/pro/agent-activate` | `{ companyKind? }` | **Legacy** (unchanged semantics) |
| GET | `/api/pro/agent-payout-requisites` | — | `{ items[] }` masked accounts |
| POST | `/api/pro/agent-payout-requisites` | requisites fields | `{ item }` |
| GET | `/api/pro/agent-payout-requisites/:id` | — | full item for owner |
| PATCH | `/api/pro/agent-payout-requisites/:id` | `{ action: setPrimary \| applyForNextPayout \| archive \| revise, ... }` | `{ item }`; `revise` archives prior row |

Draft payload keys: `displayName`, `city`, `audience`, `channel`, `contactPhone`, `contactEmail`.

Finish requires `displayName` + `city`. Phone normalized to `+7XXXXXXXXXX`.
