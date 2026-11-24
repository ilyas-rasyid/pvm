import { RfqFormFields } from "../components/RfqFormFields";
import { FormFrame } from "../../../shared/ui/forms/FormFrame";
import { useRfqForm } from "../hooks/useRfqForm";

export function RfqFormPage() {
  const model = useRfqForm();
  const { error } = model;
  return (
    <FormFrame
      title="Create RFQ"
      description="Start sourcing from an approved request, then compare real vendor quotations."
      error={error}
    >
      <RfqFormFields model={model} />
    </FormFrame>
  );
}
