import { request } from "./client";
import type {
  Customer,
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
  VariantInput,
} from "./types";

const body = (value: unknown) => ({ method: "POST", body: JSON.stringify(value) });

export const api = {
  getDashboard: () => request<DashboardSummary>("/dashboard/summary"),
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
  recordPayment: (invoiceId: number, input: PaymentInput) => request<Payment>(`/invoices/${invoiceId}/payments`, body(input)),
};
