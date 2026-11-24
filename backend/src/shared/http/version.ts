import { AppError } from "../errors/app-error";
import type { RouteContext } from "./context";
export const etag = (version: number) => `"v${version}"`;
export function requireVersion(ctx: RouteContext, version: number) {
  const value = ctx.request.headers.get("if-match");
  if (!value) {
    throw new AppError("PRECONDITION_REQUIRED", "Refresh before editing", 428);
  }
  if (value !== etag(version)) {
    throw new AppError("RESOURCE_VERSION_MISMATCH", "Document was updated by another user", 412);
  }
}
export function attachEtag(ctx: RouteContext, version: number) {
  ctx.set.headers.etag = etag(version);
}
