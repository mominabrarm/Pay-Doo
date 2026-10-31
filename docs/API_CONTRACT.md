# Brightloop Subscription Management System — API Contract
**Version:** 1.0.0  
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

### Money Format
Monetary values are serialized as `Decimal` strings or two-decimal numbers (e.g. `1200.00`). Backend performs all calculations using Python `Decimal` and database `NUMERIC(12, 2)`.

### State Enums
- **Subscription Status:** `draft`, `quotation`, `confirmed`, `active`, `closed`, `paused`
- **Invoice Status:** `draft`, `confirmed`, `paid`, `cancelled`
- **Payment Method:** `bank_transfer`, `credit_card`, `upi`, `cash`
- **Billing Interval:** `daily`, `weekly`, `monthly`, `yearly`
- **Discount Type:** `percentage`, `fixed`

---

## 2. Endpoints

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
  - **Response `201 Created`:**
    ```json
    {
      "id": 1,
      "name": "Acme Corp",
      "email": "billing@acme.com",
      "phone": "+91-9876543210",
      "address": "123 Tech Park",
      "city": "Bengaluru",
      "country": "India",
      "is_active": true,
      "created_at": "2026-10-31T10:00:00Z",
      "updated_at": "2026-10-31T10:00:00Z"
    }
    ```
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
  - **Response `201 Created`:** Subscription object including populated lines and status `"active"`.

- **`GET /api/subscriptions`**
  - **Query Params:** `customer_id` (optional), `status` (optional), `skip`, `limit`
  - **Response `200 OK`:** List of subscriptions with line items.

- **`GET /api/subscriptions/{id}`**
  - **Response `200 OK`:** Subscription details with customer, plan, and lines.

- **`PATCH /api/subscriptions/{id}/status`**
  - **Request Body:** `{"status": "paused"}` (or `"active"`, `"closed"`)
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
  - **Response `201 Created`:**
    ```json
    {
      "id": 1,
      "invoice_number": "INV-2026-00001",
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
          "tax_rate": "18.00",
          "tax_amount": "1425.60",
          "subtotal": "8800.00",
          "total_amount": "9345.60"
        }
      ]
    }
    ```
  - **Critical Invariant (`409 Conflict`):**
    If an invoice for this subscription and billing period already exists:
    ```json
    {
      "detail": "Invoice already generated for subscription 1 and period 2026-11-01 to 2026-11-30."
    }
    ```

- **`GET /api/invoices`**
  - **Query Params:** `customer_id` (optional), `status` (optional), `is_overdue` (optional bool)
  - **Response `200 OK`:** List of invoices with computed balances.

- **`GET /api/invoices/{id}`**
  - **Response `200 OK`:** Full invoice details with payment history.

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
  - **Response `201 Created`:**
    ```json
    {
      "payment_id": 1,
      "payment_number": "PAY-2026-00001",
      "invoice_id": 1,
      "amount": "9345.60",
      "payment_method": "bank_transfer",
      "payment_date": "2026-11-02",
      "status": "success",
      "invoice_status": "paid",
      "invoice_amount_paid": "9345.60",
      "invoice_outstanding_balance": "0.00"
    }
    ```
  - **Errors:**
    - `400 Bad Request`: Payment amount exceeds outstanding balance or is non-positive.
    - `404 Not Found`: Invoice not found.

---

### 2.9 Finance Lead KPI Dashboard
- **`GET /api/dashboard/summary`**
  - **Response `200 OK`:**
    ```json
    {
      "active_subscriptions_count": 142,
      "total_revenue_collected": "542300.00",
      "total_outstanding_receivables": "84500.00",
      "overdue_invoices_count": 7,
      "overdue_invoices_amount": "21400.00",
      "subscriptions_by_interval": {
        "monthly": 110,
        "yearly": 32
      },
      "recent_activity": [
        {
          "type": "payment",
          "reference": "PAY-2026-00001",
          "customer_name": "Acme Corp",
          "amount": "9345.60",
          "date": "2026-11-02"
        }
      ]
    }
    ```

