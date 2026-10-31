import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/paydoo";
import type { Plan } from "../api/types";
import { useCollection } from "../hooks/useCollection";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/ui";
import { titleCase } from "../utils/format";
import { SubscribeModal } from "../components/SubscribeModal";

export function PricingPlansPage() {
  const plans = useCollection(api.listPlans);
  const [selectedInterval, setSelectedInterval] = useState<string>("all");
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const intervals = useMemo(() => {
    const set = new Set<string>();
    plans.data.forEach((p) => set.add(p.billing_interval));
    return ["all", ...Array.from(set)];
  }, [plans.data]);

  const filteredPlans = useMemo(() => {
    if (selectedInterval === "all") return plans.data;
    return plans.data.filter((p) => p.billing_interval === selectedInterval);
  }, [plans.data, selectedInterval]);

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    setModalOpen(true);
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Subscription Pricing & Cadence"
        description="Choose a transparent billing cadence with automated invoice generation and guaranteed uptime terms."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/explore" className="button secondary">
              Browse Software
            </Link>
            <Link to="/subscriptions" className="button secondary">
              My Subscriptions
            </Link>
          </div>
        }
      />

      {/* Interval filter tabs */}
      <div className="tab-bar">
        {intervals.map((intv) => (
          <button
            key={intv}
            className={`tab-btn ${selectedInterval === intv ? "active" : ""}`}
            onClick={() => setSelectedInterval(intv)}
          >
            {intv === "all" ? "All Cadences" : `${titleCase(intv)} Billing`}
          </button>
        ))}
      </div>

      {plans.loading ? (
        <LoadingState label="Loading subscription plans" />
      ) : plans.error ? (
        <ErrorState message={plans.error} retry={() => void plans.refresh()} />
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          title="No plans found"
          message={`No plans configured under ${selectedInterval} cadence.`}
        />
      ) : (
        <div className="catalog-grid">
          {filteredPlans.map((plan) => (
            <article className="catalog-card" key={plan.id}>
              <div className="catalog-card-header">
                <div>
                  <h3 className="catalog-card-title">{plan.name}</h3>
                  <span className="mono">{plan.code}</span>
                </div>
                <span className="badge badge-active">{plan.billing_interval.toUpperCase()}</span>
              </div>

              <div className="price-display" style={{ marginTop: "6px" }}>
                <span className="price-amount">{titleCase(plan.billing_interval)}</span>
                <span className="price-cadence">Recurring Invoicing</span>
              </div>

              <div style={{ fontSize: "13px", color: "#64748b", display: "grid", gap: "8px", margin: "10px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#0f766e", fontWeight: "bold" }}>✓</span>
                  <span>Automated invoice confirmation each {plan.billing_interval}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#0f766e", fontWeight: "bold" }}>✓</span>
                  <span>15-day payment grace period for registered customers</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#0f766e", fontWeight: "bold" }}>✓</span>
                  <span>Direct PDF receipt download upon settlement</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#0f766e", fontWeight: "bold" }}>✓</span>
                  <span>Cancel or pause at any time from your portal</span>
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  className="button"
                  style={{ width: "100%" }}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Choose {plan.name}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <SubscribeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialPlanId={selectedPlanId}
      />
    </div>
  );
}

