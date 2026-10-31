import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/paydoo";
import type { PaymentMethod } from "../api/types";
import { EmptyState, ErrorState, Flash, FormLabel, LoadingState, PageHeader, Panel, StatusBadge } from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatCurrency, formatDate, today } from "../utils/format";

const paymentMethods: PaymentMethod[] = ["bank_transfer", "credit_card", "upi", "cash"];

export function PaymentsPage() {
  const invoices = useCollection(api.listInvoices);
  const [params, setParams] = useSearchParams();
  const [invoiceId, setInvoiceId] = useState(params.get("invoice") ?? "");
  const [form, setForm] = useState({ amount: "", payment_method: "bank_transfer" as PaymentMethod, payment_date: today(), notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const selectedInvoice = useMemo(() => invoices.data.find((invoice) => invoice.id === Number(invoiceId)), [invoices.data, invoiceId]);

  useEffect(() => { setInvoiceId(params.get("invoice") ?? ""); }, [params]);

  function selectInvoice(value: string) {
    setInvoiceId(value);
    setParams(value ? { invoice: value } : {});
    const invoice = invoices.data.find((item) => item.id === Number(value));
    if (invoice) setForm((current) => ({ ...current, amount: String(invoice.outstanding_balance) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const payment = await api.recordPayment(selectedInvoice.id, { ...form, notes: form.notes || undefined });
      setForm((current) => ({ ...current, amount: "", notes: "" }));
      setMessage({ kind: "success", text: `${payment.payment_number} recorded. Outstanding balance is now ${formatCurrency(payment.invoice_outstanding_balance)}.` });
      await invoices.refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setSubmitting(false);
    }
  }

  const payableInvoices = invoices.data.filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled" && Number(invoice.outstanding_balance) > 0);

  return <div className="page-stack"><PageHeader title="Payments" description="Allocate payments to the exact invoice and immediately see its balance change." /><section className="two-column-wide"><Panel><div className="panel-heading"><div><h2>Record payment</h2><p>Payments that exceed the live outstanding balance are rejected by the backend.</p></div></div>{message && <Flash kind={message.kind}>{message.text}</Flash>}{invoices.loading ? <LoadingState label="Loading invoices" /> : invoices.error ? <ErrorState message={invoices.error} retry={() => void invoices.refresh()} /> : <form onSubmit={submit} className="form-grid"><FormLabel label="Invoice"><select required value={invoiceId} onChange={(event) => selectInvoice(event.target.value)}><option value="">Choose an unpaid invoice</option>{payableInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · outstanding {formatCurrency(invoice.outstanding_balance)}</option>)}</select></FormLabel>{selectedInvoice && <div className="selected-invoice"><span>{selectedInvoice.invoice_number}</span><strong>{formatCurrency(selectedInvoice.outstanding_balance)}</strong><small>Outstanding balance · due {formatDate(selectedInvoice.due_date)}</small></div>}<FormLabel label="Payment amount"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></FormLabel><FormLabel label="Payment method"><select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value as PaymentMethod })}>{paymentMethods.map((method) => <option key={method} value={method}>{method.replace("_", " ")}</option>)}</select></FormLabel><FormLabel label="Payment date"><input required type="date" value={form.payment_date} onChange={(event) => setForm({ ...form, payment_date: event.target.value })} /></FormLabel><FormLabel label="Notes"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Reference or reconciliation note" /></FormLabel><div className="form-actions"><button className="button" disabled={submitting || !selectedInvoice}>{submitting ? "Recording…" : "Record payment"}</button></div></form>}</Panel><Panel className="list-panel"><div className="panel-heading"><div><h2>Open balances</h2><p>Invoices that can receive a payment.</p></div><button className="text-button" onClick={() => void invoices.refresh()}>Refresh</button></div>{invoices.loading ? <LoadingState /> : invoices.error ? <ErrorState message={invoices.error} retry={() => void invoices.refresh()} /> : payableInvoices.length === 0 ? <EmptyState title="Nothing outstanding" message="Open invoices will appear here once generated." /> : <div className="payment-invoice-list">{payableInvoices.map((invoice) => <button className={`payment-invoice${invoice.id === selectedInvoice?.id ? " selected" : ""}`} key={invoice.id} onClick={() => selectInvoice(String(invoice.id))}><div><strong>{invoice.invoice_number}</strong><span>Due {formatDate(invoice.due_date)}</span></div><div><StatusBadge value={invoice.status} /><strong>{formatCurrency(invoice.outstanding_balance)}</strong></div></button>)}</div>}</Panel></section></div>;
}
