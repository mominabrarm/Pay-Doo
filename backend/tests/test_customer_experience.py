from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient


def test_customer_explore_and_subscribe_flow(client: TestClient, db_session):
    # 1. Setup product and plan
    prod_resp = client.post("/api/products", json={
        "name": "Cloud CRM Pro",
        "code": "PROD-CRM-PRO",
        "sales_price": "1500.00",
        "cost_price": "500.00",
        "description": "Enterprise customer relationship software",
    })
    assert prod_resp.status_code == 201
    prod = prod_resp.json()

    # Add a variant
    var_resp = client.post(f"/api/products/{prod['id']}/variants", json={
        "variant_name": "API & Webhook Access",
        "sku": "PROD-CRM-PRO-API",
        "price_extra": "500.00",
    })
    assert var_resp.status_code == 201
    variant = var_resp.json()

    # Create Plan
    plan_resp = client.post("/api/plans", json={
        "name": "Monthly Business",
        "code": "PLAN-CRM-MONTHLY",
        "billing_interval": "monthly",
        "price": "2000.00",
        "allow_renewal": True,
    })
    assert plan_resp.status_code == 201
    plan = plan_resp.json()

    # 2. Register customer user
    pwd = "CustomerSecure2026!"
    reg_resp = client.post("/api/auth/register", json={
        "email": "sarah.connor@cyber.org",
        "password": pwd,
        "full_name": "Sarah Connor",
        "role": "customer",
    })
    assert reg_resp.status_code == 201
    user = reg_resp.json()
    assert user["customer_id"] is not None

    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": "sarah.connor@cyber.org",
        "password": pwd,
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Customer browses catalog
    products = client.get("/api/products", headers=headers).json()
    assert len(products) >= 1
    found_prod = next(p for p in products if p["id"] == prod["id"])
    assert len(found_prod["variants"]) >= 1

    plans = client.get("/api/plans", headers=headers).json()
    assert len(plans) >= 1

    # 4. Customer purchases subscription via dedicated /subscribe endpoint
    sub_resp = client.post("/api/subscriptions/subscribe", json={
        "product_id": prod["id"],
        "plan_id": plan["id"],
        "variant_id": variant["id"],
        "quantity": 2,
        "start_date": "2026-11-01",
    }, headers=headers)
    assert sub_resp.status_code == 201
    sub = sub_resp.json()
    assert sub["customer_id"] == user["customer_id"]
    assert sub["status"] == "active"
    assert len(sub["lines"]) == 1
    # Authoritative calculation: (1500 + 500) * 2 = 4000.00 + 18% tax (720.00) = 4720.00
    assert Decimal(str(sub["lines"][0]["amount"])) == Decimal("4720.00")

    # 5. Customer verifies the invoice was automatically generated
    invoices = client.get("/api/invoices", headers=headers).json()
    assert len(invoices) >= 1
    inv = invoices[0]
    assert inv["subscription_id"] == sub["id"]
    assert inv["customer_id"] == user["customer_id"]
    assert Decimal(str(inv["total_amount"])) == Decimal("4720.00")

    # 6. Customer downloads invoice PDF with their token
    pdf_resp = client.get(f"/api/invoices/{inv['id']}/pdf?token={token}")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert b"%PDF-" in pdf_resp.content[:10]

    # 7. Customer updates profile
    update_resp = client.put("/api/auth/profile", json={
        "full_name": "Sarah Connor-Reese",
        "phone": "+1-555-0199",
        "address": "42 Cyberdyne Way",
        "city": "Los Angeles",
        "country": "USA",
    }, headers=headers)
    assert update_resp.status_code == 200
    updated_user = update_resp.json()
    assert updated_user["full_name"] == "Sarah Connor-Reese"
    assert updated_user["role"] == "customer"  # Cannot escalate role

    # 8. Customer payments history endpoint
    pay_history = client.get("/api/invoices/payments/history", headers=headers)
    assert pay_history.status_code == 200

