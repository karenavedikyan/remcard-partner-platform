# P7 observer detail views — partial harness notes

**Product:** `observer.module.css` detail tokens (back, detailGrid, partnerPageHead, statsInline).  
**Prototype:** `3dc31836` `ca-back`, `ca-detail-*`, `ca-observer-stats`.

**Font registration:** Production uses `next/font` Manrope (`layout.tsx`). Agent VM has **no** `.next` build → paired tests use `globals.css` `--font-body` family string only; **glyph-accurate @font-face NOT_VERIFIED** without Next build or bundled woff.

**Harness:** `P7.observer-detail-views.test.ts` @ 375×568 and 1440×650/900, light/dark.

**Glue contract (appeal→order):** Not P7 — K8 `orderLink.ts`, K1 route, P4 href builders, Scanner owner.
