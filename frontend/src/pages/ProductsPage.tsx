import { FormEvent, useMemo, useState } from "react";
import { api } from "../api/paydoo";
import { EmptyState, ErrorState, Flash, FormLabel, LoadingState, PageHeader, Panel } from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatCurrency } from "../utils/format";

const initialProduct = { name: "", code: "", product_type: "software", sales_price: "", cost_price: "", description: "" };
const initialVariant = { productId: "", variant_name: "", sku: "", price_extra: "0.00" };

export function ProductsPage() {
  const { data: products, loading, error, refresh } = useCollection(api.listProducts);
  const [productForm, setProductForm] = useState(initialProduct);
  const [variantForm, setVariantForm] = useState(initialVariant);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const productOptions = useMemo(() => products.map((product) => ({ id: product.id, name: product.name })), [products]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingProduct(true);
    setMessage(null);
    try {
      const product = await api.createProduct({ ...productForm, description: productForm.description || undefined });
      setProductForm(initialProduct);
      setVariantForm((current) => ({ ...current, productId: String(product.id) }));
      setMessage({ kind: "success", text: `${product.name} is ready for subscription lines.` });
      await refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setCreatingProduct(false);
    }
  }

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!variantForm.productId) return;
    setCreatingVariant(true);
    setMessage(null);
    try {
      const variant = await api.createVariant(Number(variantForm.productId), {
        variant_name: variantForm.variant_name,
        sku: variantForm.sku,
        price_extra: variantForm.price_extra,
      });
      setVariantForm(initialVariant);
      setMessage({ kind: "success", text: `${variant.variant_name} has been added.` });
      await refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setCreatingVariant(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Products" description="Set the commercial catalogue and optional price-adjusting variants." />
      {message && <Flash kind={message.kind}>{message.text}</Flash>}
      <section className="form-columns">
        <Panel>
          <div className="panel-heading"><div><h2>New product</h2><p>Prices are passed to the backend as precise decimal values.</p></div></div>
          <form onSubmit={createProduct} className="form-grid">
            <FormLabel label="Product name"><input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="PayDoo Business Suite" /></FormLabel>
            <FormLabel label="Product code"><input required value={productForm.code} onChange={(event) => setProductForm({ ...productForm, code: event.target.value })} placeholder="PAY-CORE-01" /></FormLabel>
            <FormLabel label="Type"><input required value={productForm.product_type} onChange={(event) => setProductForm({ ...productForm, product_type: event.target.value })} /></FormLabel>
            <FormLabel label="Sales price"><input required type="number" min="0" step="0.01" value={productForm.sales_price} onChange={(event) => setProductForm({ ...productForm, sales_price: event.target.value })} /></FormLabel>
            <FormLabel label="Cost price"><input required type="number" min="0" step="0.01" value={productForm.cost_price} onChange={(event) => setProductForm({ ...productForm, cost_price: event.target.value })} /></FormLabel>
            <FormLabel label="Description"><input value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="What customers receive" /></FormLabel>
            <div className="form-actions"><button className="button" disabled={creatingProduct}>{creatingProduct ? "Saving…" : "Create product"}</button></div>
          </form>
        </Panel>
        <Panel>
          <div className="panel-heading"><div><h2>Add variant</h2><p>Use a variant for optional features or brand-specific pricing.</p></div></div>
          <form onSubmit={createVariant} className="form-grid">
            <FormLabel label="Product"><select required value={variantForm.productId} onChange={(event) => setVariantForm({ ...variantForm, productId: event.target.value })}><option value="">Choose a product</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></FormLabel>
            <FormLabel label="Variant name"><input required value={variantForm.variant_name} onChange={(event) => setVariantForm({ ...variantForm, variant_name: event.target.value })} placeholder="Odoo integration" /></FormLabel>
            <FormLabel label="SKU"><input required value={variantForm.sku} onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })} placeholder="PAY-CORE-01-ODOO" /></FormLabel>
            <FormLabel label="Price adjustment"><input required type="number" min="0" step="0.01" value={variantForm.price_extra} onChange={(event) => setVariantForm({ ...variantForm, price_extra: event.target.value })} /></FormLabel>
            <div className="form-actions"><button className="button" disabled={creatingVariant || products.length === 0}>{creatingVariant ? "Saving…" : "Add variant"}</button></div>
          </form>
        </Panel>
      </section>
      <Panel className="list-panel">
        <div className="panel-heading"><div><h2>Product catalogue</h2><p>{products.length} active product{products.length === 1 ? "" : "s"}</p></div><button className="text-button" onClick={() => void refresh()}>Refresh</button></div>
        {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={() => void refresh()} /> : products.length === 0 ? <EmptyState title="No products yet" message="Create a product before building a subscription." /> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>Base price</th><th>Variants</th><th>Description</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><span className="mono">{product.code}</span></td><td>{formatCurrency(product.sales_price)}</td><td>{product.variants.length === 0 ? <span className="muted">None</span> : <div className="variant-list">{product.variants.map((variant) => <span key={variant.id}>{variant.variant_name} <b>+{formatCurrency(variant.price_extra)}</b></span>)}</div>}</td><td>{product.description || "—"}</td></tr>)}</tbody></table></div>}
      </Panel>
    </div>
  );
}
