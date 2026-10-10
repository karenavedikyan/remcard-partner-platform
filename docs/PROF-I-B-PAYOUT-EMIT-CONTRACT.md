# PROF-I-B payout inbox emit (stream D)

**Function:** `emitProfPayoutRecorded(db, payload)` in navigator `src/lib/profInboxEmit.ts`.

**When:** Inside the same DB transaction (or immediately after commit with the same `db` client) that persists the payout transition. Do **not** call on rollback, validation failure, or dry-run.

**Payload (`ProfPayoutEmitPayload`):**

| Field | Rule |
|--------|------|
| `recipientUserId` | Single inbox owner (bonus recipient / pro user). |
| `payoutOperationId` | Stable id of the persisted pay operation — use the paid accrual row id or dedicated payment audit id; must be identical on idempotent retry. |
| `accrualType` | `'bonus'` \| `'agentBonus'`. |
| `accrualId` | Underlying accrual id (for deep link). |
| `amountRub` | Snapshot amount at commit (integer rubles as stored). |
| `method` | `'CASH'` \| `'TRANSFER'` (independent flags from I2). |
| `orderId` | Optional; not used in dedupe. |

**Dedupe:** `prof:payout:{payoutOperationId}:{recipientUserId}` — one inbox row per successful payout effect.

**Meta:** `scope: 'PROF'`, `kind: 'payout.cash'` or `payout.transfer'`, `eventId: payoutOperationId`, `entityType` = accrual type, `entityId` = accrual id.

**Deep link:** `profCabinetPayoutUrl(accrualId, accrualType)` on prof cabinet host.

**Example (after bonus pay commit):**

```ts
await emitProfPayoutRecorded(tx, {
  recipientUserId: bonus.proUserId,
  payoutOperationId: bonus.id,
  accrualType: 'bonus',
  accrualId: bonus.id,
  amountRub: bonus.amount,
  method: 'TRANSFER',
  orderId: bonus.orderId,
});
```

External Telegram/MAX delivery remains separate; inbox insert must not fail the payout API response.
