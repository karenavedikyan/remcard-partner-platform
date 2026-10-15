# PARITY-MATRIX — прототип ↔ PROF release (`e245fee` / `bf2081d`)

**Дата:** 2026-10-14 · **Evidence default:** CODE REVIEW on release tips unless noted  
**Legend:** EXISTS | ADAPT | NEW | BLOCKED | EXCLUDED  
**Proof:** CODE REVIEW | TEST PASS | HISTORICAL | NOT VERIFIED

Сокращения ролей: **Owner** (ORG_OWNER / solo PRO), **Staff** (CLIENT + branch context), **Agent** (partner activity agent), **Store / Master / Company** (partner types).

---

## A. Оболочка и навигация

| Partner / role | Screen | State / action | Frontend (release) | API | Auth / context | Status | Proof |
|----------------|--------|----------------|--------------------|-----|----------------|--------|-------|
| All | App shell | Sidebar nav 7 items | `AppShell.tsx` NAV | — | session | EXISTS | CODE REVIEW |
| All | Mobile bottom | 4 fixed tabs (no «Ещё») | `MOBILE_BOTTOM_NAV` in `AppShell.tsx` | — | — | ADAPT | CODE REVIEW — прототип: до 4 + «Ещё» |
| All | Mobile overflow | History / settlements / recommendations | only via hamburger sidebar | — | — | ADAPT | CODE REVIEW |
| All | Theme light/dark | toggle + persist | `ThemeToggle.tsx`, `globals.css` `[data-theme=dark]` | — | localStorage | EXISTS | HISTORICAL vitest PROF-I |
| All | Notifications bell | open inbox | `ProfNotificationBell` + `/notifications` | `GET/PATCH /api/pro/notifications*` | cabinet gate | **EXCLUDED** (no redesign) | CODE REVIEW |
| All | Breadcrumb / topbar | page title | `AppShell.tsx` | — | — | ADAPT | NOT VERIFIED vs Perplexity |
| All | Login / logout | Telegram verify | `login/page.tsx`, BFF verify-code | `/api/auth/verify-code`, `/api/auth/logout` | Origin check | EXISTS | LIVE probe logout 403 |
| Staff | Account caption | «Владелец профиля» label | hardcoded in `AppShell.tsx` | — | — | ADAPT | CODE REVIEW — staff caption |

---

## B. Профиль и каталог (owner / partner types)

| Type | Screen | Action | Frontend | API | Rights | Status | Proof |
|------|--------|--------|----------|-----|--------|--------|-------|
| All | Profile hub | 6 tabs overview | `ProfileEditor.tsx`, sections | `GET/PATCH /api/pro/profile` | `deriveProfileCabinetAccess` | EXISTS | CODE REVIEW |
| Master/Store/Company | Catalog draft | editable prefill, no overwrite user edits | `ProfileCatalogSection`, draft flags on profile | profile PATCH + moderation | catalog status | EXISTS | HISTORICAL prof-combined-rc |
| All | Phone display | +7 E.164 server, UI +7 (918)… | navigator normalizers (verify in profile save path) | profile | — | ADAPT | NOT VERIFIED in R00 |
| All | Directions | categories/stages top, navigator link copy | `ProfileDirectionsPicker.tsx` | `GET /api/pro/partner-taxonomy` | — | EXISTS | HISTORICAL screenshots |
| Specialist/Store/Company | Publish gate | min category + stage | server readiness + UI hints | submit-for-moderation | — | ADAPT | CODE REVIEW partial |
| All | Suggest category/stage | compact proposal → global taxonomy | **verify** `category proposal` APIs | — | — | NEW/BLOCKED | NOT VERIFIED — needs API trace |
| All | Preview card | pre-moderation preview | `CatalogPublicationPreview.tsx` | — | — | EXISTS | CODE REVIEW |
| All | Submit catalog | explicit pending moderation | `submit-for-moderation` routes | POST org/branch | owner/manager | EXISTS | CODE REVIEW |
| Owner | Team | people, invites, permissions | `ProfileTeamSection.tsx` … | invites, employees-overview | teamCapabilities | **EXCLUDED** | TEST PASS HISTORICAL prof-i-team |
| Owner | Branches | list, detail, schedule, geocode | `ProfileBranchesSection.tsx` … | `/api/pro/organization/branches` | — | **EXCLUDED** | CODE REVIEW |
| Staff | Branch switch | working branch cookie | `ProfileBranchContextSwitcher.tsx` | `PATCH /api/pro/context` | branch list | **EXCLUDED** | HISTORICAL scope smoke |
| All | Notification settings | Telegram/MAX toggles | `NotificationSettingsPanel.tsx` | notification-settings | — | **EXCLUDED** | CODE REVIEW |

---

## C. Рекомендации / сертификаты

| Type | Screen | Action | Frontend | API | Status | Proof |
|------|--------|--------|----------|-----|--------|-------|
| Pro/Store | List | filters, cards | `recommendations/page.tsx` | `GET /api/store/certificate` (BFF) | EXISTS | CODE REVIEW |
| Pro/Store | Create | author codes А/М/К/С, «Сертификат Ремкард» | `CertificateCreateForm.tsx` | POST certificate | ADAPT | HISTORICAL browser |
| All | Public link / QR / PDF | preserve legacy codes | remcard.ru public routes | `/api/certificate/[code]/pdf` | EXISTS | CODE REVIEW |
| All | Bulk actions on certs | multi-select actions | **search** bulk UI | — | NEW/ADAPT | NOT VERIFIED |
| Agent | Issue as agent | program partners limits | certificate agent routes | available-partners | EXISTS | CODE REVIEW |

---

## D. Партнёры

| Type | Screen | Action | Frontend | API | Status | Proof |
|------|--------|--------|----------|-----|--------|-------|
| Owner | Partners list | counterparty cards | `PartnersHub.tsx` | `GET /api/partnership/list` | EXISTS | CODE REVIEW |
| Staff | Org partnerships | party = org owner, read/manage split | **release:** personal `meId` | list PRO gate | ADAPT | fix branch HISTORICAL |
| All | Search filters | role, taxonomy, stages | `PartnerSearchFilters.tsx` | `GET /api/partnership/search` | EXISTS | CODE REVIEW |
| All | Term change | propose / approve | `TermChangePanel.tsx` | `/api/partnerships/.../term-change` | EXISTS | CODE REVIEW |
| All | Link invite | share link | `PartnerLinkInvitePanel.tsx` | link-invite API | EXISTS | CODE REVIEW |
| All | Deep link | `?terms=` | `partners/page.tsx` | term-change GET | EXISTS | HISTORICAL partnership-access smoke |

---

## E. Сканер и заказы

| Type | Screen | Action | Frontend | API | Status | Proof |
|------|--------|--------|----------|-----|--------|-------|
| Store staff | Scanner | QR / manual | `scanner/page.tsx` | store scan/order | EXISTS | CODE REVIEW |
| Store | Order preview | terms snapshot | scanner flow | `POST /api/store/order/preview` | EXISTS | HISTORICAL H5 tests |
| Store | Place order | idempotency | — | `POST /api/store/order` | EXISTS | branch M4 tests HISTORICAL |
| Specialist | Scan scenario | allowed flows per prototype | — | — | ADAPT | NOT VERIFIED |

---

## F. История и финансы

| Type | Screen | Action | Frontend | API | Status | Proof |
|------|--------|--------|----------|-----|--------|-------|
| Pro | History accruals/purchases | lists + detail | `history/page.tsx` | bonus/history routes (BFF) | EXISTS | CODE REVIEW |
| Pro | Settlements | payable / paid | `SettlementsHub.tsx` | `GET /api/pro/wallet/settlements` | EXISTS | CODE REVIEW |
| Staff CLIENT | Settlements | view org wallet | gate PRO in navigator route | same | **BLOCKED** | CODE REVIEW |
| Agent | Only receivables | hide pay-out | UI + server | payout POST guards | ADAPT | NOT VERIFIED |
| All | Partial payout | 1000→600→400 illustration | — | bonus pay | NEW | product + PROF-I notes |
| All | Multi-order one payout | same partner + legal pair | — | — | NEW | NOT VERIFIED |
| All | Period reconciliation XLSX | full filtered export | prototype «планируется» | — | NEW | NOT VERIFIED |
| All | Cash/transfer confirm | payment confirmation | `bonus/[id]/pay` pattern | POST pay | EXISTS | CODE REVIEW — not bank |

**Note:** bonus program APIs exist; owner wants **wallet UI = settlements only**, no bonus marketing — **ADAPT** legacy surfaces.

---

## G. Клиенты

| Type | Screen | Action | Frontend | API | Status | Proof |
|------|--------|--------|----------|-----|--------|-------|
| Pro | Clients / leads | CRM-lite | **no `/clients` route** on release | `/api/leads*` on navigator | NEW/ADAPT | CODE REVIEW — leads API exists, PROF UI partial |
| Pro | Partner → orders/certs/clients chain | drill-down | prototype expectation | store orders + certs | ADAPT | NOT VERIFIED |

---

## H. Cross-cutting

| Concern | Finding | Status |
|---------|---------|--------|
| BFF allowlist | explicit regex list `remcard-proxy.ts` | EXISTS |
| Staff context cookie | `remcard-pro-branch` | EXISTS |
| CSRF/Origin | mutating blocked cross-origin | TEST PASS live sample |
| SSR session | no-store pages | CODE REVIEW |
| PDF binary proxy | certificate pdf | CODE REVIEW |
| i18n labels RU | category labels fix branches | ADAPT |

---

## I. Visual parity (without pinned prototype)

| Area | Functional | Visual vs Perplexity |
|------|------------|----------------------|
| Shell density, cards, tables | largely implemented | **NOT VERIFIED** |
| Mobile bottom «Ещё» | gap | ADAPT |
| Profile team/branches/notifications | EXCLUDED | must stay visually stable after shell changes |

---

## J. Regression bundle (EXCLUDED sections — do not refactor)

1. Owner: create invite → accept on second browser → permissions matrix save.  
2. HEAD_OFFICE staff: 6 branches scope headline unchanged when switching branch.  
3. Inbox: mark one / mark all; no duplicate on idempotent action.  
4. Branch: create/edit address geocode only on publish path (existing behavior).  
5. Revoked staff: 403 on cabinet APIs, no data leak.

---

## K. Open questions (conflicts — do not guess)

1. Perplexity **remcard-profile-copy** vs older **32ee93fd** link in PROF-I docs — which is authoritative?  
2. Production deploy SHA vs `e245fee` / `bf2081d` tips.  
3. CLIENT staff: settlements read-only via org owner wallet or remain PRO-only?  
4. Category/stage suggestion API — already shipped or NEW?
