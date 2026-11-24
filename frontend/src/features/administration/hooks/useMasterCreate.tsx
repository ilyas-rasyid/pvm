import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { fields, endpoints, redirectAfterCreate } from "../config/master-create.config";
import type { Kind } from "../config/master-create.config";
import { masterDataApi } from "../services/master-data.api";

export function useMasterCreate({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsDept = fields[kind].some((f) => f.options === "departments");
  const needsCenter = fields[kind].some((f) => f.options === "centers");
  const needsPeriod = fields[kind].some((f) => f.options === "periods");
  const depts = useQuery({
    queryKey: ["reference", "departments"],
    queryFn: () => masterDataApi.departments(),
    enabled: needsDept,
  });
  const centers = useQuery({
    queryKey: ["reference", "cost-centers"],
    queryFn: () => masterDataApi.costCenters(),
    enabled: needsCenter,
  });
  const periods = useQuery({
    queryKey: ["reference", "periods"],
    queryFn: () => masterDataApi.fiscalPeriods(),
    enabled: needsPeriod,
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...values };
      if (kind === "user" && !payload.departmentId) {
        payload.departmentId = null;
      }
      if (kind === "vendor" && !payload.email) {
        delete payload.email;
      }
      if (kind === "policy") {
        payload.directPurchaseEnabled = values.directPurchaseEnabled !== "false";
      }
      await masterDataApi.create(endpoints[kind], payload);
      await navigate({ to: (redirectAfterCreate[kind] || "/app") as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return {
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
  };
}
