# R03 UI parity matrix (verified)

Legend: **PASS** (computed/functional) · **VISUAL_DIFF** (paired capture, expected/known delta) · **NOT_VERIFIED**

Evidence: `screenshots/captures.json` (2026-10-15T23:21:44Z), `screenshots/*-{ref,impl,diff}.png`, runner `scripts/r03-ui-parity-visual.mjs` exit 0.

| Area | Reference | Implementation | Status | Evidence / notes |
|------|-----------|----------------|--------|------------------|
| Nav icon certificates (desktop) | house 20px | `nav-certificates` SVG 20×20 | PASS | computed `navIconWidth/Height=20` @1440 |
| Nav icon clients | users-round | `clients` icon | PASS | desktop captures |
| Nav icon partners | handshake | handshake paths | PASS | desktop captures |
| Page eyebrow | АГЕНТ | PageHeading АГЕНТ | VISUAL_DIFF | diff ratio ~4–9%; test banner on impl |
| Hero task panel | `.hero-task` | `AgentR03PageIntro` | VISUAL_DIFF | copy without bonus promise |
| Stat cards money | demo ₽ | **—** + caption | VISUAL_DIFF | functional gap (documented) |
| Stat count | demo count | `activeCount` server | PASS | seeded ≥3 certs |
| View default list | list | list + localStorage | PASS | `activeViewLabel=Список` |
| Segmented control | `.segment` | `.viewToggle` | PASS | computed active label |
| Toolbar row | collection-tools | `.collectionTools` | PASS | toolbar visible all captures |
| Search debounced | no «Найти» | debounce 400ms | PASS | smoke `certificates_search` |
| Cards 2-col @1440 | ~559px cards | grid `559px 559px` | PASS | computed @ cards 1440 |
| Cert terms disclosure | `details.certificate-terms` | `agent-cert-terms` | PASS | `termsPresent=true` cards |
| Cert usage caption | ticket + usage text | ticket SVG + label | PASS | card region screenshots |
| Cert footer | issuer + Подробнее ↗ | `certificateBottom` + arrow | PASS | card impl captures |
| Actions row | separate strip | `recordCardActions` | PASS | card layout |
| Fractional % | 5.5% | no round to int | PASS | seed cert + mapper tests |
| Client purchase pill | purchase-based | `hasPurchases` | PASS | API field |
| Pagination region | compact footer | pagination crop PNG | PASS | `*-impl-pagination.png` |
| Select all found | all filtered | page only | VISUAL_DIFF | functional gap (documented) |
| Test-mode banner | n/a | impl top bar | VISUAL_DIFF | excluded from product diff |
| Full-page pixel diff | — | — | VISUAL_DIFF | ratio 0.04–0.09; banner/stats/copy |

## Capture matrix (18/18 CAPTURED)

| ID | diff ratio | view/theme |
|----|------------|------------|
| certificates-list-light-1440x900 | 0.044 | main |
| certificates-cards-light-1440x900 | (see captures.json) | main |
| … | … | 16 main + 2×320 smoke |

All pairs include `-ref-full.png`, `-impl-full.png`, `-diff.png`. Cards views include `-impl-cert-card.png` where applicable.
