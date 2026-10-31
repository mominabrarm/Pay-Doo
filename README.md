# Pay-Doo — Brightloop Subscription Management System

Enterprise-grade subscription, billing, and recurring revenue engine built for **Brightloop Software** (Odoo Hackathon 2026).

---

## 1. Architecture Overview

- **Backend Framework:** FastAPI (Python 3.12)
- **Data Persistence:** SQLAlchemy 2.0 ORM with PostgreSQL / SQLite support
- **Data Validation:** Pydantic v2 schemas at all system boundaries
- **Financial Precision:** Currency stored as `NUMERIC(12, 2)` / Python `Decimal` with deterministic rounding
- **Idempotent Billing:** Database-level unique constraint preventing duplicate invoices per subscription billing cycle

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    CUSTOMERS ||--o{ SUBSCRIPTIONS : places
    CUSTOMERS ||--o{ INVOICES : billed_to
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    PRODUCTS ||--o{ SUBSCRIPTION_LINES : referenced_in
    PRODUCTS ||--o{ INVOICE_LINES : billed_in
    SUBSCRIPTION_PLANS ||--o{ SUBSCRIPTIONS : governs
    DISCOUNT_RULES ||--o{ SUBSCRIPTIONS : applies_to
    SUBSCRIPTIONS ||--o{ SUBSCRIPTION_LINES : contains
    SUBSCRIPTIONS ||--o{ INVOICES : generates
    INVOICES ||--o{ INVOICE_LINES : contains
    INVOICES ||--o{ PAYMENTS : settles

    CUSTOMERS {
        int id PK
        string name
        string email UK
        string phone
        string address
        string city
        string country
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        int id PK
        string name
        string code UK
        string product_type
        numeric sales_price
        numeric cost_price
        text description
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    PRODUCT_VARIANTS {
        int id PK
        int product_id FK
        string variant_name
        string sku UK
        numeric price_extra
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTION_PLANS {
        int id PK
        string name
        string code UK
        string billing_interval
        numeric price
        int min_quantity
        date start_date
        date end_date
        boolean auto_close
        boolean allow_pause
        boolean allow_renewal
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    DISCOUNT_RULES {
        int id PK
        string name
        string code UK
        string discount_type
        numeric value
        numeric min_purchase_amount
        int min_quantity
        int max_uses
        int current_uses
        date start_date
        date end_date
        string target_type
        int product_id FK
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTIONS {
        int id PK
        string subscription_number UK
        int customer_id FK
        int plan_id FK
        int discount_rule_id FK
        string status
        date start_date
        date expiry_date
        date next_billing_date
        string payment_terms
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTION_LINES {
        int id PK
        int subscription_id FK
        int product_id FK
        int variant_id FK
        int quantity
        numeric unit_price
        numeric tax_rate
        numeric amount
        datetime created_at
        datetime updated_at
    }

    INVOICES {
        int id PK
        string invoice_number UK
        int subscription_id FK
        int customer_id FK
        date billing_period_start
        date billing_period_end
        date issue_date
        date due_date
        string status
        numeric subtotal
        numeric discount_amount
        numeric tax_amount
        numeric total_amount
        numeric amount_paid
        numeric outstanding_balance
        datetime created_at
        datetime updated_at
    }

    INVOICE_LINES {
        int id PK
        int invoice_id FK
        int product_id FK
        int variant_id FK
        string description
        int quantity
        numeric unit_price
        numeric tax_rate
        numeric tax_amount
        numeric subtotal
        numeric total_amount
        datetime created_at
        datetime updated_at
    }

    PAYMENTS {
        int id PK
        string payment_number UK
        int invoice_id FK
        string payment_method
        numeric amount
        date payment_date
        text notes
        string status
        datetime created_at
        datetime updated_at
    }
```

---

## 3. Core Business Workflow

```
Customer Registration
       ↓
Plan & Product Selection (with Variants)
       ↓
Subscription Creation (Draft → Confirmed → Active)
       ↓
Automated Billing Engine (Period-specific Invoice Generation)
       ↓
Payment Recording & Partial/Full Settlement
       ↓
Dynamic Real-Time KPI Telemetry Dashboard
```

---

## 4. Quickstart Guide (Backend)

### Prerequisites
- Python 3.12+
- Docker (optional for PostgreSQL container)

### Step 1: Environment Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 2: Seed Initial Data
```bash
python -m app.seed
```

### Step 3: Run the API Server
```bash
python run.py
```
- API Base URL: `http://localhost:8000/api`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Step 4: Run Test Suite
```bash
pytest -v
```

---

## 5. API Contract Reference
For endpoint specifications, request/response payloads, and error schemas, see [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

