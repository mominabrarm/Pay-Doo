from datetime import date
from decimal import Decimal


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_customer_creation_and_duplicate_rejection(client):
    payload = {
        "name": "Brightloop Customer",
        "email": "customer@brightloop.com",
        "phone": "+91-9988776655",
        "city": "Bengaluru",
        "country": "India",
    }
    resp = client.post("/api/customers", json=payload)
    assert resp.status_code == 201
    cust_id = resp.json()["id"]

    dup_resp = client.post("/api/customers", json=payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    get_resp = client.get(f"/api/customers/{cust_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["email"] == "customer@brightloop.com"


def test_products_variants_and_plans(client):
    prod_payload = {
        "name": "Enterprise ERP Suite",
        "code": "PROD-ERP-01",
        "product_type": "software",
        "sales_price": "1000.00",
        "cost_price": "500.00",
        "description": "Core software",
    }
    prod_resp = client.post("/api/products", json=prod_payload)
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["id"]

    var_payload = {
        "variant_name": "Brand: Odoo Integration",
        "sku": "PROD-ERP-01-ODOO",
        "price_extra": "560.00",
    }
    var_resp = client.post(f"/api/products/{prod_id}/variants", json=var_payload)
    assert var_resp.status_code == 201
    assert Decimal(var_resp.json()["price_extra"]) == Decimal("560.00")

    plan_payload = {
        "name": "Monthly Business Plan",
        "code": "PLAN-MONTHLY-BIZ",
        "billing_interval": "monthly",
        "price": "1560.00",
        "min_quantity": 1,
        "auto_close": False,
        "allow_pause": True,
        "allow_renewal": True,
    }
    plan_resp = client.post("/api/plans", json=plan_payload)
    assert plan_resp.status_code == 201


def test_complete_billing_and_payment_workflow(client):
    cust_resp = client.post(
        "/api/customers",
        json={"name": "Acme Software", "email": "finance@acme.com"},
    )
    cust_id = cust_resp.json()["id"]

    prod_resp = client.post(
        "/api/products",
        json={
            "name": "Brightloop Core",
            "code": "PROD-BL-CORE",
            "sales_price": "1000.00",
            "cost_price": "400.00",
        },
    )
    prod_id = prod_resp.json()["id"]

    plan_resp = client.post(
        "/api/plans",
        json={
            "name": "Pro Monthly",
            "code": "PLAN-PRO-M",
            "billing_interval": "monthly",
            "price": "1000.00",
            "min_quantity": 1,
        },
    )
    plan_id = plan_resp.json()["id"]

    disc_resp = client.post(
        "/api/discounts",
        json={
            "name": "10% Welcome Discount",
            "code": "DISC-10",
            "discount_type": "percentage",
            "value": "10.00",
            "min_purchase_amount": "500.00",
            "min_quantity": 1,
            "max_uses": 50,
        },
    )
    disc_id = disc_resp.json()["id"]

    sub_payload = {
        "customer_id": cust_id,
        "plan_id": plan_id,
        "discount_rule_id": disc_id,
        "start_date": "2026-11-01",
        "payment_terms": "Net 15",
        "lines": [
            {
                "product_id": prod_id,
                "quantity": 2,
                "unit_price": "1000.00",
                "tax_rate": "18.00",
            }
        ],
    }
    sub_resp = client.post("/api/subscriptions", json=sub_payload)
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    sub_id = sub_data["id"]
    assert sub_data["status"] == "active"

    inv_payload = {
        "billing_period_start": "2026-11-01",
        "billing_period_end": "2026-11-30",
        "due_date": "2026-11-15",
    }
    inv_resp = client.post(f"/api/subscriptions/{sub_id}/generate-invoice", json=inv_payload)
    assert inv_resp.status_code == 201
    inv_data = inv_resp.json()
    inv_id = inv_data["id"]
    assert Decimal(inv_data["subtotal"]) == Decimal("2000.00")
    assert Decimal(inv_data["discount_amount"]) == Decimal("200.00")
    assert Decimal(inv_data["tax_amount"]) == Decimal("360.00")
    assert Decimal(inv_data["total_amount"]) == Decimal("2160.00")
    assert Decimal(inv_data["outstanding_balance"]) == Decimal("2160.00")
    assert inv_data["status"] == "confirmed"

    dup_inv_resp = client.post(f"/api/subscriptions/{sub_id}/generate-invoice", json=inv_payload)
    assert dup_inv_resp.status_code == 409
    assert "already generated" in dup_inv_resp.json()["detail"]

    overpay_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={
            "amount": "2500.00",
            "payment_method": "bank_transfer",
            "payment_date": "2026-11-05",
        },
    )
    assert overpay_resp.status_code == 400
    assert "exceeds outstanding balance" in overpay_resp.json()["detail"]

    zero_pay_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={
            "amount": "0.00",
            "payment_method": "upi",
            "payment_date": "2026-11-05",
        },
    )
    assert zero_pay_resp.status_code in [400, 422]

    part_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={
            "amount": "1000.00",
            "payment_method": "upi",
            "payment_date": "2026-11-05",
            "notes": "First installment UPI Ref #12345",
        },
    )
    assert part_resp.status_code == 201
    part_data = part_resp.json()
    assert Decimal(part_data["invoice_amount_paid"]) == Decimal("1000.00")
    assert Decimal(part_data["invoice_outstanding_balance"]) == Decimal("1160.00")
    assert part_data["invoice_status"] == "confirmed"

    full_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={
            "amount": "1160.00",
            "payment_method": "bank_transfer",
            "payment_date": "2026-11-06",
            "notes": "Final settlement",
        },
    )
    assert full_resp.status_code == 201
    full_data = full_resp.json()
    assert Decimal(full_data["invoice_amount_paid"]) == Decimal("2160.00")
    assert Decimal(full_data["invoice_outstanding_balance"]) == Decimal("0.00")
    assert full_data["invoice_status"] == "paid"

    post_paid_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={
            "amount": "10.00",
            "payment_method": "cash",
            "payment_date": "2026-11-07",
        },
    )
    assert post_paid_resp.status_code == 400
    assert "already fully paid" in post_paid_resp.json()["detail"]

    dash_resp = client.get("/api/dashboard/summary")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["active_subscriptions_count"] == 1
    assert Decimal(dash_data["total_revenue_collected"]) == Decimal("2160.00")
    assert Decimal(dash_data["total_outstanding_receivables"]) == Decimal("0.00")
    assert dash_data["subscriptions_by_interval"]["monthly"] == 1
    assert len(dash_data["recent_activity"]) == 2


def test_plan_pause_policy_and_state_transitions(client):
    cust = client.post("/api/customers", json={"name": "No Pause Co", "email": "nopause@co.com"}).json()
    prod = client.post("/api/products", json={"name": "P1", "code": "P1", "sales_price": "100.00", "cost_price": "50.00"}).json()
    
    # Plan with allow_pause = False
    plan = client.post(
        "/api/plans",
        json={
            "name": "Strict Plan",
            "code": "PLAN-STRICT",
            "billing_interval": "yearly",
            "price": "12000.00",
            "allow_pause": False,
        },
    ).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "12000.00", "tax_rate": "0.00"}],
        },
    ).json()

    # Attempt to pause should be rejected by business rule
    pause_attempt = client.patch(f"/api/subscriptions/{sub['id']}/status", json={"status": "paused"})
    assert pause_attempt.status_code == 400
    assert "Pausing is not permitted" in pause_attempt.json()["detail"]

    # Closing subscription
    close_resp = client.patch(f"/api/subscriptions/{sub['id']}/status", json={"status": "closed"})
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"

    # Attempting to generate invoice for closed subscription should be rejected
    inv_attempt = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={
            "billing_period_start": "2026-11-01",
            "billing_period_end": "2026-11-30",
            "due_date": "2026-11-15",
        },
    )
    assert inv_attempt.status_code == 400
    assert "Cannot generate invoice" in inv_attempt.json()["detail"]


def test_invalid_billing_period_dates(client):
    cust = client.post("/api/customers", json={"name": "Date Test", "email": "date@test.com"}).json()
    prod = client.post("/api/products", json={"name": "P2", "code": "P2", "sales_price": "100.00", "cost_price": "50.00"}).json()
    plan = client.post(
        "/api/plans",
        json={"name": "Daily Plan", "code": "PLAN-DAILY", "billing_interval": "daily", "price": "10.00"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "10.00", "tax_rate": "0.00"}],
        },
    ).json()

    # Start date after end date
    bad_date_resp = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={
            "billing_period_start": "2026-11-30",
            "billing_period_end": "2026-11-01",
            "due_date": "2026-11-15",
        },
    )
    assert bad_date_resp.status_code == 400
    assert "cannot be after end date" in bad_date_resp.json()["detail"]
