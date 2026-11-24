import type { Actor } from "../../../shared/http/context";

export function canReadRequest(
  actor: Actor,
  request: {
    requesterId: string;
    departmentId: string;
  },
) {
  return (
    request.requesterId === actor.id ||
    actor.role === "ADMIN" ||
    ["PROCUREMENT_OFFICER", "FINANCE_OFFICER"].includes(actor.role) ||
    (actor.role === "DEPARTMENT_MANAGER" && actor.departmentId === request.departmentId)
  );
}
