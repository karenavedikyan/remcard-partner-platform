"use client";

/** Per-card bulk PATCH summary — one list item per appeal id. */
export function ReceivingBulkPartialOutcome({
  message,
  testId = "ca-receiving-bulk-error",
}: {
  message: string;
  testId?: string;
}) {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) {
    return (
      <p className="notice" role="alert" data-testid={testId}>
        {message}
      </p>
    );
  }
  return (
    <div className="notice" role="alert" data-testid={testId}>
      <ul className="ca-bulk-outcome-list" data-testid="ca-bulk-outcome-list">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}