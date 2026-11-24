import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageHeader } from "../PageHeader";
import { ErrorNotice } from "../Feedback";
export function FormFrame({
  title,
  description,
  error,
  children,
  backTo = "/app",
  backLabel = "Back to workspace",
}: {
  title: string;
  description: string;
  error?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <main className="page">
      <PageHeader
        eyebrow="CREATE DOCUMENT"
        title={title}
        description={description}
      />
      <div className="card max-form">
        {error && (
          <div className="form-section">
            <ErrorNotice message={error} />
          </div>
        )}
        {children}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link
          className="button"
          to={backTo as "/app"}
        >
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      {label}
      {children}
    </label>
  );
}
export function Actions({ busy, label = "Save draft" }: { busy: boolean; label?: string }) {
  return (
    <div className="form-actions">
      <button
        className="button primary"
        disabled={busy}
        type="submit"
      >
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}
