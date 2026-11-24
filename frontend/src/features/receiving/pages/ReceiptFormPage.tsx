import { ReceiptFormFields } from "../components/ReceiptFormFields";
import { FormFrame } from "../../../shared/ui/forms/FormFrame";
import { useReceiptForm } from "../hooks/useReceiptForm";

export function ReceiptFormPage() {
  const model = useReceiptForm();
  const { error } = model;
  return (
    <FormFrame
      title="Record goods receipt"
      description="Log delivered, accepted, and rejected units without exceeding the PO."
      error={error}
    >
      <ReceiptFormFields model={model} />
    </FormFrame>
  );
}
