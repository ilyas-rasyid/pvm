import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Menu, LogOut, Sun, Moon, ChevronDown } from "lucide-react";
import { nav } from "../app/config/navigation";
import { logout } from "../shared/api/http-client";
import { queryClient } from "../app/query/query-client";
import type { User } from "../shared/types/models";

const roles: Record<string, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_MANAGER: "Department Manager",
  PROCUREMENT_OFFICER: "Procurement Officer",
  RECEIVING_OFFICER: "Receiving Officer",
  FINANCE_OFFICER: "Finance / AP",
  ADMIN: "Administrator",
};
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("pvms-theme");
    if (saved) return saved === "dark";
    return (
      document.documentElement.dataset.theme === "dark" ||
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  const location = useLocation();
  const current = location.pathname;

  function isNavActive(to: string): boolean {
    if (to === "/app") {
      return current === "/app" || current === "/app/";
    }
    if (to === "/app/my-requests") {
      return current === "/app/my-requests" || current.startsWith("/app/requests");
    }
    if (to === "/app/receiving/expected") {
      return current.startsWith("/app/receiving");
    }
    if (to === "/app/finance/budgets") {
      return (
        current === "/app/finance/budgets" ||
        current.startsWith("/app/finance/budgets/") ||
        current.startsWith("/app/admin/budgets") ||
        current.startsWith("/app/budgets") ||
        current.startsWith("/app/department/budget")
      );
    }
    if (to === "/app/admin/departments") {
      return (
        current === "/app/admin/departments" ||
        (current.startsWith("/app/admin/") &&
          !current.startsWith("/app/admin/users") &&
          !current.startsWith("/app/admin/audit") &&
          !current.startsWith("/app/admin/budgets"))
      );
    }
    return current === to || current.startsWith(`${to}/`);
  }

  useEffect(() => {
    const next = dark ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("pvms-theme", next);
  }, [dark]);

  async function exit() {
    try {
      await logout();
    } finally {
      queryClient.clear();
      window.location.assign("/login");
    }
  }
  function theme() {
    setDark((prev) => !prev);
  }
  return (
    <div className="app-shell">
      {open && (
        <button
          aria-label="Close navigation"
          className="mobile-overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-top">
          <span className="brand-mark">P</span>
          <span>
            pvms<span className="muted">.</span>
          </span>
        </div>
        <div className="nav-scroll">
          {nav.map((group) => {
            const entries = group.items.filter(
              (item) =>
                (item.roles as readonly string[]).includes("ALL") ||
                (item.roles as readonly string[]).includes(user.role),
            );
            return entries.length ? (
              <div
                className="nav-group"
                key={group.group}
              >
                <p className="nav-group-title">{group.group}</p>
                {entries.map((item) => {
                  const active = isNavActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to as "/app"}
                      onClick={() => setOpen(false)}
                      activeOptions={{ exact: item.to === "/app" }}
                      activeProps={{ className: "" }}
                      inactiveProps={{ className: "" }}
                      aria-current={active ? "page" : undefined}
                      className={`nav-link ${active ? "active" : ""}`}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null;
          })}
        </div>
        <div className="sidebar-footer">
          <div className="profile-mini">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{roles[user.role] || user.role}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="inline-list">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={19} />
            </button>
            <span className="topbar-context">Procurement workspace</span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              onClick={theme}
              title={dark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
              aria-label={dark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to={"/app/notifications" as "/app"}
              className="icon-button"
              title="Notifications"
            >
              <Bell size={18} />
            </Link>
            <Link
              to={"/app/profile" as "/app"}
              className="inline-list"
            >
              <span className="avatar">{user.name.slice(0, 1)}</span>
              <ChevronDown size={13} />
            </Link>
            <button
              className="icon-button"
              onClick={exit}
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
