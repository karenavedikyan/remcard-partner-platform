# R03 UI parity matrix (2026-10-16)

Legend: **FUNC_PASS** · **VISUAL_DIFF** (paired PNG; operator review) · **NOT_VERIFIED** · **CAPTURED** (evidence only)

Evidence: `screenshots/captures.json` (`2026-10-16T04:36:52Z`), region crops (`*-content/toolbar/pagination/cert-card/client-row`), runner exit `ok: true`.

Allowed compare exceptions (documented): impl **test-mode banner**; stat money **—**; reference demo chrome hidden at capture via CSS injection (not frozen file edits); **different demo entity names/counts** vs parity seed — use **content crops** + component crops, not raw full-page ratio alone.

| # | Area | Status | Notes / crop diff @1440 light |
|---|------|--------|-------------------------------|
| 1 | Cert card title/watermark/padding | VISUAL_DIFF | `certificates-cards-light-1440x900-diff-certCard.png` ratio **0.053** — closer R/title/fold; not signed off |
| 2 | Terms disclosure (fold-list) | FUNC_PASS + VISUAL_DIFF | `termsPresent`; closed summary row + `+`; crop still ~5% |
| 3 | Card actions row end-aligned | FUNC_PASS + VISUAL_DIFF | `recordActionToolbarEnd` / list actions; verify crop |
| 4 | Cert footer issuer + Подробнее | FUNC_PASS + VISUAL_DIFF | dashed bottom + separate actions strip |
| 5 | Stat row typography | FUNC_PASS + VISUAL_DIFF | real `activeCount`; money **—** |
| 6 | Client table header/borders | FUNC_PASS + VISUAL_DIFF | `collectionTable` offset header; content crop ~4.3% clients list |
| 7 | Purchase status pill | FUNC_PASS + VISUAL_DIFF | `hasPurchases`; `purchasePill` nowrap; client-row crop ~4.1% |
| 8 | Client row composition | FUNC_PASS + VISUAL_DIFF | caption=task, detail=certs+«бонус —» |
| 9 | Visible «Поиск» label | FUNC_PASS + VISUAL_DIFF | toolbar crop ~5.9% |
| 10 | Pagination row layout | FUNC_PASS + VISUAL_DIFF | `collectionFooter`; pagination crop ~2.2% |
| 11 | Paired capture methodology | CAPTURED | 18 main + 320 smoke; content/toolbar/pagination/card/row crops + diffs |
| 12 | Matrix honesty | FUNC_PASS | no visual PASS without crop review |

## Remaining product gaps (not masked)

- Stat **Начислено / Получено**: **—** (no API).
- Client detail **«ваш бонус ₽»** in reference → impl **«бонус —»** in list detail (honest).
- **Select-all-across-pages**: not implemented.
- Reference vs impl **record counts/names** differ; full-page diff **~4–10%**; **content-region** diffs **~3.4–4.3%** @1440 light.

Merge base unchanged: **PR #17** @ `375d2636613b4d2f0a3bec89a691ad7eb8c05ad7`.
