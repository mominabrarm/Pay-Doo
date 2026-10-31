def test_password_complexity_validation(client):
    # Too short
    r1 = client.post("/api/auth/register", json={"email": "u1@test.com", "password": "Short1!", "full_name": "User 1"})
    assert r1.status_code == 400
    assert "more than 8 characters" in r1.json()["detail"]

    # No uppercase
    r2 = client.post("/api/auth/register", json={"email": "u2@test.com", "password": "lowercase123!", "full_name": "User 2"})
    assert r2.status_code == 400
    assert "uppercase" in r2.json()["detail"]

    # No lowercase
    r3 = client.post("/api/auth/register", json={"email": "u3@test.com", "password": "UPPERCASE123!", "full_name": "User 3"})
    assert r3.status_code == 400
    assert "lowercase" in r3.json()["detail"]

    # No special char
    r4 = client.post("/api/auth/register", json={"email": "u4@test.com", "password": "ValidPassword123", "full_name": "User 4"})
    assert r4.status_code == 400
    assert "special character" in r4.json()["detail"]


def test_auth_registration_login_and_me(client):
    email = "jane.doe@brightloop.com"
    password = "SecurePassword2026!"

    # 1. Register customer user
    reg = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Jane Doe", "role": "customer"},
    )
    assert reg.status_code == 201
    user_data = reg.json()
    assert user_data["email"] == email
    assert user_data["role"] == "customer"
    assert "hashed_password" not in user_data

    # 2. Reject duplicate registration
    dup = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Jane Doe Duplicate"},
    )
    assert dup.status_code == 400
    assert "already exists" in dup.json()["detail"]

    # 3. Invalid credentials
    bad_login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword2026!"},
    )
    assert bad_login.status_code == 401
    assert "Invalid email or password" in bad_login.json()["detail"]

    # 4. Successful login
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    token = token_data["access_token"]
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["email"] == email

    # 5. Access /auth/me with token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == user_data["id"]

    # 6. Unauthenticated access rejected
    unauth = client.get("/api/auth/me")
    assert unauth.status_code == 401


def test_invoice_pdf_generation_and_customer_isolation(client):
    # Setup customers
    c1 = client.post("/api/customers", json={"name": "Cust A", "email": "a@co.com"}).json()
    c2 = client.post("/api/customers", json={"name": "Cust B", "email": "b@co.com"}).json()

    # Users linked to customers
    pwd = "StrongPassword2026!"
    client.post("/api/auth/register", json={"email": "usera@co.com", "password": pwd, "full_name": "User A", "customer_id": c1["id"]})
    token_a = client.post("/api/auth/login", json={"email": "usera@co.com", "password": pwd}).json()["access_token"]

    client.post("/api/auth/register", json={"email": "userb@co.com", "password": pwd, "full_name": "User B", "customer_id": c2["id"]})
    token_b = client.post("/api/auth/login", json={"email": "userb@co.com", "password": pwd}).json()["access_token"]

    # Create product, plan, and subscription for Cust A
    prod = client.post("/api/products", json={"name": "Software", "code": "P-PDF", "sales_price": "800.00", "cost_price": "200.00"}).json()
    plan = client.post("/api/plans", json={"name": "Plan", "code": "PLAN-PDF", "billing_interval": "monthly", "price": "800.00"}).json()

    sub_a = client.post(
        "/api/subscriptions",
        json={
            "customer_id": c1["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "800.00", "tax_rate": "18.00"}],
        },
    ).json()

    inv_a = client.post(
        f"/api/subscriptions/{sub_a['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()
    inv_id = inv_a["id"]

    # Cust A can download their own invoice PDF
    pdf_resp = client.get(f"/api/invoices/{inv_id}/pdf", headers={"Authorization": f"Bearer {token_a}"})
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert b"%PDF-" in pdf_resp.content[:10]
    assert len(pdf_resp.content) > 1000

    # Cust B attempting to download Cust A's invoice MUST be rejected with 403 Forbidden
    forbidden_resp = client.get(f"/api/invoices/{inv_id}/pdf", headers={"Authorization": f"Bearer {token_b}"})
    assert forbidden_resp.status_code == 403
    assert "Customers may only download their own invoices" in forbidden_resp.json()["detail"]

    # Anonymous request verification
    anon_resp = client.get(f"/api/invoices/{inv_id}/pdf")
    assert anon_resp.status_code in [200, 401]
