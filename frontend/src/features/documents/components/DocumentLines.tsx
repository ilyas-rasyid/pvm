import { rupiah } from "../../../shared/formatters/value";

type Line = {
  id: string;
  description?: string;
  quantity?: number;
  approvedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  deliveredQty?: number;
  invoicedQty?: number;
  price?: unknown;
  estimatedPrice?: unknown;
  total?: unknown;
  orderLine?: {
    description?: string;
  };
};
export function DocumentLines({ lines, kind }: { lines: Line[]; kind: string }) {
  if (!lines.length) return <div className="empty-state">No line items.</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            {kind === "po" && (
              <>
                <th>Accepted</th>
                <th>Invoiced</th>
              </>
            )}
            {kind === "receipt" && (
              <>
                <th>Accepted</th>
                <th>Rejected</th>
              </>
            )}
            <th>Unit price</th>
            <th>Line amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>{l.description || l.orderLine?.description || l.id.slice(0, 8)}</td>
              <td>{l.quantity ?? l.deliveredQty ?? "—"}</td>
              {kind === "po" && (
                <>
                  <td>{l.acceptedQty}</td>
                  <td>{l.invoicedQty}</td>
                </>
              )}
              {kind === "receipt" && (
                <>
                  <td>{l.acceptedQty}</td>
                  <td>{l.rejectedQty}</td>
                </>
              )}
              <td>
                {l.price !== undefined
                  ? rupiah(l.price)
                  : l.estimatedPrice !== undefined
                    ? rupiah(l.estimatedPrice)
                    : "—"}
              </td>
              <td>{l.total !== undefined ? rupiah(l.total) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
