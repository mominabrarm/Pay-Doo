import { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
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

// Public Stitch-designed Pages
import { LandingPage } from "./pages/public/LandingPage";
import { SignupPage } from "./pages/public/SignupPage";
import { LoginPage } from "./pages/public/LoginPage";
import { ForgotPasswordPage } from "./pages/public/ForgotPasswordPage";
import { ResetConfirmationPage } from "./pages/public/ResetConfirmationPage";

function RoleGuard({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const user = getStoredUser<AuthUser>();
  const role = user?.role ?? "customer";
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  // Public Marketing & Auth routes
  { path: "/", element: <LandingPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-confirmation", element: <ResetConfirmationPage /> },

  // Protected App Workspace routes
  {
    path: "/",
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
      // Aliases for /app routes
      { path: "app", element: <Navigate to="/dashboard" replace /> },
      { path: "app/dashboard", element: <Navigate to="/dashboard" replace /> },
      { path: "app/customers", element: <Navigate to="/customers" replace /> },
      { path: "app/products", element: <Navigate to="/products" replace /> },
      { path: "app/plans", element: <Navigate to="/plans" replace /> },
      { path: "app/subscriptions", element: <Navigate to="/subscriptions" replace /> },
      { path: "app/invoices", element: <Navigate to="/invoices" replace /> },
      { path: "app/payments", element: <Navigate to="/payments" replace /> },
    ],
  },

  // Fallback redirect
  { path: "*", element: <Navigate to="/" replace /> },
]);
