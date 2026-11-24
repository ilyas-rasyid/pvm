import { RequestFormFields } from "../components/RequestFormFields";
import { FormFrame } from "../../../shared/ui/forms/FormFrame";
import { useRequestForm } from "../hooks/useRequestForm";

export function RequestFormPage() {
  const model = useRequestForm();
  const { error } = model;
  return (
    <FormFrame
      title="New purchase request"
      description="Describe what is needed and why. A manager reviews the request before procurement."
      error={error}
    >
      <RequestFormFields model={model} />
    </FormFrame>
  );
}
