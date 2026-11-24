export const normalizeInvoice = (number: string) =>
  number.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
