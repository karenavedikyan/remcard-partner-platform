# P6 handoff — manual channels (`+ Свой канал`)

**Scope:** source-only П6; no DB/deploy. Prototype `client-appeals.js` `addWorkspaceChannel` (1264–1308, 2876).

## Wire contract (user pins)

| Owner | Tip   | Contract |
|-------|-------|----------|
| K8    | `0f4fe833` | `settings.manualChannels: [{ key, label }]` per receiving `User.id` |
| K1    | `51353825` | `POST /api/pro/client-appeals/working-stages` body `{ kind: 'manualChannel', label, expectedVersion? }` → `{ settings, version }` |
| K1    | manual create | `manualSourceKey` = builtin key or own persisted custom `key` (not free text) |

## П6 implementation

- `unwrapReceivingPartnerSettingsWire` maps `manualChannels`.
- `postReceivingManualChannel`, `receivingManualChannelOptions`, `findDuplicateManualChannelLabel` in `receiving-appeals-api.ts`.
- `ReceivingAppealForm`: duplicate (case-insensitive), empty label, blocked POST (no localStorage), select new key after save.
- `ReceivingAppealsWorkspace` passes `settings`, `settingsVersion`, `onChannelsUpdated`.

## Detail mapper boundary (P4)

- `ReceivingAppealDetailRowWire` + `mapReceivingAppealDetailFieldsFromWire` preserve `privateNotes`, `clientContact`, `discountPercent`, `certValidUntil`.
- `ReceivingAppealDetailWire` remains the raw GET envelope; P4 may map from wire directly — П6 mapper is convenience only.

## Unresolved

- P1 must allowlist `POST /api/pro/client-appeals/working-stages` on production pin before UI save leaves `BLOCKED_CONTRACT`.
- K8 migration apply still requires separate production DB approval.
