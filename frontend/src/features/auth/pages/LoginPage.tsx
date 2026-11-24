
import { ArrowRight, ShieldCheck } from "lucide-react";

import { login } from "../../../shared/api/http-client";
import { useLogin } from "../hooks/useLogin";

export function LoginPage() {
  const {
    navigate,
    auth,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    setLoading,
    error,
    setError,
    submit,
  } = useLogin();
  return (
    <div className="login-layout">
      <aside className="login-aside">
        <div className="identity">
          <div className="brand-mark">P</div>
          <span>PVMS</span>
        </div>
        <div className="login-aside-copy">
          <p className="eyebrow light">PROCUREMENT OPERATIONS</p>
          <h1>
            Every purchase.
            <br />
            Accounted for.
          </h1>
          <p>A focused workspace for requests, sourcing, receiving and invoice verification.</p>
        </div>
        <div className="login-footer">
          <ShieldCheck size={17} /> Controlled approvals. Clear audit trails.
        </div>
      </aside>
      <main className="login-main">
        <div className="login-form-wrap">
          <div className="mobile-brand">PVMS · Procurement</div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your company credentials.</p>
          <form
            onSubmit={submit}
            className="stack gap-lg"
          >
            <label className="form-field">
              Work email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </label>
            <label className="form-field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <div
                className="alert error"
                role="alert"
              >
                {error}
              </div>
            )}
            <button
              className="button primary full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <p
            className="small muted"
            style={{ marginTop: 24 }}
          >
            Account access is managed by your administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
