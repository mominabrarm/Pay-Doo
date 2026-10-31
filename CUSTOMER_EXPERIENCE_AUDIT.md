# Pay-Doo — Customer Experience Comprehensive Audit & Architecture Report

**Version:** 1.0.0  
**Date:** 2026-10-31  
**Project:** Brightloop Software Pay-Doo Subscription Management System (Odoo Hackathon)  
**Target Focus:** Customer Experience Exclusively (Discovery, Catalog, Pricing, Checkout/Purchase, Subscription Lifecycle, Invoices, Payment History, Account Settings)

---

## 1. Executive Summary & Inventory

An end-to-end audit of the customer-facing interface revealed that while backend database models for products, variants, plans, subscriptions, and invoices exist and reconcile accurately, the customer frontend was largely restricted to a read-only invoice viewer without a software purchasing journey or self-service subscription catalog.

### Customer Inventory Matrix

| Page / Component | Visible Action / Feature | Expected Behavior | Actual Pre-Audit Behavior | Status | Severity | Proposed Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Navigation (`AppShell.tsx`)** | Sidebar links | Clear customer navigation: Overview, Explore, Pricing, Subscriptions, Invoices, Billing History, Settings | Showed only 3 items (`My Portal`, `My Subscriptions`, `My Invoices`). Rest of app was hidden or redirected. | Broken / Incomplete | P1 | Expand customer navigation with 7 dedicated, functional customer sections. |
| **Software Catalog (`/explore`)** | Browse Software | Customers discover active software products, read descriptions, see features, and inspect variants. | Non-existent; `/products` was restricted to admins via `RoleGuard`. | Missing | P1 | Build dedicated `ExploreSoftwarePage.tsx` pulling live catalog from `GET /api/products`. |
| **Pricing & Plans (`/pricing`)** | Compare Plans & Cadence | View all subscription plans, compare billing cadences (daily, weekly, monthly, yearly), and understand validity. | Non-existent; `/plans` was restricted to admins via `RoleGuard`. | Missing | P1 | Build dedicated `PricingPlansPage.tsx` comparing plans from `GET /api/plans`. |
| **Purchase Flow (`/subscribe`)** | Subscribe / Purchase Plan | Select product, plan, variant, review authoritative price breakdown with tax, and confirm subscription. | `POST /api/subscriptions` threw `403 Forbidden: Customers cannot create subscriptions directly`. | Broken | P0 | Implement safe `POST /api/subscriptions/subscribe` endpoint enforcing customer ownership and server-side pricing. Add interactive checkout modal. |
| **Subscriptions (`/subscriptions`)** | My Subscriptions List & Tabs | View active, paused, closed subscriptions with renewal dates, plan names, and line items. | Only showed basic static cards without filter tabs, details view, or pause/cancel actions. | Incomplete | P2 | Add status filter tabs (All, Active, Paused, Closed), subscription details modal, and pause/resume lifecycle controls. |
| **Invoices (`/invoices`)** | Invoice Register & Details | View invoices, inspect line-level breakdowns, check payment status, and download authenticated PDF. | Unauthenticated PDF downloads failed token validation in browser. View detail lacked invoice status filters. | Broken | P1 | Add authenticated `?token=` parameter to PDF download URLs, filter tabs (All, Unpaid, Paid), and instant download triggers. |
| **Billing History (`/billing-history`)** | Payments & Receipts | Inspect settled payments, payment methods, transaction references, and associated invoices. | Payments list was partially embedded in dashboard only; no dedicated billing history view existed. | Incomplete | P2 | Build dedicated `BillingHistoryPage.tsx` displaying transaction receipts and payment methods. |
| **Account Settings (`/settings`)** | View & Update Profile | View account info, linked company billing details, update contact name/phone/address, and sign out. | Non-existent; customer could only log out. | Missing | P2 | Add `AccountSettingsPage.tsx` and backend `PUT /api/auth/profile` endpoint. |
| **Customer Dashboard (`/dashboard`)** | Overview & Quick Actions | View active services, balance, next renewal date, and jump to explore/invoices. | Lacked quick-action navigation cards to explore software or view billing. | Incomplete | P2 | Add action cards: "Explore Software", "Compare Plans", "Review Invoices" with real metrics. |

---

## 2. Security & Data Ownership Audit

1. **Price Tampering Prevention:**
   - Pre-fix: `POST /api/subscriptions` accepted user-supplied `unit_price`, which was rightly blocked for customers.
   - Fix: `POST /api/subscriptions/subscribe` looks up `sales_price` and `price_extra` directly from database records. Unit prices, discounts, and taxes are strictly server-side authoritative.
2. **Customer ID Manipulation:**
   - The customer cannot supply or alter `customer_id`. The backend assigns `current_user.customer_id` extracted from the verified JWT.
3. **Multi-Tenant Isolation:**
   - Verified that customer queries for subscriptions, invoices, and payments filter strictly by `customer_id`.
   - Verified that attempting to fetch another customer's invoice PDF or subscription detail returns `403 Forbidden`.
4. **No Fake Payments:**
   - No mock payment gateway is added. When a customer subscribes, an authoritative confirmed invoice is generated. Payment records remain immutable ledger entries recorded via verified payment rails.

---

## 3. Plan Validity & Pricing Precision Rules

- **Currency:** Indian Rupee (INR / ₹) formatted via `formatCurrency` with 2 decimal places.
- **Tax Rate:** Standard 18.00% GST calculated with `Decimal` and `ROUND_HALF_UP`.
- **Interval Durations:**
  - `daily`: 1 day cadence.
  - `weekly`: 7 days cadence.
  - `monthly`: Calendar month with month-end anniversary preservation.
  - `yearly`: Calendar year with leap-year handling (Feb 29 $\rightarrow$ Feb 28 in non-leap years).
- **Auto-Renewal & Expiry:**
  - Plans with `allow_renewal: true` display ongoing renewal cadences with determinable `next_billing_date`.
  - Subscriptions without fixed expiry dates clearly state "Ongoing recurring billing until paused or cancelled".

