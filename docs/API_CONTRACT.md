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
