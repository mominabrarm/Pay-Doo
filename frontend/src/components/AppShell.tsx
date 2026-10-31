import { useState, useEffect } from "react";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getAuthToken, getStoredUser, clearAuthSession } from "../api/client";
import { api } from "../api/paydoo";
import type { AuthUser, UserRole } from "../api/types";

interface NavItem {
  path: string;
  label: string;
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/customers", label: "Customers" },
    { path: "/products", label: "Products" },
    { path: "/plans", label: "Plans" },
    { path: "/subscriptions", label: "Subscriptions" },
    { path: "/invoices", label: "Invoices" },
    { path: "/payments", label: "Payments" },
  ],
  staff: [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/customers", label: "Customers" },
    { path: "/subscriptions", label: "Subscriptions" },
    { path: "/invoices", label: "Invoices" },
    { path: "/payments", label: "Payments" },
  ],
  customer: [
    { path: "/dashboard", label: "My Portal" },
    { path: "/subscriptions", label: "My Subscriptions" },
    { path: "/invoices", label: "My Invoices" },
  ],
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getAuthToken();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser<AuthUser>());

  useEffect(() => {
    if (token) {
      api.getMe()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          clearAuthSession();
          navigate("/login", { replace: true, state: { from: location } });
        });
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole: UserRole = currentUser?.role ?? "customer";
  const visibleNav = navItemsByRole[userRole] || navItemsByRole.customer;

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuthSession();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/dashboard" aria-label="PayDoo dashboard">
          <span className="brand-mark">P</span>
          <span>Pay<span>Doo</span></span>
        </NavLink>

        <nav aria-label="Main navigation">
          {visibleNav.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard"}
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
          <div className="user-profile-widget" style={{ width: "100%", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <strong style={{ color: "#f8fafc", fontSize: "13px" }}>
                {currentUser?.full_name || currentUser?.email?.split("@")[0] || "User"}
              </strong>
              <span
                className={`badge badge-${currentUser?.role === "admin" ? "confirmed" : currentUser?.role === "staff" ? "paused" : "active"}`}
                style={{ textTransform: "capitalize", fontSize: "10px", padding: "2px 6px" }}
              >
                {currentUser?.role ?? "customer"}
              </span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "11px", wordBreak: "break-all" }}>
              {currentUser?.email}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#9eb5cb" }}>
              <span className="live-dot" /> Live API
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-button"
              style={{ color: "#f87171", fontSize: "12px", cursor: "pointer", padding: "2px 6px" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
