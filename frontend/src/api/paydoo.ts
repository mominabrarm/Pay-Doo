import { request, getAuthToken } from "./client";
import type {
  AuthUser,
  Customer,
  CustomerDashboardSummary,
  CustomerInput,
  CustomerSubscribeInput,
  DashboardSummary,
  DiscountRule,
  Invoice,
  InvoiceExplanation,
  InvoiceGenerationInput,
  LeakageAlert,
  LeakageSummary,
  NotificationLog,
  NotificationPreferenceResponse,
  NotificationPreferenceUpdate,
  Payment,
  PaymentInput,
  Plan,
  PlanInput,
  PlanSimulatorOption,
  Product,
  ProductInput,
  ProductVariant,
  ProfileUpdateInput,
  SendNotificationRequest,
  SimulatorRequest,
  SimulatorResponse,
  Subscription,
  SubscriptionInput,
  TokenResponse,
  VariantInput,
} from "./types";

const body = (value: unknown) => ({ method: "POST", body: JSON.stringify(value) });

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", body(credentials)),
  register: (payload: { email: string; password: string; full_name?: string }) =>
    request<AuthUser>("/auth/register", body(payload)),
  getMe: () => request<AuthUser>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  // Core entities
  getDashboard: () => request<DashboardSummary>("/dashboard/summary"),
  getCustomerDashboard: (customerId?: number) =>
    request<CustomerDashboardSummary>(`/dashboard/customer-summary${customerId ? `?customer_id=${customerId}` : ""}`),
  listCustomers: (search?: string, skip = 0, limit = 50) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (search) params.set("search", search);
    return request<Customer[]>(`/customers?${params}`);
  },
  createCustomer: (input: CustomerInput) => request<Customer>("/customers", body(input)),
  listProducts: () => request<Product[]>("/products"),
  createProduct: (input: ProductInput) => request<Product>("/products", body(input)),
  createVariant: (productId: number, input: VariantInput) => request<ProductVariant>(`/products/${productId}/variants`, body(input)),
  listPlans: () => request<Plan[]>("/plans"),
  createPlan: (input: PlanInput) => request<Plan>("/plans", body(input)),
  listDiscounts: () => request<DiscountRule[]>("/discounts"),
  listSubscriptions: (skip = 0, limit = 50) => request<Subscription[]>(`/subscriptions?skip=${skip}&limit=${limit}`),
  createSubscription: (input: SubscriptionInput) => request<Subscription>("/subscriptions", body(input)),
  updateSubscriptionStatus: (subscriptionId: number, status: Subscription["status"]) => request<Subscription>(`/subscriptions/${subscriptionId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  generateInvoice: (subscriptionId: number, input: InvoiceGenerationInput) => request<Invoice>(`/subscriptions/${subscriptionId}/generate-invoice`, body(input)),
  listInvoices: (skip = 0, limit = 50) => request<Invoice[]>(`/invoices?skip=${skip}&limit=${limit}`),
  getInvoice: (invoiceId: number) => request<Invoice>(`/invoices/${invoiceId}`),
  getInvoicePdfUrl: (invoiceId: number) => {
    const token = getAuthToken();
    return `/api/invoices/${invoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },
  // Customer self-service methods
  subscribe: (input: CustomerSubscribeInput) => request<Subscription>("/subscriptions/subscribe", body(input)),
  updateProfile: (input: ProfileUpdateInput) => request<AuthUser>("/auth/profile", { method: "PUT", body: JSON.stringify(input) }),
  listPaymentHistory: () => request<Payment[]>("/invoices/payments/history"),
  recordPayment: (invoiceId: number, input: PaymentInput) => request<Payment>(`/invoices/${invoiceId}/payments`, body(input)),

  // Financial Intelligence (PROTECT, PREDICT, EXPLAIN)
  listLeakageAlerts: (status?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    const qs = params.toString();
    return request<LeakageAlert[]>(`/intelligence/alerts${qs ? `?${qs}` : ""}`);
  },
  scanLeakageAlerts: () => request<LeakageAlert[]>("/intelligence/alerts/scan", { method: "POST" }),
  updateLeakageAlert: (alertId: number, update: { status: string; resolution_notes?: string }) =>
    request<LeakageAlert>(`/intelligence/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    }),
  getLeakageSummary: () => request<LeakageSummary>("/intelligence/alerts/summary"),
  getSimulatorPlans: () => request<PlanSimulatorOption[]>("/intelligence/simulator/plans"),
  calculateSimulation: (input: SimulatorRequest) =>
    request<SimulatorResponse>("/intelligence/simulator/calculate", body(input)),
  explainInvoice: (invoiceId: number) => request<InvoiceExplanation>(`/invoices/${invoiceId}/explain`),

  // Notifications
  listNotifications: (params?: { invoice_id?: number; channel?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.invoice_id) qs.set("invoice_id", String(params.invoice_id));
    if (params?.channel) qs.set("channel", params.channel);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return request<NotificationLog[]>(`/notifications${query ? `?${query}` : ""}`);
  },
  sendInvoiceNotification: (invoiceId: number, input?: SendNotificationRequest) =>
    request<NotificationLog[]>(`/notifications/invoices/${invoiceId}/send`, body(input || { channel: "all", force_resend: true })),
  getNotificationPreferences: (customerId?: number) =>
    request<NotificationPreferenceResponse>(`/notifications/preferences${customerId ? `?customer_id=${customerId}` : ""}`),
  updateNotificationPreferences: (input: NotificationPreferenceUpdate, customerId?: number) =>
    request<NotificationPreferenceResponse>(`/notifications/preferences${customerId ? `?customer_id=${customerId}` : ""}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};
