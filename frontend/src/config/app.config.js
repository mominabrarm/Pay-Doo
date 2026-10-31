export const appConfig = {
  appName: "PayDoo",
  tagline: "Subscription & Recurring Revenue Engine",
  roles: {
    admin: {
      name: "Administrator",
      defaultRoute: "/dashboard",
    },
    staff: {
      name: "Staff Member",
      defaultRoute: "/dashboard",
    },
    customer: {
      name: "Customer Portal",
      defaultRoute: "/dashboard",
    },
  },
  defaultRole: "customer",
};

export function getDefaultRouteForRole(role = "customer") {
  return appConfig.roles[role]?.defaultRoute || "/dashboard";
}
