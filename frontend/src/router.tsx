import { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PlansPage } from "./pages/PlansPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { IntelligencePage } from "./pages/IntelligencePage";
import { getStoredUser } from "./api/client";
import type { AuthUser, UserRole } from "./api/types";

function RoleGuard({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const user = getStoredUser<AuthUser>();
  const role = user?.role ?? "customer";
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  // Public Entry Pages
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },

  // Authenticated Operations Workspace
  {
    element: <AppShell />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      {
        path: "intelligence",
        element: (
          <RoleGuard allowedRoles={["admin", "staff"]}>
            <IntelligencePage />
          </RoleGuard>
        ),
      },
      {
        path: "customers",
        element: (
          <RoleGuard allowedRoles={["admin", "staff"]}>
            <CustomersPage />
          </RoleGuard>
        ),
      },
      {
        path: "products",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <ProductsPage />
          </RoleGuard>
        ),
      },
      {
        path: "plans",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <PlansPage />
          </RoleGuard>
        ),
      },
      { path: "subscriptions", element: <SubscriptionsPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      {
        path: "payments",
        element: (
          <RoleGuard allowedRoles={["admin", "staff"]}>
            <PaymentsPage />
          </RoleGuard>
        ),
      },
      { path: "app", element: <Navigate to="/dashboard" replace /> },
    ],
  },

  // Fallback
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
