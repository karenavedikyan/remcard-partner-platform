# Read-contract audit (Stage B blocker)

## What list already gives (`PartnershipUser` / `GET /api/partnership/list`)

`id`, `displayName`, `photoUrl`, `city`, `specializations`, `storeCategories`, `partnerType`, `partnerActivities`, working direction id arrays, `organizationName`, `organizationLogoUrl`, plus partnership-scoped `terms` / status on the parent `Partnership`.

## What the prototype needs but list lacks

| UI block | Blocker |
| --- | --- |
| **О партнёре** | `description` (or equivalent cooperation-facing bio) |
| **Контакт для сотрудничества** | `partnershipContact` `{ name, phone, email }` |
| **География** (beyond single `city`) | branch cities / service geography |
| **`publicId`** (как в своём профиле, `RC-XXXX-YYYY`) | отсутствует в `PartnershipUser`; без подстановки внутреннего `id` |

## Cannot reuse without abuse

- **`/api/partnership/search`**: discovery contract; must not hydrate existing non-searchable or hidden cooperating users.
- **`/partner/[id]`**: public catalog gate (agents / non-public excluded).

## Smallest remaining blocker

Add an **authorized counterparty read** on the partnership list payload (or one partnership-scoped GET): **`publicId`**, **`description`**, **`partnershipContact`**, optionally **branch geography**, scoped to participants of that partnership. Frontend can resolve working-id chips from existing fields + taxonomy; **«Ваше сотрудничество»** from existing `partnership.terms`. If `publicId` is absent, UI shows **ID пока недоступен** — never substitute internal user id.

Own **`/api/pro/profile`** / working-profile registration contacts stay private and must not be shown as automatic counterparty share.
