# Pay-Doo — Comprehensive Senior Backend Architecture & Security Audit

**Project:** Pay-Doo — Brightloop Subscription Management System  
**Event:** Brightloop Software Odoo Hackathon 2026  
**Auditor:** Senior Backend Systems Engineer  
**Audit Date:** October 31, 2026  
**Repository Branch:** `main` (Commit `66a5c71`)  
**Working Directory:** `D:\HACKATHONS\ODOO HACKATHON\Pay-Doo`  

---

## Executive Summary

A comprehensive architectural, functional, security, and test audit was conducted on the Pay-Doo backend.

The backend is built with **FastAPI**, **SQLAlchemy 2.0 ORM**, **Pydantic v2**, and **PostgreSQL 16** (backed by Docker Compose), running Python 3.12. Core billing reconciliation, Decimal precision, concurrency control, and database-level idempotency are implemented to a high standard. The automated test suite executes **18 tests with 100% pass rate** in under 4 seconds using an isolated in-memory SQLite fixture.

However, the audit revealed a **critical architectural gap**: while authentication primitives (JWT decoding, bcrypt password hashing, role enforcement functions) were fully built and tested in `app/services/auth.py`, they have **not yet been connected as FastAPI dependencies** (`Depends(get_current_user)`) across operational routes (`/api/customers`, `/api/subscriptions`, `/api/invoices`, `/api/payments`, `/api/dashboard`). Consequently, operational endpoints and business KPI telemetry currently execute without authentication, leaving customer data isolation unenforced outside of targeted test endpoints.

---

## 1. Safe Repository & Environment Inspection

### 1.1 Git Status & Commit History
* **Current Branch:** `main` (Clean working tree, synced with `origin/main`).
* **Recent Commits:**
  * `66a5c71` — `refactor: validate payment rails and add database healthcheck`
  * `519a605` — `feat: add user authentication, invoice pdf export, and login pages`
  * `06f2943` — `fix: auto-migrate invoice line discount column and add preview port to cors`
  * `52ab81d` — `fix(billing): harmonize tax reconciliation and billing validations with audit tests`
  * `7ebd04e` — `fix(billing): add discount row locks, line-level reconciliation, plan period validation, and batch billing engine`
* **Uncommitted Changes:** None. The repository is clean and unpolluted.

### 1.2 Documented Execution Commands
* **Start PostgreSQL Database:**
  ```bash
  docker compose up -d
  ```
* **Run Backend API Server:**
  ```bash
  cd backend
  .\.venv\Scripts\python.exe run.py
  # Runs Uvicorn on http://0.0.0.0:8000 with auto-reload
  ```
* **Run Automated Test Suite:**
  ```bash
  cd backend
  .\.venv\Scripts\python.exe -m pytest -v
  ```
* **Seed Initial Sample Data:**
  ```bash
  cd backend
  .\.venv\Scripts\python.exe -m app.seed
  ```
* **Bootstrap Initial Administrator:**
  ```bash
  cd backend
  .\.venv\Scripts\python.exe -m app.create_admin --email admin@brightloop.com --password "Admin@Brightloop2026!" --name "Brightloop Admin"
  ```

---

## 2. API Route Inventory

The application exposes **30 total HTTP endpoints** across 9 dedicated APIRouters and 1 root route.

| Method | Endpoint Path | Module / Tag | Auth Required? | Allowed Roles | Request Schema | Response Schema | DB Models Modified / Accessed | Status Codes | Test Covered? |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **GET** | `/` | Root | No | Public | None | `dict` | None | 200 | Yes |
| **GET** | `/api/health` | Health | No | Public | None | `HealthResponse` | None | 200 | Yes |
| **POST** | `/api/auth/register` | Auth | Conditional | Public (customer), Admin (staff/admin) | `UserRegisterRequest` | `UserResponse` | `User`, `Customer` | 201, 400, 401, 403, 404 | Yes |
| **POST** | `/api/auth/login` | Auth | No | Public | `UserLoginRequest` | `TokenResponse` | `User` | 200, 401, 403 | Yes |
| **GET** | `/api/auth/me` | Auth | **Yes** | All active users | None (Bearer Token) | `UserResponse` | `User` | 200, 401, 403 | Yes |
| **POST** | `/api/auth/logout` | Auth | **Yes** | All active users | None (Bearer Token) | `dict` | `User` | 200, 401 | Yes |
| **POST** | `/api/customers` | Customers | **No (GAP)** | Unprotected | `CustomerCreate` | `CustomerResponse` | `Customer` | 201, 400 | Yes |
| **GET** | `/api/customers` | Customers | **No (GAP)** | Unprotected | Query: `skip`, `limit`, `search` | `List[CustomerResponse]` | `Customer` | 200 | Yes |
| **GET** | `/api/customers/{id}` | Customers | **No (GAP)** | Unprotected | Path: `customer_id` | `CustomerResponse` | `Customer` | 200, 404 | No |
| **POST** | `/api/products` | Products | **No (GAP)** | Unprotected | `ProductCreate` | `ProductResponse` | `Product` | 201, 400 | Yes |
| **GET** | `/api/products` | Products | No | Public Catalog | None | `List[ProductResponse]` | `Product`, `ProductVariant` | 200 | Yes |
| **GET** | `/api/products/{id}` | Products | No | Public Catalog | Path: `product_id` | `ProductResponse` | `Product` | 200, 404 | No |
| **POST** | `/api/products/{id}/variants` | Products | **No (GAP)** | Unprotected | `ProductVariantCreate` | `ProductVariantResponse` | `ProductVariant` | 201, 400, 404 | Yes |
| **POST** | `/api/plans` | Plans | **No (GAP)** | Unprotected | `SubscriptionPlanCreate` | `SubscriptionPlanResponse` | `SubscriptionPlan` | 201, 400 | Yes |
| **GET** | `/api/plans` | Plans | No | Public Catalog | None | `List[SubscriptionPlanResponse]` | `SubscriptionPlan` | 200 | Yes |
| **GET** | `/api/plans/{id}` | Plans | No | Public Catalog | Path: `plan_id` | `SubscriptionPlanResponse` | `SubscriptionPlan` | 200, 404 | No |
| **POST** | `/api/discounts` | Discounts | **No (GAP)** | Unprotected | `DiscountRuleCreate` | `DiscountRuleResponse` | `DiscountRule` | 201, 400 | Yes |
| **GET** | `/api/discounts` | Discounts | **No (GAP)** | Unprotected | None | `List[DiscountRuleResponse]` | `DiscountRule` | 200 | No |
| **GET** | `/api/discounts/{id}` | Discounts | **No (GAP)** | Unprotected | Path: `discount_id` | `DiscountRuleResponse` | `DiscountRule` | 200, 404 | No |
| **POST** | `/api/subscriptions` | Subscriptions | **No (GAP)** | Unprotected | `SubscriptionCreate` | `SubscriptionResponse` | `Subscription`, `SubscriptionLine`, `Customer`, `Plan`, `Product` | 201, 400, 404 | Yes |
| **GET** | `/api/subscriptions` | Subscriptions | **No (GAP)** | Unprotected | Query: `customer_id`, `status`, `skip`, `limit` | `List[SubscriptionResponse]` | `Subscription` | 200 | Yes |
| **GET** | `/api/subscriptions/{id}` | Subscriptions | **No (GAP)** | Unprotected | Path: `subscription_id` | `SubscriptionResponse` | `Subscription` | 200, 404 | No |
| **PATCH** | `/api/subscriptions/{id}/status` | Subscriptions | **No (GAP)** | Unprotected | `SubscriptionStatusUpdate` | `SubscriptionResponse` | `Subscription`, `SubscriptionPlan` | 200, 400, 404 | Yes |
| **POST** | `/api/subscriptions/{id}/generate-invoice` | Subscriptions | **No (GAP)** | Unprotected | `InvoiceGenerateRequest` | `InvoiceResponse` | `Invoice`, `InvoiceLine`, `Subscription`, `DiscountRule` | 201, 400, 404, 409 | Yes |
| **GET** | `/api/invoices` | Invoices | **No (GAP)** | Unprotected | Query: `customer_id`, `status`, `is_overdue`, `skip`, `limit` | `List[InvoiceResponse]` | `Invoice` | 200 | Yes |
| **GET** | `/api/invoices/{id}` | Invoices | **No (GAP)** | Unprotected | Path: `invoice_id` | `InvoiceResponse` | `Invoice` | 200, 404 | No |
| **GET** | `/api/invoices/{id}/pdf` | Invoices | **Partial (GAP)** | Leaks to anonymous; rejects mismatched customer | Path: `invoice_id`, Query/Header: `token` | Binary (`application/pdf`) | `Invoice`, `Customer`, `Payment`, `InvoiceLine`, `User` | 200, 403, 404 | Yes |
| **POST** | `/api/invoices/{id}/payments` | Invoices | **No (GAP)** | Unprotected | `PaymentCreate` | `PaymentResponse` | `Payment`, `Invoice` | 201, 400, 404 | Yes |
| **POST** | `/api/invoices/run-billing-cycle` | Invoices | **No (GAP)** | Unprotected | Query: `target_date` | `dict` | `Subscription`, `Invoice`, `InvoiceLine` | 200 | Yes |
| **GET** | `/api/dashboard/summary` | Dashboard | **No (GAP)** | Unprotected | None | `DashboardSummaryResponse` | `Subscription`, `Payment`, `Invoice`, `Customer`, `Plan` | 200 | Yes |

---

## 3. Business Logic & Financial Integrity Audit

### 3.1 Financial Calculation & Currency Precision
* **Evaluation: EXCELLENT.**
* Every price, line amount, discount deduction, tax calculation, and payment settlement strictly operates on Python's `Decimal` class.
* No floating-point (`float`) types are used in models or calculations.
* Deterministic rounding is implemented via:
  ```python
  def round_currency(val: Decimal) -> Decimal:
      return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
  ```
* All database financial columns are declared as `Numeric(12, 2)` (and `Numeric(5, 2)` for tax percentages).
* Line-level tax and discount allocation are verified to reconcile to the exact penny:
  $$\text{Invoice Total} = \sum (\text{Line Subtotal}) - \text{Discount} + \text{Tax}$$

### 3.2 Concurrency & Transactional Integrity
* **Evaluation: STRONG.**
* **Payment Settlement:** `app/services/payment.py` uses `with_for_update()` row-level locks on the `Invoice` record before inspecting outstanding balances. This completely eliminates race conditions where two concurrent payment requests could result in overpaying or conflicting balance records.
* **Discount Limit Checks:** `app/services/billing.py` applies `with_for_update()` on the `DiscountRule` row before evaluating `current_uses < max_uses` and atomically increments the counter.
* **Duplicate Invoice Prevention:** In addition to application-level checks, a composite unique database constraint exists on the `invoices` table:
  ```python
  UniqueConstraint("subscription_id", "billing_period_start", "billing_period_end", name="uq_subscription_billing_period")
  ```
  Attempting to generate a second invoice for the exact same subscription and billing cycle raises `409 Conflict`.

### 3.3 Subscription Lifecycle State Machine
* Transition table implemented in `app/routers/subscriptions.py`:
  * `draft` $\rightarrow$ `quotation`, `confirmed`, `active`, `closed`
  * `quotation` $\rightarrow$ `confirmed`, `closed`
  * `confirmed` $\rightarrow$ `active`, `closed`
  * `active` $\rightarrow$ `paused`, `closed`
  * `paused` $\rightarrow$ `active`, `closed`
  * `closed` $\rightarrow$ Terminal state (no further transitions permitted)
* Policy enforcement: Pausing a subscription is checked against `plan.allow_pause`. If `False`, an immediate `400 Bad Request` is returned.

### 3.4 Payment Rail Validation
* Supported rails explicitly validated in `app/services/payment.py`:
  * `{"bank_transfer", "credit_card", "upi", "cash"}`
* Any unknown rail returns `400 Bad Request`.
* Partial payments are correctly accumulated in `invoice.amount_paid`, reducing `invoice.outstanding_balance`. When `outstanding_balance == 0.00`, the invoice status transitions automatically to `paid`.

### 3.5 PDF Generation Architecture
* `app/services/pdf.py` dynamically compiles PDF documents using ReportLab `SimpleDocTemplate` directly into an in-memory `io.BytesIO` buffer.
* No temporary files are written to disk, preventing filesystem bloat and multi-tenant disk leaks.
* Contains complete invoice header, customer details, line items table, totals summary, and payment history receipt.

---

## 4. Test Suite Execution & Audit

* **Command:** `pytest -v` (executed in `backend/` using `.venv\Scripts\python.exe`)
* **Environment:** Isolated SQLite in-memory database (`sqlite:///:memory:`) configured via `tests/conftest.py`.
* **Execution Duration:** 3.26 seconds.
* **Test Results:**

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.2.0, pluggy-1.7.0
rootdir: D:\HACKATHONS\ODOO HACKATHON\Pay-Doo\backend
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.15.1
collected 18 items

tests/test_audit_expanded.py::test_customer_validation_and_pagination PASSED   [  5%]
tests/test_audit_expanded.py::test_product_variants_and_uniqueness PASSED      [ 11%]
tests/test_audit_expanded.py::test_fixed_discount_rule_and_thresholds PASSED    [ 16%]
tests/test_audit_expanded.py::test_payment_validations_and_reconciliation PASSED [ 22%]
tests/test_audit_expanded.py::test_overdue_invoices_and_kpi_telemetry PASSED     [ 27%]
tests/test_audit_expanded.py::test_subscription_with_product_variant_line PASSED [ 33%]
tests/test_audit_expanded.py::test_discount_max_uses_expiration PASSED          [ 38%]
tests/test_audit_expanded.py::test_subscription_pause_and_resume_cycle PASSED  [ 44%]
tests/test_auth_and_pdf.py::test_password_complexity_validation PASSED         [ 50%]
tests/test_auth_and_pdf.py::test_auth_registration_login_and_me PASSED         [ 55%]
tests/test_auth_and_pdf.py::test_invoice_pdf_generation_and_customer_isolation PASSED [ 61%]
tests/test_workflow.py::test_health_check PASSED                               [ 66%]
tests/test_workflow.py::test_customer_creation_and_duplicate_rejection PASSED   [ 72%]
tests/test_workflow.py::test_products_variants_and_plans PASSED                [ 77%]
tests/test_workflow.py::test_complete_billing_reconciliation_and_payments PASSED [ 83%]
tests/test_workflow.py::test_plan_pause_policy_and_state_transitions PASSED    [ 88%]
tests/test_workflow.py::test_billing_period_and_plan_duration_validation PASSED [ 94%]
tests/test_workflow.py::test_automated_billing_run PASSED                      [100%]

======================== 18 passed, 1 warning in 3.26s ========================
```

* **Reproduction Assessment:** The reported 18 passing tests **are 100% reproducible** and passed with zero failures.

---

## 5. Security Concerns, Critical Bugs & Missing Features

### 5.1 Security Vulnerabilities (P0)

1. **Unprotected Core Business Endpoints:**
   * While `app/services/auth.py` provides `get_current_user`, `require_roles`, and `verify_customer_access`, they are only wired into `/api/auth/me` and `/api/auth/logout`.
   * The routers for `/api/customers`, `/api/subscriptions`, `/api/invoices`, `/api/payments`, and `/api/dashboard` do not declare `current_user = Depends(get_current_user)`.
   * **Impact:** Any unauthenticated caller can query `/api/invoices`, record arbitrary payments via `POST /api/invoices/{id}/payments`, create subscriptions, or inspect the entire company's financial dashboard (`/api/dashboard/summary`).

2. **Invoice PDF Authorization Bypass for Anonymous Callers:**
   * In `app/routers/invoices.py` (`download_invoice_pdf`), the role verification logic reads:
     ```python
     if current_user and current_user.role == "customer":
         if not current_user.customer_id or current_user.customer_id != invoice.customer_id:
             raise HTTPException(status_code=403, detail="Access denied...")
     ```
   * If a requester supplies **no token at all** (`raw_token is None`), `current_user` remains `None`. The check evaluates to `False`, bypassing the customer isolation gate and streaming the full PDF invoice to an anonymous requester.

3. **Customer Multi-Tenant Isolation Not Enforced in Lists:**
   * Even if a customer logs in, `GET /api/invoices` and `GET /api/subscriptions` accept an optional `customer_id` query parameter without verifying if the caller is authorized to view that ID. A logged-in customer can pass `customer_id=2` and inspect another company's active contracts and billing data.

### 5.2 Critical Bugs & Calculation Edge Cases (P1)

1. **Anniversary Date Miscalculation in Batch Automated Billing:**
   * In `app/routers/invoices.py` (`run_automated_billing_cycle`), monthly billing periods are calculated using:
     ```python
     next_month = p_start.replace(day=28) + timedelta(days=4)
     p_end = next_month.replace(day=1) - timedelta(days=1)
     ```
   * If a subscription starts on the 15th of the month (`2026-11-15`), `p_end` is forced to `2026-11-30` (calendar month end) rather than `2026-12-14` (anniversary month cycle). Subscriptions that bill mid-month receive truncated billing periods.

2. **Missing Pagination on Catalog Collections:**
   * `GET /api/products`, `GET /api/plans`, and `GET /api/discounts` execute `.all()` without `skip` or `limit` parameters. In large product catalogs, this creates a potential Denial of Service (DoS) vulnerability through unbounded database memory allocation.

### 5.3 Missing Backend Features & Frontend Orphans (P1 & P2)

1. **Unintegrated Backend Routes (Frontend Orphans):**
   * `POST /api/discounts` and `GET /api/discounts` are implemented in the backend, but the frontend (`paydoo.ts`) has no methods or navigation to manage or apply discount rules manually.
   * `POST /api/invoices/run-billing-cycle` exists on the backend, but the frontend only allows single-subscription invoice generation from the UI.
2. **Password Reset Workflow:**
   * Omitted by design. No transactional email provider is configured or mocked. Documented as a known limitation.
3. **Explicit Subscription Renewal Endpoint:**
   * There is no dedicated `POST /api/subscriptions/{id}/renew` endpoint. Currently, renewal is handled implicitly by advancing `next_billing_date` upon invoice generation.

---

## 6. Ranked Remediation Plan

### Tier P0: Security Vulnerabilities & Tenant Boundary Enforcement (Immediate)
* [ ] **Enforce Authentication on Operational Routers:**
  * Add `Depends(get_current_user)` as router-level or endpoint dependencies on `customers.py`, `subscriptions.py`, `invoices.py`, `payments.py`, and `dashboard.py`.
* [ ] **Fix PDF Anonymous Access Gate:**
  * Require authentication for `GET /api/invoices/{id}/pdf`. If neither a valid Bearer token nor a query token is provided, return `401 Unauthorized`.
* [ ] **Enforce Multi-Tenant Customer Isolation on Collections:**
  * In `list_invoices` and `list_subscriptions`, if `current_user.role == "customer"`, strictly force `customer_id = current_user.customer_id` regardless of client query parameters. Return `403 Forbidden` if a customer attempts to query another customer's ID.

### Tier P1: Functional Defects & Contract Completeness (High Priority)
* [ ] **Harmonize Monthly Billing Period Calculations:**
  * Support anniversary-based period calculation for monthly plans rather than forcing calendar-month boundaries.
* [ ] **Add Standard Pagination to Products, Plans, and Discounts:**
  * Add `skip: int = Query(0, ge=0)` and `limit: int = Query(50, ge=1, le=200)` to `/api/products`, `/api/plans`, and `/api/discounts`.
* [ ] **Detail Route Test Coverage:**
  * Add unit tests for `GET /api/customers/{id}`, `GET /api/products/{id}`, `GET /api/plans/{id}`, `GET /api/discounts`, and `GET /api/invoices/{id}`.

### Tier P2: Operational Refinements & Frontend Integration (Medium Priority)
* [ ] **Frontend Batch Billing Trigger:**
  * Wire `POST /api/invoices/run-billing-cycle` into a "Run Billing Cycle" button on the Invoices page.
* [ ] **Discount Management UI:**
  * Expose discount rule creation in the frontend catalog settings.

---

**Audit Status:** Complete. Standing by for authorization before implementing application changes.

