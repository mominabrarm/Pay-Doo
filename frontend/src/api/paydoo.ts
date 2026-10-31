import { request } from "./client";
import type {
  AuthUser,
  Customer,
  CustomerDashboardSummary,
  CustomerInput,
  DashboardSummary,
  Invoice,
  InvoiceGenerationInput,
  Payment,
  PaymentInput,
  Plan,
  PlanInput,
  Product,
  ProductInput,
  ProductVariant,
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
  listCustomers: (search?: string) => request<Customer[]>(`/customers?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  createCustomer: (input: CustomerInput) => request<Customer>("/customers", body(input)),
  listProducts: () => request<Product[]>("/products"),
  createProduct: (input: ProductInput) => request<Product>("/products", body(input)),
  createVariant: (productId: number, input: VariantInput) => request<ProductVariant>(`/products/${productId}/variants`, body(input)),
  listPlans: () => request<Plan[]>("/plans"),
  createPlan: (input: PlanInput) => request<Plan>("/plans", body(input)),
  listSubscriptions: () => request<Subscription[]>("/subscriptions?limit=50"),
  createSubscription: (input: SubscriptionInput) => request<Subscription>("/subscriptions", body(input)),
  updateSubscriptionStatus: (subscriptionId: number, status: Subscription["status"]) => request<Subscription>(`/subscriptions/${subscriptionId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  generateInvoice: (subscriptionId: number, input: InvoiceGenerationInput) => request<Invoice>(`/subscriptions/${subscriptionId}/generate-invoice`, body(input)),
  listInvoices: () => request<Invoice[]>("/invoices?limit=50"),
  getInvoice: (invoiceId: number) => request<Invoice>(`/invoices/${invoiceId}`),
  getInvoicePdfUrl: (invoiceId: number) => `/api/invoices/${invoiceId}/pdf`,
  recordPayment: (invoiceId: number, input: PaymentInput) => request<Payment>(`/invoices/${invoiceId}/payments`, body(input)),
};
