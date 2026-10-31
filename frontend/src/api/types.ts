export type Money = string | number;

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  sku: string;
  price_extra: Money;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  product_type: string;
  sales_price: Money;
  cost_price: Money;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants: ProductVariant[];
}

export type BillingInterval = "daily" | "weekly" | "monthly" | "yearly";

export interface Plan {
  id: number;
  name: string;
  code: string;
  billing_interval: BillingInterval;
  price: Money;
  min_quantity: number;
  start_date: string | null;
  end_date: string | null;
  auto_close: boolean;
  allow_pause: boolean;
  allow_renewal: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = "draft" | "quotation" | "confirmed" | "active" | "closed" | "paused";

export interface SubscriptionLine {
  id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  unit_price: Money;
  tax_rate: Money;
  amount: Money;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  customer_id: number;
  plan_id: number;
  discount_rule_id: number | null;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string | null;
  next_billing_date: string;
  payment_terms: string;
  created_at: string;
  updated_at: string;
  customer: Customer | null;
  plan: Plan | null;
  lines: SubscriptionLine[];
}

export type InvoiceStatus = "draft" | "confirmed" | "paid" | "cancelled";

export interface InvoiceLine {
  id: number;
  product_id: number;
  variant_id: number | null;
  description: string;
  quantity: number;
  unit_price: Money;
  tax_rate: Money;
  tax_amount: Money;
  subtotal: Money;
  total_amount: Money;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subscription_id: number;
  customer_id: number;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: Money;
  discount_amount: Money;
  tax_amount: Money;
  total_amount: Money;
  amount_paid: Money;
  outstanding_balance: Money;
  created_at: string;
  updated_at: string;
  lines: InvoiceLine[];
}

export type PaymentMethod = "bank_transfer" | "credit_card" | "upi" | "cash";

export interface Payment {
  payment_id: number;
  payment_number: string;
  invoice_id: number;
  amount: Money;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string | null;
  status: string;
  invoice_status: InvoiceStatus;
  invoice_amount_paid: Money;
  invoice_outstanding_balance: Money;
}

export interface DashboardSummary {
  active_subscriptions_count: number;
  total_revenue_collected: Money;
  total_outstanding_receivables: Money;
  overdue_invoices_count: number;
  overdue_invoices_amount: Money;
  subscriptions_by_interval: Record<string, number>;
  recent_activity: Array<Record<string, unknown>>;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface ProductInput {
  name: string;
  code: string;
  product_type: string;
  sales_price: string;
  cost_price: string;
  description?: string;
}

export interface VariantInput {
  variant_name: string;
  sku: string;
  price_extra: string;
}

export interface PlanInput {
  name: string;
  code: string;
  billing_interval: BillingInterval;
  price: string;
  min_quantity: number;
  start_date?: string;
  end_date?: string;
  auto_close: boolean;
  allow_pause: boolean;
  allow_renewal: boolean;
}

export interface SubscriptionInput {
  customer_id: number;
  plan_id: number;
  start_date: string;
  expiry_date?: string;
  payment_terms: string;
  lines: Array<{
    product_id: number;
    variant_id?: number;
    quantity: number;
    unit_price: string;
    tax_rate: string;
  }>;
}

export interface InvoiceGenerationInput {
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
}

export interface PaymentInput {
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
}

export type UserRole = "admin" | "staff" | "customer";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  customer_id: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}
