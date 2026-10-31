export const appConfig = {
  appName: "PayDoo",
  tagline: "Subscription & Recurring Revenue Engine",
  roles: {
    admin: {
      name: "Administrator",
      defaultRoute: "/app",
    },
    billing_manager: {
      name: "Billing Manager",
      defaultRoute: "/app/invoices",
    },
    finance_ops: {
      name: "Finance Ops",
      defaultRoute: "/app/subscriptions",
    },
  },
  defaultRole: "admin",
};

export function getDefaultRouteForRole(role = "admin") {
  return appConfig.roles[role]?.defaultRoute || "/app";
}
