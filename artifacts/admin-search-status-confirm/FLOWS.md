# Partner search visibility — admin confirm flows (baseline before change)

Base product ref: `7443ac29ce8bab27b318f4dccb83ff011abaa531`.

## Single partner management (table / cards / dense mobile)

1. Open row management («Действия» / «Удалить» / expand panel).
2. **Search block:** read factual visibility + admin override; choose «Показывать партнёрам», «Скрыть от партнёров», or «По правилам регистрации».
3. **Before change:** manual «Причина» required for every lifecycle action including search; empty reason blocks preview.
4. Server `previewPartnerLifecycle` → effects/warnings + `confirmToken`.
5. «Подтвердить» → `applyPartnerLifecycle` with trimmed manual reason; «Отмена» clears preview only.
6. **Catalog/archive block:** same reason field; actions `hide_catalog`, `publish_catalog`, `archive_project`, `restore_project` always require manual reason.

## Hard gates (unchanged)

- `show_partner_search` disabled when `isHardPartnerSearchGate` (archived, blocked, demo rules, opt-out, etc.); no preview/apply bypass.

## Bulk (unchanged)

- No search visibility actions in bulk map; group reason required for supported bulk lifecycle actions.

## Target UX (this feature)

- Search trio: no manual reason on path; auto Russian audit reason on apply only after confirm.
- Catalog/archive: manual reason still required.
