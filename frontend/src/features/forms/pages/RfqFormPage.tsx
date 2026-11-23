import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { FormFrame, Field, Actions } from "../components/FormFrame";
import type { PurchaseRequest, EntityRow } from "../../../shared/types/models";

export function RfqFormPage() {
  const navigate = useNavigate();
  const [requestId, setRequestId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queue = useQuery({
    queryKey: ["procurement", "queue"],
    queryFn: () => apiGet<PurchaseRequest[]>("/procurement/queue"),
  });
  const vendors = useQuery({
    queryKey: ["vendors", "options"],
    queryFn: () => apiGet<EntityRow[]>("/vendors?pageSize=100"),
  });
  const selected = queue.data?.find((r) => r.id === requestId);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lines = (selected?.lines || [])
        .filter((l) => (qty[l.id] ?? l.approvedQty - l.awardedQty - l.issuedQty) > 0)
        .map((l) => ({
          requestLineId: l.id,
          quantity: qty[l.id] ?? l.approvedQty - l.awardedQty - l.issuedQty,
        }));
      const rfq = await apiPost<EntityRow>("/rfqs", {
        requestId,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        lines,
        vendorIds,
      });
      await navigate({ to: `/app/rfqs/${rfq.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create RFQ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title="Create RFQ"
      description="Start sourcing from an approved request, then compare real vendor quotations."
      error={error}
    >
      <form onSubmit={save}>
        <section className="form-section">
          <h3>Sourcing context</h3>
          <div className="form-grid">
            <Field label="Approved purchase request">
              <select
                required
                value={requestId}
                onChange={(e) => {
                  setRequestId(e.target.value);
                  setQty({});
                }}
              >
                <option value="">Choose approved request</option>
                {(queue.data || []).map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                  >
                    {r.reference} · {r.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quotation deadline">
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>
          </div>
        </section>
        <section className="form-section">
          <h3>Required quantities</h3>
          {!selected ? (
            <p className="muted">Choose an approved PR to select the requested items.</p>
          ) : (
            <div className="stack">
              {selected.lines.map((line) => (
                <div
                  className="flex-between"
                  key={line.id}
                >
                  <div>
                    <strong>{line.description}</strong>
                    <div className="small muted">
                      Available: {line.approvedQty - line.awardedQty - line.issuedQty} units
                    </div>
                  </div>
                  <input
                    className="input"
                    aria-label={`Quantity ${line.description}`}
                    style={{ width: 115 }}
                    type="number"
                    min={0}
                    max={line.approvedQty - line.awardedQty - line.issuedQty}
                    value={
                      qty[line.id] ??
                      Math.max(0, line.approvedQty - line.awardedQty - line.issuedQty)
                    }
                    onChange={(e) => setQty((v) => ({ ...v, [line.id]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="form-section">
          <h3>Invited vendors</h3>
          <p
            className="form-help"
            style={{ marginBottom: 12 }}
          >
            Select vendors whose quotations will be recorded by procurement.
          </p>
          <div className="form-grid">
            {(vendors.data || [])
              .filter((v) => v.active)
              .map((v) => (
                <label
                  key={v.id}
                  className="inline-list"
                  style={{ fontSize: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={vendorIds.includes(v.id)}
                    onChange={(e) =>
                      setVendorIds((prev) =>
                        e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id),
                      )
                    }
                  />
                  {v.name}
                </label>
              ))}
          </div>
          <Actions
            busy={busy}
            label="Create RFQ draft"
          />
        </section>
      </form>
    </FormFrame>
  );
}
