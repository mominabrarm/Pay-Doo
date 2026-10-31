import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/paydoo";
import { getStoredUser } from "../api/client";
import type {
  AuthUser,
  CustomerDashboardSummary,
  DashboardSummary,
  LeakageSummary,
} from "../api/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
} from "../components/ui";
import { ExplainBillModal } from "../components/ExplainBillModal";
import { errorMessage } from "../hooks/useCollection";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser<AuthUser>());
  const [adminSummary, setAdminSummary] = useState<DashboardSummary | null>(null);
  const [leakageSummary, setLeakageSummary] = useState<LeakageSummary | null>(null);
  const [customerSummary, setCustomerSummary] = useState<CustomerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      if (user.role === "customer") {
        const data = await api.getCustomerDashboard();
        setCustomerSummary(data);
      } else {
        const [dashData, leakData] = await Promise.all([
          api.getDashboard(),
          api.getLeakageSummary().catch(() => null),
        ]);
        setAdminSummary(dashData);
        setLeakageSummary(leakData);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (currentUser?.role === "customer") {
    return (
      <>
        <PageHeader
          title="Customer billing portal"
          description={
            customerSummary
              ? `Account overview for ${customerSummary.customer_name}. Manage your subscriptions and invoices.`
              : "Account overview, active subscriptions, and invoice settlement."
          }
          action={
            <button className="button secondary" onClick={() => void refresh()}>
              Refresh portal
            </button>
          }
        />
        {loading && <LoadingState label="Loading customer portal" />}
        {error && <ErrorState message={error} retry={() => void refresh()} />}
        {customerSummary && !loading && !error && (
          <CustomerDashboardContent summary={customerSummary} />
        )}
      </>
    );
  }

  const isStaff = currentUser?.role === "staff";

  return (
    <>
      <PageHeader
        title={isStaff ? "Operations command center" : "Financial command center"}
        description={
          isStaff
            ? "Operational metrics, active billing subscriptions, and receivable status."
            : "Live revenue, receivables, and company-wide subscription activity."
        }
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link className="button" to="/intelligence">
              💡 Financial Intelligence
            </Link>
            <button className="button secondary" onClick={() => void refresh()}>
              Refresh data
            </button>
          </div>
        }
      />
      {loading && <LoadingState label="Loading dashboard" />}
      {error && <ErrorState message={error} retry={() => void refresh()} />}
      {adminSummary && !loading && !error && (
        <AdminDashboardContent
          summary={adminSummary}
          leakageSummary={leakageSummary}
        />
      )}
    </>
  );
}

function CustomerDashboardContent({ summary }: { summary: CustomerDashboardSummary }) {
  const [explainingInvoiceId, setExplainingInvoiceId] = useState<number | null>(null);

  return (
    <div className="page-stack">
      {/* Quick Action Navigation Bar */}
      <div className="quick-actions-bar">
        <Link to="/explore" className="quick-action-link">
          🚀 Explore Software Catalog
        </Link>
        <Link to="/pricing" className="quick-action-link">
          📋 Compare Billing Plans
        </Link>
        <Link to="/subscriptions" className="quick-action-link">
          ⚙️ Manage Subscriptions
        </Link>
        <Link to="/billing-history" className="quick-action-link">
          📜 Billing & Receipts
        </Link>
        <Link to="/settings" className="quick-action-link">
          👤 Account Profile
        </Link>
      </div>

      <section className="metric-grid">
        <MetricCard
          label="Active subscriptions"
          value={summary.active_subscriptions_count}
          hint="Your ongoing active services"
        />
        <MetricCard
          label="Total paid"
          value={formatCurrency(summary.total_paid)}
          hint="Recorded successful settlements"
        />
        <MetricCard
          label="Outstanding balance"
          value={formatCurrency(summary.outstanding_balance)}
          hint="Pending payment amount"
        />
        <MetricCard
          label="Next billing date"
          value={summary.next_billing_date ? formatDate(summary.next_billing_date) : "None scheduled"}
          hint={summary.next_billing_date ? "Upcoming renewal" : "No active renewals"}
        />
      </section>

      <section className="dashboard-grid">
        <Panel>
          <div className="panel-heading">
            <div>
              <h2>My recent invoices</h2>
              <p>Your latest billing statements, transparent breakdown, and PDF downloads.</p>
            </div>
          </div>
          {summary.recent_invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              message="Your billing statements will appear here as soon as invoices are generated."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Outstanding</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent_invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.invoice_number}</strong>
                      </td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td>
                        <StatusBadge value={inv.status} />
                      </td>
                      <td>{formatCurrency(inv.total_amount)}</td>
                      <td>{formatCurrency(inv.outstanding_balance)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="text-button"
                            style={{ color: "#38bdf8" }}
                            onClick={() => setExplainingInvoiceId(inv.id)}
                          >
                            💡 Explain
                          </button>
                          <a
                            className="text-button"
                            href={api.getInvoicePdfUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`Invoice-${inv.invoice_number}.pdf`}
                            style={{ textDecoration: "none" }}
                          >
                            ⬇ PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="panel-heading">
            <div>
              <h2>Payment history</h2>
              <p>Historical settlements credited to your account.</p>
            </div>
          </div>
          {summary.recent_payments.length === 0 ? (
            <EmptyState
              title="No payment records"
              message="Settled transactions and payment receipts will appear here."
            />
          ) : (
            <div className="activity-list">
              {summary.recent_payments.map((payment) => (
                <div className="activity-row" key={payment.id}>
                  <div>
                    <strong>{payment.payment_number}</strong>
                    <span>{titleCase(payment.payment_method.replace("_", " "))}</span>
                  </div>
                  <div>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <span>{formatDate(payment.payment_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <ExplainBillModal
        invoiceId={explainingInvoiceId}
        onClose={() => setExplainingInvoiceId(null)}
      />
    </div>
  );
}

function AdminDashboardContent({
  summary,
  leakageSummary,
}: {
  summary: DashboardSummary;
  leakageSummary: LeakageSummary | null;
}) {
  return (
    <div className="page-stack">
      {/* Financial Intelligence Alert Strip */}
      {leakageSummary && leakageSummary.total_open_alerts > 0 && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid #ef4444",
          borderRadius: "8px",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div>
            <strong style={{ color: "#fca5a5", fontSize: "14px" }}>
              ⚠️ {leakageSummary.total_open_alerts} Revenue Leakage Alert{leakageSummary.total_open_alerts > 1 ? "s" : ""} Flagged
            </strong>
            <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "2px" }}>
              Potential revenue at risk: <strong>{formatCurrency(leakageSummary.total_amount_at_risk)}</strong> ({leakageSummary.critical_alerts_count} critical)
            </div>
          </div>
          <Link className="button" style={{ backgroundColor: "#dc2626", fontSize: "12px", padding: "6px 12px" }} to="/intelligence">
            Audit Leakages →
          </Link>
        </div>
      )}

      <section className="metric-grid">
        <MetricCard
          label="Active subscriptions"
          value={summary.active_subscriptions_count}
          hint="Currently billable accounts"
        />
        <MetricCard
          label="Revenue collected"
          value={formatCurrency(summary.total_revenue_collected)}
          hint="Recorded payments"
        />
        <MetricCard
          label="Outstanding receivables"
          value={formatCurrency(summary.total_outstanding_receivables)}
          hint="Awaiting settlement"
        />
        <MetricCard
          label="Overdue invoices"
          value={summary.overdue_invoices_count}
          hint={`${formatCurrency(summary.overdue_invoices_amount)} overdue`}
        />
      </section>

      <section className="dashboard-grid">
        <Panel>
          <div className="panel-heading">
            <div>
              <h2>Subscription cadence</h2>
              <p>Active subscriptions by billing frequency.</p>
            </div>
          </div>
          <div className="interval-list">
            {Object.entries(summary.subscriptions_by_interval).length === 0 ? (
              <span className="muted">No active subscriptions yet.</span>
            ) : (
              Object.entries(summary.subscriptions_by_interval).map(([interval, count]) => (
                <div key={interval}>
                  <span>{titleCase(interval)}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <div>
              <h2>Recent payments</h2>
              <p>Latest payment events returned by the API.</p>
            </div>
          </div>
          {summary.recent_activity.length === 0 ? (
            <p className="muted">
              Activity will appear after you generate invoices or record payments.
            </p>
          ) : (
            <div className="activity-list">
              {summary.recent_activity.map((activity, index) => (
                <ActivityRow
                  activity={activity}
                  key={`${String(activity.reference)}-${index}`}
                />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Record<string, unknown> }) {
  const reference = typeof activity.reference === "string" ? activity.reference : "Activity";
  const customer = typeof activity.customer_name === "string" ? activity.customer_name : "";
  const amount =
    typeof activity.amount === "string" || typeof activity.amount === "number"
      ? formatCurrency(activity.amount)
      : "";
  const date = typeof activity.date === "string" ? formatDate(activity.date) : "";
  return (
    <div className="activity-row">
      <div>
        <strong>{reference}</strong>
        <span>{customer || titleCase(String(activity.type ?? "update"))}</span>
      </div>
      <div>
        <strong>{amount}</strong>
        <span>{date}</span>
      </div>
    </div>
  );
}
