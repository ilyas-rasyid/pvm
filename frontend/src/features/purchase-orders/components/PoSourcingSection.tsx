import type { Dispatch, SetStateAction } from "react";

import { Field } from "../../../shared/ui/forms/FormFrame";
import type { EntityRow, PurchaseRequest } from "../../../shared/types/models";
import type { Rfq } from "../types/po-form.types";

type Props = {
  mode: "DIRECT" | "RFQ";
  setMode: Dispatch<SetStateAction<"DIRECT" | "RFQ">>;
  requestId: string;
  setRequestId: Dispatch<SetStateAction<string>>;
  rfqId: string;
  setRfqId: Dispatch<SetStateAction<string>>;
  vendorId: string;
  setVendorId: Dispatch<SetStateAction<string>>;
  periodId: string;
  setPeriodId: Dispatch<SetStateAction<string>>;
  locationId: string;
  setLocationId: Dispatch<SetStateAction<string>>;
  reason: string;
  setReason: Dispatch<SetStateAction<string>>;
  queue: PurchaseRequest[];
  rfqs: Rfq[];
  vendors: EntityRow[];
  periods: EntityRow[];
  locations: EntityRow[];
};

export function PoSourcingSection({
  mode, setMode, requestId, setRequestId, rfqId, setRfqId, vendorId, setVendorId,
  periodId, setPeriodId, locationId, setLocationId, reason, setReason,
  queue, rfqs, vendors, periods, locations,
}: Props) {
  return (
    <section className="form-section">
      <h3>Sourcing method</h3>
      <div className="inline-list">
        <label className="inline-list">
          <input
            type="radio"
            checked={mode === "DIRECT"}
            onChange={() => setMode("DIRECT")}
          />{" "}
          Direct purchase
        </label>
        <label className="inline-list">
          <input
            type="radio"
            checked={mode === "RFQ"}
            onChange={() => setMode("RFQ")}
          />{" "}
          Awarded RFQ
        </label>
      </div>
      <div
        className="form-grid"
        style={{ marginTop: 17 }}
      >
        {mode === "DIRECT" ? (
          <Field label="Approved purchase request">
            <select
              required
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            >
              <option value="">Select request</option>
              {queue.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                >
                  {r.reference} · {r.title}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Awarded RFQ">
            <select
              required
              value={rfqId}
              onChange={(e) => {
                setRfqId(e.target.value);
                setVendorId("");
              }}
            >
              <option value="">Select awarded RFQ</option>
              {rfqs
                .filter((r) => r.status === "AWARDED")
                .map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                  >
                    {r.reference}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Vendor">
          <select
            required
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="">Select vendor</option>
            {vendors
              .filter((v) => v.active)
              .map((v) => (
                <option
                  key={v.id}
                  value={v.id}
                >
                  {v.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Fiscal period">
          <select
            required
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            <option value="">Select period</option>
            {periods
              .filter((p) => p.status === "OPEN")
              .map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {String(p.code || p.id)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Delivery location">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">No location selected</option>
            {locations.map((l) => (
              <option
                key={l.id}
                value={l.id}
              >
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {mode === "DIRECT" && (
        <div style={{ marginTop: 16 }}>
          <Field label="Direct purchase justification">
            <textarea
              required
              minLength={10}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why direct sourcing is appropriate"
            />
          </Field>
        </div>
      )}
    </section>
  );
}
