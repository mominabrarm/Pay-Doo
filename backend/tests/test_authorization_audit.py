from datetime import datetime, timedelta, timezone
import jwt
import pytest
from app.config import settings
from app.models.user import User


def test_public_registration_role_escalation_rejected_when_users_exist(client, db_session):
    # Setup existing admin
    client.post(
        "/api/auth/register",
        json={"email": "existing_admin@test.com", "password": "AdminPassword123!", "full_name": "Admin", "role": "admin"},
    )

    # Attempt 1: Unauthenticated user registers with role="admin"
    r1 = client.post(
        "/api/auth/register",
        json={"email": "hacker1@test.com", "password": "HackerPassword123!", "full_name": "Hacker 1", "role": "admin"},
    )
    assert r1.status_code == 401
    assert "Authentication required to create staff or admin accounts" in r1.json()["detail"]

    # Attempt 2: Unauthenticated user registers with role="staff"
    r2 = client.post(
        "/api/auth/register",
        json={"email": "hacker2@test.com", "password": "HackerPassword123!", "full_name": "Hacker 2", "role": "staff"},
    )
    assert r2.status_code == 401
    assert "Authentication required to create staff or admin accounts" in r2.json()["detail"]


def test_first_user_registration_flaw_allows_public_admin(client, db_session):
    # When total_users == 0, anyone can register as admin
    assert db_session.query(User).count() == 0
    resp = client.post(
        "/api/auth/register",
        json={"email": "first_user@test.com", "password": "FirstUserPassword123!", "full_name": "First User", "role": "admin"},
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "admin"


def test_staff_cannot_create_admins_or_staff(client):
    # Bootstrap admin
    client.post(
        "/api/auth/register",
        json={"email": "admin@test.com", "password": "AdminPassword123!", "full_name": "Admin", "role": "admin"},
    )
    admin_token = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "AdminPassword123!"},
    ).json()["access_token"]

    # Admin creates staff
    staff_reg = client.post(
        "/api/auth/register",
        json={"email": "staff@test.com", "password": "StaffPassword123!", "full_name": "Staff User", "role": "staff"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert staff_reg.status_code == 201
    assert staff_reg.json()["role"] == "staff"

    # Staff logs in
    staff_token = client.post(
        "/api/auth/login",
        json={"email": "staff@test.com", "password": "StaffPassword123!"},
    ).json()["access_token"]

    # Staff attempts to create another staff member -> MUST be 403 Forbidden
    staff_create_staff = client.post(
        "/api/auth/register",
        json={"email": "staff2@test.com", "password": "StaffPassword123!", "full_name": "Staff 2", "role": "staff"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert staff_create_staff.status_code == 403
    assert "Only an administrator can create staff or admin accounts" in staff_create_staff.json()["detail"]

    # Staff attempts to create admin -> MUST be 403 Forbidden
    staff_create_admin = client.post(
        "/api/auth/register",
        json={"email": "admin2@test.com", "password": "AdminPassword123!", "full_name": "Admin 2", "role": "admin"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert staff_create_admin.status_code == 403
    assert "Only an administrator can create staff or admin accounts" in staff_create_admin.json()["detail"]


def test_token_validation_expired_and_tampered(client):
    # Create user
    client.post(
        "/api/auth/register",
        json={"email": "tokentest@test.com", "password": "TokenPassword123!", "full_name": "Token Tester", "role": "customer"},
    )

    # 1. Tampered signature
    fake_token = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "wrong_secret_key_12345678901234567890",
        algorithm="HS256",
    )
    r1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert r1.status_code == 401
    assert "Could not validate credentials" in r1.json()["detail"]

    # 2. Expired token
    expired_token = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=10)},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    r2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert r2.status_code == 401
    assert "Token has expired" in r2.json()["detail"]


def test_disabled_account_cannot_login_or_call_api(client, db_session):
    # Register user
    reg = client.post(
        "/api/auth/register",
        json={"email": "inactive@test.com", "password": "InactivePassword123!", "full_name": "Inactive User", "role": "customer"},
    ).json()
    user_id = reg["id"]

    # Login and obtain token while active
    token = client.post(
        "/api/auth/login",
        json={"email": "inactive@test.com", "password": "InactivePassword123!"},
    ).json()["access_token"]

    # Verify active access
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    # Deactivate account in DB
    user = db_session.query(User).filter(User.id == user_id).first()
    user.is_active = False
    db_session.commit()

    # Attempt login with inactive account -> 403 Forbidden
    login_attempt = client.post(
        "/api/auth/login",
        json={"email": "inactive@test.com", "password": "InactivePassword123!"},
    )
    assert login_attempt.status_code == 403
    assert "Account is inactive" in login_attempt.json()["detail"]

    # Existing token used by now-inactive account -> 403 Forbidden
    token_attempt = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert token_attempt.status_code == 403
    assert "User account is inactive" in token_attempt.json()["detail"]


def test_unauthenticated_access_to_unprotected_core_routes(client):
    # Audit verification: Check whether core business endpoints currently require auth
    # Invoices list:
    r_inv = client.get("/api/invoices")
    # Check status: currently 200 OK because no auth dependency was added to GET /api/invoices
    assert r_inv.status_code == 200

    # Subscriptions list:
    r_sub = client.get("/api/subscriptions")
    assert r_sub.status_code == 200

    # Dashboard summary:
    r_dash = client.get("/api/dashboard/summary")
    assert r_dash.status_code == 200

    # Customer list:
    r_cust = client.get("/api/customers")
    assert r_cust.status_code == 200


def test_public_user_arbitrary_customer_binding_vulnerability(client):
    # Create customer A
    cust_a = client.post("/api/customers", json={"name": "Target Company", "email": "target@corp.com"}).json()
    cust_a_id = cust_a["id"]

    # Attacker registers publicly and supplies customer_id=cust_a_id
    attacker_reg = client.post(
        "/api/auth/register",
        json={
            "email": "attacker@gmail.com",
            "password": "AttackerPassword123!",
            "full_name": "Attacker",
            "role": "customer",
            "customer_id": cust_a_id,
        },
    )
    assert attacker_reg.status_code == 201
    # Confirmed vulnerability: Attacker is now bound to Target Company's customer_id!
    assert attacker_reg.json()["customer_id"] == cust_a_id


def test_invoice_pdf_unauthenticated_bypass_vulnerability(client):
    # Setup customer, product, plan, subscription, and invoice
    c = client.post("/api/customers", json={"name": "Confidential Corp", "email": "secret@corp.com"}).json()
    p = client.post("/api/products", json={"name": "Audit Prod", "code": "P-AUDIT", "sales_price": "500.00", "cost_price": "100.00"}).json()
    plan = client.post("/api/plans", json={"name": "Audit Plan", "code": "PLAN-AUDIT", "billing_interval": "monthly", "price": "500.00"}).json()
    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": c["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": p["id"], "quantity": 1, "unit_price": "500.00", "tax_rate": "18.00"}],
        },
    ).json()
    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()

    # Confirmed vulnerability: Invoking GET /api/invoices/{id}/pdf WITHOUT any Authorization header or token succeeds!
    unauth_pdf = client.get(f"/api/invoices/{inv['id']}/pdf")
    assert unauth_pdf.status_code == 200
    assert unauth_pdf.headers["content-type"] == "application/pdf"
    assert b"%PDF-" in unauth_pdf.content[:10]


def test_admin_only_operations_lack_backend_role_guards(client):
    # Create staff user
    client.post(
        "/api/auth/register",
        json={"email": "first_admin@test.com", "password": "AdminPassword123!", "full_name": "Admin", "role": "admin"},
    )
    admin_token = client.post(
        "/api/auth/login",
        json={"email": "first_admin@test.com", "password": "AdminPassword123!"},
    ).json()["access_token"]

    client.post(
        "/api/auth/register",
        json={"email": "staff_member@test.com", "password": "StaffPassword123!", "full_name": "Staff", "role": "staff"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    staff_token = client.post(
        "/api/auth/login",
        json={"email": "staff_member@test.com", "password": "StaffPassword123!"},
    ).json()["access_token"]

    # 1. Discount rule creation: Problem statement specifies ONLY admin can create discounts.
    # Currently, POST /api/discounts has no auth guard, so staff can invoke it:
    staff_disc_resp = client.post(
        "/api/discounts",
        json={
            "name": "Staff Discount",
            "code": "DISC-STAFF",
            "discount_type": "percentage",
            "value": "50.00",
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert staff_disc_resp.status_code == 201

    # 2. Automated batch billing cycle:
    # Currently, POST /api/invoices/run-billing-cycle has no auth guard:
    staff_billing_resp = client.post(
        "/api/invoices/run-billing-cycle",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert staff_billing_resp.status_code == 200


def test_dashboard_role_segregation(client, db_session):
    # 1. Create two customers in DB
    c1 = client.post("/api/customers", json={"name": "Customer 1 Corp", "email": "c1@corp.com"}).json()
    c2 = client.post("/api/customers", json={"name": "Customer 2 Corp", "email": "c2@corp.com"}).json()

    # 2. Create products and plans
    p = client.post("/api/products", json={"name": "SaaS Platform", "code": "SAAS-1", "sales_price": "100.00", "cost_price": "20.00"}).json()
    plan = client.post("/api/plans", json={"name": "Monthly Plan", "code": "PLAN-M", "billing_interval": "monthly", "price": "100.00"}).json()

    # 3. Create subscription for customer 1
    sub1 = client.post("/api/subscriptions", json={
        "customer_id": c1["id"],
        "plan_id": plan["id"],
        "start_date": "2026-11-01",
        "lines": [{"product_id": p["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "18.00"}],
    }).json()

    # 4. Generate invoice for customer 1
    inv1 = client.post(f"/api/subscriptions/{sub1['id']}/generate-invoice", json={
        "billing_period_start": "2026-11-01",
        "billing_period_end": "2026-11-30",
        "due_date": "2026-11-15",
    }).json()

    # 5. Create users:
    # First user becomes admin
    client.post("/api/auth/register", json={"email": "superadmin@corp.com", "password": "AdminPassword123!", "full_name": "Super Admin", "role": "admin"})
    admin_token = client.post("/api/auth/login", json={"email": "superadmin@corp.com", "password": "AdminPassword123!"}).json()["access_token"]

    # Staff user
    client.post("/api/auth/register", json={"email": "staff1@corp.com", "password": "StaffPassword123!", "full_name": "Staff One", "role": "staff"}, headers={"Authorization": f"Bearer {admin_token}"})
    staff_token = client.post("/api/auth/login", json={"email": "staff1@corp.com", "password": "StaffPassword123!"}).json()["access_token"]

    # Customer 1 user
    client.post("/api/auth/register", json={"email": "cust1@corp.com", "password": "CustPassword123!", "full_name": "Cust One", "role": "customer", "customer_id": c1["id"]})
    cust1_token = client.post("/api/auth/login", json={"email": "cust1@corp.com", "password": "CustPassword123!"}).json()["access_token"]

    # Customer 2 user
    client.post("/api/auth/register", json={"email": "cust2@corp.com", "password": "CustPassword123!", "full_name": "Cust Two", "role": "customer", "customer_id": c2["id"]})
    cust2_token = client.post("/api/auth/login", json={"email": "cust2@corp.com", "password": "CustPassword123!"}).json()["access_token"]

    # CHECK 1: Customer calling company-wide dashboard (/api/dashboard/summary) is REJECTED with 403 Forbidden
    cust_dash = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {cust1_token}"})
    assert cust_dash.status_code == 403
    assert "Customers are not permitted to access company-wide financial metrics" in cust_dash.json()["detail"]

    # CHECK 2: Staff and Admin calling /api/dashboard/summary SUCCEEDS
    admin_dash = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_dash.status_code == 200
    assert "total_revenue_collected" in admin_dash.json()
    assert admin_dash.json()["active_subscriptions_count"] >= 1

    staff_dash = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {staff_token}"})
    assert staff_dash.status_code == 200

    # CHECK 3: Customer accessing their scoped portal dashboard (/api/dashboard/customer-summary)
    c1_summary = client.get("/api/dashboard/customer-summary", headers={"Authorization": f"Bearer {cust1_token}"})
    assert c1_summary.status_code == 200
    c1_data = c1_summary.json()
    assert c1_data["customer_id"] == c1["id"]
    assert c1_data["customer_name"] == "Customer 1 Corp"
    assert c1_data["active_subscriptions_count"] == 1
    assert len(c1_data["recent_invoices"]) == 1
    assert c1_data["recent_invoices"][0]["id"] == inv1["id"]

    # CHECK 4: Customer 2 accessing portal dashboard shows 0 active subscriptions, 0 invoices (isolated from Customer 1)
    c2_summary = client.get("/api/dashboard/customer-summary", headers={"Authorization": f"Bearer {cust2_token}"})
    assert c2_summary.status_code == 200
    c2_data = c2_summary.json()
    assert c2_data["customer_id"] == c2["id"]
    assert c2_data["active_subscriptions_count"] == 0
    assert len(c2_data["recent_invoices"]) == 0

    # CHECK 5: Customer attempting to forge customer_id in query parameter is ignored/constrained to authenticated user
    forged_summary = client.get(f"/api/dashboard/customer-summary?customer_id={c1['id']}", headers={"Authorization": f"Bearer {cust2_token}"})
    assert forged_summary.status_code == 200
    assert forged_summary.json()["customer_id"] == c2["id"]

    # CHECK 6: Customer 1 cannot access Customer 2's or vice-versa invoice
    inv_c2_view = client.get(f"/api/invoices/{inv1['id']}", headers={"Authorization": f"Bearer {cust2_token}"})
    assert inv_c2_view.status_code == 403
    assert "Customers may only view their own invoices" in inv_c2_view.json()["detail"]

    # CHECK 7: Customer 1 CAN access their own invoice
    inv_c1_view = client.get(f"/api/invoices/{inv1['id']}", headers={"Authorization": f"Bearer {cust1_token}"})
    assert inv_c1_view.status_code == 200
    assert inv_c1_view.json()["id"] == inv1["id"]

    # CHECK 8: Customer 1 cannot access Customer 2's subscription or vice versa
    sub_c2_view = client.get(f"/api/subscriptions/{sub1['id']}", headers={"Authorization": f"Bearer {cust2_token}"})
    assert sub_c2_view.status_code == 403
    assert "Customers may only view their own subscriptions" in sub_c2_view.json()["detail"]

    # CHECK 9: Customer 1 CAN access their own subscription
    sub_c1_view = client.get(f"/api/subscriptions/{sub1['id']}", headers={"Authorization": f"Bearer {cust1_token}"})
    assert sub_c1_view.status_code == 200

    # CHECK 10: Customer cannot perform administrative operations (create subscription, generate invoice, run billing)
    sub_create = client.post("/api/subscriptions", json={
        "customer_id": c1["id"],
        "plan_id": plan["id"],
        "start_date": "2026-11-01",
        "lines": [{"product_id": p["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "18.00"}],
    }, headers={"Authorization": f"Bearer {cust1_token}"})
    assert sub_create.status_code == 403

    inv_gen = client.post(f"/api/subscriptions/{sub1['id']}/generate-invoice", json={
        "billing_period_start": "2026-12-01",
        "billing_period_end": "2026-12-31",
        "due_date": "2026-12-15",
    }, headers={"Authorization": f"Bearer {cust1_token}"})
    assert inv_gen.status_code == 403

    bill_cycle = client.post("/api/invoices/run-billing-cycle", headers={"Authorization": f"Bearer {cust1_token}"})
    assert bill_cycle.status_code == 403
