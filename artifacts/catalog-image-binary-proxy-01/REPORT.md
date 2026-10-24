# CATALOG-IMAGE-BINARY-PROXY-01

Дата: 2026-10-24. Frontend-only. Backend не менялся.

## Root cause

BFF `src/app/api/remcard/[...path]/route.ts` читал любой POST/PATCH body через `request.text()` и передавал строку в `proxyRemcardRequest`. Для `multipart/form-data` с PNG/JPEG UTF-8 decode/encode меняет бинарные байты файла; backend `/api/upload` (`purpose=catalog`) не может декодировать изображение → «Не удалось обработать изображение. Выберите JPG или PNG.»

## Fix

- `readProxyRequestBody` в `src/lib/remcard-proxy.ts`: для `multipart/form-data` — `arrayBuffer()`, иначе — `text()` (JSON/consent без изменений).
- Upstream fetch: `bodyBinary` как `Uint8Array`, сохраняется исходный `Content-Type` (с boundary); JSON по-прежнему через `bodyText`.
- Сборка input вынесена в `src/lib/remcard-proxy-bff.ts` (тот же контракт, что у route handler).
- UI: `OrganizationCatalogWizard`, `SpecialistCatalogWizard`, `ProfileCatalogSection` — сброс `uploadError` перед попыткой, сброс value file input после success/error, `catalogImageUrl` touched при успехе; при ошибке старый URL не сбрасывается.

## Byte proof (изолированно, без storage)

| Этап | PNG file part sha256 (fixture `catalog-upload-8x8.png`, 186 B) |
|------|------------------------------------------------------------------|
| Оригинал в FormData | `1056ea15880a6988b2e58570b5f73529fee2abdb295e16fe661ed788ca00a1bf` |
| После `Request.text()` + UTF-8 buffer (старый путь) | ≠ оригинал (multipart повреждён) |
| После `readProxyRequestBody` + `proxyRemcardRequest` | `1056ea15880a6988b2e58570b5f73529fee2abdb295e16fe661ed788ca00a1bf` |

Отдельно воспроизведённый в ТЗ 8×8 PNG (95 B, sha256 `443dd4f84790e556aea9e2ee10fd58a151f79c58dfa3516be9afa51f13991f66`) — тот же класс ошибки; в тестах использован синтетический fixture того же типа (pngjs 8×8).

## Verification (final relevant run)

```bash
npx tsx --test src/lib/remcard-proxy.test.ts src/lib/remcard-proxy-multipart.test.ts
# tests 31, pass 31, fail 0, exit 0

npx vitest run src/components/profile/business/OrganizationCatalogWizard.upload.test.tsx
# 2 passed, exit 0

npx tsc --noEmit
# exit 0

npm run build
# exit 0
```

## SHAs / branches

| | SHA |
|--|-----|
| Baseline (production frontend) | `465290ef2486f11a27db73f0a2ca904f9b9975e1` |
| Backend (unchanged) | `15b296352c3a82691682e665a250e306b3f06db9` |
| Branch | `fix/catalog-image-binary-proxy-01` |
| Final code SHA | 5be2d37ab02214167f2e05c51b18363185ba77ef |

## Scope / not verified

- Нет live browser E2E, production upload, deploy, PR/merge.
- HEIC decode на backend не проверялся и не объявлялся рабочим.
- Полный `npm test` (все profile suites) не гонялся — только proxy + multipart + wizard upload.
