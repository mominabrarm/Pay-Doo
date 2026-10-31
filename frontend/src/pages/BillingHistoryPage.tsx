import { Link } from "react-router-dom";
import { api } from "../api/paydoo";
import { useCollection } from "../hooks/useCollection";
import { PageHeader, Panel, LoadingState, ErrorState, EmptyState, MetricCard, StatusBadge } from "../components/ui";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function BillingHistoryPage() {
  const payments = useCollection(api.listPaymentHistory);

  const totalSettled = payments.data.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Billing & Payment History"
        description="Official settlement receipts, payment audit records, and downloadable tax invoices."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="button secondary" onClick={() => void payments.refresh()}>
              Refresh
            </button>
            <Link to="/invoices" className="button secondary">
              My Invoices
            </Link>
          </div>
        }
      />

      <section className="metric-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <MetricCard
          label="Total Settled Payments"
          value={formatCurrency(totalSettled.toFixed(2))}
          hint="All verified transaction receipts"
        />
        <MetricCard
          label="Settled Receipts Count"
          value={payments.data.length}
          hint="Total completed payments"
        />
      </section>

      <Panel className="list-panel">
        <div className="panel-heading">
          <div>
            <h2>Settlement register</h2>
            <p>Direct payments recorded against your confirmed invoices.</p>
          </div>
        </div>

        {payments.loading ? (
          <LoadingState label="Loading payment ledger" />
        ) : payments.error ? (
          <ErrorState message={payments.error} retry={() => void payments.refresh()} />
        ) : payments.data.length === 0 ? (
          <EmptyState
            title="No settlement history yet"
            message="Recorded payments and settlement receipts will appear here as soon as invoices are paid."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Invoice Ref</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Amount Settled</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>
                      <strong>{payment.payment_number}</strong>
                      {payment.notes && <span className="mono">{payment.notes}</span>}
                    </td>
                    <td>
                      <span className="mono">Invoice #{payment.invoice_id}</span>
                      <StatusBadge value={payment.invoice_status} />
                    </td>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td>
                      <span style={{ textTransform: "capitalize", fontWeight: 600 }}>
                        {payment.payment_method.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#0f766e" }}>{formatCurrency(payment.amount)}</strong>
                    </td>
                    <td>
                      <span className="badge badge-paid">{payment.status.toUpperCase()}</span>
                    </td>
                    <td>
                      <a
                        className="text-button"
                        href={api.getInvoicePdfUrl(payment.invoice_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`Invoice-${payment.invoice_id}.pdf`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        ⬇ PDF Receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

