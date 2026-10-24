# Parallel work — conflict notes (REGISTRATION-01.3)

| Area | This agent (registration) | Other agent (R06 tail / taxonomy) |
|------|---------------------------|-----------------------------------|
| Branches | `cursor/registration-01-3-b3e3` from release | R06 branches from #27 / #690 |
| Scope | `/join`, welcome, MAX OTP, `registration-entry.module.css` | Specialist wizard, taxonomy proposals |
| **Avoid editing** | — | Do not merge R06 into registration PRs |
| **Shared files risk** | `src/components/auth/AuthFlow.tsx` (consents only after OTP), `auth.module.css` | If R06 touches login/auth shell, rebase carefully |
| **Globals** | No intentional `--primary` / surface token changes | R06 may adjust platform tokens — registration welcome dark card gap documented in visual report |

Registration UI prefers **scoped** `registration-entry.module.css` + `partner-welcome.module.css` over global design tokens.

## Local welcome capture (SSR)

Playwright mocks do not affect `/` SSR. For `registration-01-visual.mjs` welcome pairs, start platform dev with:

`REGISTRATION_SSR_WELCOME=1 pnpm exec next dev -p 3020 -H 127.0.0.1`

(`capabilities-server.ts` — dev-only; not for production deploy.)
