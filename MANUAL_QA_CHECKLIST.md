# Pay-Doo: Comprehensive Manual QA & Verification Checklist

This document is the official, operational manual testing guide for **Pay-Doo** (Subscription Management, Invoicing, Financial Intelligence, and Notifications Platform).

---

## 1. System Startup & Verification Instructions

### 1.1 Prerequisites
- **Operating System:** Windows 10/11
- **Node.js:** v18+ or v20+
- **Python:** 3.11 or 3.12 with `.venv` installed in `backend`
- **Docker Desktop:** Running (for PostgreSQL)

---

### 1.2 Step-by-Step Service Startup

#### Step 1: Start PostgreSQL Database Container
Open PowerShell:
```powershell
Set-Location "D:\HACKATHONS\ODOO HACKATHON\Pay-Doo"
docker-compose up -d postgres
```
Verify container status:
```powershell
docker ps --filter "name=brightloop_postgres"
```
*Expected Output:* Container `brightloop_postgres` is running and healthy on port `5432:5432`.

---

#### Step 2: Seed / Verify Initial Database State
```powershell
Set-Location "D:\HACKATHONS\ODOO HACKATHON\Pay-Doo\backend"
& ".\.venv\Scripts\python.exe" -m app.seed
```
*Expected Output:* Seeds customers (`Nexus Infotech`, `Apex Digital`, `Solaria Retailers`), products (`Brightloop ERP Core`, `BI Addon`), plans (`Business Pro Monthly`, `Enterprise Annual`), discount rules, and initial subscriptions.

---

#### Step 3: Start FastAPI Backend Server
In a dedicated terminal:
```powershell
Set-Location "D:\HACKATHONS\ODOO HACKATHON\Pay-Doo\backend"
& ".\.venv\Scripts\python.exe" run.py
```
*Expected Terminal Output:*
```text
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Health Check Verification:**
Open browser or run:
```powershell
curl http://localhost:8000/api/health
```
*Expected Response:* `{"status":"healthy","timestamp":"..."}`

---

#### Step 4: Start React/Vite Frontend
In a separate terminal:
```powershell
Set-Location "D:\HACKATHONS\ODOO HACKATHON\Pay-Doo\frontend"
npm run dev -- --host
```
*Expected Terminal Output:*
```text
  VITE v8.3.5  ready in ... ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://<LAN-IP>:5173/
```

---

## 2. Test Account Directory & Role Matrix

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@brightloop.com` | `Admin@Brightloop2026!` | Company KPI Dashboard, Product catalog, Plans, Discounts, Subscriptions, Invoicing, Payments, Financial Intelligence (Leakage Scanner, Simulator). |
| **Staff Member** | `staff@brightloop.com` | `StaffPassword123!` | Customer CRM, Subscriptions, Invoices, Payment recording, Financial Intelligence. *(Blocked from modifying Products/Plans)* |
| **Customer A** | `billing@nexusinfotech.com` | `CustomerPass123!` | Customer Portal (`/dashboard`), Software Catalog (`/explore`), Pricing Plans (`/pricing`), Subscriptions, Invoices, Receipts, Settings. *(Row-level isolation: scoped to ID #1)* |
| **Customer B** | `accounts@apexdigital.in` | `CustomerPass123!` | Customer Portal for Customer ID #2. *(Strictly isolated from Customer A)* |

*(If test accounts need bootstrapping or password resets, use the CLI helper below)*:
```powershell
# Create or reset administrator:
Set-Location "D:\HACKATHONS\ODOO HACKATHON\Pay-Doo\backend"
& ".\.venv\Scripts\python.exe" -m app.create_admin --email admin@brightloop.com --password "Admin@Brightloop2026!" --name "Brightloop Admin"

# Create a customer account linked to Customer #1:
curl -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{\"email\":\"billing@nexusinfotech.com\",\"password\":\"CustomerPass123!\",\"full_name\":\"Nexus Billing\",\"customer_id\":1,\"role\":\"customer\"}'
```

---

## 3. Core Product Tests

### TEST-01: Authentication, Password Policy & Logout
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify bcrypt salted authentication, password complexity enforcement, and session invalidation.
- **Steps:**
  1. Navigate to `http://localhost:5173/login`.
  2. Click **Create an account** (`/signup` or switch mode).
  3. Attempt registration with weak password `weak123`.
  4. Notice the client-side/server-side validation rejection.
  5. Enter a compliant password: `SecurePass2026!` (min 8 chars, 1 uppercase, 1 lowercase, 1 special character).
  6. Register with `newuser@testcorp.com`.
  7. Confirm automatic login and redirection to `/dashboard`.
  8. Click the user avatar in the top navbar and click **Logout**.
  9. Attempt navigating back to `/dashboard`.
- **Expected Outcome:** User is redirected to `/login`. Token is cleared from localStorage.
- **Failure Indicator:** Weak passwords accepted, or clicking back restores authenticated portal session without token.
- **Observations / Notes:** __________________________________________________

---

### TEST-02: Customer Data Isolation & Boundary Enforcement
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Prove that Customer A cannot view or manipulate Customer B's financial records.
- **Steps:**
  1. Log in as Customer A (`billing@nexusinfotech.com`).
  2. Navigate to **My Invoices** (`/invoices`). Note the list of invoice numbers belonging exclusively to Nexus Infotech.
  3. Note an invoice ID (e.g. `Invoice #1`).
  4. Log out and log in as Customer B (`accounts@apexdigital.in`).
  5. Go to **My Invoices** (`/invoices`).
  6. Confirm that Invoice #1 is **NOT** present in Customer B's list.
  7. In the browser URL bar or devtools console, attempt to fetch Customer A's invoice:
     `fetch('http://localhost:8000/api/invoices/1', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('paydoo_token') } })`
- **Expected Outcome:** Returns `404 Not Found` or `403 Forbidden` (`"Access denied: Customers may only view their own invoices"`).
- **Failure Indicator:** Customer B sees Customer A's invoices, totals, or company name.
- **Observations / Notes:** __________________________________________________

---

### TEST-03: Product & Plan Discovery (Customer Self-Service)
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify customer can browse the active software catalog and compare pricing.
- **Steps:**
  1. Log in as a customer account.
  2. Click **Explore Software** (`/explore`) from the sidebar.
  3. Confirm products are listed (e.g., *Brightloop ERP Core*, *Advanced BI & Analytics Addon*) with prices and descriptions.
  4. Click **Pricing Plans** (`/pricing`).
  5. Toggle between monthly and yearly billing intervals if available.
  6. Verify seat pricing calculations and minimum quantity constraints.
- **Expected Outcome:** Real products from PostgreSQL database render with correct pricing.
- **Failure Indicator:** Mock static strings appear, prices display NaN, or prices fail to reflect database values.
- **Observations / Notes:** __________________________________________________

---

### TEST-04: Subscription Checkout & Lifecycle
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify self-service subscription purchase, initial invoice creation, and lifecycle status tracking.
- **Steps:**
  1. As a customer on `/pricing`, select **Business Pro Monthly** and click **Subscribe / Purchase**.
  2. Enter seat count `2` and confirm purchase.
  3. Redirects to **My Subscriptions** (`/subscriptions`).
  4. Confirm the new subscription appears with status `active` or `confirmed`.
  5. Navigate to **My Invoices** (`/invoices`).
  6. Confirm an initial cycle invoice has been generated automatically with a 15-day due date.
- **Expected Outcome:** Subscription record created in PostgreSQL; initial invoice line items calculated at `quantity * unit_price + tax`.
- **Failure Indicator:** Subscription created without an invoice, or invoice total does not match seat count.
- **Observations / Notes:** __________________________________________________

---

### TEST-05: Payment Recording & Balance Reconciliation
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify recording payments immediately decrements invoice outstanding balance.
- **Steps:**
  1. Log in as an administrator or staff (`admin@brightloop.com`).
  2. Navigate to **Invoices** (`/invoices`). Select an unpaid invoice.
  3. Note the `total_amount` (e.g. `₹2,430.80`) and `outstanding_balance` (`₹2,430.80`).
  4. Click **Record Payment** (or go to `/payments`).
  5. Record a partial payment of `₹1,000.00` via `bank_transfer` with reference `NEFT-TEST-001`.
  6. Return to `/invoices` and inspect the invoice detail.
  7. Verify:
     - `amount_paid`: `₹1,000.00`
     - `outstanding_balance`: `₹1,430.80`
     - `status`: `confirmed`
  8. Record a second payment of `₹1,430.80`.
  9. Inspect invoice again.
  10. Verify:
      - `outstanding_balance`: `₹0.00`
      - `status`: `paid`
- **Expected Outcome:** Decimal calculations reconcile cleanly without floating-point rounding errors.
- **Failure Indicator:** Status remains unpaid when balance reaches 0, or balance shows floating point noise like `.7999999`.
- **Observations / Notes:** __________________________________________________

---

### TEST-06: GST-Compliant ReportLab PDF Download
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify binary PDF generation, layout structure, and access control.
- **Steps:**
  1. In **Invoices**, click **⬇ Download PDF** on any confirmed invoice.
  2. Open the downloaded `Invoice-INV-....pdf` in your PDF viewer.
  3. Check the PDF elements:
     - Header: *BRIGHTLOOP SOFTWARE / Pay-Doo* branding.
     - Invoice Metadata: Invoice number, issue date, due date, status.
     - Customer details: Company name, billing address, email.
     - Table: Item description, quantity, unit price, tax rate, amount.
     - Summary Box: Subtotal, discount, GST tax amount, total amount, paid amount, and outstanding balance.
     - Payment receipt history table if payments exist.
- **Expected Outcome:** Valid PDF file opens without corruption, with all mathematical values matching the web portal.
- **Failure Indicator:** Blank PDF, missing headers, or 500 Internal Server Error.
- **Observations / Notes:** __________________________________________________

---

## 4. Financial Intelligence Tests

### 4.1 Revenue Leakage Detection Engine (PROTECT)

Navigate to **Financial Intelligence** -> **Revenue Leakage Alerts** (`/intelligence`).

#### TEST-07: Rule 1 — Cancelled Subscription Billed Again (`CANCELLED_SUB_BILLED`)
- [ ] **Pass** | [ ] **Fail**
- **Trigger Scenario:**
  1. Log in as admin. Open Subscriptions (`/subscriptions`).
  2. Cancel an active subscription (status -> `cancelled`).
  3. In the database or via API, an active uncancelled invoice exists tied to that subscription.
  4. Navigate to `/intelligence` and click **Run Leakage Audit Scan**.
- **Expected Outcome:** Alert appears titled *"Cancelled Subscription Billed: SUB-..."* with severity `critical`, amount at risk equal to the invoice total, and evidence detailing the cancellation terms.
- **Failure Indicator:** Scan completes without flagging the cancelled subscription's invoice.

---

#### TEST-08: Rule 2 — Expired Subscription Invoiced (`EXPIRED_SUB_BILLED`)
- [ ] **Pass** | [ ] **Fail**
- **Trigger Scenario:**
  1. Have a subscription whose `expiry_date` is in the past (e.g., `2026-01-01`).
  2. An invoice exists with billing period starting after that date (e.g., `2026-02-01`).
  3. Click **Run Leakage Audit Scan**.
- **Expected Outcome:** Alert flagged with rule code `EXPIRED_SUB_BILLED`, severity `high`, recommending contract renewal or invoice credit.

---

#### TEST-09: Rule 3 — Duplicate Invoice for Identical Period (`DUPLICATE_INVOICE_PERIOD`)
- [ ] **Pass** | [ ] **Fail**
- **Trigger Scenario:**
  1. Two non-cancelled invoices exist in the database with the exact same `subscription_id`, `billing_period_start`, and `billing_period_end`.
  2. Click **Run Leakage Audit Scan**.
- **Expected Outcome:** Alert flagged with rule code `DUPLICATE_INVOICE_PERIOD`, severity `critical`, citing both invoice numbers in the evidence and recommending voiding the duplicate.

---

#### TEST-10: Rule 4 — Unreconciled Payment Ledger (`PAYMENT_UNRECONCILED`)
- [ ] **Pass** | [ ] **Fail**
- **Trigger Scenario:**
  1. An invoice has recorded payments totaling `₹1,000.00`, but `invoice.amount_paid` is stored as `₹0.00` or `invoice.outstanding_balance` was not decremented.
  2. Click **Run Leakage Audit Scan**.
- **Expected Outcome:** Alert flagged with rule code `PAYMENT_UNRECONCILED`, severity `high`, displaying variance and recommending ledger reconciliation.

---

#### TEST-11: Rule 5 — Invalid/Expired Discount Window (`DISCOUNT_INVALID_PERIOD`)
- [ ] **Pass** | [ ] **Fail**
- **Trigger Scenario:**
  1. A subscription has a discount rule whose `end_date` has passed or is deactivated (`is_active=False`).
  2. An invoice was generated with `discount_amount > 0`.
  3. Click **Run Leakage Audit Scan**.
- **Expected Outcome:** Alert flagged with rule code `DISCOUNT_INVALID_PERIOD`, severity `medium`, identifying the discount rule name and amount leaked.

---

#### TEST-12: Rule 6 — Mathematical Line Item Inconsistency (`INVOICE_AMOUNT_INCONSISTENCY`)
- [ ] **Pass** | [ ] **Fail**
- **Trigger Scenario:**
  1. An invoice header total does not match `sum(line items subtotal) - discount + tax` (variance > `₹0.05`).
  2. Click **Run Leakage Audit Scan**.
- **Expected Outcome:** Alert flagged with severity `high`, indicating mathematical line item inconsistency.

---

#### TEST-13: Alert Idempotency & Lifecycle Workflow
- [ ] **Pass** | [ ] **Fail**
- **Steps:**
  1. Click **Run Leakage Audit Scan** repeatedly 3 times.
  2. Check alert count and database records in `revenue_leakage_alerts`.
  3. Select an open alert, change status to **Acknowledged**, and save notes: *"Investigating with sales rep"*.
  4. Change status to **Resolved**, save notes: *"Duplicate invoice voided"*.
  5. Run the scan again.
- **Expected Outcome:** Scan does not recreate duplicate alerts for the same underlying anomaly. Resolved alert remains tracked.
- **Failure Indicator:** Every scan creates duplicate rows in the alerts table.
- **Observations / Notes:** __________________________________________________

---

### 4.2 Subscription Impact Simulator (PREDICT)

Navigate to **Financial Intelligence** -> **Scenario Simulator** (`/intelligence`).

#### TEST-14: Price Increase & Elasticity Sensitivity
- [ ] **Pass** | [ ] **Fail**
- **Steps:**
  1. Select plan **Business Pro Monthly** (Baseline price: `₹2,060.00`).
  2. Enter **Simulated Price**: `₹2,472.00` (+20% increase).
  3. Enter **Expected Churn Rate**: `5.0%`.
  4. Enter **Seat Expansion Rate**: `10.0%`.
  5. Click **Calculate Scenario**.
  6. Inspect Projected Metrics:
     - Projected MRR & ARR.
     - MRR Delta (`₹` and `%`).
     - Net ARR Gain / Loss.
     - Customer Lifetime Value (LTV) projection.
- **Expected Outcome:** Metrics are calculated instantly in memory using Decimal arithmetic.
- **Database Safety Verification:**
  - Open `/plans` in another tab.
  - Verify that the actual stored price of *Business Pro Monthly* is still `₹2,060.00` (unchanged).
- **Failure Indicator:** Simulated price overwrites real database records, or LTV shows `Infinity` or `NaN`.
- **Observations / Notes:** __________________________________________________

---

### 4.3 Explain My Bill (EXPLAIN)

#### TEST-15: Plain-English Bill Breakdown & Comparison
- [ ] **Pass** | [ ] **Fail**
- **Steps:**
  1. Log in as Customer (`billing@nexusinfotech.com`).
  2. Go to **My Invoices** (`/invoices`).
  3. Click **💡 Explain** on an invoice.
  4. The **Explain My Bill** modal opens:
     - Verify **Friendly Summary** (e.g. *"Invoice INV-... is ₹7,292.40. Base service subtotal: ₹6,180.00, Taxes: +₹1,112.40, Payments: ₹0.00, Outstanding: ₹7,292.40"*).
     - Verify **Itemized Charge Breakdown** showing line descriptions, tax rates, and discount deductions.
     - Verify **Period Comparison** against previous invoice (percentage change and explanation).
  5. Close modal.
- **Expected Outcome:** Plain-English explanation clearly deconstructs math without accounting jargon.
- **Failure Indicator:** Modal displays raw JSON, undefined values, or incorrect subtraction.
- **Observations / Notes:** __________________________________________________

---

## 5. Email & WhatsApp Notifications Tests

### 5.1 Email Notifications (Resend Integration)

#### TEST-16: Missing Credentials Fail-Safe Execution
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify that missing `RESEND_API_KEY` does NOT crash the application, block checkout, or abort payments.
- **Steps:**
  1. Ensure `RESEND_API_KEY` is not set or empty in `backend/.env`.
  2. Log in as a customer and create a subscription or trigger an invoice.
  3. Go to `/invoices` -> Select invoice -> View.
  4. Look at the **Delivery & Notifications** card:
     - Channel: `📧 Email`
     - Status badge: `SKIPPED NO CREDENTIALS` (amber badge).
     - Tooltip/Diagnostic: *"Resend API key not configured (RESEND_API_KEY)..."*
  5. Record a payment on that invoice.
- **Expected Outcome:** Invoicing and payment succeed 100%. The dispatch is recorded safely in database table `notification_logs` with status `skipped_no_credentials`.
- **Failure Indicator:** 500 error on invoice generation or payment recording.
- **Observations / Notes:** __________________________________________________

---

#### TEST-17: Live Resend Email Delivery (When Key Provided)
- [ ] **Pass** | [ ] **Fail**
- **Prerequisites:** Valid `RESEND_API_KEY` added to `backend/.env` (from [resend.com](https://resend.com)).
- **Steps:**
  1. Set `RESEND_API_KEY=re_...` in `backend/.env`.
  2. Set customer email to your verified Resend testing email (e.g., in Account Settings).
  3. Go to **My Invoices**, select an invoice, and click **📧 Resend Email**.
  4. Check your inbox for subject: *"Invoice #INV-... from Pay-Doo - Due ..."*.
  5. Open email and verify:
     - Pay-Doo dark header and status pill.
     - Itemized table and amounts.
     - Attached file: `Invoice-INV-....pdf`.
  6. Open the attached PDF and verify it is a valid ReportLab PDF.
- **Expected Outcome:** Delivery status transitions to `SENT` with provider message ID recorded.
- **Observations / Notes:** __________________________________________________

---

### 5.2 WhatsApp Notifications (Twilio Integration)

#### TEST-18: Phone Normalization & WhatsApp Sandbox Verification
- [ ] **Pass** | [ ] **Fail**
- **Prerequisites:** Twilio Account SID and Auth Token added to `backend/.env`.
- **Steps:**
  1. Join Twilio WhatsApp sandbox: Send `join <sandbox-keyword>` from your WhatsApp phone to `+1 415 523 8886`.
  2. In Pay-Doo **Account Settings** (`/settings`), enter your WhatsApp number (e.g., Indian mobile: `9876543210` or `+91 98765 43210`).
  3. Click **Save Notification Preferences**.
  4. In **My Invoices**, click **💬 Resend WhatsApp**.
  5. Check WhatsApp on your mobile phone:
     - Message received from Twilio sandbox.
     - Contains: Invoice number, amount in INR, due date, outstanding balance.
     - Contains: 1-click secure PDF download link: `http://localhost:8000/api/invoices/{id}/pdf?token=...`.
  6. Tap the download link on your phone (or open in browser).
- **Expected Outcome:** PDF opens immediately without asking for user credentials.
- **Tamper Protection Check:** Change the invoice ID in the URL to another invoice (e.g. from `/1/pdf` to `/2/pdf`) keeping the same token.
- **Expected Tamper Outcome:** Server returns `403 Forbidden` (`"Access denied: Token is not valid for this invoice"`).
- **Failure Indicator:** Phone normalization crashes, or token allows downloading arbitrary customer invoices.
- **Observations / Notes:** __________________________________________________

---

#### TEST-19: Duplicate-Send Protection (Idempotency)
- [ ] **Pass** | [ ] **Fail**
- **Objective:** Verify identical billing cycles do not send duplicate spam to customers.
- **Steps:**
  1. Trigger an automated billing run via `POST /api/invoices/run-billing-cycle`.
  2. Inspect database `notification_logs` table:
     ```powershell
     & ".\.venv\Scripts\python.exe" -c "from app.database import SessionLocal; from app.models.notification import NotificationLog; db=SessionLocal(); print([(n.id, n.idempotency_key, n.status) for n in db.query(NotificationLog).all()])"
     ```
  3. Re-run billing cycle or call trigger function without `force_resend`.
- **Expected Outcome:** System detects existing `idempotency_key` with status `sent` and bypasses duplicate outbound HTTP dispatch.
- **Observations / Notes:** __________________________________________________

---

#### TEST-20: Customer Channel Opt-Out Preferences
- [ ] **Pass** | [ ] **Fail**
- **Steps:**
  1. Go to **Account Settings** (`/settings`) -> **Notification Preferences**.
  2. Uncheck **WhatsApp Billing Alerts (Twilio)**. Click **Save Notification Preferences**.
  3. Go to **My Invoices** and trigger notification dispatch.
- **Expected Outcome:** WhatsApp dispatch record is created with status `SKIPPED PREFERENCE` and message `"Customer has disabled WhatsApp notifications"`. Email notification proceeds normally.
- **Observations / Notes:** __________________________________________________

---

## 6. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Port 5432 in use** | Local PostgreSQL service running on host machine. | Run `Stop-Service postgresql*` in Administrator PowerShell or configure alternative port in `docker-compose.yml` and `DATABASE_URL`. |
| **Port 8000 in use** | Previous background uvicorn/python process did not terminate. | Run `Get-Process python -ErrorAction SilentlyContinue \| Stop-Process -Force` and restart `run.py`. |
| **`401 Unauthorized` on API calls** | JWT token expired (1440 min default) or invalid. | Log out and log back in to refresh token in `localStorage`. |
| **`403 Forbidden` on Dashboard / CRM** | Customer account attempting to view internal staff pages. | Customer accounts are strictly restricted to Customer Portal. Log in as `admin@brightloop.com` for company-wide views. |
| **`skipped_no_credentials` status** | `RESEND_API_KEY` or `TWILIO_ACCOUNT_SID` empty in `backend/.env`. | Expected behavior when live keys are omitted. Add live credentials to test live transmission. |
| **WhatsApp message not received** | Recipient phone has not completed sandbox opt-in. | Send `join <keyword>` from the recipient phone to `+1 415 523 8886` as required by Twilio sandbox. |

---

## 7. Hackathon Final Demo Script (3-Minute Walkthrough)

- [ ] **1. Executive Pitch & Architecture (30s)**
  - Open `http://localhost:5173`.
  - Highlight dual-interface architecture: Customer Purchasing Portal vs. Internal Admin/Staff Workspace.
  - Explain strict row-level isolation and enterprise PostgreSQL backend.

- [ ] **2. Customer Journey: Explore, Subscribe & Explain (60s)**
  - Log in as Customer (`billing@nexusinfotech.com`).
  - Show Software Catalog (`/explore`) and Pricing Plans (`/pricing`).
  - View **My Invoices** (`/invoices`).
  - Open **Explain My Bill** modal: demonstrate how complex taxes and line-item charges are transparently explained in plain English with previous billing period comparison.
  - Click **Download PDF**: show official GST invoice rendered dynamically by ReportLab.

- [ ] **3. Financial Intelligence: Revenue Leakage Detection (45s)**
  - Switch to Admin (`admin@brightloop.com`).
  - Open **Financial Intelligence** (`/intelligence`).
  - Click **Run Leakage Audit Scan**: showcase live detection across the 6 deterministic leakage rules (cancelled subs billed, duplicate billing periods, unreconciled payments, invalid discounts).
  - Show evidence deconstruction and click **Acknowledge / Resolve**.

- [ ] **4. Scenario Simulator & Notifications (45s)**
  - On `/intelligence`, open **Scenario Simulator**:
    - Simulate a +15% price increase and 5% churn.
    - Demonstrate instant MRR/ARR and Customer Lifetime Value (LTV) projections with Decimal precision without modifying real database rows.
  - Show **Delivery & Notifications**: demonstrate dual-channel Email (Resend) and WhatsApp (Twilio) logs with 72-hour cryptographically signed PDF access links.

