import { Link } from "@tanstack/react-router";
import { LockKeyhole, UserRound } from "lucide-react";

import { useProfile } from "../hooks/useProfile";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ErrorNotice, Loading } from "../../../shared/ui/Feedback";
import { dateText } from "../../../shared/formatters/value";

export function ProfilePage({ security = false }: { security?: boolean }) {
  const {
    user,
    isPending,
    oldPassword,
    setOld,
    next,
    setNext,
    error,
    setError,
    success,
    setSuccess,
    busy,
    setBusy,
    sessions,
    change,
    revoke,
  } = useProfile({ security });
  if (isPending) {
    return (
      <main className="page">
        <Loading />
      </main>
    );
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="YOUR ACCOUNT"
        title={security ? "Account security" : "My profile"}
        description={
          security
            ? "Change your password and manage active sessions."
            : "Personal identity and assigned role."
        }
      />
      {error && (
        <div style={{ marginBottom: 18 }}>
          <ErrorNotice message={error} />
        </div>
      )}
      {success && (
        <div
          className="alert success"
          style={{ marginBottom: 18 }}
        >
          {success}
        </div>
      )}
      {!security ? (
        <section className="card max-form">
          <div className="section-header">
            <h2 className="card-title">Account information</h2>
            <UserRound size={17} />
          </div>
          <div className="card-pad">
            <dl className="detail-meta">
              <div>
                <dt>Name</dt>
                <dd>{user?.name}</dd>
              </div>
              <div>
                <dt>Work email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{user?.role.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>
                  {user?.departmentName ||
                    (typeof user?.department === "string"
                      ? user.department
                      : user?.department?.name) ||
                    "Not assigned"}
                </dd>
              </div>
            </dl>
            <Link
              className="button"
              to="/app/profile/security"
              style={{ marginTop: 22 }}
            >
              Security settings
            </Link>
          </div>
        </section>
      ) : (
        <div className="stack max-form">
          <section className="card">
            <div className="section-header">
              <h2 className="card-title">Change password</h2>
              <LockKeyhole size={17} />
            </div>
            <form
              className="form-section stack"
              onSubmit={change}
            >
              <label className="form-field">
                Current password
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOld(e.target.value)}
                />
              </label>
              <label className="form-field">
                New password (15+ characters)
                <input
                  type="password"
                  required
                  minLength={15}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </label>
              <div className="form-actions">
                <button
                  className="button primary"
                  disabled={busy}
                >
                  {busy ? "Updating…" : "Change password"}
                </button>
              </div>
            </form>
          </section>
          <section className="card">
            <div className="section-header">
              <h2 className="card-title">Active sessions</h2>
            </div>
            {sessions.isPending ? (
              <Loading />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Last activity</th>
                      <th>Session</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.data?.map((s) => (
                      <tr key={s.id}>
                        <td>{dateText(s.createdAt)}</td>
                        <td>{dateText(s.lastSeenAt)}</td>
                        <td>{s.current ? "Current device" : "Other session"}</td>
                        <td>
                          <button
                            className="button small-btn danger"
                            onClick={() => revoke(s.id)}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
