from datetime import date, timedelta
from decimal import Decimal
import pytest


def test_customer_validation_and_pagination(client):
    # Invalid email rejection
    bad_email_resp = client.post(
        "/api/customers",
        json={"name": "Bad Email User", "email": "not-an-email"},
    )
    assert bad_email_resp.status_code == 422

    # Missing required name
    missing_name_resp = client.post(
        "/api/customers",
        json={"email": "valid@email.com"},
    )
    assert missing_name_resp.status_code == 422

    # Create several customers for pagination test
    for i in range(1, 6):
        client.post(
            "/api/customers",
            json={
                "name": f"Enterprise Client {i}",
                "email": f"client{i}@enterprise.com",
                "city": "Bengaluru" if i % 2 == 0 else "Mumbai",
            },
        )

    # Test limit and skip
    list_resp = client.get("/api/customers?skip=0&limit=3")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 3

    # Test search query
    search_resp = client.get("/api/customers?search=Client 3")
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 1
    assert search_resp.json()[0]["email"] == "client3@enterprise.com"

    # Non-existent customer 404
    not_found = client.get("/api/customers/99999")
    assert not_found.status_code == 404


def test_product_variants_and_uniqueness(client):
    # Create product
    p_resp = client.post(
        "/api/products",
        json={
            "name": "Cloud Storage Addon",
            "code": "PROD-STORAGE",
            "product_type": "addon",
            "sales_price": "200.00",
            "cost_price": "50.00",
        },
    )
    assert p_resp.status_code == 201
    prod_id = p_resp.json()["id"]

    # Duplicate code rejection
    dup_p = client.post(
        "/api/products",
        json={
            "name": "Duplicate Code",
            "code": "PROD-STORAGE",
            "sales_price": "100.00",
            "cost_price": "20.00",
        },
    )
    assert dup_p.status_code == 400
    assert "already exists" in dup_p.json()["detail"]

    # Create variant
    v_resp = client.post(
        f"/api/products/{prod_id}/variants",
        json={
            "variant_name": "Tier 1: 100GB",
            "sku": "SKU-STORAGE-100GB",
            "price_extra": "50.00",
        },
    )
    assert v_resp.status_code == 201

    # Duplicate SKU rejection
    dup_v = client.post(
        f"/api/products/{prod_id}/variants",
        json={
            "variant_name": "Duplicate SKU",
            "sku": "SKU-STORAGE-100GB",
            "price_extra": "75.00",
        },
    )
    assert dup_v.status_code == 400
    assert "already exists" in dup_v.json()["detail"]

    # Variant on non-existent product 404
    bad_v = client.post(
        "/api/products/99999/variants",
        json={"variant_name": "Ghost", "sku": "SKU-GHOST"},
    )
    assert bad_v.status_code == 404


def test_fixed_discount_rule_and_thresholds(client):
    cust = client.post("/api/customers", json={"name": "Discount User", "email": "disc@user.com"}).json()
    prod = client.post(
        "/api/products",
        json={"name": "Software Seat", "code": "SEAT-01", "sales_price": "500.00", "cost_price": "100.00"},
    ).json()
    plan = client.post(
        "/api/plans",
        json={"name": "Monthly Seat", "code": "PLAN-SEAT-M", "billing_interval": "monthly", "price": "500.00"},
    ).json()

    # Fixed discount: $150 off with min purchase amount $1000
    disc = client.post(
        "/api/discounts",
        json={
            "name": "150 Flat Off",
            "code": "DISC-FLAT-150",
            "discount_type": "fixed",
            "value": "150.00",
            "min_purchase_amount": "1000.00",
            "min_quantity": 2,
            "max_uses": 2,
        },
    ).json()

    # Case A: Subscription with quantity 1 (subtotal = 500, does NOT meet min_purchase 1000)
    sub1 = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "discount_rule_id": disc["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "500.00", "tax_rate": "10.00"}],
        },
    ).json()

    inv1 = client.post(
        f"/api/subscriptions/{sub1['id']}/generate-invoice",
        json={
            "billing_period_start": "2026-11-01",
            "billing_period_end": "2026-11-30",
            "due_date": "2026-11-15",
        },
    ).json()
    # Threshold not met -> discount should be 0.00
    assert Decimal(inv1["discount_amount"]) == Decimal("0.00")
    assert Decimal(inv1["subtotal"]) == Decimal("500.00")
    assert Decimal(inv1["tax_amount"]) == Decimal("50.00")
    assert Decimal(inv1["total_amount"]) == Decimal("550.00")

    # Case B: Subscription with quantity 3 (subtotal = 1500, meets threshold!)
    sub2 = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "discount_rule_id": disc["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 3, "unit_price": "500.00", "tax_rate": "10.00"}],
        },
    ).json()

    inv2 = client.post(
        f"/api/subscriptions/{sub2['id']}/generate-invoice",
        json={
            "billing_period_start": "2026-11-01",
            "billing_period_end": "2026-11-30",
            "due_date": "2026-11-15",
        },
    ).json()
    # Threshold met -> discount = 150.00, subtotal = 1500.00, tax (10% of 1500) = 150.00
    # total = 1500 - 150 + 150 = 1500.00
    assert Decimal(inv2["discount_amount"]) == Decimal("150.00")
    assert Decimal(inv2["subtotal"]) == Decimal("1500.00")
    assert Decimal(inv2["tax_amount"]) == Decimal("150.00")
    assert Decimal(inv2["total_amount"]) == Decimal("1500.00")


def test_payment_validations_and_reconciliation(client):
    cust = client.post("/api/customers", json={"name": "Payee", "email": "payee@co.com"}).json()
    prod = client.post("/api/products", json={"name": "Item", "code": "ITEM-1", "sales_price": "200.00", "cost_price": "50.00"}).json()
    plan = client.post("/api/plans", json={"name": "Plan", "code": "P-ITEM", "billing_interval": "monthly", "price": "200.00"}).json()
    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "200.00", "tax_rate": "0.00"}],
        },
    ).json()
    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()
    inv_id = inv["id"]

    # 1. Negative payment rejection
    neg_resp = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "-50.00", "payment_method": "cash", "payment_date": "2026-11-05"},
    )
    assert neg_resp.status_code in [400, 422]

    # 2. Payment on non-existent invoice
    ghost_inv_resp = client.post(
        "/api/invoices/99999/payments",
        json={"amount": "100.00", "payment_method": "cash", "payment_date": "2026-11-05"},
    )
    assert ghost_inv_resp.status_code == 404

    # 3. Partial payment 1
    p1 = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "70.00", "payment_method": "credit_card", "payment_date": "2026-11-05"},
    ).json()
    assert Decimal(p1["invoice_amount_paid"]) == Decimal("70.00")
    assert Decimal(p1["invoice_outstanding_balance"]) == Decimal("130.00")
    assert p1["invoice_status"] == "confirmed"

    # 4. Partial payment 2
    p2 = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "130.00", "payment_method": "bank_transfer", "payment_date": "2026-11-06"},
    ).json()
    assert Decimal(p2["invoice_amount_paid"]) == Decimal("200.00")
    assert Decimal(p2["invoice_outstanding_balance"]) == Decimal("0.00")
    assert p2["invoice_status"] == "paid"

    # 5. Overpayment attempt on settled invoice
    post_settle = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "1.00", "payment_method": "cash", "payment_date": "2026-11-07"},
    )
    assert post_settle.status_code == 400
    assert "already fully paid" in post_settle.json()["detail"]


def test_overdue_invoices_and_kpi_telemetry(client):
    cust = client.post("/api/customers", json={"name": "Overdue Corp", "email": "overdue@corp.com"}).json()
    prod = client.post("/api/products", json={"name": "Hardware", "code": "HW-1", "sales_price": "1000.00", "cost_price": "200.00"}).json()
    plan = client.post("/api/plans", json={"name": "HW Plan", "code": "PLAN-HW", "billing_interval": "yearly", "price": "1000.00"}).json()
    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-01-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "1000.00", "tax_rate": "18.00"}],
        },
    ).json()

    past_date = date.today() - timedelta(days=10)
    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={
            "billing_period_start": "2026-01-01",
            "billing_period_end": "2026-01-31",
            "due_date": past_date.isoformat(),
        },
    ).json()

    # Query overdue filter
    overdue_list = client.get("/api/invoices?is_overdue=true").json()
    matching = [i for i in overdue_list if i["id"] == inv["id"]]
    assert len(matching) == 1
    assert Decimal(matching[0]["outstanding_balance"]) == Decimal("1180.00")

    # Verify dashboard KPI catches overdue invoice
    dash = client.get("/api/dashboard/summary").json()
    assert dash["overdue_invoices_count"] >= 1
    assert Decimal(dash["overdue_invoices_amount"]) >= Decimal("1180.00")


def test_subscription_with_product_variant_line(client):
    cust = client.post("/api/customers", json={"name": "Variant Customer", "email": "var@cust.com"}).json()
    prod = client.post("/api/products", json={"name": "Business Suite", "code": "SUITE-01", "sales_price": "1000.00", "cost_price": "300.00"}).json()
    var = client.post(
        f"/api/products/{prod['id']}/variants",
        json={"variant_name": "Brand: Odoo", "sku": "SUITE-ODOO", "price_extra": "560.00"},
    ).json()
    plan = client.post(
        "/api/plans",
        json={"name": "Pro Monthly", "code": "P-PRO-M", "billing_interval": "monthly", "price": "1560.00"},
    ).json()

    # Subscription with variant
    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [
                {
                    "product_id": prod["id"],
                    "variant_id": var["id"],
                    "quantity": 2,
                    "unit_price": "1560.00",
                    "tax_rate": "18.00",
                }
            ],
        },
    ).json()

    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()

    assert len(inv["lines"]) == 1
    line = inv["lines"][0]
    assert "Business Suite (Brand: Odoo)" in line["description"]
    assert Decimal(line["unit_price"]) == Decimal("1560.00")
    assert line["quantity"] == 2
    assert Decimal(line["subtotal"]) == Decimal("3120.00")
    assert Decimal(line["tax_amount"]) == Decimal("561.60")
    assert Decimal(line["total_amount"]) == Decimal("3681.60")


def test_discount_max_uses_expiration(client):
    cust = client.post("/api/customers", json={"name": "Quota Cust", "email": "quota@cust.com"}).json()
    prod = client.post("/api/products", json={"name": "Widget", "code": "WIDGET-01", "sales_price": "100.00", "cost_price": "20.00"}).json()
    plan = client.post("/api/plans", json={"name": "Plan", "code": "P-WIDGET", "billing_interval": "monthly", "price": "100.00"}).json()

    # Single-use discount
    disc = client.post(
        "/api/discounts",
        json={
            "name": "One-Time Special",
            "code": "DISC-ONCE",
            "discount_type": "percentage",
            "value": "20.00",
            "max_uses": 1,
        },
    ).json()

    sub1 = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "discount_rule_id": disc["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "0.00"}],
        },
    ).json()

    # First invoice: discount applied (20.00)
    inv1 = client.post(
        f"/api/subscriptions/{sub1['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()
    assert Decimal(inv1["discount_amount"]) == Decimal("20.00")
    assert Decimal(inv1["total_amount"]) == Decimal("80.00")

    # Second subscription referencing same discount
    sub2 = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "discount_rule_id": disc["id"],
            "start_date": "2026-12-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "0.00"}],
        },
    ).json()

    # Second invoice: max_uses reached (current_uses = 1, max_uses = 1) -> NO discount
    inv2 = client.post(
        f"/api/subscriptions/{sub2['id']}/generate-invoice",
        json={"billing_period_start": "2026-12-01", "billing_period_end": "2026-12-31", "due_date": "2026-12-15"},
    ).json()
    assert Decimal(inv2["discount_amount"]) == Decimal("0.00")
    assert Decimal(inv2["total_amount"]) == Decimal("100.00")


def test_subscription_pause_and_resume_cycle(client):
    cust = client.post("/api/customers", json={"name": "Lifecycle User", "email": "life@user.com"}).json()
    prod = client.post("/api/products", json={"name": "P-Life", "code": "P-LIFE", "sales_price": "50.00", "cost_price": "10.00"}).json()
    plan = client.post("/api/plans", json={"name": "P-Life-Plan", "code": "PLAN-LIFE", "billing_interval": "monthly", "price": "50.00", "allow_pause": True}).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "50.00", "tax_rate": "0.00"}],
        },
    ).json()
    sub_id = sub["id"]

    # Pause
    p_resp = client.patch(f"/api/subscriptions/{sub_id}/status", json={"status": "paused"})
    assert p_resp.status_code == 200
    assert p_resp.json()["status"] == "paused"

    # Cannot invoice while paused
    inv_err = client.post(
        f"/api/subscriptions/{sub_id}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    )
    assert inv_err.status_code == 400
    assert "paused" in inv_err.json()["detail"]

    # Resume (active)
    r_resp = client.patch(f"/api/subscriptions/{sub_id}/status", json={"status": "active"})
    assert r_resp.status_code == 200
    assert r_resp.json()["status"] == "active"

    # Now invoice succeeds
    inv_ok = client.post(
        f"/api/subscriptions/{sub_id}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    )
    assert inv_ok.status_code == 201
