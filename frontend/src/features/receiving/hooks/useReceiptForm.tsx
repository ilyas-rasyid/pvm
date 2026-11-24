import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import type { ReceivingQuantity } from "../types/receiving-form.types";
import { receivingApi } from "../services/receiving.api";

export function useReceiptForm() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<string, ReceivingQuantity>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const expected = useQuery({
    queryKey: ["receiving", "expected"],
    queryFn: () => receivingApi.expectedOrders(),
  });
  const order = useQuery({
    queryKey: ["po", orderId],
    queryFn: () => receivingApi.getOrder(orderId),
    enabled: !!orderId,
  });
  function patch(id: string, key: keyof ReceivingQuantity, val: number) {
    setValues((old) => {
      const next = {
        ...(old[id] || { deliveredQty: 0, acceptedQty: 0, rejectedQty: 0 }),
        [key]: val,
      };
      if (key === "acceptedQty" || key === "rejectedQty") {
        next.deliveredQty = next.acceptedQty + next.rejectedQty;
      }
      return { ...old, [id]: next };
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lines = (order.data?.lines || [])
        .filter((l) => (values[l.id]?.deliveredQty || 0) > 0)
        .map((l) => ({ orderLineId: l.id, ...values[l.id] }));
      const rec = await receivingApi.createReceipt({
        orderId,
        deliveryReference,
        note,
        lines,
      });
      await navigate({ to: `/app/receipts/${rec.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create receipt");
    } finally {
      setBusy(false);
    }
  }
  return {
    navigate,
    orderId,
    setOrderId,
    deliveryReference,
    setDeliveryReference,
    note,
    setNote,
    values,
    setValues,
    busy,
    setBusy,
    error,
    setError,
    expected,
    order,
    patch,
    save,
  };
}
