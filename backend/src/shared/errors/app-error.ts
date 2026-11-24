export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 409,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function assert(
  condition: unknown,
  code: string,
  message: string,
  status = 409,
): asserts condition {
  if (!condition) {
    throw new AppError(code, message, status);
  }
}
