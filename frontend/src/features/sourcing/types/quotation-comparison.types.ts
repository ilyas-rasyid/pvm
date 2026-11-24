type OfferLine = {
  id: string;
  rfqLineId: string;
  quantity: number;
  price: string;
  taxRate: string;
};
type Quote = {
  id: string;
  vendor: {
    name: string;
  };
  revisions: {
    lines: OfferLine[];
    leadDays: number;
    validUntil: string | null;
  }[];
};
export type QuotationComparison = {
  id: string;
  reference: string;
  lines: {
    id: string;
    quantity: number;
    requestLine: {
      description: string;
    };
  }[];
  quotations: Quote[];
};
