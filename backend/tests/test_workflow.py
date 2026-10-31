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


def test_complete_billing_reconciliation_and_payments(client):
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
        "status": "draft",
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
    sub_id = sub_resp.json()["id"]
    assert sub_resp.json()["status"] == "draft"

    conf_resp = client.patch(f"/api/subscriptions/{sub_id}/status", json={"status": "confirmed"})
    assert conf_resp.status_code == 200
    act_resp = client.patch(f"/api/subscriptions/{sub_id}/status", json={"status": "active"})
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "active"

    # Subtotal = 2000.00, Discount = 200.00, Tax (18% of 2000) = 360.00, Total = 2160.00
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

    lines = inv_data["lines"]
    line_subtotal_sum = sum(Decimal(line["subtotal"]) for line in lines)
    line_discount_sum = sum(Decimal(line["discount_amount"]) for line in lines)
    line_tax_sum = sum(Decimal(line["tax_amount"]) for line in lines)
    line_total_sum = sum(Decimal(line["total_amount"]) for line in lines)

    assert line_subtotal_sum == Decimal(inv_data["subtotal"])
    assert line_discount_sum == Decimal(inv_data["discount_amount"])
    assert line_tax_sum == Decimal(inv_data["tax_amount"])
    assert line_total_sum == Decimal(inv_data["total_amount"])

    dup_inv_resp = client.post(f"/api/subscriptions/{sub_id}/generate-invoice", json=inv_payload)
    assert dup_inv_resp.status_code == 409

    pay_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={
            "amount": "2160.00",
            "payment_method": "bank_transfer",
            "payment_date": "2026-11-05",
            "notes": "Full NEFT Settlement",
        },
    )
    assert pay_resp.status_code == 201
    assert pay_resp.json()["invoice_status"] == "paid"
    assert Decimal(pay_resp.json()["invoice_outstanding_balance"]) == Decimal("0.00")


def test_plan_pause_policy_and_state_transitions(client):
    cust = client.post("/api/customers", json={"name": "No Pause Co", "email": "nopause@co.com"}).json()
    prod = client.post("/api/products", json={"name": "P1", "code": "P1", "sales_price": "100.00", "cost_price": "50.00"}).json()
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
            "status": "active",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "12000.00", "tax_rate": "0.00"}],
        },
    ).json()

    pause_attempt = client.patch(f"/api/subscriptions/{sub['id']}/status", json={"status": "paused"})
    assert pause_attempt.status_code == 400
    assert "Pausing is not permitted" in pause_attempt.json()["detail"]

    close_resp = client.patch(f"/api/subscriptions/{sub['id']}/status", json={"status": "closed"})
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"


def test_billing_period_and_plan_duration_validation(client):
    cust = client.post("/api/customers", json={"name": "Date Test", "email": "date@test.com"}).json()
    prod = client.post("/api/products", json={"name": "P2", "code": "P2", "sales_price": "100.00", "cost_price": "50.00"}).json()
    plan = client.post(
        "/api/plans",
        json={"name": "Monthly Plan", "code": "PLAN-M-VAL", "billing_interval": "monthly", "price": "100.00"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "status": "active",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "0.00"}],
        },
    ).json()

    # Reject start date before subscription start date
    early_start = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-10-01", "billing_period_end": "2026-10-31", "due_date": "2026-11-15"},
    )
    assert early_start.status_code == 400
    assert "cannot be before subscription start date" in early_start.json()["detail"]

    # Reject start date after end date
    bad_dates = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-30", "billing_period_end": "2026-11-01", "due_date": "2026-11-15"},
    )
    assert bad_dates.status_code == 400
    assert "cannot be after end date" in bad_dates.json()["detail"]


def test_automated_billing_run(client):
    cust = client.post("/api/customers", json={"name": "Batch Customer", "email": "batch@corp.com"}).json()
    prod = client.post("/api/products", json={"name": "Batch P", "code": "BATCH-P", "sales_price": "200.00", "cost_price": "100.00"}).json()
    plan = client.post(
        "/api/plans",
        json={"name": "Batch Plan", "code": "BATCH-PLAN", "billing_interval": "monthly", "price": "200.00"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-10-01",
            "status": "active",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "200.00", "tax_rate": "0.00"}],
        },
    ).json()

    run_resp = client.post("/api/invoices/run-billing-cycle?target_date=2026-10-31")
    assert run_resp.status_code == 200
    data = run_resp.json()
    assert data["status"] == "success"
    assert data["invoices_generated"] >= 1
