import Decimal from "decimal.js";
export function rupiah(value: unknown) {
  try {
    const val = new Decimal(String(value ?? 0));
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(val.toNumber());
  } catch {
    return String(value ?? "—");
  }
}
export function dateText(value: unknown) {
  if (!value) {
    return "—";
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}
export function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && "name" in value) {
    return String(
      (
        value as {
          name: unknown;
        }
      ).name,
    );
  }
  if (typeof value === "object" && "reference" in value) {
    return String(
      (
        value as {
          reference: unknown;
        }
      ).reference,
    );
  }
  return "—";
}
