import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api/paydoo";
import { getStoredUser } from "../api/client";
import type { AuthUser, Invoice, NotificationLog, Subscription } from "../api/types";
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
import { ExplainBillModal } from "../components/ExplainBillModal";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { billingPeriodEnd, formatCurrency, formatDate, today } from "../utils/format";

const initialForm = { subscriptionId: "", periodStart: "", periodEnd: "", dueDate: today() };
const PAGE_SIZE = 50;

export function InvoicesPage() {
  const context = useOutletContext<{ currentUser: AuthUser | null } | undefined>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(context?.currentUser ?? getStoredUser<AuthUser>());

  useEffect(() => {
    if (context?.currentUser) {
      setCurrentUser(context.currentUser);
    }
  }, [context?.currentUser]);

  const isCustomer = currentUser?.role === "customer";

  const subscriptions = useCollection(isCustomer ? async () => [] : api.listSubscriptions);
  const [page, setPage] = useState(0);
  const loadInvoices = useCallback(() => api.listInvoices(page * PAGE_SIZE, PAGE_SIZE), [page]);
  const invoices = useCollection(loadInvoices);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [explainingInvoiceId, setExplainingInvoiceId] = useState<number | null>(null);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const invoice = await api.generateInvoice(Number(form.subscriptionId), {
        billing_period_start: form.periodStart,
        billing_period_end: form.periodEnd,
        due_date: form.dueDate,
      });
      setSelectedInvoice(invoice);
      setMessage({ kind: "success", text: `${invoice.invoice_number} has been generated and confirmed.` });
      setForm(initialForm);
      await Promise.all([invoices.refresh(), subscriptions.refresh()]);
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setSubmitting(false);
    }
  }

  async function viewInvoice(invoiceId: number) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setSelectedInvoice(await api.getInvoice(invoiceId));
    } catch (cause) {
      setDetailError(errorMessage(cause));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={isCustomer ? "My Invoices" : "Invoices"}
        description={
          isCustomer
            ? "Your billing statements, transparent charge breakdowns, and PDF downloads."
            : "Generate confirmed invoices from active subscriptions, review live balances, and inspect billing explainability."
        }
      />
      <section className="invoice-workspace">
        <div className="page-stack compact-stack">
          {!isCustomer && (
            <Panel>
              <div className="panel-heading">
                <div>
                  <h2>Generate invoice</h2>
                  <p>
                    Submitting an existing subscription-period pair displays the backend’s
                    duplicate-billing error.
                  </p>
                </div>
              </div>
              {message && <Flash kind={message.kind}>{message.text}</Flash>}
              {subscriptions.loading ? (
                <LoadingState label="Loading subscriptions" />
              ) : subscriptions.error ? (
                <ErrorState
                  message={subscriptions.error}
                  retry={() => void subscriptions.refresh()}
                />
              ) : (
                <InvoiceForm
                  form={form}
                  setForm={setForm}
                  subscriptions={subscriptions.data}
                  submitting={submitting}
                  onSubmit={generate}
                />
              )}
            </Panel>
          )}
          <Panel className="list-panel">
            <div className="panel-heading">
              <div>
                <h2>{isCustomer ? "My billing register" : "Invoice register"}</h2>
                <p>
                  {isCustomer
                    ? "Invoices issued for your subscriptions."
                    : "Latest 50 records returned by the API."}
                </p>
              </div>
              <button className="text-button" onClick={() => void invoices.refresh()}>
                Refresh
              </button>
            </div>
            {invoices.loading ? (
              <LoadingState />
            ) : invoices.error ? (
              <ErrorState message={invoices.error} retry={() => void invoices.refresh()} />
            ) : invoices.data.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                message={
                  isCustomer
                    ? "Invoices will be available here once generated by the billing cycle."
                    : "Generate one from an active subscription."
                }
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Period</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Outstanding</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.data.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <strong>{invoice.invoice_number}</strong>
                          <span className="mono">Sub #{invoice.subscription_id}</span>
                        </td>
                        <td>
                          {formatDate(invoice.billing_period_start)} –{" "}
                          {formatDate(invoice.billing_period_end)}
                        </td>
                        <td>
                          <strong>{formatCurrency(invoice.total_amount)}</strong>
                        </td>
                        <td>
                          <StatusBadge value={invoice.status} />
                        </td>
                        <td>
                          <span style={{ color: Number(invoice.outstanding_balance) > 0 ? "#b42318" : "#0f766e", fontWeight: 700 }}>
                            {formatCurrency(invoice.outstanding_balance)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <a
                              className="text-button"
                              href={api.getInvoicePdfUrl(invoice.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={`Invoice-${invoice.invoice_number}.pdf`}
                            >
                              ⬇ PDF
                            </a>
                            <button
                              className="text-button"
                              onClick={() => void viewInvoice(invoice.id)}
                            >
                              View
                            </button>
                            <button
                              className="text-button"
                              style={{ color: "#0f766e" }}
                              onClick={() => setExplainingInvoiceId(invoice.id)}
                            >
                              💡 Explain
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!invoices.loading && !invoices.error && (invoices.data.length > 0 || page > 0) && (
              <PaginationControls
                page={page}
                hasNext={invoices.data.length === PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </Panel>
        </div>
        <InvoiceDetail
          invoice={selectedInvoice}
          loading={detailLoading}
          error={detailError}
          isCustomer={isCustomer}
          onExplain={(invId) => setExplainingInvoiceId(invId)}
        />
      </section>

      <ExplainBillModal
        invoiceId={explainingInvoiceId}
        onClose={() => setExplainingInvoiceId(null)}
      />
    </div>
  );
}

function InvoiceForm({
  form,
  setForm,
  subscriptions,
  submitting,
  onSubmit,
}: {
  form: typeof initialForm;
  setForm: (value: typeof initialForm) => void;
  subscriptions: Subscription[];
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active");
  const selectedSubscription = activeSubscriptions.find((subscription) => subscription.id === Number(form.subscriptionId));

  function chooseSubscription(subscriptionId: string) {
    const subscription = activeSubscriptions.find((item) => item.id === Number(subscriptionId));
    const periodStart = subscription?.next_billing_date ?? "";
    setForm({
      ...form,
      subscriptionId,
      periodStart,
      periodEnd: subscription?.plan ? billingPeriodEnd(periodStart, subscription.plan.billing_interval) : "",
      dueDate: periodStart > today() ? periodStart : today(),
    });
  }

  return (
    <form onSubmit={onSubmit} className="form-grid invoice-form">
      <FormLabel label="Subscription">
        <select
          required
          value={form.subscriptionId}
          onChange={(event) => chooseSubscription(event.target.value)}
        >
          <option value="">Choose an active subscription</option>
          {activeSubscriptions.map((subscription) => (
            <option key={subscription.id} value={subscription.id}>
              {subscription.subscription_number} ·{" "}
              {subscription.customer?.name ?? `Customer #${subscription.customer_id}`}
            </option>
          ))}
        </select>
      </FormLabel>
      <FormLabel label="Billing period start">
        <input required type="date" value={form.periodStart} readOnly />
      </FormLabel>
      <FormLabel label="Billing period end">
        <input required type="date" value={form.periodEnd} readOnly />
      </FormLabel>
      <FormLabel label="Payment due date">
        <input
          required
          type="date"
          min={form.periodStart > today() ? form.periodStart : today()}
          value={form.dueDate}
          onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
        />
      </FormLabel>
      {selectedSubscription && (
        <p className="field-note invoice-period-note">
          Period follows the {selectedSubscription.plan?.billing_interval ?? "configured"} plan interval and the next billing date returned by the API.
        </p>
      )}
      <div className="form-actions">
        <button className="button" disabled={submitting || !selectedSubscription}>
          {submitting ? "Generating…" : "Generate invoice"}
        </button>
        {activeSubscriptions.length === 0 && (
          <span className="field-note">No active subscriptions are available to bill.</span>
        )}
      </div>
    </form>
  );
}

function InvoiceDetail({
  invoice,
  loading,
  error,
  isCustomer,
  onExplain,
}: {
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
  isCustomer?: boolean;
  onExplain?: (invoiceId: number) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<string | null>(null);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice?.id) {
      setNotifications([]);
      setNotifMessage(null);
      return;
    }
    setLoadingNotifs(true);
    setNotifMessage(null);
    api.listNotifications({ invoice_id: invoice.id })
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifs(false));
  }, [invoice?.id]);

  async function handleSendNotification(channel: "email" | "whatsapp" | "all") {
    if (!invoice) return;
    setSendingChannel(channel);
    setNotifMessage(null);
    try {
      const logs = await api.sendInvoiceNotification(invoice.id, { channel, force_resend: true });
      setNotifications((prev) => [...logs, ...prev]);
      const successful = logs.filter((l) => l.status === "sent" || l.status === "delivered");
      const skipped = logs.filter((l) => l.status.startsWith("skipped"));
      if (successful.length > 0) {
        setNotifMessage(`Dispatched via ${successful.map((s) => s.channel).join(" & ")}.`);
      } else if (skipped.length > 0) {
        setNotifMessage(`Notification logged (${skipped[0].status.replace(/_/g, " ")}: ${skipped[0].error_message || "no credentials configured"}).`);
      } else {
        setNotifMessage("Notification dispatch completed.");
      }
    } catch (cause) {
      setNotifMessage(`Failed: ${errorMessage(cause)}`);
    } finally {
      setSendingChannel(null);
    }
  }

  return (
    <Panel className="invoice-detail">
      <div className="panel-heading">
        <div>
          <h2>Invoice detail</h2>
          <p>Amounts and status come directly from the invoice record.</p>
        </div>
      </div>
      {loading ? (
        <LoadingState label="Loading invoice" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !invoice ? (
        <EmptyState
          title="Choose an invoice"
          message="Select View on an invoice to inspect its totals and line items."
        />
      ) : (
        <>
          <div className="detail-topline">
            <div>
              <span className="eyebrow">{invoice.invoice_number}</span>
              <h3>{formatCurrency(invoice.total_amount)}</h3>
              <span>Due {formatDate(invoice.due_date)}</span>
            </div>
            <StatusBadge value={invoice.status} />
          </div>
          <dl className="amount-grid">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(invoice.subtotal)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>−{formatCurrency(invoice.discount_amount)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatCurrency(invoice.tax_amount)}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>{formatCurrency(invoice.amount_paid)}</dd>
            </div>
            <div className="outstanding">
              <dt>Outstanding</dt>
              <dd>{formatCurrency(invoice.outstanding_balance)}</dd>
            </div>
          </dl>
          <div className="line-list">
            {invoice.lines.map((line) => (
              <div key={line.id}>
                <div>
                  <strong>{line.description}</strong>
                  <span>
                    {line.quantity} × {formatCurrency(line.unit_price)} · {line.tax_rate}% tax
                  </span>
                </div>
                <strong>{formatCurrency(line.total_amount)}</strong>
              </div>
            ))}
          </div>

          {/* Delivery & Notifications Section */}
          <div style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>Delivery & Notifications</strong>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  disabled={sendingChannel !== null}
                  onClick={() => void handleSendNotification("email")}
                >
                  {sendingChannel === "email" ? "Sending…" : "📧 Resend Email"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  disabled={sendingChannel !== null}
                  onClick={() => void handleSendNotification("whatsapp")}
                >
                  {sendingChannel === "whatsapp" ? "Sending…" : "💬 Resend WhatsApp"}
                </button>
              </div>
            </div>

            {notifMessage && (
              <div style={{ fontSize: "11px", padding: "6px 8px", background: "#eff6ff", color: "#1d4ed8", borderRadius: "4px", marginBottom: "8px" }}>
                {notifMessage}
              </div>
            )}

            {notifications.length === 0 ? (
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {loadingNotifs ? "Checking notification history…" : "No notification dispatches recorded yet for this invoice."}
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {notifications.slice(0, 3).map((log) => (
                  <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", padding: "4px 8px", background: "#ffffff", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span>
                      <strong>{log.channel === "email" ? "📧 Email" : "💬 WhatsApp"}</strong> · {log.recipient}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      background: log.status === "sent" || log.status === "delivered" ? "#dcfce7" : log.status.startsWith("skipped") ? "#fef3c7" : "#fee2e2",
                      color: log.status === "sent" || log.status === "delivered" ? "#15803d" : log.status.startsWith("skipped") ? "#b45309" : "#b91c1c",
                    }}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              className="button"
              style={{ backgroundColor: "#0284c7" }}
              onClick={() => onExplain && onExplain(invoice.id)}
            >
              💡 Explain My Bill
            </button>
            <a
              className="button secondary"
              href={api.getInvoicePdfUrl(invoice.id)}
              target="_blank"
              rel="noopener noreferrer"
              download={`Invoice-${invoice.invoice_number}.pdf`}
            >
              ⬇ Download PDF
            </a>
            {!isCustomer && invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <Link className="button secondary" to={`/payments?invoice=${invoice.id}`}>
                Record payment
              </Link>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
