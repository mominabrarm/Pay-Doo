# Pay-Doo — Database & Data Integrity Audit Report
**Role:** Senior QA Engineer & Integration Auditor (Laptop 3)  
**Target:** Relational Persistence, Schema Invariants, Financial Precision, Billing Idempotency  
**Database Engines Tested:** PostgreSQL 16 (Engine target) / SQLite 3 (Isolated testing & fallback persistence)  
**Date:** October 31, 2026  

---

## 1. Executive Summary

A comprehensive data-integrity and persistence audit was executed across the Pay-Doo backend data tier. The audit covered all 10 relational entities, schema constraints, numeric precision representations, transactional boundaries, and duplicate billing prevention mechanisms.

**Audit Verdict:** **PASS WITH NOTED ADVISORIES**
- **Relational Integrity:** Strong. Foreign key constraints enforce referential consistency with explicit `ondelete` semantics (`RESTRICT`, `CASCADE`, `SET NULL`).
- **Financial Precision:** Verified. Monetary amounts strictly utilize `NUMERIC(12, 2)` at the schema layer and Python `Decimal` with deterministic `ROUND_HALF_UP` in application logic. Floating-point drift is absent.
- **Billing Idempotency:** Verified. Duplicate invoice generation for the same subscription and billing cycle is blocked both transactionally and via a database composite unique constraint (`uq_subscription_billing_period`).
- **Persistence:** Verified. Seed data and workflow mutations persist deterministically.

---

## 2. Relational Integrity & Schema Analysis

The database model comprises 10 relational tables defined via SQLAlchemy 2.0 ORM:
`customers`, `products`, `product_variants`, `subscription_plans`, `discount_rules`, `subscriptions`, `subscription_lines`, `invoices`, `invoice_lines`, `payments`.

| Table | Primary Key | Foreign Keys & Actions | Unique Constraints | Nullability Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `customers` | `id` (int PK) | None | `email` (UNIQUE, indexed) | `name`, `email`, `is_active` NOT NULL |
| `products` | `id` (int PK) | None | `code` (UNIQUE, indexed) | `name`, `code`, `sales_price`, `cost_price` NOT NULL |
| `product_variants` | `id` (int PK) | `product_id` -> `products.id` (`CASCADE`) | `sku` (UNIQUE, indexed) | `variant_name`, `sku`, `price_extra` NOT NULL |
| `subscription_plans` | `id` (int PK) | None | `code` (UNIQUE, indexed) | `name`, `code`, `billing_interval`, `price`, `min_quantity` NOT NULL |
| `discount_rules` | `id` (int PK) | `product_id` -> `products.id` (`SET NULL`) | `code` (UNIQUE, indexed) | `name`, `code`, `discount_type`, `value` NOT NULL |
| `subscriptions` | `id` (int PK) | `customer_id` -> `customers.id` (`RESTRICT`), `plan_id` -> `subscription_plans.id` (`RESTRICT`), `discount_rule_id` -> `discount_rules.id` (`SET NULL`) | `subscription_number` (UNIQUE, indexed) | `customer_id`, `plan_id`, `status`, `start_date`, `next_billing_date` NOT NULL |
| `subscription_lines` | `id` (int PK) | `subscription_id` -> `subscriptions.id` (`CASCADE`), `product_id` -> `products.id` (`RESTRICT`), `variant_id` -> `product_variants.id` (`SET NULL`) | None | `subscription_id`, `product_id`, `quantity`, `unit_price`, `amount` NOT NULL |
| `invoices` | `id` (int PK) | `subscription_id` -> `subscriptions.id` (`RESTRICT`), `customer_id` -> `customers.id` (`RESTRICT`) | `invoice_number` (UNIQUE, indexed), **`uq_subscription_billing_period`** | `subscription_id`, `customer_id`, `billing_period_start`, `billing_period_end`, `issue_date`, `due_date`, `status`, `total_amount`, `outstanding_balance` NOT NULL |
| `invoice_lines` | `id` (int PK) | `invoice_id` -> `invoices.id` (`CASCADE`), `product_id` -> `products.id` (`RESTRICT`), `variant_id` -> `product_variants.id` (`SET NULL`) | None | `invoice_id`, `product_id`, `description`, `quantity`, `unit_price`, `subtotal`, `total_amount` NOT NULL |
| `payments` | `id` (int PK) | `invoice_id` -> `invoices.id` (`RESTRICT`) | `payment_number` (UNIQUE, indexed) | `invoice_id`, `payment_method`, `amount`, `payment_date`, `status` NOT NULL |

---

## 3. Financial Integrity Audit

### 3.1 Numeric Precision & Rounding
- **Column Definition:** All monetary fields (`sales_price`, `cost_price`, `price_extra`, `price`, `unit_price`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `amount_paid`, `outstanding_balance`, `amount`) are defined as `Numeric(12, 2)`.
- **Tax Rates:** Stored as `Numeric(5, 2)` (e.g. `18.00` for 18% GST).
- **Rounding Strategy:** Governed by `app.services.billing.round_currency`:
  ```python
  def round_currency(val: Decimal) -> Decimal:
      return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
  ```
  Every arithmetic operation converts inputs explicitly via `Decimal(str(...))` prior to multiplication/division and quantizes the result to two decimal places.

### 3.2 Invoice Balance Reconciliation
- **Formula:**
  $$\text{subtotal} = \sum (\text{unit\_price} \times \text{quantity})$$
  $$\text{tax\_amount} = \sum \text{line\_tax}$$
  $$\text{total\_amount} = \text{subtotal} - \text{discount\_amount} + \text{tax\_amount}$$
  $$\text{outstanding\_balance} = \text{total\_amount} - \text{amount\_paid}$$
- **Audit Verification:** Tested across multiple test cases (e.g. `test_complete_billing_and_payment_workflow`, `test_fixed_discount_rule_and_thresholds`). In all instances:
  $$\text{outstanding\_balance} + \text{amount\_paid} == \text{total\_amount}$$
  No penny discrepancies or floating-point rounding errors were observed.

### 3.3 Payment Bounds
- Payments $\le 0.00$ are rejected with HTTP 400/422.
- Payments exceeding `outstanding_balance` are rejected with HTTP 400 (`Payment amount exceeds outstanding balance`).
- Once `outstanding_balance == 0.00`, the invoice transitions to `paid` and further payment attempts are rejected with HTTP 400.

---

## 4. Billing Idempotency & Duplicate Prevention

### 4.1 Multi-Layer Defense
1. **Pre-check Query Layer:**
   `app.services.billing.generate_subscription_invoice` verifies if an invoice already exists for `(subscription_id, period_start, period_end)`. If found, immediately returns HTTP 409 Conflict.
2. **Database Engine Constraint Layer:**
   `app.models.invoice.Invoice` defines:
   ```python
   __table_args__ = (
       UniqueConstraint(
           "subscription_id",
           "billing_period_start",
           "billing_period_end",
           name="uq_subscription_billing_period"
       ),
   )
   ```
3. **Transaction Rollback Protection:**
   If a concurrent race condition triggers an `IntegrityError` at `db.flush()`, the service catches `IntegrityError`, executes `db.rollback()`, and cleanly raises HTTP 409 Conflict without polluting database state.

---

## 5. Identified Findings & Recommendations

### Finding 1: Product-Specific Discount Scope Implementation
- **Severity:** Medium
- **Location:** `backend/app/services/billing.py` (lines 86-114)
- **Description:** `DiscountRule` models support `target_type = "specific_product"` and `product_id`. However, `billing.py` currently computes discounts against the entire subscription `subtotal`.
- **Impact:** If a sales admin intends a discount to apply only to an add-on or specific product, it applies to the whole invoice subtotal.
- **Recommendation for Laptop 1:** In `billing.py`, if `discount_rule.target_type == "specific_product"`, filter matching `subscription.lines` by `line.product_id == discount_rule.product_id` to compute the discountable base.

### Finding 2: Sequential Number Generation Under High Concurrency
- **Severity:** Low / Advisory
- **Location:** `app/services/billing.py` (`db.query(Invoice).count() + 1`), `app/services/payment.py` (`db.query(Payment).count() + 1`)
- **Description:** Using `count() + 1` for human-readable identifiers (`INV-YYYY-XXXXX`, `PAY-YYYY-XXXXX`) can encounter race conditions or duplicate numbers if records are deleted.
- **Impact:** Covered by the unique constraint on `invoice_number` and `payment_number`, but can trigger an unexpected rollback if two records are generated simultaneously.
- **Recommendation:** Use PostgreSQL sequences or UUID-suffixed references for production scale.

---

## 6. Audit Conclusion
The database tier provides robust relational consistency, deterministic financial precision, and bulletproof billing cycle idempotency. It is certified sound for hackathon release demonstration.
