import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/paydoo";
import type { Product } from "../api/types";
import { useCollection } from "../hooks/useCollection";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/ui";
import { formatCurrency } from "../utils/format";
import { SubscribeModal } from "../components/SubscribeModal";

export function ExploreSoftwarePage() {
  const navigate = useNavigate();
  const products = useCollection(api.listProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products.data;
    return products.data.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [products.data, searchTerm]);

  const handleOpenSubscribe = (prodId: number) => {
    setSelectedProductId(prodId);
    setModalOpen(true);
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Explore Software Catalog"
        description="Discover and license enterprise software, cloud subscriptions, and scalable module add-ons."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/pricing" className="button secondary">
              View Billing Plans
            </Link>
            <Link to="/subscriptions" className="button secondary">
              My Subscriptions
            </Link>
          </div>
        }
      />

      {/* Search and Filters */}
      <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search software products, editions, or codes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            maxWidth: "380px",
            height: "38px",
            padding: "8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "7px",
            fontSize: "13px",
            background: "#fff",
          }}
        />
        {searchTerm && (
          <button className="text-button" onClick={() => setSearchTerm("")}>
            Clear search
          </button>
        )}
      </div>

      {products.loading ? (
        <LoadingState label="Loading available software catalog" />
      ) : products.error ? (
        <ErrorState message={products.error} retry={() => void products.refresh()} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No software products found"
          message={searchTerm ? "Try searching for a different keyword or code." : "No active software products available at this time."}
        />
      ) : (
        <div className="catalog-grid">
          {filteredProducts.map((product) => (
            <article className="catalog-card" key={product.id}>
              <div className="catalog-card-header">
                <div>
                  <h3 className="catalog-card-title">{product.name}</h3>
                  <span className="mono">{product.code}</span>
                </div>
                <span className="badge badge-active">Available</span>
              </div>

              <p className="catalog-card-desc">
                {product.description || "Enterprise cloud software solution engineered for business productivity and growth."}
              </p>

              <div className="price-display">
                <span className="price-amount">{formatCurrency(product.sales_price)}</span>
                <span className="price-cadence">/ base unit</span>
              </div>

              {product.variants && product.variants.length > 0 && (
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Available Editions / Tiers:
                  </span>
                  <div className="variant-badges">
                    {product.variants.map((v) => (
                      <span className="variant-pill" key={v.id}>
                        {v.variant_name} (+{formatCurrency(v.price_extra)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  className="button"
                  style={{ width: "100%" }}
                  onClick={() => handleOpenSubscribe(product.id)}
                >
                  Subscribe Now
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <SubscribeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialProductId={selectedProductId}
        onSubscribed={() => {
          // Trigger refresh if needed or navigate
        }}
      />
    </div>
  );
}
