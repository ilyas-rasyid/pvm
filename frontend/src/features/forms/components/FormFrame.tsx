import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ErrorNotice } from "../../../shared/ui/Feedback";
export function FormFrame({
  title,
  description,
  error,
  children,
}: {
  title: string;
  description: string;
  error?: string;
  children: ReactNode;
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
          to="/app"
        >
          Back to workspace
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
