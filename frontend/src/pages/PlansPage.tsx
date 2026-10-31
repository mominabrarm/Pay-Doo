import { FormEvent, useState } from "react";
import { api } from "../api/paydoo";
import type { BillingInterval } from "../api/types";
import { EmptyState, ErrorState, Flash, FormLabel, LoadingState, PageHeader, Panel, StatusBadge } from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

const initialForm = {
  name: "", code: "", billing_interval: "monthly" as BillingInterval, price: "", min_quantity: "1", start_date: "", end_date: "", auto_close: false, allow_pause: true, allow_renewal: true,
};

export function PlansPage() {
  const { data: plans, loading, error, refresh } = useCollection(api.listPlans);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const plan = await api.createPlan({
        ...form,
        min_quantity: Number(form.min_quantity),
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      });
      setForm(initialForm);
      setMessage({ kind: "success", text: `${plan.name} is available for subscriptions.` });
      await refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Subscription plans" description="Configure billing frequency, availability, and lifecycle policy for each offer." />
      <section className="two-column-wide">
        <Panel>
          <div className="panel-heading"><div><h2>Create plan</h2><p>Lifecycle controls are enforced by the backend policy.</p></div></div>
          {message && <Flash kind={message.kind}>{message.text}</Flash>}
          <form onSubmit={submit} className="form-grid">
            <FormLabel label="Plan name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Professional Monthly" /></FormLabel>
            <FormLabel label="Plan code"><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="PLAN-PRO-M" /></FormLabel>
            <FormLabel label="Billing interval"><select value={form.billing_interval} onChange={(event) => setForm({ ...form, billing_interval: event.target.value as BillingInterval })}>{(["daily", "weekly", "monthly", "yearly"] as BillingInterval[]).map((interval) => <option key={interval} value={interval}>{titleCase(interval)}</option>)}</select></FormLabel>
            <FormLabel label="Plan price"><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></FormLabel>
            <FormLabel label="Minimum quantity"><input required type="number" min="1" step="1" value={form.min_quantity} onChange={(event) => setForm({ ...form, min_quantity: event.target.value })} /></FormLabel>
            <FormLabel label="Available from"><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></FormLabel>
            <FormLabel label="Available until"><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></FormLabel>
            <div className="toggle-set"><label><input type="checkbox" checked={form.auto_close} onChange={(event) => setForm({ ...form, auto_close: event.target.checked })} /> Auto-close at expiry</label><label><input type="checkbox" checked={form.allow_pause} onChange={(event) => setForm({ ...form, allow_pause: event.target.checked })} /> Allow pause</label><label><input type="checkbox" checked={form.allow_renewal} onChange={(event) => setForm({ ...form, allow_renewal: event.target.checked })} /> Allow renewal</label></div>
            <div className="form-actions"><button className="button" disabled={submitting}>{submitting ? "Saving…" : "Create plan"}</button></div>
          </form>
        </Panel>
        <Panel className="list-panel">
          <div className="panel-heading"><div><h2>Available plans</h2><p>Active plans from the backend.</p></div><button className="text-button" onClick={() => void refresh()}>Refresh</button></div>
          {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={() => void refresh()} /> : plans.length === 0 ? <EmptyState title="No plans yet" message="Create a plan to enable subscriptions." /> : <div className="plan-list">{plans.map((plan) => <article className="plan-card" key={plan.id}><div><div className="row-between"><h3>{plan.name}</h3><StatusBadge value={plan.billing_interval} /></div><span className="mono">{plan.code}</span><p>{formatCurrency(plan.price)} per {plan.billing_interval}</p></div><div className="plan-meta"><span>Minimum: {plan.min_quantity}</span><span>{plan.start_date ? `Starts ${formatDate(plan.start_date)}` : "Available now"}</span><span>{plan.end_date ? `Ends ${formatDate(plan.end_date)}` : "No expiry"}</span></div></article>)}</div>}
        </Panel>
      </section>
    </div>
  );
}
