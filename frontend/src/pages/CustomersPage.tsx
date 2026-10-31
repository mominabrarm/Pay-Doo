import { FormEvent, useCallback, useState } from "react";
import { api } from "../api/paydoo";
import { EmptyState, ErrorState, Flash, FormLabel, LoadingState, PageHeader, PaginationControls, Panel } from "../components/ui";
import { errorMessage, useCollection } from "../hooks/useCollection";
import { formatDate } from "../utils/format";

const initialForm = { name: "", email: "", phone: "", address: "", city: "", country: "" };
const PAGE_SIZE = 50;

export function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const loadCustomers = useCallback(() => api.listCustomers(search, page * PAGE_SIZE, PAGE_SIZE), [page, search]);
  const { data: customers, loading, error, refresh } = useCollection(loadCustomers);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await api.createCustomer(form);
      setForm(initialForm);
      setMessage({ kind: "success", text: `${created.name} has been added as a customer.` });
      await refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause) });
    } finally {
      setSubmitting(false);
    }
  }

  function searchCustomers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  return (
    <div className="page-stack">
      <PageHeader title="Customers" description="Create and manage the accounts that subscriptions and invoices belong to." />
      <section className="two-column-wide">
        <Panel>
          <div className="panel-heading"><div><h2>Add customer</h2><p>Use a unique billing email address.</p></div></div>
          {message && <Flash kind={message.kind}>{message.text}</Flash>}
          <form onSubmit={submit} className="form-grid">
            <FormLabel label="Company or customer name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Acme Corporation" /></FormLabel>
            <FormLabel label="Billing email"><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="billing@acme.com" /></FormLabel>
            <FormLabel label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" /></FormLabel>
            <FormLabel label="City"><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Bengaluru" /></FormLabel>
            <FormLabel label="Country"><input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="India" /></FormLabel>
            <FormLabel label="Address"><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="123 Tech Park" /></FormLabel>
            <div className="form-actions"><button className="button" disabled={submitting}>{submitting ? "Saving…" : "Create customer"}</button></div>
          </form>
        </Panel>
        <Panel className="list-panel">
          <div className="panel-heading"><div><h2>Customer directory</h2><p>{customers.length} record{customers.length === 1 ? "" : "s"} on this page</p></div><button className="text-button" onClick={() => void refresh()}>Refresh</button></div>
          <form className="table-toolbar" onSubmit={searchCustomers}><input type="search" aria-label="Search customers by name or email" placeholder="Search name or email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button className="button secondary" type="submit">Search</button>{search && <button className="text-button" type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>Clear</button>}</form>
          {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={() => void refresh()} /> : customers.length === 0 ? <EmptyState title="No customers yet" message="Add your first customer to start a subscription." /> : <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>Added</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong><span className="mono">#{customer.id}</span></td><td><a href={`mailto:${customer.email}`}>{customer.email}</a><span>{customer.phone || "No phone"}</span></td><td>{[customer.city, customer.country].filter(Boolean).join(", ") || "—"}</td><td>{formatDate(customer.created_at)}</td></tr>)}</tbody></table></div>}
          {!loading && !error && (customers.length > 0 || page > 0) && <PaginationControls page={page} hasNext={customers.length === PAGE_SIZE} onPageChange={setPage} />}
        </Panel>
      </section>
    </div>
  );
}
