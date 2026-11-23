import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
export function Loading({ label = "Loading records…" }: { label?: string }) {
  return (
    <div
      className="empty-state"
      role="status"
    >
      <LoaderCircle size={22} />
      <p>{label}</p>
    </div>
  );
}
export function Empty({
  title = "No records found",
  description = "There is nothing to display for the selected filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox size={25} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      className="alert error"
      role="alert"
    >
      <AlertCircle
        size={14}
        style={{ display: "inline", marginRight: 6 }}
      />
      {message}
    </div>
  );
}
