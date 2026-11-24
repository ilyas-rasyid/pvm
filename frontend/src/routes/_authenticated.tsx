import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";

import { AppShell } from "../layouts/AppShell";
import { useAuth } from "../features/auth/hooks/useAuth";
import { HttpProblem } from "../shared/api/http-client";

function Guard() {
  const auth = useAuth();
  if (auth.isPending) {
    return <div className="boot-state">Memeriksa sesi aman…</div>;
  }
  if (auth.error instanceof HttpProblem && auth.error.problem.status === 401) {
    return <Navigate to="/login" />;
  }
  if (auth.isError) {
    return (
      <div className="boot-state">
        Tidak dapat memeriksa sesi. <button onClick={() => auth.refetch()}>Coba lagi</button>
      </div>
    );
  }
  return (
    <AppShell user={auth.data!}>
      <Outlet />
    </AppShell>
  );
}
export const Route = createFileRoute("/_authenticated")({ component: Guard });
