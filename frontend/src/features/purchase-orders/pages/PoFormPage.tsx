
import { FormFrame } from "../../../shared/ui/forms/FormFrame";
import { PoSourcingSection } from "../components/PoSourcingSection";
import { PoLinesSection } from "../components/PoLinesSection";
import { usePoForm } from "../hooks/usePoForm";

export function PoFormPage() {
  const {
    navigate,
    mode,
    setMode,
    requestId,
    setRequestId,
    vendorId,
    setVendorId,
    periodId,
    setPeriodId,
    locationId,
    setLocationId,
    reason,
    setReason,
    rfqId,
    setRfqId,
    qty,
    setQty,
    prices,
    setPrices,
    busy,
    setBusy,
    error,
    setError,
    queue,
    vendors,
    periods,
    locations,
    rfqs,
    rfq,
    source,
    awarded,
    vendorAwards,
    save,
  } = usePoForm();
  return (
    <FormFrame
      title="New purchase order"
      description="Prepare an order from an approved PR and an authorized sourcing decision."
      error={error}
    >
      <form onSubmit={save}>
        <PoSourcingSection
          mode={mode}
          setMode={setMode}
          requestId={requestId}
          setRequestId={setRequestId}
          rfqId={rfqId}
          setRfqId={setRfqId}
          vendorId={vendorId}
          setVendorId={setVendorId}
          periodId={periodId}
          setPeriodId={setPeriodId}
          locationId={locationId}
          setLocationId={setLocationId}
          reason={reason}
          setReason={setReason}
          queue={queue.data || []}
          rfqs={rfqs.data || []}
          vendors={vendors.data || []}
          periods={periods.data || []}
          locations={locations.data || []}
        />
        <PoLinesSection
          mode={mode}
          source={source}
          vendorAwards={vendorAwards}
          qty={qty}
          setQty={setQty}
          prices={prices}
          setPrices={setPrices}
          busy={busy}
        />
      </form>
    </FormFrame>
  );
}
