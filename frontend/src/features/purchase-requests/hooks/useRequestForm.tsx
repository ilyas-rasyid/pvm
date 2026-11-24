import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { createBlankRequestLine } from "../schemas/request-form.defaults";
import type { RequestLine } from "../types/request-form.types";
import { purchaseRequestsApi } from "../services/purchase-requests.api";
import { useAuth } from "../../auth/hooks/useAuth";

export function useRequestForm() {
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [neededBy, setNeededBy] = useState(new Date().toISOString().slice(0, 10));
  const [justification, setJustification] = useState("");
  const [lines, setLines] = useState<RequestLine[]>([createBlankRequestLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const centers = useQuery({
    queryKey: ["reference", "cost-centers"],
    queryFn: () => purchaseRequestsApi.listCostCenters(),
  });
  const departments = useQuery({
    queryKey: ["reference", "departments"],
    queryFn: () => purchaseRequestsApi.listDepartments(),
  });
  const selectedDepartment = departmentId || user?.departmentId || "";
  const filtered = (centers.data || []).filter((c) => c.departmentId === selectedDepartment);
  function patch(i: number, key: keyof RequestLine, value: string | number) {
    setLines((old) => old.map((x, j) => (i === j ? { ...x, [key]: value } : x)));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const request = await purchaseRequestsApi.create({
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
  return {
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
  };
}
