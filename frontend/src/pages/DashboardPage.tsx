import { useCallback, useEffect, useState } from "react";
import { api } from "../api/paydoo";
import type { DashboardSummary } from "../api/types";
import { ErrorState, LoadingState, MetricCard, PageHeader, Panel } from "../components/ui";
import { errorMessage } from "../hooks/useCollection";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getDashboard());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <>
      <PageHeader title="Financial command center" description="Live revenue, receivables, and subscription activity from your PayDoo API." action={<button className="button secondary" onClick={() => void refresh()}>Refresh data</button>} />
      {loading && <LoadingState label="Loading dashboard" />}
      {error && <ErrorState message={error} retry={() => void refresh()} />}
      {summary && !loading && !error && <DashboardContent summary={summary} />}
    </>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="page-stack">
      <section className="metric-grid">
        <MetricCard label="Active subscriptions" value={summary.active_subscriptions_count} hint="Currently billable accounts" />
        <MetricCard label="Revenue collected" value={formatCurrency(summary.total_revenue_collected)} hint="Recorded payments" />
        <MetricCard label="Outstanding receivables" value={formatCurrency(summary.total_outstanding_receivables)} hint="Awaiting settlement" />
        <MetricCard label="Overdue invoices" value={summary.overdue_invoices_count} hint={`${formatCurrency(summary.overdue_invoices_amount)} overdue`} />
      </section>
      <section className="dashboard-grid">
        <Panel>
          <div className="panel-heading"><div><h2>Subscription cadence</h2><p>Active subscriptions by billing frequency.</p></div></div>
          <div className="interval-list">
            {Object.entries(summary.subscriptions_by_interval).length === 0 ? <span className="muted">No active subscriptions yet.</span> : Object.entries(summary.subscriptions_by_interval).map(([interval, count]) => (
              <div key={interval}><span>{titleCase(interval)}</span><strong>{count}</strong></div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="panel-heading"><div><h2>Recent payments</h2><p>Latest payment events returned by the API.</p></div></div>
          {summary.recent_activity.length === 0 ? <p className="muted">Activity will appear after you generate invoices or record payments.</p> : <div className="activity-list">
            {summary.recent_activity.map((activity, index) => <ActivityRow activity={activity} key={`${String(activity.reference)}-${index}`} />)}
          </div>}
        </Panel>
      </section>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Record<string, unknown> }) {
  const reference = typeof activity.reference === "string" ? activity.reference : "Activity";
  const customer = typeof activity.customer_name === "string" ? activity.customer_name : "";
  const amount = typeof activity.amount === "string" || typeof activity.amount === "number" ? formatCurrency(activity.amount) : "";
  const date = typeof activity.date === "string" ? formatDate(activity.date) : "";
  return <div className="activity-row"><div><strong>{reference}</strong><span>{customer || titleCase(String(activity.type ?? "update"))}</span></div><div><strong>{amount}</strong><span>{date}</span></div></div>;
}
