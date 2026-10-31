import { FormEvent, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api/paydoo";
import { getStoredUser } from "../api/client";
import type { AuthUser, Customer, Plan, Product, Subscription, SubscriptionStatus } from "../api/types";
import {
  EmptyState,
  ErrorState,
  Flash,
  FormLabel,
  LoadingState,
  PageHeader,
  Panel,
  StatusBadge,
} from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatCurrency, formatDate, today } from "../utils/format";

type SubscriptionForm = {
  customerId: string;
  planId: string;
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  startDate: string;
  expiryDate: string;
  paymentTerms: string;
};

function initialForm(): SubscriptionForm {
  return {
    customerId: "",
    planId: "",
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

export function SubscriptionsPage() {
  const context = useOutletContext<{ currentUser: AuthUser | null } | undefined>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(context?.currentUser ?? getStoredUser<AuthUser>());

  useEffect(() => {
    if (context?.currentUser) {
      setCurrentUser(context.currentUser);
    }
  }, [context?.currentUser]);

  const isCustomer = currentUser?.role === "customer";

  const customers = useCollection(isCustomer ? async () => [] : api.listCustomers);
  const plans = useCollection(isCustomer ? async () => [] : api.listPlans);
  const products = useCollection(isCustomer ? async () => [] : api.listProducts);
  const subscriptions = useCollection(api.listSubscriptions);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
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

  if (isCustomer) {
    return (
      <div className="page-stack">
        <PageHeader
          title="My Subscriptions"
          description="Active service plans, renewal dates, and billing cadences for your account."
          action={
            <button className="button secondary" onClick={() => void subscriptions.refresh()}>
              Refresh
            </button>
          }
        />
        <Panel className="list-panel">
          <div className="panel-heading">
            <div>
              <h2>Active subscriptions</h2>
              <p>Your ongoing subscriptions managed under PayDoo.</p>
            </div>
          </div>
          {subscriptions.loading ? (
            <LoadingState label="Loading subscriptions" />
          ) : subscriptions.error ? (
            <ErrorState message={subscriptions.error} retry={() => void subscriptions.refresh()} />
          ) : subscriptions.data.length === 0 ? (
            <EmptyState
              title="No active subscriptions"
              message="You currently do not have any active subscriptions registered."
            />
          ) : (
            <div className="subscription-list">
              {subscriptions.data.map((subscription) => (
                <article className="subscription-card" key={subscription.id}>
                  <div className="row-between">
                    <div>
                      <h3>{subscription.subscription_number}</h3>
                      <p>{subscription.plan?.name ?? `Plan #${subscription.plan_id}`}</p>
                    </div>
                    <StatusBadge value={subscription.status} />
                  </div>
                  <div className="subscription-meta">
                    <span>Next billing date: {formatDate(subscription.next_billing_date)}</span>
                    <span>
                      {subscription.lines.length} service line
                      {subscription.lines.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  const dependenciesLoading = customers.loading || plans.loading || products.loading;
  const dependencyError = customers.error || plans.error || products.error;

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
              }}
            />
          ) : (
            <SubscriptionFormFields
              form={form}
              setForm={setForm}
              customers={customers.data}
              plans={plans.data}
              products={products.data}
              selectedProduct={selectedProduct}
              submitting={submitting}
              onSubmit={submit}
            />
          )}
        </Panel>
        <SubscriptionList subscriptions={subscriptions} />
      </section>
    </div>
  );
}

function SubscriptionFormFields({
  form,
  setForm,
  customers,
  plans,
  products,
  selectedProduct,
  submitting,
  onSubmit,
}: {
  form: SubscriptionForm;
  setForm: (form: SubscriptionForm) => void;
  customers: Customer[];
  plans: Plan[];
  products: Product[];
  selectedProduct: Product | undefined;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formIsReady = customers.length > 0 && plans.length > 0 && products.length > 0;
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
          min="1"
          step="1"
          value={form.quantity}
          onChange={(event) => setForm({ ...form, quantity: event.target.value })}
        />
      </FormLabel>
      <FormLabel label="Unit price">
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={form.unitPrice}
          onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
        />
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
          value={form.startDate}
          onChange={(event) => setForm({ ...form, startDate: event.target.value })}
        />
      </FormLabel>
      <FormLabel label="Expiry date">
        <input
          type="date"
          value={form.expiryDate}
          onChange={(event) => setForm({ ...form, expiryDate: event.target.value })}
        />
      </FormLabel>
      <div className="form-actions">
        <button className="button" disabled={submitting || !formIsReady}>
          {submitting ? "Creating…" : "Activate subscription"}
        </button>
        {!formIsReady && <span className="field-note">Add a customer, plan, and product first.</span>}
      </div>
    </form>
  );
}

function SubscriptionList({
  subscriptions,
}: {
  subscriptions: {
    data: Subscription[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
}) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function updateStatus(id: number, status: SubscriptionStatus) {
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
        <EmptyState
          title="No subscriptions yet"
          message="Create one when customer, plan, and product setup is complete."
        />
      ) : (
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
                {(["active", "paused", "closed"] as SubscriptionStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
