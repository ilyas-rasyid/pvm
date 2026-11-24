import { fields, redirectAfterCreate } from "../config/master-create.config";
import type { Kind } from "../config/master-create.config";
import { FormFrame, Field, Actions } from "../../../shared/ui/forms/FormFrame";
import { useMasterCreate } from "../hooks/useMasterCreate";

export function MasterCreatePage({ kind }: { kind: Kind }) {
  const {
    navigate,
    values,
    setValues,
    error,
    setError,
    busy,
    setBusy,
    needsDept,
    needsCenter,
    needsPeriod,
    depts,
    centers,
    periods,
    submit,
  } = useMasterCreate({ kind });
  return (
    <FormFrame
      title={`New ${kind.replaceAll("-", " ")}`}
      description="Create an authorized record in the company workspace."
      error={error}
      backTo={redirectAfterCreate[kind] || "/app"}
      backLabel="Back to list"
    >
      <form onSubmit={submit}>
        <section className="form-section">
          <h3>Record information</h3>
          <div className="form-grid">
            {fields[kind].map((field) => (
              <Field
                label={field.label}
                key={field.name}
              >
                {field.options ? (
                  <select
                    required={field.name !== "departmentId"}
                    value={values[field.name] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  >
                    <option value="">Select option</option>
                    {(
                      (field.options === "departments"
                        ? depts.data?.map((x) => ({ value: x.id, label: String(x.name) }))
                        : field.options === "centers"
                          ? centers.data?.map((x) => ({ value: x.id, label: String(x.name) }))
                          : field.options === "periods"
                            ? periods.data?.map((x) => ({ value: x.id, label: String(x.code) }))
                            : field.options
                              ?.split(",")
                              .map((x) => ({ value: x, label: x.replaceAll("_", " ") }))) || []
                    ).map((o) => (
                      <option
                        key={o.value}
                        value={o.value}
                      >
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={!["email", "phone", "address"].includes(field.name)}
                    type={field.type || "text"}
                    value={values[field.name] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
          <Actions
            busy={busy}
            label="Create record"
          />
        </section>
      </form>
    </FormFrame>
  );
}
