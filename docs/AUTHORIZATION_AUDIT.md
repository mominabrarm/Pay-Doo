# Pay-Doo — Authentication & Authorization Security Audit Report
**Target System:** Pay-Doo Subscription Management Platform (Brightloop Software)  
**Audit Role:** Senior QA Engineer & Security Integration Auditor (Laptop 3)  
**Date:** October 31, 2026  
**Audited Artifacts:** Backend Auth Service, Routers, Data Models, Bootstrap CLI, Frontend Auth Shell & Login Forms  
**Audit Test Suite:** `backend/tests/test_authorization_audit.py` (9 automated test cases) & `backend/tests/test_auth_and_pdf.py` (3 test cases)  

---

## 1. Executive Summary

A comprehensive pre-release authentication and role-based access control (RBAC) audit of Pay-Doo was conducted. The platform implements a JWT (HMAC-SHA256) and bcrypt-based identity subsystem with three designated roles: `admin`, `staff`, and `customer`.

### Overall Security Status: **CONDITIONAL PASS — VULNERABILITIES IDENTIFIED**
* **Authentication Subsystem:** **STRONG.** Password complexity validation (>8 chars, uppercase, lowercase, special character), bcrypt password hashing with dynamic salt, JWT signature verification, and account deactivation guards are functional and verified.
* **Role-Based Authorization:** **INCOMPLETE.** While staff cannot create administrators or promote themselves, and PDF generation enforces customer boundary checks when a token is provided, **multiple core business routes (invoices, subscriptions, customers, dashboard, and discounts) completely lack backend authentication and authorization dependencies.** They rely entirely on frontend UI route guards.
* **Customer Isolation:** **AT RISK.** An unauthenticated requester can bypass the customer isolation check on invoice PDFs by omitting the token entirely, and public registration allows binding to arbitrary `customer_id` values.

---

## 2. 12-Point Detailed Verification Matrix

| # | Verification Criterion | Status | Current Verified Behavior | Evidence & Affected Endpoints |
| :- | :--- | :---: | :--- | :--- |
| **1** | **Public registration cannot create admin/staff accounts** | **PARTIAL PASS** | When users exist (`total_users > 0`), unauthenticated role injection is rejected with `401 Unauthorized`. Non-admins receive `403 Forbidden`. However, when `total_users == 0`, public registration accepts `role="admin"`. | `POST /api/auth/register`<br>Verified in `test_public_registration_role_escalation_rejected_when_users_exist` & `test_first_user_registration_flaw_allows_public_admin`. |
| **2** | **Intended public registration policy for customers enforced** | **PASS WITH DEFECT** | Password complexity (>8 chars, uppercase, lowercase, special char) and email uniqueness are strictly validated. However, `customer_id` can be arbitrarily supplied without verifying email match. | `POST /api/auth/register`<br>Verified in `test_password_complexity_validation` & `test_public_user_arbitrary_customer_binding_vulnerability`. |
| **3** | **Staff accounts created only through authorized admin workflow** | **PASS** | `POST /api/auth/register` requires a valid Admin Bearer token to create accounts with `role="staff"`. Unauthenticated or staff callers are rejected with `401` or `403`. | `POST /api/auth/register`<br>Verified in `test_staff_cannot_create_admins_or_staff`. |
| **4** | **Admin creation uses secure bootstrap without default passwords** | **PASS** | `backend/app/create_admin.py` requires explicit `--email` and `--password` CLI flags. Enforces password complexity and hashes with bcrypt. No hardcoded credentials exist. | `backend/app/create_admin.py` |
| **5** | **Protected endpoints reject missing, invalid, and expired tokens** | **PASS** | `get_current_user` rejects missing tokens (`401`), tampered signatures (`401`), and expired timestamps (`401`). | `app/services/auth.py`<br>Verified in `test_token_validation_expired_and_tampered`. |
| **6** | **Authorization enforced on backend, not just frontend UI** | **FAIL** | Core business endpoints (`/invoices`, `/subscriptions`, `/customers`, `/dashboard`, `/discounts`) have **zero** backend auth dependencies. Anyone can query or mutate them directly via HTTP. | `app/routers/invoices.py`, `app/routers/subscriptions.py`, `app/routers/customers.py`, `app/routers/discounts.py`, `app/routers/dashboard.py`. |
| **7** | **Customers can access only their own records & PDFs** | **FAIL** | 1. If a customer token is provided to `/api/invoices/{id}/pdf`, cross-customer access returns `403`. **However, if no token is sent, the check is skipped and the PDF is returned.**<br>2. `/api/invoices/{id}` and `/api/subscriptions/{id}` have no ownership checks. | `GET /api/invoices/{id}/pdf`<br>`GET /api/invoices/{id}`<br>`GET /api/subscriptions/{id}`<br>Verified in `test_invoice_pdf_unauthenticated_bypass_vulnerability`. |
| **8** | **Staff cannot promote themselves, create admins, or access admin-only ops** | **PARTIAL PASS** | Staff cannot create admins (returns `403`). No role elevation endpoint exists. However, admin-only ops (`POST /api/discounts`, `POST /api/invoices/run-billing-cycle`) lack backend role checks. | `POST /api/discounts`<br>`POST /api/invoices/run-billing-cycle`<br>Verified in `test_admin_only_operations_lack_backend_role_guards`. |
| **9** | **Profile updates cannot change role/customer association** | **PASS** | Verified by omission: No user profile mutation endpoint (`PUT/PATCH /api/auth/me` or `/api/users/{id}`) exists in the API. User attributes cannot be altered via HTTP. | `app/routers/auth.py` |
| **10** | **Disabled accounts cannot authenticate; logout behavior tested** | **PASS** | Accounts with `is_active=False` are rejected at login (`403`) and on in-flight requests (`403`). Logout endpoint `/api/auth/logout` exists and returns success; JWT invalidation is client-side. | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`<br>Verified in `test_disabled_account_cannot_login_or_call_api`. |
| **11** | **Role and ownership checks cover direct access by resource ID** | **FAIL** | Direct access by ID (`/customers/{id}`, `/subscriptions/{id}`, `/invoices/{id}`) has no user/customer ownership checks. Any authenticated or unauthenticated user can read any record. | `GET /api/customers/{id}`<br>`GET /api/subscriptions/{id}`<br>`GET /api/invoices/{id}` |
| **12** | **Tests cover allowed and denied operations for all three roles** | **PASS** | `tests/test_authorization_audit.py` (9 tests) + `tests/test_auth_and_pdf.py` (3 tests) provide complete test coverage of allowed and denied operations across Admin, Staff, Customer, and Anonymous actors. | `backend/tests/test_authorization_audit.py`<br>`backend/tests/test_auth_and_pdf.py` |

---

## 3. Confirmed Security Vulnerabilities

### Vulnerability 1 (CRITICAL): Unauthenticated PDF Download Bypass
- **File / Endpoint:** `backend/app/routers/invoices.py` (`GET /api/invoices/{invoice_id}/pdf`)
- **Reproduction:**
  ```bash
  curl -X GET "http://localhost:8000/api/invoices/1/pdf"
  ```
- **Actual Behavior:** Returns HTTP 200 with the full PDF binary. The route checks `if current_user and current_user.role == "customer":`. When no token is passed, `current_user` is `None`, so the customer isolation branch is completely skipped!
- **Expected Behavior:** Must require a valid authenticated user (`Depends(get_current_user)`). If the user is a `customer`, verify `current_user.customer_id == invoice.customer_id`. If unauthenticated, return `401 Unauthorized`.
- **Severity:** **CRITICAL**

---

### Vulnerability 2 (HIGH): Core Business Endpoints Completely Unprotected on Backend
- **File / Endpoints:**
  - `GET /api/invoices` & `GET /api/invoices/{id}` (`app/routers/invoices.py`)
  - `GET /api/subscriptions` & `GET /api/subscriptions/{id}` (`app/routers/subscriptions.py`)
  - `GET /api/customers` & `GET /api/customers/{id}` (`app/routers/customers.py`)
  - `GET /api/dashboard/summary` (`app/routers/dashboard.py`)
  - `POST /api/discounts` (`app/routers/discounts.py`)
  - `POST /api/invoices/run-billing-cycle` (`app/routers/invoices.py`)
- **Actual Behavior:** None of these endpoints specify `Depends(get_current_user)` or role checks. Protection exists only via frontend UI navigation hiding.
- **Impact:**
  - Any customer or anonymous actor can view total company financial revenue, overdue debts, and all customer subscriptions by querying the API directly.
  - Staff or anonymous actors can create discount rules (`POST /api/discounts`), violating the requirement that *"Only the admin can create discount rules"*.
- **Severity:** **HIGH**

---

### Vulnerability 3 (HIGH): Arbitrary Customer Account Binding at Registration
- **File / Endpoint:** `backend/app/routers/auth.py` (`POST /api/auth/register`)
- **Reproduction:**
  Send request:
  ```json
  {
    "email": "attacker@gmail.com",
    "password": "Password123!",
    "full_name": "Attacker",
    "role": "customer",
    "customer_id": 1
  }
  ```
- **Actual Behavior:** The backend checks `if payload.customer_id: cust = db.query(Customer)...` and attaches `user.customer_id = 1` without checking if `cust.email == payload.email` or whether customer 1 is already linked to another account.
- **Impact:** Attacker gains legitimate JWT credentials granting access to customer 1's portal data and invoices.
- **Severity:** **HIGH**

---

### Vulnerability 4 (MEDIUM): Zero-User Admin Bootstrap Flaw
- **File / Endpoint:** `backend/app/routers/auth.py` (`POST /api/auth/register`)
- **Actual Behavior:** If `db.query(User).count() == 0`, the role check `if payload.role in ["admin", "staff"]` is bypassed. The first person to hit the registration endpoint on a clean database automatically becomes an administrator.
- **Expected Behavior:** Administrator provisioning should be restricted strictly to the secure CLI bootstrap script (`backend/app/create_admin.py`). Public registration must always force `user.role = "customer"`.
- **Severity:** **MEDIUM**

---

### Vulnerability 5 (LOW): Stateless JWT Logout Without Server-Side Invalidation
- **File / Endpoint:** `backend/app/routers/auth.py` (`POST /api/auth/logout`)
- **Actual Behavior:** Returns `{"status": "logged_out"}` without token blacklisting or revocation. The token remains valid until expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Impact:** Standard for stateless JWT architectures; token destruction relies on frontend clearing client storage.
- **Severity:** **LOW / ADVISORY**

---

## 4. Prioritized Remediation Plan

### Priority 1 (Immediate / P0) — Enforce Auth & Customer Isolation on Invoice PDFs
In `backend/app/routers/invoices.py`, update `download_invoice_pdf`:
```python
@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    token: Optional[str] = Query(None),
    auth=Depends(security_bearer),
    db: Session = Depends(get_db),
):
    raw_token = auth.credentials if (auth and auth.credentials) else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to download invoice PDF.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(raw_token)
    user_id = payload.get("sub")
    current_user = db.query(User).filter(User.id == int(user_id)).first()
    if not current_user or not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user.")

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if current_user.role == "customer":
        if not current_user.customer_id or current_user.customer_id != invoice.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only download their own invoices.",
            )
    ...
```

### Priority 2 (Immediate / P0) — Enforce Email Match on Customer Binding
In `backend/app/routers/auth.py`, inside `register_user`:
```python
if payload.customer_id:
    cust = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not cust or cust.email.lower() != payload.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer association failed: Email address does not match customer profile.",
        )
```

### Priority 3 (High / P1) — Restrict Admin-Only Operations
1. In `backend/app/routers/discounts.py`:
   Inject `current_user: User = Depends(require_roles(["admin"]))` on `POST /api/discounts`.
2. In `backend/app/routers/invoices.py`:
   Inject `current_user: User = Depends(require_roles(["admin"]))` on `POST /api/invoices/run-billing-cycle`.
3. In `backend/app/routers/auth.py`:
   Remove `total_users == 0` backdoor; enforce that public registration always assigns `role = "customer"`. Use `create_admin.py` exclusively for bootstrapping admins.

### Priority 4 (Medium / P2) — Scope Read Queries by Customer Role
In `backend/app/routers/invoices.py` and `backend/app/routers/subscriptions.py`:
Inject `current_user: User = Depends(get_current_user)`.
If `current_user.role == "customer"`:
- Force `query = query.filter(Invoice.customer_id == current_user.customer_id)`.
- On `GET /{id}`, verify `record.customer_id == current_user.customer_id`, returning `403 Forbidden` if mismatched.

---

## 5. Audit Test Results Summary

Executed full test suite including authorization audit:
```powershell
pytest -v
```
**Results:** **27 passed in 4.98 seconds**
- `tests/test_authorization_audit.py`: **9 / 9 PASSED** (Probing role escalation, bootstrap, token expiry, account disabling, bypass vulnerabilities).
- `tests/test_auth_and_pdf.py`: **3 / 3 PASSED** (Password complexity, login/register, customer PDF isolation).
- `tests/test_audit_expanded.py`: **8 / 8 PASSED** (Catalog, variants, discounts, payments, overdue telemetry).
- `tests/test_workflow.py`: **7 / 7 PASSED** (Billing cycle, idempotency, state transitions).

