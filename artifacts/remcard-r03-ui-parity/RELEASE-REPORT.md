# R03 UI parity RC

## Git

| Repo | Branch | HEAD (full) | Base |
|------|--------|-------------|------|
| remcard-partner-platform | `cursor/r03-ui-parity-b3e3` | `167633f` (full SHA at push) | `#17` @ `375d263` |
| remcard-navigator | `cursor/r03-ui-parity-b3e3` | `ce5a940a` (full SHA at push) | `40b8094e` (R03 lists) |

Release integration target: `release/prof-v1-20261007` (`a5b83b3` at fetch time).

## Merge order

1. **PR #17** (`cursor/r03-create-display-code-b3e3`, reviewed `375d263`) — certificate create display code; already included as parent of this UI branch.
2. **This RC** — visual/layout parity on top of #17.
3. **Navigator** read-only DTO (`partnerOffers`, `hasPurchases`) — deploy together with platform when operator merges.

## Scope

- Agent shell nav icons (house / users-round / handshake / wallet / user-round paths).
- Page heading eyebrow **АГЕНТ**; certificates hero task panel + stat row (count from server; money **—** with explicit caption).
- Toolbar layout (single-row tools, segmented list/cards, debounced search, styled selects, meta row geometry).
- Certificate/client cards: 2-column grid, selection strip, branded certificate face, multi-partner category lines via `partnerOffers`.
- List columns aligned to reference (details + caption); client purchase pill from `hasPurchases` (not archive).
- Row action Lucide-style icons; pagination compact select; dark link color via `--r03-accent`.

## Out of scope (unchanged)

Production deploy, flags, DB migrations, staff/branches/notifications APIs, bonus programme backend, raw promo/QR/PDF, idempotency/guards.

## Known remaining diffs

- Stat cards **Начислено / Получено**: no authorised agent totals API — shown as **—** (documented functional gap).
- Hero task muted copy: no “получайте бонус” promise (owner decision vs reference demo text).
- **Выбрать все найденные** across full server result: not implemented (page selection only).
- Test-mode top banner remains on impl screenshots (functional exception).
- Reference certificates nav uses `nav-home` + `house`; impl uses route key `certificates` with same house icon.

## Reference SHA256 (verified)

- roles.html `d6c00f57928f6dc885e9dd714937d8ae897dfaedb8e5e806e46f0ea741a09859`
- roles.js `0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc`
- roles.css `563ec02db1ca75f3377e3265cf84f15ac2ba5f62c7b0d269d4b2b5f872b8a3b6`
- profile-wizard.css `50abd754eac221c647deea5717e9f32c22b193998b8cdbec3eaac507b5217c6d`
