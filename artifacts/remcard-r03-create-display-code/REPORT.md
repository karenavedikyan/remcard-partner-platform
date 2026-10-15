# R03 create result display code fix

## PR

Branch `cursor/r03-create-display-code-b3e3` → `release/prof-v1-20261007` (separate small PR).

HEAD: _(filled after commit)_.

## Defect

After create on `/certificates/new`, `CertificateResultView` showed raw `promoCode` (`RC-JXHDPR`) because `displayCode` was not passed; detail/share used agent list mapper (`А-RC-JXHDPR`).

## Fix

- Port `formatCertificateDisplayCode` → `src/lib/certificate-issuer-display.ts` (same contract as navigator).
- `storeCertificateDisplayCode()` on create/detail result paths; QR alt uses prefixed `shownCode`.
- Raw `promoCode` / QR / PDF API paths unchanged.

## Tests

```bash
pnpm exec vitest run src/lib/certificate-issuer-display.test.ts \
  src/components/recommendations/CertificateResultView.display-code.test.tsx
pnpm build
```

Also: `scripts/admin-login-race-browser-proof.mjs` waits on `getByLabel('Логин администратора')`.

## Not verified here

Production public URL (test-user 404 guard intentional). Full public smoke not claimed.
