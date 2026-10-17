# REGISTRATION-01.3 — test results

Date: 2026-10-17  
Scope: invite continuation for ready users + join visual/progress/icons + evidence runner.

## Platform (this revision)

| Command | Exit | Count |
|---------|------|-------|
| `pnpm exec tsx --test src/lib/auth-flow.test.ts src/lib/registration/routing.test.ts` | 0 | **30 PASS** |
| `pnpm run build` | 0 | **PASS** |
| `REGISTRATION_VISUAL_BASE=http://127.0.0.1:3020 node scripts/local/registration-01-visual.mjs` | 0 | **PASS** (13 impl captures + 2 ref extracts; step/viewport verify) |
| `REGISTRATION_VISUAL_BASE=http://127.0.0.1:3020 node scripts/local/registration-01-browser-flow.mjs` | 0 | **4/4 PASS** |

Browser flows: ready user + invite redirect, auth reload, owner mismatch, employee invite.

## Navigator (carry-over, no code change in 01.3)

| Command | Exit | Count | SHA |
|---------|------|-------|-----|
| `DATABASE_URL=postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test vitest run profAgentRegistrationFinish.integration.test.ts` | — | **7 PASS** (not re-run) | `9fa871f3` |
| Probes `registration-review` + `registration-011-review` | — | **4 PASS** (not re-run) | `9fa871f3` |

## NOT_RUN

- Live MAX/Telegram OAuth  
- Production / shared staging DB  
- Full cabinet re-audit  
