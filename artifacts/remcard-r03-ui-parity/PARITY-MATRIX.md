# R03 UI parity matrix

Legend: **PASS** | **DIFF** | **NOT_VERIFIED**

| Area | Reference | Implementation | Status | Notes |
|------|-----------|----------------|--------|-------|
| Nav icon certificates | `nav-home`, Lucide house | `sections.certificates` → `home`, `AgentNavIcon` house paths | PASS | Route key stays `certificates` (prefs stable) |
| Nav icon clients | `users-round` | `sections.clients` → `clients` icon | PASS | |
| Nav icon partners | `handshake` | `partners` handshake paths | PASS | |
| Nav icon wallet / profile | wallet / user-round | unchanged keys, SVG aligned | PASS | |
| Page eyebrow | «АГЕНТ» | `PageHeading` eyebrow АГЕНТ | PASS | |
| Certificates hero panel | `.panel.hero-task` + CTA | `AgentR03PageIntro` hero + link | PASS | Muted copy without bonus promise → **DIFF** text |
| Stat cards row | 3 stats | 3 cards; count=`activeCount`; money **—** | DIFF | Money lacks API; honest caption |
| Clients intro | muted paragraph | `AgentR03PageIntro` clients | PASS | |
| View default | list | default list + localStorage override | PASS | |
| Segmented list/cards | `.segment` | `.viewToggle` gray group + white active | PASS | Visual review on captures |
| Toolbar one row | `.collection-tools` | `.collectionTools` flex row | PASS | |
| Search without «Найти» | debounced search input | 400ms debounce, no button | PASS | Enter not required |
| Search placeholders | cert / client strings | matching placeholders | PASS | Client note search via navigator `note` field |
| Filter selects styled | `.field select` | `.filterSelect` / `.showSelect` | PASS | |
| Meta row geometry | count / hint / select page rows | `.collectionCountRow` + `.selectPageRow` | PASS | |
| Cards grid 2-col | `.collection-cards` | `.list` 2-col @1440 | PASS | 1-col ≤1050px |
| Cert selection strip | `.collection-card-select` | `.collectionCardSelect` | PASS | |
| Cert branded face | `.remcard-certificate` | gradient + top accent + R watermark | PASS | |
| Multi-partner categories | terms in share text | `partnerOffers` DTO + card lines | PASS | No single blended % when categories differ |
| List columns cert | Name+caption / Details / Status | Updated table columns | PASS | |
| Client purchase status | purchase-based pill | `hasPurchases` from orders/usage | PASS | Archive tab uses «В архиве» |
| Row icons | share-2, pencil, archive, trash-2 | `RowActionIcons` Lucide paths | PASS | |
| List client eye/open | row action | `open` action in list only | PASS | |
| Pagination | compact 25/50/100 + page text | `AgentR03Pagination` | PASS | |
| Dark «Подробнее» | accent link | `--r03-accent` on `.certCardMore` | PASS | Theme assert on captures |
| Select all found | bulk select all filtered | page checkbox only | DIFF | Documented functional gap |
| Test banner | n/a | impl top test banner | DIFF | Functional exception |

Screenshots: run `node scripts/r03-ui-parity-visual.mjs` with authenticated local stack (`R03_UI_IMPL_ORIGIN`).
