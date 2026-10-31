import { useEffect, useState } from "react";
import { api } from "../api/paydoo";
import type { InvoiceExplanation } from "../api/types";
import { ErrorState, LoadingState, StatusBadge } from "./ui";
import { errorMessage } from "../hooks/useCollection";
import { formatCurrency, formatDate } from "../utils/format";

interface ExplainBillModalProps {
  invoiceId: number | null;
  onClose: () => void;
}

export function ExplainBillModal({ invoiceId, onClose }: ExplainBillModalProps) {
  const [data, setData] = useState<InvoiceExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    api.explainInvoice(invoiceId)
      .then((res) => setData(res))
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: "12px",
          maxWidth: "750px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px",
          border: "1px solid #334155",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "1px" }}>
                💡 Explain My Bill
              </span>
              {data && <StatusBadge value={data.status} />}
            </div>
            <h2 style={{ fontSize: "20px", color: "#f8fafc", margin: 0 }}>
              {data ? data.invoice_number : `Invoice #${invoiceId}`}
            </h2>
            {data && (
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" }}>
                {data.plan_name} · Period: {formatDate(data.billing_period_start)} to {formatDate(data.billing_period_end)} ({data.billing_period_days} days)
              </p>
            )}
          </div>
          <button
            className="text-button"
            onClick={onClose}
            style={{ fontSize: "20px", color: "#94a3b8", padding: "4px 8px" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <LoadingState label="Deconstructing billing charges" />
        ) : error ? (
          <ErrorState message={error} retry={() => {
            if (invoiceId) {
              setLoading(true);
              api.explainInvoice(invoiceId).then(setData).catch((c) => setError(errorMessage(c))).finally(() => setLoading(false));
            }
          }} />
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Plain-Language Friendly Summary */}
            <div style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "16px",
            }}>
              <h4 style={{ color: "#38bdf8", fontSize: "13px", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Transparent Billing Breakdown
              </h4>
              <div style={{ whiteSpace: "pre-line", color: "#e2e8f0", fontSize: "14px", lineHeight: "1.6" }}>
                {data.friendly_summary}
              </div>
            </div>

            {/* Quick Balances Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Total Invoiced</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>{formatCurrency(data.total_amount)}</div>
              </div>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Settled Payments</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#34d399" }}>{formatCurrency(data.amount_paid)}</div>
              </div>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Remaining Balance</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: Number(data.outstanding_balance) > 0 ? "#f87171" : "#94a3b8" }}>
                  {formatCurrency(data.outstanding_balance)}
                </div>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div>
              <h3 style={{ fontSize: "15px", color: "#f8fafc", marginBottom: "8px" }}>Itemized Charges</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Tax (%)</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.id}>
                        <td><strong>{line.description}</strong></td>
                        <td>{line.quantity}</td>
                        <td>{formatCurrency(line.unit_price)}</td>
                        <td>{line.tax_rate}% (+{formatCurrency(line.tax_amount)})</td>
                        <td><strong>{formatCurrency(line.total_amount)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Receipts Table */}
            {data.payments.length > 0 && (
              <div>
                <h3 style={{ fontSize: "15px", color: "#f8fafc", marginBottom: "8px" }}>Recorded Payments on this Bill</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th>Amount Credited</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((pay) => (
                        <tr key={pay.id}>
                          <td><strong>{pay.payment_number}</strong></td>
                          <td>{pay.payment_method}</td>
                          <td>{formatDate(pay.payment_date)}</td>
                          <td><strong style={{ color: "#34d399" }}>{formatCurrency(pay.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Previous Invoice Comparison */}
            <div style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "16px",
            }}>
              <h4 style={{ color: "#a855f7", fontSize: "13px", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📊 Historical Invoice Comparison
              </h4>
              <p style={{ color: "#cbd5e1", fontSize: "13px", margin: "0 0 12px" }}>
                {data.comparison_summary}
              </p>

              {data.has_previous_invoice && data.comparison_metrics.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Dimension</th>
                        <th>Previous Bill</th>
                        <th>Current Bill</th>
                        <th>Difference</th>
                        <th>Analysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.comparison_metrics.map((m, idx) => (
                        <tr key={idx}>
                          <td><strong>{m.metric_name}</strong></td>
                          <td>{formatCurrency(m.previous_value)}</td>
                          <td>{formatCurrency(m.current_value)}</td>
                          <td>
                            <strong style={{ color: Number(m.difference) > 0 ? "#f87171" : Number(m.difference) < 0 ? "#34d399" : "inherit" }}>
                              {Number(m.difference) > 0 ? `+${formatCurrency(m.difference)}` : formatCurrency(m.difference)}
                            </strong>
                          </td>
                          <td style={{ fontSize: "12px", color: "#94a3b8" }}>{m.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <a
                className="button secondary"
                href={api.getInvoicePdfUrl(data.invoice_id)}
                target="_blank"
                rel="noopener noreferrer"
                download={`Invoice-${data.invoice_number}.pdf`}
              >
                ⬇ Download PDF Invoice
              </a>

              <button className="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

