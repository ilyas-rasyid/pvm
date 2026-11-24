import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { profileApi } from "../services/profile.api";
import { useAuth } from "../../auth/hooks/useAuth";

export function useProfile({ security = false }: { security?: boolean }) {
  const { data: user, isPending } = useAuth();
  const [oldPassword, setOld] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const sessions = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => profileApi.sessions(),
    enabled: security,
  });
  async function change(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await profileApi.changePassword(oldPassword, next);
      setOld("");
      setNext("");
      setSuccess("Password changed. Other sessions were revoked.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change failed");
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (!confirm("Revoke this session?")) {
      return;
    }
    try {
      await profileApi.revokeSession(id);
      await sessions.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke session");
    }
  }
  return {
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
  };
}
