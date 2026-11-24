import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import type { InvoiceQuantities, InvoiceUnitPrices } from "../types/invoice-form.types";
import { invoicesApi } from "../services/invoices.api";

export function useInvoiceForm() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState<InvoiceQuantities>({});
  const [prices, setPrices] = useState<InvoiceUnitPrices>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const orders = useQuery({
    queryKey: ["po", "options"],
    queryFn: () => invoicesApi.listOrders(),
  });
  const order = useQuery({
    queryKey: ["po", orderId],
    queryFn: () => invoicesApi.getOrder(orderId),
    enabled: !!orderId,
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lines = (order.data?.lines || [])
        .filter((l) => (qty[l.id] || 0) > 0)
        .map((l) => ({
          orderLineId: l.id,
          quantity: qty[l.id],
          price: prices[l.id] || String(l.price),
          taxRate: String(l.taxRate),
        }));
      const invoice = await invoicesApi.create({
        orderId,
        vendorId: order.data?.vendorId,
        number,
        invoiceDate,
        lines,
      });
      await navigate({ to: `/app/invoices/${invoice.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot create invoice");
    } finally {
      setBusy(false);
    }
  }
  return {
    navigate,
    orderId,
    setOrderId,
    number,
    setNumber,
    invoiceDate,
    setInvoiceDate,
    qty,
    setQty,
    prices,
    setPrices,
    busy,
    setBusy,
    error,
    setError,
    orders,
    order,
    save,
  };
}
