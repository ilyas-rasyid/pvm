import type { EntityRow } from "../../../shared/types/models";
import type { Kind } from "../config/document-config";

export type DocumentAction = {
  label: string;
  command: string;
  roles: string[];
  reason?: boolean;
  to?: string;
};

export function getDocumentActions(
  kind: Kind,
  status: string,
  data: EntityRow | undefined,
  user: { id?: string; role?: string } | undefined,
  id: string,
): DocumentAction[] {
  const actions: DocumentAction[] = [];
  if (kind === "request") {
    if (status === "DRAFT" && data?.requesterId === user?.id) {
      actions.push({ label: "Submit request", command: "submit", roles: ["ALL"] });
    }
    if (
      status === "SUBMITTED" &&
      ["ADMIN", "DEPARTMENT_MANAGER"].includes(user?.role || "") &&
      data?.requesterId !== user?.id
    ) {
      actions.push(
        { label: "Approve", command: "approve", roles: ["ALL"] },
        { label: "Reject", command: "reject", roles: ["ALL"], reason: true },
      );
    }
  }
  if (kind === "rfq" && ["PROCUREMENT_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (status === "DRAFT") {
      actions.push({ label: "Open RFQ", command: "open", roles: ["ALL"] });
    }
    if (status === "OPEN") {
      actions.push({ label: "Start evaluation", command: "evaluate", roles: ["ALL"] });
    }
    if (status === "EVALUATION") {
      actions.push({
        label: "Compare & award",
        command: "compare",
        to: `/app/rfqs/${id}/compare`,
        roles: ["ALL"],
      });
    }
  }
  if (kind === "po" && ["PROCUREMENT_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (status === "DRAFT") {
      actions.push({ label: "Issue PO", command: "issue", roles: ["ALL"] });
    }
    if (["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(status)) {
      actions.push({ label: "Close PO", command: "close", roles: ["ALL"], reason: true });
    }
    if (["DRAFT", "ISSUED"].includes(status)) {
      actions.push({ label: "Cancel PO", command: "cancel", roles: ["ALL"], reason: true });
    }
  }
  if (kind === "receipt" && ["RECEIVING_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (status === "DRAFT") {
      actions.push({ label: "Post receipt", command: "post", roles: ["ALL"] });
    }
    if (["DRAFT", "POSTED"].includes(status)) {
      actions.push({ label: "Void receipt", command: "void", roles: ["ALL"], reason: true });
    }
  }
  if (kind === "invoice" && ["FINANCE_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (["DRAFT", "DISCREPANCY"].includes(status)) {
      actions.push({
        label: "Submit invoice",
        command: status === "DRAFT" ? "submit" : "resubmit",
        roles: ["ALL"],
      });
    }
    if (["SUBMITTED", "MATCHED", "DISCREPANCY"].includes(status)) {
      actions.push({
        label: "Three-way matching",
        command: "matching",
        to: `/app/invoices/${id}/matching`,
        roles: ["ALL"],
      });
    }
    if (["DRAFT", "SUBMITTED", "MATCHED", "DISCREPANCY"].includes(status)) {
      actions.push({ label: "Cancel invoice", command: "cancel", roles: ["ALL"], reason: true });
    }
  }
  return actions;
}
