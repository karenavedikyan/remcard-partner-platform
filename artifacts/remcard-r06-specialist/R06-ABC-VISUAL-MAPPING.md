# R06.3 — A/B/C ref → impl mapping (771cc658)

| Ref (prototype) | Impl |
|-----------------|------|
| `.production-catalog > intro` + `.cw-heading` + status badge | `[data-testid="catalog-intro-card"]` |
| `.cw-steps` | `[data-testid="specialist-catalog-wizard"] nav[aria-label="Этапы каталога"]` |
| `[data-catalog-panel]` step card | `.card` / `[data-testid="catalog-step-card"]` |
| `.row.cw-actions` (Шаг / Назад / Далее) | `[data-testid="catalog-step-actions"]` |
| `.catalog-footer` (черновик / отмена / отправить) | `[data-testid="catalog-footer-bar"]` |
| `.catalog-demo-preview` avatar scale | `[data-catalog-preview-variant="specialist"]` + `CatalogCategoryAvatar` `size="compact"` |
| `.direction-selection-summary` | `ProfileDirectionsPicker` `.selectionSummary` (tileLayout) |
| `.direction-options` tiles + selected first | `orderedVisibleItems` + `.tileGrid` |
| `details` stage / primary block | `[data-testid="direction-advanced-collapse"]` |
| `.pw-summary` compact header + chips | `[data-testid="specialist-profile-completed-summary"]` `.summary` |
| `.pw-after` catalog CTA outside summary | `[data-testid="specialist-catalog-cta"]` (sibling, not inside `.summary`) |
| Agent promo panel | `[data-testid="specialist-agent-activity-compact"]` (not full Panel) |

Taxonomy auto-add / alias pipeline: **out of scope** (no new button; existing flows unchanged).
