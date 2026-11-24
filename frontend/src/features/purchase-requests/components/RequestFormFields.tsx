import { Plus, Trash2 } from "lucide-react";

import { createBlankRequestLine } from "../schemas/request-form.defaults";
import { Field, Actions } from "../../../shared/ui/forms/FormFrame";
import type { useRequestForm } from "../hooks/useRequestForm";

type RequestFormFieldsProps = {
  model: ReturnType<typeof useRequestForm>;
};

export function RequestFormFields({ model }: RequestFormFieldsProps) {
  const {
    navigate,
    user,
    title,
    setTitle,
    departmentId,
    setDepartmentId,
    costCenterId,
    setCostCenterId,
    neededBy,
    setNeededBy,
    justification,
    setJustification,
    lines,
    setLines,
    busy,
    setBusy,
    error,
    setError,
    centers,
    departments,
    selectedDepartment,
    filtered,
    patch,
    save,
  } = model;

  return (
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
            onClick={() => setLines((x) => [...x, createBlankRequestLine()])}
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
  );
}
