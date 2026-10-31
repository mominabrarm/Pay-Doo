# Brightloop Subscription Management System — API Contract
**Version:** 1.1.0  
**Base URL:** `http://localhost:8000/api`  
**Standard Response Content-Type:** `application/json`

---

## 1. Global Conventions

### Error Format
All errors return standard HTTP error payloads:
```json
{
  "detail": "Descriptive error message"
}
```

### Money Format & Precision
Monetary values are serialized as `Decimal` strings or two-decimal numbers (e.g. `1200.00`). Backend performs all calculations using Python `Decimal` and database `NUMERIC(12, 2)`. Line totals and invoice totals reconcile 100% to the exact penny.

### State Enums & Lifecycle
- **Subscription Status:** `draft` $\rightarrow$ `quotation` $\rightarrow$ `confirmed` $\rightarrow$ `active` $\rightarrow$ `closed` / `paused`
- **Invoice Status:** `draft`, `confirmed`, `paid`, `cancelled`
- **Payment Method:** `bank_transfer`, `credit_card`, `upi`, `cash`
- **Billing Interval:** `daily`, `weekly`, `monthly`, `yearly`
- **Discount Type:** `percentage`, `fixed`

---

## 2. Endpoints

### 2.0 Authentication & Authorization
- **Password Policy:** Backend strictly enforces: `> 8 characters, at least 1 uppercase letter, at least 1 lowercase letter, at least 1 special character`.
- **Role Permissions:**
  - `admin`: Full system management, user and staff provisioning, all financial resources.
  - `staff`: Operational operations (subscriptions, invoices, payments, customers).
  - `customer`: Isolated read/action access strictly limited to their own linked `customer_id`.

- **`POST /api/auth/register`**
  - **Request Body:**
    ```json
    {
      "email": "customer@acme.com",
      "password": "SecurePassword@2026",
      "full_name": "Jane Doe",
      "role": "customer",
      "customer_id": 1
    }
    ```
  - **Response `201 Created`:** User profile without password hash.
  - **Errors:** `400 Bad Request` (duplicate email, weak password), `401/403` (unauthorized role creation).

- **`POST /api/auth/login`**
  - **Request Body:**
    ```json
    {
      "email": "customer@acme.com",
      "password": "SecurePassword@2026"
    }
    ```
  - **Response `200 OK`:**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "token_type": "bearer",
      "user": {
        "id": 1,
        "email": "customer@acme.com",
        "full_name": "Jane Doe",
        "role": "customer",
        "is_active": true,
        "customer_id": 1,
        "created_at": "2026-10-31T10:00:00Z"
      }
    }
    ```

- **`GET /api/auth/me`**
  - **Headers:** `Authorization: Bearer <token>`
  - **Response `200 OK`:** Authenticated user profile.

- **`POST /api/auth/logout`**
  - **Response `200 OK`:** Confirmation message.

---

### 2.1 Health Check
- **`GET /api/health`**
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-31T10:00:00Z"
  }
  ```

---

### 2.2 Customers
- **`POST /api/customers`**
  - **Request Body:**
    ```json
    {
      "name": "Acme Corp",
      "email": "billing@acme.com",
      "phone": "+91-9876543210",
      "address": "123 Tech Park",
      "city": "Bengaluru",
      "country": "India"
    }
    ```
  - **Response `201 Created`:** Customer object.
  - **Errors:** `400 Bad Request` (Email already registered, invalid email format).

- **`GET /api/customers`**
  - **Query Params:** `skip` (default 0), `limit` (default 50), `search` (optional string)
  - **Response `200 OK`:** List of customer objects.

- **`GET /api/customers/{id}`**
  - **Response `200 OK`:** Customer object.
  - **Errors:** `404 Not Found`.

---

### 2.3 Products & Variants
- **`POST /api/products`**
  - **Request Body:**
    ```json
    {
      "name": "Brightloop Enterprise Suite",
      "code": "PROD-BRIGHT-01",
      "product_type": "software",
      "sales_price": "1200.00",
      "cost_price": "600.00",
      "description": "Core subscription software package"
    }
    ```
  - **Response `201 Created`:** Product object with `variants: []`.

- **`GET /api/products`**
  - **Response `200 OK`:** List of products with their configured variants.

- **`POST /api/products/{id}/variants`**
  - **Request Body:**
    ```json
    {
      "variant_name": "Brand: Odoo Integration",
      "sku": "PROD-BRIGHT-01-ODOO",
      "price_extra": "560.00"
    }
    ```
  - **Response `201 Created`:** Created variant object.

---

### 2.4 Subscription Plans
- **`POST /api/plans`**
  - **Request Body:**
    ```json
    {
      "name": "Standard Monthly",
      "code": "PLAN-STD-MONTHLY",
      "billing_interval": "monthly",
      "price": "2500.00",
      "min_quantity": 1,
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "auto_close": false,
      "allow_pause": true,
      "allow_renewal": true
    }
    ```
  - **Response `201 Created`:** Plan object.

- **`GET /api/plans`**
  - **Response `200 OK`:** List of active plans.

---

### 2.5 Discount Rules
- **`POST /api/discounts`**
  - **Request Body:**
    ```json
    {
      "name": "Enterprise Bulk Discount",
      "code": "DISC-BULK-10",
      "discount_type": "percentage",
      "value": "10.00",
      "min_purchase_amount": "5000.00",
      "min_quantity": 5,
      "max_uses": 100,
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "target_type": "whole_subscription"
    }
    ```
  - **Response `201 Created`:** Discount rule object.

- **`GET /api/discounts`**
  - **Response `200 OK`:** List of active discount rules.

---

### 2.6 Subscriptions
- **`POST /api/subscriptions`**
  - **Request Body:**
    ```json
    {
      "customer_id": 1,
      "plan_id": 1,
      "discount_rule_id": 1,
      "start_date": "2026-11-01",
      "expiry_date": "2027-10-31",
      "payment_terms": "Net 15",
      "status": "draft",
      "lines": [
        {
          "product_id": 1,
          "variant_id": 1,
          "quantity": 5,
          "unit_price": "1760.00",
          "tax_rate": "18.00"
        }
      ]
    }
    ```
  - **Response `201 Created`:** Subscription object with collision-safe identifier `SUB-2026-XXXXXX`.

- **`GET /api/subscriptions`**
  - **Query Params:** `customer_id`, `status`, `skip`, `limit`
  - **Response `200 OK`:** List of subscriptions with line items.

- **`PATCH /api/subscriptions/{id}/status`**
  - **Request Body:** `{"status": "active"}` (validated against allowed transitions: `draft` $\rightarrow$ `quotation`/`confirmed`/`active` $\rightarrow$ `paused`/`closed`)
  - **Response `200 OK`:** Updated subscription.

---

### 2.7 Invoices & Automated Billing Engine
- **`POST /api/subscriptions/{id}/generate-invoice`**
  - **Request Body:**
    ```json
    {
      "billing_period_start": "2026-11-01",
      "billing_period_end": "2026-11-30",
      "due_date": "2026-11-15"
    }
    ```
  - **Validations Enforced:**
    - Period duration must match plan interval (`daily` = 1 day, `weekly` = 7 days, `monthly` = 28-31 days, `yearly` = 365-366 days).
    - `period_start` cannot precede subscription start date.
    - `period_end` cannot exceed subscription expiry date.
  - **Response `201 Created`:**
    ```json
    {
      "id": 1,
      "invoice_number": "INV-2026-XXXXXX",
      "subscription_id": 1,
      "customer_id": 1,
      "billing_period_start": "2026-11-01",
      "billing_period_end": "2026-11-30",
      "issue_date": "2026-10-31",
      "due_date": "2026-11-15",
      "status": "confirmed",
      "subtotal": "8800.00",
      "discount_amount": "880.00",
      "tax_amount": "1425.60",
      "total_amount": "9345.60",
      "amount_paid": "0.00",
      "outstanding_balance": "9345.60",
      "lines": [
        {
          "id": 1,
          "description": "Brightloop Enterprise Suite (Brand: Odoo Integration)",
          "quantity": 5,
          "unit_price": "1760.00",
          "discount_amount": "880.00",
          "tax_rate": "18.00",
          "tax_amount": "1425.60",
          "subtotal": "8800.00",
          "total_amount": "9345.60"
        }
      ]
    }
    ```
  - **Duplicate Rejection (`409 Conflict`):** Rejects second billing for same subscription and period.

- **`POST /api/invoices/run-billing-cycle`**
  - **Batch Automated Billing Run** for all subscriptions due up to `target_date`.
  - **Response `200 OK`:**
    ```json
    {
      "status": "success",
      "run_date": "2026-10-31",
      "invoices_generated": 14,
      "total_billed": "28450.00",
      "skipped_already_billed": 2
    }
    ```

- **`GET /api/invoices`**
  - **Query Params:** `customer_id`, `status`, `is_overdue`
  - **Response `200 OK`:** List of invoices.

- **`GET /api/invoices/{id}/pdf`**
  - **Headers:** Optional `Authorization: Bearer <token>` (enforces customer data isolation).
  - **Response `200 OK`:** Binary PDF file (`application/pdf`) with `Content-Disposition: inline; filename="invoice_<number>.pdf"`. Includes formal header, customer billing address, itemized charges table, tax calculation, balance summary, and payment history receipt.
  - **Errors:** `404 Not Found` (non-existent invoice), `403 Forbidden` (customer attempting to download another customer's invoice).

---

### 2.8 Payments
- **`POST /api/invoices/{id}/payments`**
  - **Request Body:**
    ```json
    {
      "amount": "9345.60",
      "payment_method": "bank_transfer",
      "payment_date": "2026-11-02",
      "notes": "HDFC Ref #TXN987654"
    }
    ```
  - **Response `201 Created`:** Payment record with updated invoice balance.

---

### 2.9 Finance Lead KPI Dashboard
- **`GET /api/dashboard/summary`**
  - **Response `200 OK`:** Aggregated counts and totals across active subscriptions, revenue, receivables, and overdue invoices.


---

### 2.10 Financial Intelligence (Protect, Predict, Explain)

#### 2.10.1 Revenue Leakage Detection (PROTECT)
- **`GET /api/intelligence/alerts`**
  - **Query Params:** `status` (`open`, `acknowledged`, `resolved`, `false_positive`), `severity` (`critical`, `high`, `medium`, `low`), `customer_id`, `skip`, `limit`.
  - **Permissions:** Admin and Staff can list all alerts. Customer accounts receive strictly their own scoped alerts.
  - **Response `200 OK`:** Array of `LeakageAlertResponse` objects containing title, description, severity, rule code, evidence, amount at risk, and recommended action.

- **`POST /api/intelligence/alerts/scan`**
  - **Permissions:** Admin and Staff only (`403 Forbidden` for customers).
  - **Description:** Triggers deterministic scan across database records checking 6 core leakage rules:
    1. Cancelled subscription billed again (`CANCELLED_SUB_BILLED`)
    2. Expired subscription receiving invoice (`EXPIRED_SUB_BILLED`)
    3. Duplicate invoice for same subscription & period (`DUPLICATE_INVOICE_PERIOD`)
    4. Payment recorded with unreconciled ledger (`PAYMENT_UNRECONCILED`)
    5. Discount applied outside validity window (`DISCOUNT_INVALID_PERIOD`)
    6. Invoice totals mathematically inconsistent with line items (`INVOICE_AMOUNT_INCONSISTENCY`)
  - **Response `200 OK`:** Array of open and newly detected alert items.

- **`PATCH /api/intelligence/alerts/{id}`**
  - **Permissions:** Admin and Staff only.
  - **Request Body:**
    ```json
    {
      "status": "resolved",
      "resolution_notes": "Correction credit issued and reconciled with customer."
    }
    ```
  - **Response `200 OK`:** Updated alert record with updated timestamp and resolution notes.

- **`GET /api/intelligence/alerts/summary`**
  - **Response `200 OK`:**
    ```json
    {
      "total_open_alerts": 2,
      "critical_alerts_count": 1,
      "total_amount_at_risk": "472.00",
      "resolved_alerts_count": 3,
      "alerts_by_severity": {
        "critical": 1,
        "high": 1,
        "medium": 0,
        "low": 0
      }
    }
    ```

#### 2.10.2 Subscription Impact Simulator (PREDICT)
- **`GET /api/intelligence/simulator/plans`**
  - **Permissions:** Admin and Staff.
  - **Response `200 OK`:** Array of plans with baseline prices, active subscriber counts, and current monthly/annualized run-rates.

- **`POST /api/intelligence/simulator/calculate`**
  - **Permissions:** Admin and Staff.
  - **Request Body:**
    ```json
    {
      "plan_id": 1,
      "proposed_price": "1000.00",
      "discount_percentage": "15.00",
      "billing_interval": "monthly",
      "target_customer_count": 25
    }
    ```
  - **Response `200 OK`:**
    ```json
    {
      "plan_id": 1,
      "plan_name": "Pro SaaS",
      "billing_interval": "monthly",
      "current_price": "1000.00",
      "proposed_price": "1000.00",
      "discount_percentage": "15.00",
      "effective_proposed_price": "850.00",
      "affected_subscriptions_count": 25,
      "current_monthly_revenue": "25000.00",
      "proposed_monthly_revenue": "21250.00",
      "monthly_difference": "-3750.00",
      "current_annualized_revenue": "300000.00",
      "proposed_annualized_revenue": "255000.00",
      "annualized_difference": "-45000.00",
      "percentage_change": "-15.00",
      "is_positive_impact": false,
      "disclaimer": "Scenario simulation only. This calculation uses Python Decimal precision against persisted plan intervals and does not modify production subscriptions, plan rates, or billing records."
    }
    ```

#### 2.10.3 Billing Explainability (EXPLAIN)
- **`GET /api/invoices/{id}/explain`** (also accessible at `/api/intelligence/invoices/{id}/explain`)
  - **Permissions:** Authenticated users. Customers can strictly explain only their own invoices (`403 Forbidden` for other customers' invoices).
  - **Response `200 OK`:**
    ```json
    {
      "invoice_id": 12,
      "invoice_number": "INV-2026-0012",
      "customer_id": 4,
      "customer_name": "Acme Corp",
      "subscription_id": 3,
      "subscription_number": "SUB-2026-9A1F2C",
      "plan_name": "Pro SaaS",
      "billing_interval": "monthly",
      "billing_period_start": "2026-02-01",
      "billing_period_end": "2026-02-28",
      "billing_period_days": 28,
      "issue_date": "2026-02-01",
      "due_date": "2026-02-15",
      "status": "confirmed",
      "subtotal": "5000.00",
      "discount_amount": "0.00",
      "tax_amount": "900.00",
      "total_amount": "5900.00",
      "amount_paid": "2000.00",
      "outstanding_balance": "3900.00",
      "lines": [
        {
          "id": 18,
          "description": "Cloud Pro Instance",
          "quantity": 1,
          "unit_price": "5000.00",
          "tax_rate": "18.00",
          "tax_amount": "900.00",
          "discount_amount": "0.00",
          "subtotal": "5000.00",
          "total_amount": "5900.00"
        }
      ],
      "payments": [
        {
          "id": 5,
          "payment_number": "PAY-2026-8B2A",
          "amount": 2000.0,
          "payment_method": "Bank Transfer",
          "payment_date": "2026-02-05"
        }
      ],
      "friendly_summary": "Invoice INV-2026-0012 is ₹5,900.00.\n• Base service subtotal: ₹5,000.00\n• Taxes applied: +₹900.00\n• Total invoice charge: ₹5,900.00\n• Payments credited: ₹2,000.00\n• Remaining balance: ₹3,900.00",
      "has_previous_invoice": true,
      "previous_invoice_id": 8,
      "previous_invoice_number": "INV-2026-0008",
      "previous_invoice_total": "5900.00",
      "comparison_metrics": [
        {
          "metric_name": "Total Invoice Amount",
          "current_value": "5900.00",
          "previous_value": "5900.00",
          "difference": "0.00",
          "percentage_change": "0.00",
          "explanation": "Total bill amount is identical to previous billing cycle."
        }
      ],
      "comparison_summary": "Your invoice total is identical to previous invoice INV-2026-0008 (₹5,900.00)."
    }
    ```

---

### 2.11 Notifications & Messaging API (Resend Email & Twilio WhatsApp)

#### 2.11.1 List Notification Logs
- **`GET /api/notifications`**
  - **Query Params:** `invoice_id`, `customer_id`, `channel` (`email` / `whatsapp`), `status` (`sent`, `delivered`, `failed`, `skipped_no_credentials`, `skipped_preference`), `skip`, `limit`
  - **Permissions:** Customer role is strictly isolated to own notifications; Admin/Staff can query all records.
  - **Response `200 OK`:** Array of `NotificationLogResponse` objects.

#### 2.11.2 Trigger / Resend Invoice Notifications
- **`POST /api/notifications/invoices/{invoice_id}/send`**
  - **Permissions:** Customer (for their own invoices) or Admin/Staff (any invoice).
  - **Request Body:**
    ```json
    {
      "channel": "all",
      "force_resend": true
    }
    ```
    *(channel: `"email"`, `"whatsapp"`, or `"all"`)*
  - **Response `200 OK`:** List of `NotificationLogResponse` objects dispatched or logged.

#### 2.11.3 Notification Channel Preferences
- **`GET /api/notifications/preferences`**
  - **Response `200 OK`:** `{ "customer_id": 2, "notify_email": true, "notify_whatsapp": true, "whatsapp_number": "+919876543210" }`
- **`PUT /api/notifications/preferences`**
  - **Request Body:** `{ "notify_email": true, "notify_whatsapp": true, "whatsapp_number": "+919876543210" }`
  - **Response `200 OK`:** Updated preferences object.

#### 2.11.4 Cryptographically Signed Invoice PDF Download
- **`GET /api/invoices/{id}/pdf?token={download_token}`**
  - **Security:** Verified with HMAC-SHA256 signature containing `purpose: "invoice_download"`, `invoice_id`, `customer_id`, and 72-hour expiration window. Mismatched or expired tokens are rejected with `403 Forbidden`. Enables seamless, secure one-click downloads from WhatsApp & Email notifications without exposing user credentials or long-lived session tokens.
