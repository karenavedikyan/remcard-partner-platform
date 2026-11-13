# P4 / P6 handoff — receiving appeal detail PATCH (P1 proxy only)

**Status:** partner proxy wired; **section unpublished**; **no DB**.

## Navigator (K1)

| Item | Value |
|------|--------|
| Tip | `63a4f3d6` |
| Route | `src/app/api/pro/client-appeals/[id]/route.ts` |
| Methods | **GET** detail, **PATCH** profile (`parseAppealProfilePatch`) |
| Stage | **separate** `PATCH .../[id]/stage` (unchanged) |

PATCH scope: bounded CRM/profile fields + `privateNotes`; **not** stage transition, order, or finance mutations (per K1 source comments).

## Partner proxy (P1 @ tip after wire)

| Method | Path |
|--------|------|
| GET, PATCH | `/api/pro/client-appeals/:id` |

Same reserved-segment regex as GET; no new `/api/pro/*` wildcards.

## P6

| Item | Value |
|------|--------|
| Tip | `4dca7af7` |
| Expectation | Mappers/cursor pagination against K1 list body; detail save via **PATCH** above (not stage route). |

## P2

Coordinates **request/response body** typing with K1 `parseAppealProfilePatch` + revision conflict (`409`).

## P4

Detail/history UI reads **GET**; profile edit persistence uses **PATCH** on same path when receiving workspace is unblocked — not observer `referred-appeals`.
