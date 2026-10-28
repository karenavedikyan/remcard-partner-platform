# Analytics login + profile consent (PROF)

## Branch / SHAs

| Item | Value |
|------|--------|
| Base (production) | `d6de8c5f723504fb379108ec106a770f58bc4b9d` |
| Feature branch | `feat/analytics-login-profile-20261028` |
| Candidate SHA | _(see git push output below — filled at commit)_ |

## Summary

- Removed global fixed bottom banner and footer manage control from root layout.
- Embedded compact analytics choice on partner login (`AuthFlow` + `ProfAnalyticsConsentLoginBlock`): pre-checked draft only, explicit «Подтвердить выбор» persists true/false.
- Profile setting `ProfAnalyticsConsentProfileSetting` on all partner profile layouts (incl. compact agent).
- `CookieConsentContext.confirmAnalyticsChoice` for explicit saves; `ProfPartnerSessionVisit` unchanged (cabinet only).

## Files touched

- `src/app/layout.tsx`
- `src/components/consent/ProfAnalyticsConsentUi.tsx`
- `src/components/consent/ProfAnalyticsConsentUi.module.css`
- `src/components/consent/ProfAnalyticsConsentUserPath.test.tsx`
- `src/contexts/CookieConsentContext.tsx`
- `src/components/auth/AuthFlow.tsx`
- `src/components/auth/AuthFlow.test.tsx` (mock login block)
- `src/components/profile/ProfileEditor.tsx`

## Commands & results

```bash
npx vitest run --maxWorkers=1 \
  src/components/consent/ProfAnalyticsConsentUserPath.test.tsx \
  src/components/auth/AuthFlow.test.tsx \
  src/components/auth/LoginExperience.test.tsx \
  src/components/auth/LoginExperience.admin-session.test.tsx \
  src/components/layout/AppShell.test.tsx
# 5 files, 28 passed

npm run test:proxy
# 295 passed

npm run build
# success
```

## Verification limits

- JSDOM/component tests only for consent gates; no claim of full browser keyboard/mobile matrix on login.
- Admin login (`checkSessionOnMount={false}`) does not render login analytics block.
