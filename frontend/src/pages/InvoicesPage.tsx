import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/paydoo";
import type { Invoice, Subscription } from "../api/types";
import { EmptyState, ErrorState, Flash, FormLabel, LoadingState, PageHeader, Panel, StatusBadge } from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatCurrency, formatDate, today } from "../utils/format";

const initialForm = { subscriptionId: "", periodStart: today(), periodEnd: today(), dueDate: today() };

export function InvoicesPage() {
  const subscriptions = useCollection(api.listSubscriptions);
  const invoices = useCollection(api.listInvoices);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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
      await invoices.refresh();
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
      <PageHeader title="Invoices" description="Generate confirmed invoices from active subscriptions and review the live balances." />
      <section className="invoice-workspace">
        <div className="page-stack compact-stack">
          <Panel>
            <div className="panel-heading"><div><h2>Generate invoice</h2><p>Submitting an existing subscription-period pair displays the backend’s duplicate-billing error.</p></div></div>
            {message && <Flash kind={message.kind}>{message.text}</Flash>}
            {subscriptions.loading ? <LoadingState label="Loading subscriptions" /> : subscriptions.error ? <ErrorState message={subscriptions.error} retry={() => void subscriptions.refresh()} /> : <InvoiceForm form={form} setForm={setForm} subscriptions={subscriptions.data} submitting={submitting} onSubmit={generate} />}
          </Panel>
          <Panel className="list-panel">
            <div className="panel-heading"><div><h2>Invoice register</h2><p>Latest 50 records returned by the API.</p></div><button className="text-button" onClick={() => void invoices.refresh()}>Refresh</button></div>
            {invoices.loading ? <LoadingState /> : invoices.error ? <ErrorState message={invoices.error} retry={() => void invoices.refresh()} /> : invoices.data.length === 0 ? <EmptyState title="No invoices yet" message="Generate one from an active subscription." /> : <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Period</th><th>Status</th><th>Outstanding</th><th /></tr></thead><tbody>{invoices.data.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoice_number}</strong><span className="mono">Subscription #{invoice.subscription_id}</span></td><td>{formatDate(invoice.billing_period_start)} – {formatDate(invoice.billing_period_end)}</td><td><StatusBadge value={invoice.status} /></td><td>{formatCurrency(invoice.outstanding_balance)}</td><td><button className="text-button" onClick={() => void viewInvoice(invoice.id)}>View</button></td></tr>)}</tbody></table></div>}
          </Panel>
        </div>
        <InvoiceDetail invoice={selectedInvoice} loading={detailLoading} error={detailError} />
      </section>
    </div>
  );
}

function InvoiceForm({ form, setForm, subscriptions, submitting, onSubmit }: { form: typeof initialForm; setForm: (value: typeof initialForm) => void; subscriptions: Subscription[]; submitting: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="form-grid invoice-form">
    <FormLabel label="Subscription"><select required value={form.subscriptionId} onChange={(event) => setForm({ ...form, subscriptionId: event.target.value })}><option value="">Choose an active subscription</option>{subscriptions.filter((subscription) => subscription.status === "active").map((subscription) => <option key={subscription.id} value={subscription.id}>{subscription.subscription_number} · {subscription.customer?.name ?? `Customer #${subscription.customer_id}`}</option>)}</select></FormLabel>
    <FormLabel label="Billing period start"><input required type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} /></FormLabel>
    <FormLabel label="Billing period end"><input required type="date" value={form.periodEnd} min={form.periodStart} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} /></FormLabel>
    <FormLabel label="Payment due date"><input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></FormLabel>
    <div className="form-actions"><button className="button" disabled={submitting || subscriptions.filter((subscription) => subscription.status === "active").length === 0}>{submitting ? "Generating…" : "Generate invoice"}</button></div>
  </form>;
}

function InvoiceDetail({ invoice, loading, error }: { invoice: Invoice | null; loading: boolean; error: string | null }) {
  return <Panel className="invoice-detail"><div className="panel-heading"><div><h2>Invoice detail</h2><p>Amounts and status come directly from the invoice record.</p></div></div>{loading ? <LoadingState label="Loading invoice" /> : error ? <ErrorState message={error} /> : !invoice ? <EmptyState title="Choose an invoice" message="Select View on an invoice to inspect its totals and line items." /> : <><div className="detail-topline"><div><span className="eyebrow">{invoice.invoice_number}</span><h3>{formatCurrency(invoice.total_amount)}</h3><span>Due {formatDate(invoice.due_date)}</span></div><StatusBadge value={invoice.status} /></div><dl className="amount-grid"><div><dt>Subtotal</dt><dd>{formatCurrency(invoice.subtotal)}</dd></div><div><dt>Discount</dt><dd>−{formatCurrency(invoice.discount_amount)}</dd></div><div><dt>Tax</dt><dd>{formatCurrency(invoice.tax_amount)}</dd></div><div><dt>Paid</dt><dd>{formatCurrency(invoice.amount_paid)}</dd></div><div className="outstanding"><dt>Outstanding</dt><dd>{formatCurrency(invoice.outstanding_balance)}</dd></div></dl><div className="line-list">{invoice.lines.map((line) => <div key={line.id}><div><strong>{line.description}</strong><span>{line.quantity} × {formatCurrency(line.unit_price)} · {line.tax_rate}% tax</span></div><strong>{formatCurrency(line.total_amount)}</strong></div>)}</div><div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}><a className="button secondary" href={api.getInvoicePdfUrl(invoice.id)} target="_blank" rel="noopener noreferrer" download={`Invoice-${invoice.invoice_number}.pdf`}>⬇ Download PDF</a>{invoice.status !== "paid" && invoice.status !== "cancelled" && <Link className="button" to={`/payments?invoice=${invoice.id}`}>Record payment</Link>}</div></>}</Panel>;
}
