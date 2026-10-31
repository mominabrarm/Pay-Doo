import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api/paydoo";
import { getStoredUser } from "../api/client";
import type {
  AuthUser,
  Customer,
  DiscountRule,
  Plan,
  Product,
  Subscription,
  SubscriptionStatus,
} from "../api/types";
import {
  EmptyState,
  ErrorState,
  Flash,
  FormLabel,
  LoadingState,
  PageHeader,
  PaginationControls,
  Panel,
  StatusBadge,
} from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatCurrency, formatDate, today } from "../utils/format";
import { SubscribeModal } from "../components/SubscribeModal";

type SubscriptionForm = {
  customerId: string;
  planId: string;
  discountRuleId: string;
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  startDate: string;
  expiryDate: string;
  paymentTerms: string;
};

const PAGE_SIZE = 50;

function initialForm(): SubscriptionForm {
  return {
    customerId: "",
    planId: "",
    discountRuleId: "",
    productId: "",
    variantId: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "18",
    startDate: today(),
    expiryDate: "",
    paymentTerms: "Immediate",
  };
}

const EMPTY_COLLECTION = async () => [];

export function SubscriptionsPage() {
  const context = useOutletContext<{ currentUser: AuthUser | null } | undefined>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(context?.currentUser ?? getStoredUser<AuthUser>());

  useEffect(() => {
    if (context?.currentUser) {
      setCurrentUser(context.currentUser);
    }
  }, [context?.currentUser]);

  const isCustomer = currentUser?.role === "customer";

  const customers = useCollection(isCustomer ? EMPTY_COLLECTION : api.listCustomers);
  const plans = useCollection(isCustomer ? EMPTY_COLLECTION : api.listPlans);
  const discounts = useCollection(isCustomer ? EMPTY_COLLECTION : api.listDiscounts);
  const products = useCollection(isCustomer ? EMPTY_COLLECTION : api.listProducts);
  const [subscriptionPage, setSubscriptionPage] = useState(0);
  const loadSubscriptions = useCallback(
    () => api.listSubscriptions(subscriptionPage * PAGE_SIZE, PAGE_SIZE),
    [subscriptionPage]
  );
  const subscriptions = useCollection(loadSubscriptions, [subscriptionPage]);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Customer self-service state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [customerMessage, setCustomerMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const selectedProduct = useMemo(
    () => products.data.find((product) => product.id === Number(form.productId)),
    [products.data, form.productId]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    const selectedVariant = selectedProduct.variants.find(
      (variant) => variant.id === Number(form.variantId)
    );
    const price =
      Number(selectedProduct.sales_price) + Number(selectedVariant?.price_extra ?? 0);
    setForm((current) => ({
      ...current,
      unitPrice: Number.isFinite(price) ? price.toFixed(2) : current.unitPrice,
    }));
  }, [selectedProduct, form.variantId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const subscription = await api.createSubscription({
        customer_id: Number(form.customerId),
        plan_id: Number(form.planId),
        discount_rule_id: form.discountRuleId ? Number(form.discountRuleId) : undefined,
        start_date: form.startDate,
        expiry_date: form.expiryDate || undefined,
        payment_terms: form.paymentTerms,
        lines: [
          {
            product_id: Number(form.productId),
            variant_id: form.variantId ? Number(form.variantId) : undefined,
            quantity: Number(form.quantity),
            unit_price: form.unitPrice,
            tax_rate: form.taxRate,
          },
        ],
      });
      setForm(initialForm());
      setMessage({
        kind: "success",
        text: `${subscription.subscription_number} is active and ready to bill.`,
      });
      await subscriptions.refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setSubmitting(false);
    }
  }

  const handleStatusChange = async (subId: number, newStatus: SubscriptionStatus) => {
    setActionLoading(subId);
    setCustomerMessage(null);
    try {
      const updated = await api.updateSubscriptionStatus(subId, newStatus);
      setCustomerMessage({
        kind: "success",
        text: `Subscription ${updated.subscription_number} status updated to ${newStatus}.`,
      });
      await subscriptions.refresh();
    } catch (err) {
      setCustomerMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  };

  if (isCustomer) {
    const filteredSubs = subscriptions.data.filter((s) => {
      if (statusFilter === "all") return true;
      return s.status === statusFilter;
    });

    return (
      <div className="page-stack">
        <PageHeader
          title="My Subscriptions"
          description="Active service plans, renewal dates, and billing cadences for your account."
          action={
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button className="button" onClick={() => setModalOpen(true)}>
                + New Subscription
              </button>
              <Link to="/explore" className="button secondary">
                Explore Catalog
              </Link>
              <button className="button secondary" onClick={() => void subscriptions.refresh()}>
                Refresh
              </button>
            </div>
          }
        />

        {customerMessage && <Flash kind={customerMessage.kind}>{customerMessage.text}</Flash>}

        {/* Status Filter Tabs */}
        <div className="tab-bar">
          {["all", "active", "paused", "closed"].map((st) => (
            <button
              key={st}
              className={`tab-btn ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === "all" ? "All Subscriptions" : `${st.charAt(0).toUpperCase() + st.slice(1)}`}
            </button>
          ))}
        </div>

        <Panel className="list-panel">
          <div className="panel-heading">
            <div>
              <h2>Subscriptions register</h2>
              <p>Your ongoing subscriptions managed under PayDoo.</p>
            </div>
          </div>

          {subscriptions.loading ? (
            <LoadingState label="Loading subscriptions" />
          ) : subscriptions.error ? (
            <ErrorState message={subscriptions.error} retry={() => void subscriptions.refresh()} />
          ) : filteredSubs.length === 0 ? (
            <EmptyState
              title={statusFilter === "all" ? "No subscriptions yet" : `No ${statusFilter} subscriptions`}
              message={
                statusFilter === "all"
                  ? "You do not have any software subscriptions active. Browse the catalog to get started."
                  : `No subscriptions currently in '${statusFilter}' status.`
              }
            />
          ) : (
            <>
              <div className="subscription-list" style={{ display: "grid", gap: "16px" }}>
                {filteredSubs.map((subscription) => (
                  <article
                    className="subscription-card"
                    key={subscription.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "20px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: "16px", color: "#1e293b" }}>
                          {subscription.subscription_number}
                        </h3>
                        <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                          Plan: <strong>{subscription.plan?.name ?? `Plan #${subscription.plan_id}`}</strong> ({subscription.plan?.billing_interval || "recurring"})
                        </p>
                      </div>
                      <StatusBadge value={subscription.status} />
                    </div>

                    <div className="subscription-meta" style={{ display: "flex", gap: "20px", fontSize: "12px", color: "#64748b", margin: "10px 0" }}>
                      <span>
                        📅 Started: <strong>{formatDate(subscription.start_date)}</strong>
                      </span>
                      <span>
                        🔄 Next Billing: <strong>{formatDate(subscription.next_billing_date)}</strong>
                      </span>
                      <span>
                        💳 Terms: <strong>{subscription.payment_terms}</strong>
                      </span>
                    </div>

                    {/* Service Lines breakdown */}
                    {subscription.lines && subscription.lines.length > 0 && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          Included Services & Licenses:
                        </span>
                        <div style={{ display: "grid", gap: "6px", marginTop: "6px" }}>
                          {subscription.lines.map((l) => (
                            <div
                              key={l.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "13px",
                                padding: "6px 10px",
                                background: "#f8fafc",
                                borderRadius: "6px",
                              }}
                            >
                              <span>
                                <strong>Product #{l.product_id}</strong>
                                {l.variant_id ? " (Variant #" + l.variant_id + ")" : ""} × {l.quantity} unit(s)
                              </span>
                              <span>
                                {formatCurrency(l.unit_price)} · {formatCurrency(l.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lifecycle Actions */}
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                      {subscription.status === "active" && (
                        <button
                          className="button secondary"
                          disabled={actionLoading === subscription.id}
                          onClick={() => handleStatusChange(subscription.id, "paused")}
                        >
                          {actionLoading === subscription.id ? "Updating…" : "Pause Subscription"}
                        </button>
                      )}

                      {subscription.status === "paused" && (
                        <button
                          className="button"
                          disabled={actionLoading === subscription.id}
                          onClick={() => handleStatusChange(subscription.id, "active")}
                        >
                          {actionLoading === subscription.id ? "Updating…" : "Resume Subscription"}
                        </button>
                      )}

                      {subscription.status !== "closed" && (
                        <button
                          className="text-button"
                          style={{ color: "#b42318" }}
                          disabled={actionLoading === subscription.id}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to cancel subscription ${subscription.subscription_number}?`)) {
                              handleStatusChange(subscription.id, "closed");
                            }
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <PaginationControls
                page={subscriptionPage}
                hasNext={subscriptions.data.length === PAGE_SIZE}
                onPageChange={setSubscriptionPage}
              />
            </>
          )}
        </Panel>

        <SubscribeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubscribed={() => {
            void subscriptions.refresh();
          }}
        />
      </div>
    );
  }

  const dependenciesLoading =
    customers.loading || plans.loading || products.loading || discounts.loading;
  const dependencyError =
    customers.error || plans.error || products.error || discounts.error;

  return (
    <div className="page-stack">
      <PageHeader
        title="Subscriptions"
        description="Link an active customer, plan, and product line into a live billing subscription."
      />
      <section className="two-column-wide">
        <Panel>
          <div className="panel-heading">
            <div>
              <h2>Create subscription</h2>
              <p>The backend immediately starts each new subscription in the active state.</p>
            </div>
          </div>
          {message && <Flash kind={message.kind}>{message.text}</Flash>}
          {dependenciesLoading ? (
            <LoadingState label="Loading subscription options" />
          ) : dependencyError ? (
            <ErrorState
              message={dependencyError}
              retry={() => {
                void customers.refresh();
                void plans.refresh();
                void products.refresh();
                void discounts.refresh();
              }}
            />
          ) : (
            <SubscriptionFormFields
              form={form}
              setForm={setForm}
              customers={customers.data}
              plans={plans.data}
              discounts={discounts.data}
              products={products.data}
              selectedProduct={selectedProduct}
              submitting={submitting}
              onSubmit={submit}
            />
          )}
        </Panel>
        <SubscriptionList
          subscriptions={subscriptions}
          page={subscriptionPage}
          onPageChange={setSubscriptionPage}
        />
      </section>
    </div>
  );
}

function SubscriptionFormFields({
  form,
  setForm,
  customers,
  plans,
  discounts,
  products,
  selectedProduct,
  submitting,
  onSubmit,
}: {
  form: SubscriptionForm;
  setForm: (form: SubscriptionForm) => void;
  customers: Customer[];
  plans: Plan[];
  discounts: DiscountRule[];
  products: Product[];
  selectedProduct: Product | undefined;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formIsReady = customers.length > 0 && plans.length > 0 && products.length > 0;
  const selectedPlan = plans.find((plan) => plan.id === Number(form.planId));

  return (
    <form onSubmit={onSubmit} className="form-grid">
      <FormLabel label="Customer">
        <select
          required
          value={form.customerId}
          onChange={(event) => setForm({ ...form, customerId: event.target.value })}
        >
          <option value="">Choose a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} · {customer.email}
            </option>
          ))}
        </select>
      </FormLabel>
      <FormLabel label="Subscription plan">
        <select
          required
          value={form.planId}
          onChange={(event) => setForm({ ...form, planId: event.target.value })}
        >
          <option value="">Choose a plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {formatCurrency(plan.price)}/{plan.billing_interval}
            </option>
          ))}
        </select>
      </FormLabel>
      <FormLabel label="Discount rule (optional)">
        <select
          value={form.discountRuleId}
          onChange={(event) => setForm({ ...form, discountRuleId: event.target.value })}
        >
          <option value="">No discount</option>
          {discounts.map((discount) => (
            <option key={discount.id} value={discount.id}>
              {discount.name} · {discount.code}
            </option>
          ))}
        </select>
      </FormLabel>
      <FormLabel label="Product">
        <select
          required
          value={form.productId}
          onChange={(event) =>
            setForm({ ...form, productId: event.target.value, variantId: "" })
          }
        >
          <option value="">Choose a product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} · {formatCurrency(product.sales_price)}
            </option>
          ))}
        </select>
      </FormLabel>
      <FormLabel label="Variant">
        <select
          value={form.variantId}
          disabled={!selectedProduct || selectedProduct.variants.length === 0}
          onChange={(event) => setForm({ ...form, variantId: event.target.value })}
        >
          <option value="">Base product</option>
          {selectedProduct?.variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.variant_name} · +{formatCurrency(variant.price_extra)}
            </option>
          ))}
        </select>
      </FormLabel>
      <FormLabel label="Quantity">
        <input
          required
          type="number"
          min={selectedPlan?.min_quantity ?? 1}
          step="1"
          value={form.quantity}
          onChange={(event) => setForm({ ...form, quantity: event.target.value })}
        />
      </FormLabel>
      <FormLabel label="Unit price">
        <input required type="number" min="0" step="0.01" value={form.unitPrice} readOnly />
      </FormLabel>
      <FormLabel label="Tax rate (%)">
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={form.taxRate}
          onChange={(event) => setForm({ ...form, taxRate: event.target.value })}
        />
      </FormLabel>
      <FormLabel label="Payment terms">
        <input
          required
          value={form.paymentTerms}
          onChange={(event) => setForm({ ...form, paymentTerms: event.target.value })}
        />
      </FormLabel>
      <FormLabel label="Start date">
        <input
          required
          type="date"
          min={selectedPlan?.start_date ?? undefined}
          max={selectedPlan?.end_date ?? undefined}
          value={form.startDate}
          onChange={(event) => setForm({ ...form, startDate: event.target.value })}
        />
      </FormLabel>
      <FormLabel label="Expiry date">
        <input
          type="date"
          min={form.startDate}
          value={form.expiryDate}
          onChange={(event) => setForm({ ...form, expiryDate: event.target.value })}
        />
      </FormLabel>
      <div className="form-actions">
        <button className="button" disabled={submitting || !formIsReady}>
          {submitting ? "Creating…" : "Activate subscription"}
        </button>
        {!formIsReady && (
          <span className="field-note">Add a customer, plan, and product first.</span>
        )}
      </div>
    </form>
  );
}

function SubscriptionList({
  subscriptions,
  page,
  onPageChange,
}: {
  subscriptions: {
    data: Subscription[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function updateStatus(id: number, status: SubscriptionStatus) {
    const subscription = subscriptions.data.find((item) => item.id === id);
    if (
      status === "closed" &&
      subscription &&
      !window.confirm(`Close subscription ${subscription.subscription_number}?`)
    )
      return;
    setUpdatingId(id);
    setMessage(null);
    try {
      await api.updateSubscriptionStatus(id, status);
      setMessage({ kind: "success", text: "Subscription status updated." });
      await subscriptions.refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Panel className="list-panel">
      <div className="panel-heading">
        <div>
          <h2>Live subscriptions</h2>
          <p>Use the lifecycle action to pause, reactivate, or close.</p>
        </div>
        <button className="text-button" onClick={() => void subscriptions.refresh()}>
          Refresh
        </button>
      </div>
      {message && <Flash kind={message.kind}>{message.text}</Flash>}
      {subscriptions.loading ? (
        <LoadingState />
      ) : subscriptions.error ? (
        <ErrorState message={subscriptions.error} retry={() => void subscriptions.refresh()} />
      ) : subscriptions.data.length === 0 ? (
        <>
          <EmptyState
            title={page > 0 ? "No more subscriptions" : "No subscriptions yet"}
            message={
              page > 0
                ? "You have reached the end of the subscription register."
                : "Create one when customer, plan, and product setup is complete."
            }
          />
          <PaginationControls page={page} hasNext={false} onPageChange={onPageChange} />
        </>
      ) : (
        <>
          <div className="subscription-list">
            {subscriptions.data.map((subscription) => (
              <article className="subscription-card" key={subscription.id}>
                <div className="row-between">
                  <div>
                    <h3>{subscription.subscription_number}</h3>
                    <p>
                      {subscription.customer?.name ?? `Customer #${subscription.customer_id}`} ·{" "}
                      {subscription.plan?.name ?? `Plan #${subscription.plan_id}`}
                    </p>
                  </div>
                  <StatusBadge value={subscription.status} />
                </div>
                <div className="subscription-meta">
                  <span>Next bill: {formatDate(subscription.next_billing_date)}</span>
                  <span>
                    {subscription.lines.length} line{subscription.lines.length === 1 ? "" : "s"}
                  </span>
                </div>
                <select
                  aria-label={`Status for ${subscription.subscription_number}`}
                  value={subscription.status}
                  disabled={updatingId === subscription.id}
                  onChange={(event) =>
                    void updateStatus(subscription.id, event.target.value as SubscriptionStatus)
                  }
                >
                  {getAllowedStatuses(subscription).map((nextStatus) => (
                    <option key={nextStatus} value={nextStatus}>
                      {nextStatus[0].toUpperCase() + nextStatus.slice(1)}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </div>
          <PaginationControls
            page={page}
            hasNext={subscriptions.data.length === PAGE_SIZE}
            onPageChange={onPageChange}
          />
        </>
      )}
    </Panel>
  );
}

function getAllowedStatuses(subscription: Subscription): SubscriptionStatus[] {
  const transitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    draft: ["quotation", "confirmed", "active", "closed"],
    quotation: ["confirmed", "closed"],
    confirmed: ["active", "closed"],
    active: [...(subscription.plan?.allow_pause ? (["paused"] as const) : []), "closed"],
    paused: ["active", "closed"],
    closed: [...(subscription.plan?.allow_renewal ? (["active"] as const) : [])],
  };
  return [subscription.status, ...(transitions[subscription.status] || [])];
}
