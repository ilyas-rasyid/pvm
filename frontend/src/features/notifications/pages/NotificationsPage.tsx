
import { Bell, Check } from "lucide-react";

import { PageHeader } from "../../../shared/ui/PageHeader";
import { Loading, Empty, ErrorNotice } from "../../../shared/ui/Feedback";
import { dateText } from "../../../shared/formatters/value";

type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};
import { useNotifications } from "../hooks/useNotifications";

export function NotificationsPage() {
  const {
    client,
    data,
    isPending,
    error,
    mark,
  } = useNotifications();
  return (
    <main className="page">
      <PageHeader
        eyebrow="WORKSPACE"
        title="Notifications"
        description="Operational events generated from real backend transactions."
        actions={
          <button
            className="button"
            onClick={() => mark()}
          >
            <Check size={15} />
            Mark all read
          </button>
        }
      />
      <section className="card">
        {isPending ? (
          <Loading />
        ) : error ? (
          <div className="card-pad">
            <ErrorNotice message={error.message} />
          </div>
        ) : !data?.length ? (
          <Empty
            title="You're all caught up"
            description="No notifications yet."
          />
        ) : (
          data.map((n) => (
            <div
              className="form-section flex-between"
              key={n.id}
            >
              <div>
                <div className="inline-list">
                  <Bell size={15} />
                  <strong>{n.title}</strong>
                  {!n.readAt && <span className="badge info">Unread</span>}
                </div>
                <p
                  className="muted small"
                  style={{ margin: "8px 0" }}
                >
                  {n.message}
                </p>
                <p className="small muted">{dateText(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <button
                  className="button small-btn"
                  onClick={() => mark(n.id)}
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
