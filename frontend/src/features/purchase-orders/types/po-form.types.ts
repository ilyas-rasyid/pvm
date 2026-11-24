export type RfqAward = {
  id: string;
  lines: {
    id: string;
    rfqLineId: string;
    quotationLineId: string;
    quantity: number;
    issuedQty: number;
  }[];
};
export type Rfq = {
  id: string;
  reference: string;
  requestId: string;
  status: string;
  lines: {
    id: string;
    requestLineId: string;
    quantity: number;
  }[];
  award: RfqAward | null;
  quotations: {
    vendorId: string;
    revisions: {
      lines: {
        id: string;
        rfqLineId: string;
        price: string;
        taxRate: string;
      }[];
    }[];
  }[];
};
