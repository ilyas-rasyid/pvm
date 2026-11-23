import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { FormFrame, Field, Actions } from "../components/FormFrame";
import { useAuth } from "../../auth/hooks/useAuth";
import type { EntityRow } from "../../../shared/types/models";

type Line = {
  description: string;
  quantity: number;
  estimatedPrice: string;
  unit: string;
};
const blank = (): Line => ({ description: "", quantity: 1, estimatedPrice: "0.00", unit: "UNIT" });
export function RequestFormPage() {
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [neededBy, setNeededBy] = useState(new Date().toISOString().slice(0, 10));
  const [justification, setJustification] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const centers = useQuery({
    queryKey: ["reference", "cost-centers"],
    queryFn: () => apiGet<EntityRow[]>("/admin/cost-centers"),
  });
  const departments = useQuery({
    queryKey: ["reference", "departments"],
    queryFn: () => apiGet<EntityRow[]>("/reference/departments"),
  });
  const selectedDepartment = departmentId || user?.departmentId || "";
  const filtered = (centers.data || []).filter((c) => c.departmentId === selectedDepartment);
  function patch(i: number, key: keyof Line, value: string | number) {
    setLines((old) => old.map((x, j) => (i === j ? { ...x, [key]: value } : x)));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const request = await apiPost<EntityRow>("/purchase-requests", {
        title,
        departmentId: selectedDepartment,
        costCenterId,
        neededBy,
        justification,
        lines,
      });
      await navigate({ to: `/app/requests/${request.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save request");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title="New purchase request"
      description="Describe what is needed and why. A manager reviews the request before procurement."
      error={error}
    >
      <form onSubmit={save}>
        <section className="form-section">
          <h3>Request information</h3>
          <div className="form-grid">
            <Field label="Request title">
              <input
                required
                minLength={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Office laptops for onboarding"
              />
            </Field>
            <Field label="Department">
              <select
                value={selectedDepartment}
                required
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setCostCenterId("");
                }}
              >
                <option value="">Select department</option>
                {(departments.data || []).map((d) => (
                  <option
                    key={d.id}
                    value={d.id}
                  >
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cost center">
              <select
                required
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
              >
                <option value="">Select cost center</option>
                {filtered.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Needed by">
              <input
                required
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ marginTop: 18 }}>
            <Field label="Business justification">
              <textarea
                required
                minLength={10}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain the business need and its urgency"
              />
            </Field>
          </div>
        </section>
        <section className="form-section">
          <div className="flex-between">
            <h3>Requested items</h3>
            <button
              className="button small-btn"
              type="button"
              onClick={() => setLines((x) => [...x, blank()])}
            >
              <Plus size={14} />
              Add item
            </button>
          </div>
          {lines.map((l, i) => (
            <div
              className="field-array"
              key={i}
            >
              <div className="field-row">
                <div className="description-cell">
                  <Field label="Item description">
                    <input
                      required
                      value={l.description}
                      onChange={(e) => patch(i, "description", e.target.value)}
                      placeholder="Business laptop, 16GB RAM"
                    />
                  </Field>
                </div>
                <Field label="Quantity">
                  <input
                    required
                    type="number"
                    min={1}
                    step={1}
                    value={l.quantity}
                    onChange={(e) => patch(i, "quantity", Number(e.target.value))}
                  />
                </Field>
                <Field label="Est. unit price (IDR)">
                  <input
                    required
                    inputMode="decimal"
                    value={l.estimatedPrice}
                    onChange={(e) => patch(i, "estimatedPrice", e.target.value)}
                  />
                </Field>
                <button
                  aria-label="Remove line"
                  className="icon-button"
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() => setLines((v) => v.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <p className="form-help">
            Estimated prices support planning; the final price is agreed when a PO is issued.
          </p>
          <Actions
            busy={busy}
            label="Save request draft"
          />
        </section>
      </form>
    </FormFrame>
  );
}
