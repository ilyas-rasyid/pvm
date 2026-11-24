export const attempts = new Map<
  string,
  {
    count: number;
    expires: number;
  }
>();
