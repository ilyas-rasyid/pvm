import { Link } from "@tanstack/react-router";

import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { rupiah, dateText, cellText } from "../../../shared/formatters/value";
import type { EntityRow } from "../../../shared/types/models";
import type { ResourceConfig } from "../config/resource-config";

function nested(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        typeof acc === "object" && acc !== null ? (acc as Record<string, unknown>)[key] : undefined,
      obj,
    );
}
function printable(value: unknown, type?: "money" | "date" | "status") {
  if (type === "status") {
    return <StatusBadge status={String(value || "UNKNOWN")} />;
  }
  if (type === "money") {
    return <span style={{ fontVariantNumeric: "tabular-nums" }}>{rupiah(value)}</span>;
  }
  if (type === "date") {
    return dateText(value);
  }
  if (typeof value === "boolean") {
    return <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} />;
  }
  return cellText(value);
}

export function ResourceRecordsTable({ rows, config }: { rows: EntityRow[]; config: ResourceConfig }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {config.columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
          {config.detail && <th> </th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {config.columns.map((col, i) => (
              <td key={col.key}>
                {i === 0 && config.detail ? (
                  <Link
                    className="text-link"
                    to={`${config.detail}/${row.id}` as "/app"}
                  >
                    {printable(nested(row, col.key), col.type)}
                  </Link>
                ) : (
                  printable(nested(row, col.key), col.type)
                )}
              </td>
            ))}
            {config.detail && (
              <td>
                <Link
                  className="button small-btn"
                  to={`${config.detail}/${row.id}` as "/app"}
                >
                  View
                </Link>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
