import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/paydoo";
import type {
  LeakageAlert,
  LeakageAlertSeverity,
  LeakageAlertStatus,
  LeakageSummary,
  PlanSimulatorOption,
  SimulatorResponse,
} from "../api/types";
import {
  EmptyState,
  ErrorState,
  Flash,
  FormLabel,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
} from "../components/ui";
import { errorMessage } from "../hooks/useCollection";
import { formatCurrency, formatDate, titleCase } from "../utils/format";

export function IntelligencePage() {
  const [activeTab, setActiveTab] = useState<"protect" | "predict">("protect");

  return (
    <div className="page-stack">
      <PageHeader
        title="Financial Intelligence"
        description="Protect revenue through explainable billing leakage detection and predict pricing impacts with real-time scenario simulation."
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`button ${activeTab === "protect" ? "" : "secondary"}`}
              onClick={() => setActiveTab("protect")}
            >
              🛡️ Protect (Leakage Detection)
            </button>
            <button
              className={`button ${activeTab === "predict" ? "" : "secondary"}`}
              onClick={() => setActiveTab("predict")}
            >
              📈 Predict (Impact Simulator)
            </button>
          </div>
        }
      />

      {activeTab === "protect" ? <ProtectSection /> : <PredictSection />}
    </div>
  );
}

// ==========================================
// 1. PROTECT: Revenue Leakage Detection
// ==========================================

function ProtectSection() {
  const [summary, setSummary] = useState<LeakageSummary | null>(null);
  const [alerts, setAlerts] = useState<LeakageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  // Inspect Modal
  const [selectedAlert, setSelectedAlert] = useState<LeakageAlert | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, alertsData] = await Promise.all([
        api.getLeakageSummary(),
        api.listLeakageAlerts(statusFilter || undefined, severityFilter || undefined),
      ]);
      setSummary(sumData);
      setAlerts(alertsData);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter, severityFilter]);

  const handleScan = async () => {
    setScanning(true);
    setMessage(null);
    try {
      const updatedAlerts = await api.scanLeakageAlerts();
      const updatedSummary = await api.getLeakageSummary();
      setAlerts(updatedAlerts);
      setSummary(updatedSummary);
      setMessage({
        kind: "success",
        text: `Revenue scan complete. Analyzed database records and flagged ${updatedAlerts.filter(a => a.status === 'open').length} active issue(s).`,
      });
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (alertId: number, newStatus: LeakageAlertStatus) => {
    setUpdating(true);
    try {
      await api.updateLeakageAlert(alertId, {
        status: newStatus,
        resolution_notes: resolutionNote || undefined,
      });
      setMessage({
        kind: "success",
        text: `Alert #${alertId} updated to '${newStatus}'.`,
      });
      setSelectedAlert(null);
      setResolutionNote("");
      await loadData();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="page-stack">
      {message && <Flash kind={message.kind}>{message.text}</Flash>}

      {/* Telemetry Metric Cards */}
      <section className="metric-grid">
        <MetricCard
          label="Open anomalies"
          value={summary ? summary.total_open_alerts : "—"}
          hint="Unresolved billing discrepancies"
        />
        <MetricCard
          label="Critical severity"
          value={summary ? summary.critical_alerts_count : "—"}
          hint="Immediate audit required"
        />
        <MetricCard
          label="Potential revenue at risk"
          value={summary ? formatCurrency(summary.total_amount_at_risk) : "—"}
          hint="Unreconciled / duplicate exposure"
        />
        <MetricCard
          label="Resolved alerts"
          value={summary ? summary.resolved_alerts_count : "—"}
          hint="Audited and closed"
        />
      </section>

      {/* Control Toolbar */}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8" }}>Filters:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: "13px", padding: "4px 8px" }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ fontSize: "13px", padding: "4px 8px" }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {(statusFilter || severityFilter) && (
              <button
                className="text-button"
                onClick={() => {
                  setStatusFilter("");
                  setSeverityFilter("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="button"
              disabled={scanning}
              onClick={handleScan}
            >
              {scanning ? "Scanning records…" : "⚡ Run revenue scan"}
            </button>
            <button
              className="button secondary"
              onClick={() => void loadData()}
            >
              Refresh
            </button>
          </div>
        </div>
      </Panel>

      {/* Alerts Table */}
      <Panel className="list-panel">
        <div className="panel-heading">
          <div>
            <h2>Detected Revenue Discrepancies</h2>
            <p>Deterministic checks for cancelled billing, expired contracts, unreconciled ledgers, and duplicate invoices.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Analyzing billing ledger" />
        ) : error ? (
          <ErrorState message={error} retry={() => void loadData()} />
        ) : alerts.length === 0 ? (
          <EmptyState
            title="Clean ledger: No revenue leakage detected"
            message="No billing discrepancies, duplicate invoices, or payment reconciliation variances found."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Issue & Rule</th>
                  <th>Customer & Resource</th>
                  <th>Amount at Risk</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td>
                      <strong>{alert.title}</strong>
                      <span className="mono" style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {alert.rule_code}
                      </span>
                    </td>
                    <td>
                      <div><strong>{alert.customer_name ?? `Customer #${alert.customer_id}`}</strong></div>
                      <span className="mono" style={{ fontSize: "11px" }}>
                        {alert.subscription_number ? `Sub: ${alert.subscription_number} ` : ""}
                        {alert.invoice_number ? `· Inv: ${alert.invoice_number}` : ""}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: Number(alert.amount_at_risk) > 0 ? "#f87171" : "inherit" }}>
                        {formatCurrency(alert.amount_at_risk)}
                      </strong>
                    </td>
                    <td>
                      <StatusBadge value={alert.status} />
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelectedAlert(alert);
                          setResolutionNote(alert.resolution_notes || "");
                        }}
                      >
                        Inspect & Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Alert Inspection & Action Modal */}
      {selectedAlert && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "#1e293b",
            borderRadius: "12px",
            maxWidth: "650px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "24px",
            border: "1px solid #334155",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <SeverityBadge severity={selectedAlert.severity} />
                  <span className="mono" style={{ color: "#94a3b8", fontSize: "12px" }}>{selectedAlert.rule_code}</span>
                </div>
                <h2 style={{ fontSize: "18px", color: "#f8fafc", margin: 0 }}>{selectedAlert.title}</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setSelectedAlert(null)}
                style={{ fontSize: "18px", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h4 style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px" }}>Description</h4>
                <p style={{ color: "#e2e8f0", fontSize: "14px", margin: 0 }}>{selectedAlert.description}</p>
              </div>

              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                <h4 style={{ color: "#38bdf8", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px" }}>Audit Evidence</h4>
                <p style={{ color: "#cbd5e1", fontSize: "13px", margin: 0, fontFamily: "monospace" }}>{selectedAlert.evidence}</p>
              </div>

              <div>
                <h4 style={{ color: "#34d399", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px" }}>Recommended Action</h4>
                <p style={{ color: "#e2e8f0", fontSize: "13px", margin: 0 }}>{selectedAlert.recommended_action}</p>
              </div>

              <div style={{ display: "flex", gap: "24px" }}>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>Amount at Risk:</span>
                  <div style={{ color: "#f87171", fontSize: "16px", fontWeight: "700" }}>{formatCurrency(selectedAlert.amount_at_risk)}</div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>Current Status:</span>
                  <div><StatusBadge value={selectedAlert.status} /></div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>Detected Date:</span>
                  <div style={{ color: "#e2e8f0", fontSize: "13px" }}>{formatDate(selectedAlert.created_at)}</div>
                </div>
              </div>

              <div>
                <FormLabel label="Resolution / Audit Notes">
                  <textarea
                    rows={3}
                    placeholder="Document root cause or corrective accounting action..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}
                  />
                </FormLabel>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="button secondary"
                disabled={updating}
                onClick={() => setSelectedAlert(null)}
              >
                Cancel
              </button>
              {selectedAlert.status === "open" && (
                <button
                  className="button secondary"
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedAlert.id, "acknowledged")}
                >
                  Mark Acknowledged
                </button>
              )}
              {selectedAlert.status !== "resolved" && (
                <button
                  className="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedAlert.id, "resolved")}
                >
                  Resolve Alert
                </button>
              )}
              {selectedAlert.status !== "false_positive" && (
                <button
                  className="text-button"
                  style={{ color: "#94a3b8" }}
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedAlert.id, "false_positive")}
                >
                  Mark False Positive
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: LeakageAlertSeverity }) {
  const colors: Record<LeakageAlertSeverity, { bg: string; text: string }> = {
    critical: { bg: "#7f1d1d", text: "#fca5a5" },
    high: { bg: "#7c2d12", text: "#fdba74" },
    medium: { bg: "#1e3a8a", text: "#93c5fd" },
    low: { bg: "#334155", text: "#cbd5e1" },
  };
  const c = colors[severity] || colors.medium;
  return (
    <span style={{
      backgroundColor: c.bg,
      color: c.text,
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase",
      padding: "2px 8px",
      borderRadius: "4px"
    }}>
      {severity}
    </span>
  );
}

// ==========================================
// 2. PREDICT: Subscription Impact Simulator
// ==========================================

function PredictSection() {
  const [plans, setPlans] = useState<PlanSimulatorOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [proposedPrice, setProposedPrice] = useState<string>("");
  const [discountPct, setDiscountPct] = useState<string>("0");
  const [billingInterval, setBillingInterval] = useState<string>("monthly");
  const [targetCount, setTargetCount] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimulatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSimulatorPlans()
      .then((data) => {
        setPlans(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedPlanId(String(first.id));
          setProposedPrice(String(first.current_price));
          setBillingInterval(first.billing_interval);
          setTargetCount(String(first.active_subscribers_count || 1));
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handlePlanChange = (planIdStr: string) => {
    setSelectedPlanId(planIdStr);
    const plan = plans.find((p) => p.id === Number(planIdStr));
    if (plan) {
      setProposedPrice(String(plan.current_price));
      setBillingInterval(plan.billing_interval);
      setTargetCount(String(plan.active_subscribers_count || 1));
      setDiscountPct("0");
    }
  };

  const handleSimulate = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSimulating(true);
    setError(null);
    try {
      const response = await api.calculateSimulation({
        plan_id: selectedPlanId ? Number(selectedPlanId) : undefined,
        proposed_price: proposedPrice ? proposedPrice : undefined,
        discount_percentage: discountPct ? discountPct : undefined,
        billing_interval: billingInterval || undefined,
        target_customer_count: targetCount ? Number(targetCount) : undefined,
      });
      setResult(response);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSimulating(false);
    }
  };

  // Run initial simulation once plans are loaded
  useEffect(() => {
    if (plans.length > 0 && selectedPlanId && !result) {
      void handleSimulate();
    }
  }, [plans, selectedPlanId]);

  const handleReset = () => {
    const plan = plans.find((p) => p.id === Number(selectedPlanId));
    if (plan) {
      setProposedPrice(String(plan.current_price));
      setDiscountPct("0");
      setBillingInterval(plan.billing_interval);
      setTargetCount(String(plan.active_subscribers_count || 1));
    }
    void handleSimulate();
  };

  if (loading) return <LoadingState label="Loading plans and baseline revenue metrics" />;

  return (
    <div className="page-stack">
      {error && <ErrorState message={error} retry={() => void handleSimulate()} />}

      <section className="two-column-wide">
        {/* Scenario Controls Panel */}
        <Panel>
          <div className="panel-heading">
            <div>
              <h2>Scenario Parameters</h2>
              <p>Model proposed pricing adjustments and promotional discount impacts before modifying production contracts.</p>
            </div>
          </div>

          <form onSubmit={handleSimulate} className="form-grid">
            <FormLabel label="Select Plan">
              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatCurrency(p.current_price)}/{p.billing_interval} ({p.active_subscribers_count} active)
                  </option>
                ))}
              </select>
            </FormLabel>

            <FormLabel label="Proposed Price (₹)">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
              />
            </FormLabel>

            <FormLabel label={`Promotional Discount (${discountPct}%)`}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  style={{ width: "70px" }}
                />
              </div>
            </FormLabel>

            <FormLabel label="Billing Frequency">
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </FormLabel>

            <FormLabel label="Target Active Subscriptions">
              <input
                required
                type="number"
                min="1"
                step="1"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
              />
            </FormLabel>

            <div className="form-actions" style={{ display: "flex", gap: "10px" }}>
              <button className="button" type="submit" disabled={simulating}>
                {simulating ? "Calculating…" : "⚡ Run Simulation"}
              </button>
              <button className="button secondary" type="button" onClick={handleReset}>
                Reset to Baseline
              </button>
            </div>
          </form>
        </Panel>

        {/* Impact Results Panel */}
        <Panel className="list-panel">
          <div className="panel-heading">
            <div>
              <h2>Projected Revenue Impact</h2>
              <p>Python Decimal financial projection normalized to monthly and annualized run-rates.</p>
            </div>
          </div>

          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Highlight Impact Card */}
              <div style={{
                background: result.is_positive_impact ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${result.is_positive_impact ? "#10b981" : "#ef4444"}`,
                borderRadius: "10px",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: result.is_positive_impact ? "#34d399" : "#f87171", fontWeight: "700" }}>
                    Net Financial Variance
                  </span>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", marginTop: "4px" }}>
                    {formatCurrency(result.monthly_difference)} <span style={{ fontSize: "14px", fontWeight: "500", color: "#94a3b8" }}>/ month</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "2px" }}>
                    Annualized: <strong>{formatCurrency(result.annualized_difference)} / year</strong>
                  </div>
                </div>

                <div style={{
                  backgroundColor: result.is_positive_impact ? "#065f46" : "#7f1d1d",
                  color: result.is_positive_impact ? "#6ee7b7" : "#fca5a5",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "18px",
                  fontWeight: "800"
                }}>
                  {Number(result.percentage_change) >= 0 ? `+${result.percentage_change}%` : `${result.percentage_change}%`}
                </div>
              </div>

              {/* Comparison Metric Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>Baseline Monthly Run-Rate</span>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#e2e8f0" }}>{formatCurrency(result.current_monthly_revenue)}</div>
                  <small style={{ color: "#64748b" }}>{formatCurrency(result.current_annualized_revenue)} / yr</small>
                </div>

                <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>Proposed Monthly Run-Rate</span>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#38bdf8" }}>{formatCurrency(result.proposed_monthly_revenue)}</div>
                  <small style={{ color: "#64748b" }}>{formatCurrency(result.proposed_annualized_revenue)} / yr</small>
                </div>
              </div>

              {/* Side-by-side Comparison Breakdown Table */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Metric Dimension</th>
                      <th>Current Baseline</th>
                      <th>Proposed Scenario</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Plan Base Price</strong></td>
                      <td>{formatCurrency(result.current_price)}</td>
                      <td>{formatCurrency(result.proposed_price)}</td>
                      <td>{formatCurrency(Number(result.proposed_price) - Number(result.current_price))}</td>
                    </tr>
                    <tr>
                      <td><strong>Promotional Discount</strong></td>
                      <td>0.00%</td>
                      <td>{result.discount_percentage}%</td>
                      <td>−{result.discount_percentage}%</td>
                    </tr>
                    <tr>
                      <td><strong>Effective Price per Sub</strong></td>
                      <td>{formatCurrency(result.current_price)}</td>
                      <td><strong style={{ color: "#38bdf8" }}>{formatCurrency(result.effective_proposed_price)}</strong></td>
                      <td>{formatCurrency(Number(result.effective_proposed_price) - Number(result.current_price))}</td>
                    </tr>
                    <tr>
                      <td><strong>Subscribers Simulated</strong></td>
                      <td>{result.affected_subscriptions_count}</td>
                      <td>{result.affected_subscriptions_count}</td>
                      <td>—</td>
                    </tr>
                    <tr>
                      <td><strong>Billing Cadence</strong></td>
                      <td>{titleCase(result.billing_interval)}</td>
                      <td>{titleCase(result.billing_interval)}</td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="field-note" style={{ fontStyle: "italic", color: "#64748b", margin: 0 }}>
                {result.disclaimer}
              </p>
            </div>
          ) : (
            <EmptyState title="No simulation computed" message="Configure pricing parameters on the left and run scenario calculation." />
          )}
        </Panel>
      </section>
    </div>
  );
}

