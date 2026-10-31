# Pay-Doo — Frontend Integration Report & Integration Guide
**Role:** Senior QA Engineer & Integration Auditor (Laptop 3)  
**Collaborator:** Frontend Developer (Laptop 2)  
**Contract Baseline:** [`docs/API_CONTRACT.md`](API_CONTRACT.md)  
**Status:** **API READY FOR IMMEDIATE FRONTEND CONSUMPTION**  
**Date:** October 31, 2026  

---

## 1. Executive Summary

As Laptop 3 (QA & Integration Auditor), I have performed a complete endpoint-by-endpoint compatibility review to ensure that Laptop 2 can connect the user interface directly to the Pay-Doo backend without guesswork, schema inconsistencies, or integration defects.

**Integration Status:**
- Backend API server runs on `http://localhost:8000`.
- Prefix for all business endpoints is `/api`.
- CORS is enabled with `allow_origins=["*"]`, allowing Next.js / Vite / React local frontend servers to make cross-origin requests immediately.
- Interactive Swagger documentation is live at `http://localhost:8000/docs`.

---

## 2. Integration Contract Checklist for Laptop 2

| View / Feature | Target Endpoint | HTTP Method | Expected Payload / Params | Response Keys Expected by UI |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `/api/dashboard/summary` | `GET` | None | `active_subscriptions_count`, `total_revenue_collected`, `total_outstanding_receivables`, `overdue_invoices_count`, `overdue_invoices_amount`, `subscriptions_by_interval`, `recent_activity` |
| **Customers** | `/api/customers` | `GET` | `?skip=0&limit=50&search=` | Array of `{ id, name, email, phone, city, country, is_active }` |
| | `/api/customers` | `POST` | `{ name, email, phone, address, city, country }` | Returns created customer with `id` |
| | `/api/customers/{id}` | `GET` | None (path ID) | Single customer object |
| **Catalog** | `/api/products` | `GET` | None | Array of `{ id, name, code, sales_price, variants: [{ id, variant_name, sku, price_extra }] }` |
| | `/api/plans` | `GET` | None | Array of `{ id, name, code, billing_interval, price, allow_pause, allow_renewal }` |
| | `/api/discounts` | `GET` | None | Array of `{ id, name, code, discount_type, value, min_purchase_amount, current_uses, max_uses }` |
| **Subscriptions** | `/api/subscriptions` | `GET` | `?customer_id=&status=&skip=0&limit=50` | Array of `{ id, subscription_number, status, start_date, customer, plan, lines }` |
| | `/api/subscriptions` | `POST` | `{ customer_id, plan_id, discount_rule_id, start_date, payment_terms, lines: [{ product_id, variant_id, quantity, unit_price, tax_rate }] }` | Returns created subscription with status `"active"` |
| | `/api/subscriptions/{id}/status` | `PATCH` | `{ "status": "paused" }` (or `"active"`, `"closed"`) | Updated subscription object |
| **Billing & Invoices** | `/api/subscriptions/{id}/generate-invoice` | `POST` | `{ "billing_period_start": "YYYY-MM-DD", "billing_period_end": "YYYY-MM-DD", "due_date": "YYYY-MM-DD" }` | Returns created invoice with subtotal, tax, discount, total, outstanding |
| | `/api/invoices` | `GET` | `?customer_id=&status=&is_overdue=` | Array of invoices |
| | `/api/invoices/{id}` | `GET` | None (path ID) | Detailed invoice with line items and payments |
| **Payments** | `/api/invoices/{id}/payments` | `POST` | `{ "amount": "1200.00", "payment_method": "bank_transfer", "payment_date": "YYYY-MM-DD", "notes": "..." }` | Returns payment confirmation, updated `invoice_amount_paid`, and `invoice_outstanding_balance` |

---

## 3. Critical UI Handling Recommendations

### 3.1 Idempotency / Duplicate Billing (`409 Conflict`)
When the user clicks **"Generate Invoice"**, if an invoice has already been generated for that subscription and period, the backend returns:
```json
HTTP 409 Conflict
{
  "detail": "Invoice already generated for subscription X and period Y to Z."
}
```
**UI Recommendation:** Display a clear toast/notification: *"Invoice already generated for this billing cycle."* Do not display a generic error.

### 3.2 Overpayment & Payment Validation (`400 Bad Request`)
If a user enters an amount greater than the remaining balance, the backend returns:
```json
HTTP 400 Bad Request
{
  "detail": "Payment amount (X) exceeds outstanding balance (Y)."
}
```
**UI Recommendation:** Pre-fill the payment modal amount input with `invoice.outstanding_balance` and disable submit if `amount > outstanding_balance` or `amount <= 0`.

### 3.3 Disallowed Status Transitions (`400 Bad Request`)
If a plan has `allow_pause = false`, attempting to pause triggers:
```json
HTTP 400 Bad Request
{
  "detail": "Pausing is not permitted by this subscription's plan policy."
}
```
**UI Recommendation:** If `subscription.plan.allow_pause === false`, disable or hide the "Pause Subscription" action button in the UI.

---

## 4. Environment Configuration for Frontend
Add to frontend `.env.local` or configuration:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```
All tests pass and the backend is verified ready for live frontend integration.
