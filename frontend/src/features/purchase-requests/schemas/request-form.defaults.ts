import type { RequestLine } from "../types/request-form.types";

export const createBlankRequestLine = (): RequestLine => ({
  description: "",
  quantity: 1,
  estimatedPrice: "0.00",
  unit: "UNIT",
});
