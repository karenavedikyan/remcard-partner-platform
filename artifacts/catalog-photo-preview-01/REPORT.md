# CATALOG-PHOTO-PREVIEW-01

Дата: 2026-10-24. Frontend-only UI. Backend без изменений.

## Изменения

- Новый presentational блок `CatalogWizardPhotoAttachment` (миниатюра ~7.5rem, `object-fit: contain`, рамка, «Фото прикреплено», «Заменить фото» / «Убрать фото», `aria-live`, alt).
- Подключён на шаг «Оформление» (step 3) в `OrganizationCatalogWizard` и `SpecialistCatalogWizard`.
- «Убрать фото» только очищает `catalogImageUrl` + touched; storage/backend не трогаем.
- При ошибке загрузки `<img>` — «Предпросмотр недоступен», URL сохраняется; сброс при смене URL.
- Locked (`catalogEditable=false`): превью и статус без кнопок мутаций.

## Screenshots

Изолированный fixture (не production, не user file):

- `artifacts/catalog-photo-preview-01/preview-fixture-desktop-1440.png`
- `artifacts/catalog-photo-preview-01/preview-fixture-mobile-390.png`
- HTML: `preview-fixture.html` (пустое / прикреплено / ошибка preview)

Live browser E2E по реальному мастеру не выполнялся; DOM покрыт Vitest.

## Tests

```bash
npx vitest run src/components/profile/business/OrganizationCatalogWizard.upload.test.tsx src/components/profile/specialist/SpecialistCatalogWizard.upload.test.tsx
# 8 passed, exit 0

npx tsc --noEmit
# exit 0

npm run build
# exit 0
```

Multipart BFF (`d5dc0d6b`) не менялся; `remcard-proxy-multipart` не перезапускался.

## SHAs

| | SHA |
|--|-----|
| Baseline | `d5dc0d6bb7395a7e6f4a6d2b44460b07e949ce06` |
| Backend (unchanged) | `15b296352c3a82691682e665a250e306b3f06db9` |
| Branch | `fix/catalog-photo-preview-01` |
| Final code / evidence | `cfbf9690b06ebee42881c6d3b69a6f93e085a698` |

## Не проверено

- Production deploy, save/reload черновика на Timeweb, реальные CDN URL пользователя.
