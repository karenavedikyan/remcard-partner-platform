# STORE-COMPANY-HOME-ADAPT-02 — final gate

## Runtime application pair (unchanged)

| | SHA |
|---|-----|
| **Frontend** | `1dcd79c2b740a91c6bc7d9624ad8f7ba5ac96cf1` |
| **Backend** | `f3baba9ca2666a569efea16d238ef8ca68e7ee2d` |

## Evidence tip (gate run + packaging)

`7ee9028e0635409d22021e54d55c169632424bcd` — accepted shell gate (`waitForPrimarySales`, log/exit/json from run `2026-10-25T09:33:40.430Z`). Later commits may adjust artifact JSON only.

## Shell browser gate (single run 2026-10-25T09:33:40Z)

| Artifact | Value |
|----------|--------|
| `shell-browser-gate.exit` | **0** |
| `shell-gate.json` → `ok` | **true** |
| `shell-gate.json` → `failures` | **[]** |
| `shell-browser-gate.log` | stdout JSON unchanged (`ok: true`, same `capturedAt`) |

Build stack pinned to application SHAs above (`run-browser-gate.sh` checkout + saved e2e script).

### CTA checks (same run)

- **Store:** `/scanner` → heading «Сканер» + button «Найти» (`ctaChecks.storeScannerHeadingAndFind: true`)
- **Company:** `team-open-invite-wizard` → dialog «Пригласить сотрудника» **opened**, **no submit** (`ctaChecks.companyInviteWizardDialog: true`)
- **2-branch metrics:** branch A primary **1**, branch B primary **0** (UI poll after HTTP 200)

### Observed 401 (non-fatal)

One GET during company profile load:

`GET /api/remcard/api/pro/organization/permission-templates?organizationId=…` → **401**

Not fatal for this gate: scanner and team **wizard open** checks passed; only `business-home/metrics` 401 is treated as gate failure. **Not verified:** invite submit, permission-template content, or template-driven invite flows.

## Product / unit gates (unchanged)

Prior acceptance: owner adapter, sales scope, employees, private GET, session `branchId` metrics — **not reworked**.
