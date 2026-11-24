import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { login, HttpProblem } from "../../../shared/api/http-client";
import { queryClient } from "../../../app/query/query-client";
import { authKey, useAuth } from "../hooks/useAuth";
export function useLogin() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.data) {
      navigate({ to: "/app" });
    }
  }, [auth.data, navigate]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      await queryClient.invalidateQueries({ queryKey: authKey });
      await navigate({ to: "/app" });
    } catch (e) {
      setError(e instanceof HttpProblem ? e.message : "Login failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }
  return {
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
  };
}
