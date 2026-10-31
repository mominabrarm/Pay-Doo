import { useState, useEffect, useMemo, FormEvent } from "react";
import { api } from "../api/paydoo";
import type { Product, Plan, Subscription } from "../api/types";
import { formatCurrency, today } from "../utils/format";
import { errorMessage } from "../hooks/useCollection";
import { Flash } from "./ui";

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: number;
  initialPlanId?: number;
  onSubscribed?: (subscription: Subscription) => void;
}

export function SubscribeModal({
  isOpen,
  onClose,
  initialProductId,
  initialPlanId,
  onSubscribed,
}: SubscribeModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [productId, setProductId] = useState<number | undefined>(initialProductId);
  const [variantId, setVariantId] = useState<number | undefined>(undefined);
  const [planId, setPlanId] = useState<number | undefined>(initialPlanId);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentTerms, setPaymentTerms] = useState<string>("Immediate");
  const [startDate, setStartDate] = useState<string>(today());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessResult(null);
      return;
    }

    setLoadingOptions(true);
    Promise.all([api.listProducts(), api.listPlans()])
      .then(([prods, plns]) => {
        setProducts(prods);
        setPlans(plns);

        // Pre-select defaults if not set
        if (!productId && prods.length > 0) {
          const first = initialProductId ? prods.find((p) => p.id === initialProductId) || prods[0] : prods[0];
          setProductId(first.id);
        }
        if (!planId && plns.length > 0) {
          const firstPlan = initialPlanId ? plns.find((p) => p.id === initialPlanId) || plns[0] : plns[0];
          setPlanId(firstPlan.id);
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoadingOptions(false));
  }, [isOpen, initialProductId, initialPlanId]);

  // Sync initial props when opened
  useEffect(() => {
    if (initialProductId) setProductId(initialProductId);
    if (initialPlanId) setPlanId(initialPlanId);
  }, [initialProductId, initialPlanId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const selectedVariant = useMemo(() => {
    if (!selectedProduct || !variantId) return undefined;
    return selectedProduct.variants.find((v) => v.id === variantId);
  }, [selectedProduct, variantId]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId]
  );

  // Authoritative calculations matching backend
  const basePrice = selectedProduct ? Number(selectedProduct.sales_price) : 0;
  const priceExtra = selectedVariant ? Number(selectedVariant.price_extra) : 0;
  const unitPrice = basePrice + priceExtra;
  const validQty = Math.max(1, quantity || 1);
  const subtotal = unitPrice * validQty;
  const taxRate = 18.0;
  const taxAmount = (subtotal * taxRate) / 100.0;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!productId || !planId) {
      setError("Please select both a software product and a billing plan.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const subscription = await api.subscribe({
        product_id: productId,
        plan_id: planId,
        variant_id: variantId,
        quantity: validQty,
        start_date: startDate,
        payment_terms: paymentTerms,
      });

      setSuccessResult(subscription);
      if (onSubscribed) {
        onSubscribed(subscription);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Purchase Software Subscription</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {error && <Flash kind="error">{error}</Flash>}

        {successResult ? (
          <div className="page-stack">
            <Flash kind="success">
              Subscription <strong>{successResult.subscription_number}</strong> created successfully!
            </Flash>
            <div className="breakdown-box">
              <div className="breakdown-row">
                <span>Plan:</span>
                <strong>{selectedPlan?.name || "Standard Plan"}</strong>
              </div>
              <div className="breakdown-row">
                <span>Product:</span>
                <strong>{selectedProduct?.name}</strong>
              </div>
              <div className="breakdown-row">
                <span>Status:</span>
                <span className="badge badge-active">{successResult.status.toUpperCase()}</span>
              </div>
              <div className="breakdown-row">
                <span>Billing Interval:</span>
                <strong>{selectedPlan?.billing_interval || "Monthly"}</strong>
              </div>
              <div className="breakdown-row total">
                <span>First Cycle Invoiced:</span>
                <span>{formatCurrency(totalAmount.toFixed(2))}</span>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Your first cycle invoice has been generated automatically. You can review your billing statement and download your PDF invoice from the Invoices portal.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
              <button className="button" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="page-stack compact-stack">
            <div className="field">
              <span>Software Product</span>
              <select
                required
                value={productId || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setProductId(id);
                  setVariantId(undefined);
                }}
                disabled={loadingOptions || submitting}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {formatCurrency(p.sales_price)}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && selectedProduct.variants.length > 0 && (
              <div className="field">
                <span>Product Variant / Edition</span>
                <select
                  value={variantId || ""}
                  onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={submitting}
                >
                  <option value="">Base Edition (Standard)</option>
                  {selectedProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.variant_name} ({v.sku}) — +{formatCurrency(v.price_extra)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-columns">
              <div className="field">
                <span>Billing Plan</span>
                <select
                  required
                  value={planId || ""}
                  onChange={(e) => setPlanId(Number(e.target.value))}
                  disabled={loadingOptions || submitting}
                >
                  <option value="">Select a plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billing_interval})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Quantity / Licenses</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-columns">
              <div className="field">
                <span>Start Date</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="field">
                <span>Payment Terms</span>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  disabled={submitting}
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                </select>
              </div>
            </div>

            {/* Authoritative Live Price Breakdown */}
            <div className="breakdown-box">
              <div className="breakdown-row">
                <span>Base Unit Price:</span>
                <span>{formatCurrency(basePrice.toFixed(2))}</span>
              </div>
              {priceExtra > 0 && (
                <div className="breakdown-row">
                  <span>Variant Surcharge:</span>
                  <span>+{formatCurrency(priceExtra.toFixed(2))}</span>
                </div>
              )}
              <div className="breakdown-row">
                <span>Effective Unit Price:</span>
                <strong>{formatCurrency(unitPrice.toFixed(2))}</strong>
              </div>
              <div className="breakdown-row">
                <span>Subtotal ({validQty} license{validQty > 1 ? "s" : ""}):</span>
                <span>{formatCurrency(subtotal.toFixed(2))}</span>
              </div>
              <div className="breakdown-row">
                <span>GST / Tax (18%):</span>
                <span>{formatCurrency(taxAmount.toFixed(2))}</span>
              </div>
              <div className="breakdown-row total">
                <span>Total Due First Cycle:</span>
                <span>{formatCurrency(totalAmount.toFixed(2))}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button type="button" className="button secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={submitting || !productId || !planId}>
                {submitting ? "Processing…" : `Subscribe & Bill ${formatCurrency(totalAmount.toFixed(2))}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
