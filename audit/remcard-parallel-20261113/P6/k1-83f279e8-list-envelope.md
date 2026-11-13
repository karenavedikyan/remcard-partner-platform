# K1 `83f279e8` — receiving list envelope (П6 adapter)

**Assembly:** K8 `1894569a` + K1 `83f279e8` + K2 `78ce748d` + K5 `6c444487` (ref not on origin — coordinate with P2).

## GET `/api/pro/client-appeals` — **actual today**

```json
{
  "appeals": [],
  "nextCursor": null,
  "tab": "active",
  "readOnly": false
}
```

**Not yet on wire (do not invent in UI):** `principal`, `access`, `kpis`, `settings` — Root assigned K1 to align later.

## Query params (П6 → K1/P2 lock names)

| Param | Prototype | П6 `buildReceivingAppealsListQuery` |
|-------|-----------|-------------------------------------|
| `tab` | bucket `active`\|`archive`\|`trash` | `filters.bucket` |
| `source` | `all`\|`cert`\|`manual` | when not `all` |
| `q` | search | trimmed |
| `stage` | status filter label/id | when not «Все статусы» |
| `cursor` | pagination | `nextCursor` chain |

No `branchId` / `organizationId` query from UI.

## Write gate

- **`readOnly: true`** → list-only employee: hide toolbar, bulk, manual/scan/settings mutations (agent still 403 on routes — direction router).
- Do **not** treat missing `readOnly` as owner write — coerce: `readOnly = (wire.readOnly === true)`.

## Mutations (coordinate K1)

| Action | Method | Path | Owner |
|--------|--------|------|-------|
| Manual create | POST | `/api/pro/client-appeals` | K1 |
| Stage/fields | **PATCH** | `/api/pro/client-appeals/:id` | K1/P4 UI |
| Certificate entry | POST | `/api/pro/client-appeals/certificate-entry` | K1 |
| Soft delete/restore | PATCH or dedicated | TBD K1 | K1 |
| Bulk | POST batch | `/api/pro/client-appeals/batch` | **P5** (`updatedIds` / `failures` all IDs) |
| Working stages | GET/POST | `…/working-stages` | K1+K8 |

П6 adapter: `coerceK1ClientAppealsListPayload`, `fetchReceivingAppealsWorkspace(filters, cursor)`.
