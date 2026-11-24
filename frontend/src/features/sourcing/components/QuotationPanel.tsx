import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "../../../shared/api/http-client";
import { ErrorNotice } from "../../../shared/ui/Feedback";
import { Field } from "../../../shared/ui/forms/FormFrame";
import type { EntityRow } from "../../../shared/types/models";

type RfqLine = {
  id: string;
  quantity: number;
  requestLine?: {
    description: string;
  };
};
type RfqDoc = EntityRow & {
  lines: RfqLine[];
  invitations: {
    vendorId: string;
  }[];
};
export function QuotationPanel({ rfq, onSaved }: { rfq: EntityRow; onSaved: () => void }) {
  const doc = rfq as RfqDoc;
  const [vendorId, setVendorId] = useState("");
  const [reference, setReference] = useState("");
  const [leadDays, setLeadDays] = useState(7);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const vendors = useQuery({
    queryKey: ["vendors", "options"],
    queryFn: () => apiGet<EntityRow[]>("/vendors?pageSize=100"),
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiPost(`/rfqs/${doc.id}/record-quotation`, {
        vendorId,
        reference,
        leadDays,
        lines: doc.lines.map((l) => ({
          rfqLineId: l.id,
          quantity: quantities[l.id] || l.quantity,
          price: prices[l.id] || "0",
          taxRate: "0",
        })),
      });
      setReference("");
      setPrices({});
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record quotation");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="card"
      style={{ marginBottom: 18 }}
    >
      <div className="section-header">
        <h2 className="card-title">Record vendor quotation</h2>
      </div>
      <form
        className="form-section"
        onSubmit={save}
      >
        {error && <ErrorNotice message={error} />}
        <div className="form-grid">
          <Field label="Invited vendor">
            <select
              required
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value="">Choose invited vendor</option>
              {(vendors.data || [])
                .filter((v) => doc.invitations.some((i) => i.vendorId === v.id))
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
          <Field label="Vendor quotation reference">
            <input
              required
              minLength={2}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
          <Field label="Lead time (days)">
            <input
              required
              type="number"
              min={0}
              step={1}
              value={leadDays}
              onChange={(e) => setLeadDays(Number(e.target.value))}
            />
          </Field>
        </div>
        <div style={{ marginTop: 18 }}>
          {doc.lines.map((l) => (
            <div
              className="field-row field-array"
              key={l.id}
            >
              <div className="description-cell">
                <strong>{l.requestLine?.description || l.id.slice(0, 8)}</strong>
              </div>
              <Field label="Offered units">
                <input
                  type="number"
                  min={1}
                  value={quantities[l.id] || l.quantity}
                  onChange={(e) => setQuantities((x) => ({ ...x, [l.id]: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Unit price (IDR)">
                <input
                  required
                  inputMode="decimal"
                  value={prices[l.id] || ""}
                  onChange={(e) => setPrices((x) => ({ ...x, [l.id]: e.target.value }))}
                />
              </Field>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button
            className="button primary"
            disabled={busy}
            type="submit"
          >
            {busy ? "Recording…" : "Record quotation"}
          </button>
        </div>
      </form>
    </section>
  );
}
