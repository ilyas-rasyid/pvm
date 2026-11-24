import type { Dispatch, SetStateAction } from "react";

import { Actions, Field } from "../../../shared/ui/forms/FormFrame";
import type { PurchaseRequest } from "../../../shared/types/models";
import type { RfqAward } from "../types/po-form.types";

type Props = {
  mode: "DIRECT" | "RFQ";
  source?: PurchaseRequest;
  vendorAwards: RfqAward["lines"];
  qty: Record<string, number>;
  setQty: Dispatch<SetStateAction<Record<string, number>>>;
  prices: Record<string, string>;
  setPrices: Dispatch<SetStateAction<Record<string, string>>>;
  busy: boolean;
};

export function PoLinesSection({
  mode, source, vendorAwards, qty, setQty, prices, setPrices, busy,
}: Props) {
  return (
    <section className="form-section">
      <h3>Purchase order lines</h3>
      {mode === "DIRECT"
        ? source?.lines.map((l) => (
          <div
            className="field-row field-array"
            key={l.id}
          >
            <div className="description-cell">
              <strong>{l.description}</strong>
              <div className="small muted">
                Available: {l.approvedQty - l.awardedQty - l.issuedQty}
              </div>
            </div>
            <Field label="Quantity">
              <input
                type="number"
                min={0}
                max={l.approvedQty - l.awardedQty - l.issuedQty}
                value={qty[l.id] ?? 0}
                onChange={(e) => setQty((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Unit price">
              <input
                value={prices[l.id] ?? String(l.estimatedPrice)}
                onChange={(e) => setPrices((v) => ({ ...v, [l.id]: e.target.value }))}
              />
            </Field>
          </div>
        ))
        : vendorAwards.map((l) => (
          <div
            className="field-row field-array"
            key={l.id}
          >
            <div className="description-cell">Awarded item · {l.rfqLineId.slice(0, 8)}</div>
            <Field label="Quantity">
              <input
                type="number"
                min={1}
                max={l.quantity - l.issuedQty}
                value={qty[l.id] ?? l.quantity - l.issuedQty}
                onChange={(e) => setQty((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
              />
            </Field>
          </div>
        ))}
      <p className="form-help">
        PO issue occurs after draft review and a final budget validation.
      </p>
      <Actions
        busy={busy}
        label="Save purchase order draft"
      />
    </section>
  );
}
