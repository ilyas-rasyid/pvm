const success = new Set([
  "APPROVED",
  "MATCHED",
  "READY_FOR_PAYMENT",
  "POSTED",
  "FULLY_RECEIVED",
  "CLOSED",
  "DONE",
  "ACTIVE",
]);
const warn = new Set([
  "SUBMITTED",
  "PARTIALLY_RECEIVED",
  "DISCREPANCY",
  "PENDING",
  "OPEN",
  "EVALUATION",
]);
const danger = new Set(["REJECTED", "CANCELLED", "VOIDED", "FAILED", "INACTIVE"]);
export function StatusBadge({ status }: { status: string }) {
  const cls = success.has(status)
    ? "success"
    : warn.has(status)
      ? "warn"
      : danger.has(status)
        ? "danger"
        : "info";
  return <span className={`badge ${cls}`}>{status.replaceAll("_", " ")}</span>;
}
