import { InvoiceFormFields } from "../components/InvoiceFormFields";
import { FormFrame } from "../../../shared/ui/forms/FormFrame";
import { useInvoiceForm } from "../hooks/useInvoiceForm";

export function InvoiceFormPage() {
  const model = useInvoiceForm();
  const { error } = model;
  return (
    <FormFrame
      title="Record vendor invoice"
      description="A vendor invoice stays draft until submitted and matched against accepted goods."
      error={error}
    >
      <InvoiceFormFields model={model} />
    </FormFrame>
  );
}
