import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { FormFrame, Field, Actions } from "../../forms/components/FormFrame";
import type { EntityRow } from "../../../shared/types/models";

type Kind =
  | "vendor"
  | "user"
  | "department"
  | "cost-center"
  | "category"
  | "location"
  | "period"
  | "policy"
  | "budget";
const endpoints: Record<Kind, string> = {
  vendor: "/vendors",
  user: "/admin/users",
  department: "/admin/departments",
  "cost-center": "/admin/cost-centers",
  category: "/admin/item-categories",
  location: "/admin/delivery-locations",
  period: "/admin/fiscal-periods",
  policy: "/admin/procurement-policies",
  budget: "/budgets",
};
const fields: Record<
  Kind,
  {
    name: string;
    label: string;
    type?: string;
    options?: string;
  }[]
> = {
  vendor: [
    { name: "code", label: "Vendor code" },
    { name: "name", label: "Legal company name" },
    { name: "email", label: "Business email", type: "email" },
    { name: "phone", label: "Phone" },
    { name: "address", label: "Address" },
  ],
  user: [
    { name: "name", label: "Full name" },
    { name: "email", label: "Work email", type: "email" },
    { name: "password", label: "Temporary password (15+ chars)", type: "password" },
    {
      name: "role",
      label: "Role",
      options:
        "EMPLOYEE,DEPARTMENT_MANAGER,PROCUREMENT_OFFICER,RECEIVING_OFFICER,FINANCE_OFFICER,ADMIN",
    },
    { name: "departmentId", label: "Department", options: "departments" },
  ],
  department: [
    { name: "code", label: "Department code" },
    { name: "name", label: "Department name" },
  ],
  "cost-center": [
    { name: "code", label: "Cost center code" },
    { name: "name", label: "Cost center name" },
    { name: "departmentId", label: "Department", options: "departments" },
  ],
  category: [
    { name: "code", label: "Category code" },
    { name: "name", label: "Category name" },
  ],
  location: [
    { name: "code", label: "Location code" },
    { name: "name", label: "Location name" },
    { name: "address", label: "Address" },
  ],
  period: [
    { name: "code", label: "Fiscal period code" },
    { name: "startDate", label: "Start", type: "date" },
    { name: "endDate", label: "End", type: "date" },
  ],
  policy: [
    { name: "directPurchaseThreshold", label: "Direct purchase maximum (IDR)" },
    { name: "directPurchaseEnabled", label: "Enable direct purchase", options: "true,false" },
  ],
  budget: [
    { name: "costCenterId", label: "Cost center", options: "centers" },
    { name: "fiscalPeriodId", label: "Fiscal period", options: "periods" },
    { name: "amount", label: "Initial allocation (IDR)" },
  ],
};
export function MasterCreatePage({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsDept = fields[kind].some((f) => f.options === "departments");
  const needsCenter = fields[kind].some((f) => f.options === "centers");
  const needsPeriod = fields[kind].some((f) => f.options === "periods");
  const depts = useQuery({
    queryKey: ["reference", "departments"],
    queryFn: () => apiGet<EntityRow[]>("/reference/departments"),
    enabled: needsDept,
  });
  const centers = useQuery({
    queryKey: ["reference", "cost-centers"],
    queryFn: () => apiGet<EntityRow[]>("/admin/cost-centers"),
    enabled: needsCenter,
  });
  const periods = useQuery({
    queryKey: ["reference", "periods"],
    queryFn: () => apiGet<EntityRow[]>("/admin/fiscal-periods"),
    enabled: needsPeriod,
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...values };
      if (kind === "user" && !payload.departmentId) payload.departmentId = null;
      if (kind === "vendor" && !payload.email) delete payload.email;
      if (kind === "policy")
        payload.directPurchaseEnabled = values.directPurchaseEnabled !== "false";
      await apiPost(endpoints[kind], payload);
      await navigate({ to: "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title={`New ${kind.replaceAll("-", " ")}`}
      description="Create an authorized record in the company workspace."
      error={error}
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
