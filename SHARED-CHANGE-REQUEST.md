# SHARED-CHANGE-REQUEST — Admin R1 (`feat/admin-release1-prototype-20261029`)

## Status

- **SCR-001 BFF allowlist:** реализован в отдельном commit на task-ветке (координатор разрешил exact Admin R1 patterns). Не wildcard; существующие записи сохранены.
- **SCR-002 partner primary kind:** dependency `feat/partner-primary-kind-unify-20261029` — Admin использует DTO `partnerKind` / adapter labels; shared helpers не менялись.
- **SCR-003 global layout/CSS:** не требуется — оболочка в owned `AdminR1Shell` / scoped CSS.
- **SCR-004 package/Prisma:** не запрошены.
