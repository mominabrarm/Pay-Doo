from datetime import date, timedelta
from decimal import Decimal
import pytest
from app.models.invoice import Invoice
from app.models.product import Product
from app.models.plan import SubscriptionPlan
from app.routers.invoices import add_months, add_years


def test_end_to_end_financial_workflow(client, db_session):
    # 1. Customer
    cust = client.post("/api/customers", json={"name": "Alpha Corp", "email": "alpha@example.com"}).json()
    assert cust["id"] is not None

    # 2. Product & Variant
    prod = client.post(
        "/api/products",
        json={"name": "Cloud Host", "code": "HOST-01", "sales_price": "100.00", "cost_price": "40.00"},
    ).json()
    var = client.post(
        f"/api/products/{prod['id']}/variants",
        json={"variant_name": "Pro Tier", "sku": "HOST-01-PRO", "price_extra": "25.00"},
    ).json()

    # 3. Plan
    plan = client.post(
        "/api/plans",
        json={"name": "Monthly Cloud", "code": "PLAN-HOST-M", "billing_interval": "monthly", "price": "125.00"},
    ).json()

    # 4. Subscription (Start: 2026-11-01)
    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "status": "active",
            "lines": [
                {
                    "product_id": prod["id"],
                    "variant_id": var["id"],
                    "quantity": 2,
                    "unit_price": "125.00",
                    "tax_rate": "18.00",
                }
            ],
        },
    ).json()
    assert sub["status"] == "active"

    # 5. Generate Invoice: Subtotal = 250.00, Tax = 45.00, Total = 295.00
    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={
            "billing_period_start": "2026-11-01",
            "billing_period_end": "2026-11-30",
            "due_date": "2026-11-15",
        },
    ).json()

    assert Decimal(inv["subtotal"]) == Decimal("250.00")
    assert Decimal(inv["tax_amount"]) == Decimal("45.00")
    assert Decimal(inv["total_amount"]) == Decimal("295.00")
    assert Decimal(inv["outstanding_balance"]) == Decimal("295.00")
    assert Decimal(inv["amount_paid"]) == Decimal("0.00")
    assert inv["status"] == "confirmed"

    # Verify database stored values match returned API values
    db_inv = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()
    assert db_inv.total_amount == Decimal("295.00")
    assert db_inv.outstanding_balance == Decimal("295.00")
    assert db_inv.amount_paid == Decimal("0.00")

    # 6. Record Payment of 295.00
    pay = client.post(
        f"/api/invoices/{inv['id']}/payments",
        json={
            "amount": "295.00",
            "payment_method": "upi",
            "payment_date": "2026-11-05",
            "notes": "UPI/Ref/123456",
        },
    ).json()

    assert Decimal(pay["invoice_amount_paid"]) == Decimal("295.00")
    assert Decimal(pay["invoice_outstanding_balance"]) == Decimal("0.00")
    assert pay["invoice_status"] == "paid"

    # Verify invariant: outstanding = total - amount_paid
    db_session.refresh(db_inv)
    assert db_inv.outstanding_balance == db_inv.total_amount - db_inv.amount_paid
    assert db_inv.outstanding_balance == Decimal("0.00")
    assert db_inv.status == "paid"


def test_multi_line_and_discount_tax_calculations(client):
    cust = client.post("/api/customers", json={"name": "Beta LLC", "email": "beta@example.com"}).json()
    p1 = client.post("/api/products", json={"name": "Item A", "code": "ITM-A", "sales_price": "100.00", "cost_price": "50.00"}).json()
    p2 = client.post("/api/products", json={"name": "Item B", "code": "ITM-B", "sales_price": "200.00", "cost_price": "100.00"}).json()
    plan = client.post("/api/plans", json={"name": "Multi Plan", "code": "PLAN-MULTI", "billing_interval": "monthly", "price": "500.00"}).json()

    # 10% Percentage discount rule
    disc = client.post(
        "/api/discounts",
        json={
            "name": "10% Welcome",
            "code": "DISC-10PCT",
            "discount_type": "percentage",
            "value": "10.00",
            "min_purchase_amount": "100.00",
        },
    ).json()

    # Line 1: Qty 2 @ 100.00 (subtotal 200.00, tax 5% = 10.00)
    # Line 2: Qty 1 @ 200.00 (subtotal 200.00, tax 18% = 36.00)
    # Total Subtotal = 400.00. 10% discount = 40.00. Total Tax = 46.00. Total Amount = 400 - 40 + 46 = 406.00
    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "discount_rule_id": disc["id"],
            "start_date": "2026-11-01",
            "lines": [
                {"product_id": p1["id"], "quantity": 2, "unit_price": "100.00", "tax_rate": "5.00"},
                {"product_id": p2["id"], "quantity": 1, "unit_price": "200.00", "tax_rate": "18.00"},
            ],
        },
    ).json()

    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()

    assert Decimal(inv["subtotal"]) == Decimal("400.00")
    assert Decimal(inv["discount_amount"]) == Decimal("40.00")
    assert Decimal(inv["tax_amount"]) == Decimal("46.00")
    assert Decimal(inv["total_amount"]) == Decimal("406.00")

    # Verify line-item reconciliation to the exact penny
    lines_sum = sum(Decimal(line["total_amount"]) for line in inv["lines"])
    assert lines_sum == Decimal("406.00")


def test_billing_periods_and_frequency_engine(client):
    cust = client.post("/api/customers", json={"name": "Gamma Corp", "email": "gamma@example.com"}).json()
    prod = client.post("/api/products", json={"name": "Gamma Prod", "code": "G-PROD", "sales_price": "10.00", "cost_price": "5.00"}).json()

    # 1. Daily frequency
    daily_plan = client.post("/api/plans", json={"name": "Daily Plan", "code": "P-DAILY", "billing_interval": "daily", "price": "10.00"}).json()
    sub_daily = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": daily_plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "10.00", "tax_rate": "0.00"}],
        },
    ).json()

    inv_daily = client.post(
        f"/api/subscriptions/{sub_daily['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-01", "due_date": "2026-11-02"},
    )
    assert inv_daily.status_code == 201

    # 2. Duplicate billing attempt for same period -> 409 Conflict
    dup_daily = client.post(
        f"/api/subscriptions/{sub_daily['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-01", "due_date": "2026-11-02"},
    )
    assert dup_daily.status_code == 409
    assert "already generated" in dup_daily.json()["detail"]

    # 3. Inactive / Closed subscription billing rejection
    client.patch(f"/api/subscriptions/{sub_daily['id']}/status", json={"status": "closed"})
    closed_inv = client.post(
        f"/api/subscriptions/{sub_daily['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-02", "billing_period_end": "2026-11-02", "due_date": "2026-11-03"},
    )
    assert closed_inv.status_code == 400
    assert "Cannot generate invoice" in closed_inv.json()["detail"]


def test_calendar_date_math_and_leap_years():
    # 1. Month-end clamping (Jan 31 -> Feb 28 / Feb 29)
    assert add_months(date(2023, 1, 31), 1) == date(2023, 2, 28)
    assert add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)

    # 2. Mid-month anniversary (Nov 15 -> Dec 15)
    assert add_months(date(2026, 11, 15), 1) == date(2026, 12, 15)

    # 3. Leap year + 1 year (Feb 29 -> Feb 28)
    assert add_years(date(2024, 2, 29), 1) == date(2025, 2, 28)
    assert add_years(date(2024, 2, 29), 4) == date(2028, 2, 29)


def test_exhaustive_payment_reconciliation_scenarios(client):
    cust = client.post("/api/customers", json={"name": "Delta Inc", "email": "delta@example.com"}).json()
    prod = client.post("/api/products", json={"name": "SaaS Seat", "code": "SEAT-D", "sales_price": "100.00", "cost_price": "20.00"}).json()
    plan = client.post("/api/plans", json={"name": "SaaS Plan", "code": "P-SEAT-D", "billing_interval": "monthly", "price": "100.00"}).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "0.00"}],
        },
    ).json()

    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()
    inv_id = inv["id"]

    # Scenario 1: Invoice with 0 payments
    assert Decimal(inv["total_amount"]) == Decimal("100.00")
    assert Decimal(inv["outstanding_balance"]) == Decimal("100.00")
    assert Decimal(inv["amount_paid"]) == Decimal("0.00")
    assert inv["status"] == "confirmed"

    # Scenario 2: Partial payment of 30.00
    p1 = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "30.00", "payment_method": "credit_card", "payment_date": "2026-11-02", "notes": "TXN-01"},
    ).json()
    assert Decimal(p1["invoice_amount_paid"]) == Decimal("30.00")
    assert Decimal(p1["invoice_outstanding_balance"]) == Decimal("70.00")
    assert p1["invoice_status"] == "confirmed"

    # Scenario 3: Multiple partial payments (Add 20.00 -> balance becomes 50.00)
    p2 = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "20.00", "payment_method": "bank_transfer", "payment_date": "2026-11-03", "notes": "TXN-02"},
    ).json()
    assert Decimal(p2["invoice_amount_paid"]) == Decimal("50.00")
    assert Decimal(p2["invoice_outstanding_balance"]) == Decimal("50.00")

    # Scenario 5: Payment exceeding outstanding balance (Try 60.00 on 50.00 balance) -> 400 Bad Request
    overpay = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "60.00", "payment_method": "cash", "payment_date": "2026-11-04"},
    )
    assert overpay.status_code == 400
    assert "exceeds outstanding balance" in overpay.json()["detail"]

    # Scenario 6: Zero or negative payment -> 400 or 422
    zero_pay = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "0.00", "payment_method": "cash", "payment_date": "2026-11-04"},
    )
    assert zero_pay.status_code in [400, 422]

    neg_pay = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "-10.00", "payment_method": "cash", "payment_date": "2026-11-04"},
    )
    assert neg_pay.status_code in [400, 422]

    # Scenario 7: Unsupported payment method -> 400 or 422
    bad_method = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "10.00", "payment_method": "bitcoin", "payment_date": "2026-11-04"},
    )
    assert bad_method.status_code in [400, 422]

    # Scenario 8: Repeated payment request with identical reference note -> 409 Conflict
    dup_pay = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "20.00", "payment_method": "bank_transfer", "payment_date": "2026-11-03", "notes": "TXN-02"},
    )
    assert dup_pay.status_code == 409
    assert "Duplicate payment detected" in dup_pay.json()["detail"]

    # Scenario 9: Payment against non-existent invoice -> 404
    bad_inv = client.post(
        "/api/invoices/99999/payments",
        json={"amount": "10.00", "payment_method": "cash", "payment_date": "2026-11-04"},
    )
    assert bad_inv.status_code == 404

    # Scenario 4: Exact settlement payment (50.00 settles the remaining 50.00)
    p3 = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "50.00", "payment_method": "upi", "payment_date": "2026-11-05", "notes": "TXN-03"},
    ).json()
    assert Decimal(p3["invoice_amount_paid"]) == Decimal("100.00")
    assert Decimal(p3["invoice_outstanding_balance"]) == Decimal("0.00")
    assert p3["invoice_status"] == "paid"

    # Scenario 10: Payment against settled invoice -> 400 Bad Request
    post_settle = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"amount": "5.00", "payment_method": "cash", "payment_date": "2026-11-06"},
    )
    assert post_settle.status_code == 400
    assert "already fully paid" in post_settle.json()["detail"]


def test_immutability_and_catalog_price_changes(client, db_session):
    cust = client.post("/api/customers", json={"name": "Epsilon", "email": "eps@example.com"}).json()
    prod = client.post("/api/products", json={"name": "Immutable Prod", "code": "IMM-01", "sales_price": "100.00", "cost_price": "50.00"}).json()
    plan = client.post("/api/plans", json={"name": "Immutable Plan", "code": "P-IMM", "billing_interval": "monthly", "price": "100.00"}).json()

    sub = client.post(
        "/api/subscriptions",
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": "2026-11-01",
            "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "100.00", "tax_rate": "0.00"}],
        },
    ).json()

    inv = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-11-01", "billing_period_end": "2026-11-30", "due_date": "2026-11-15"},
    ).json()
    assert Decimal(inv["total_amount"]) == Decimal("100.00")

    # Now alter product price and plan price directly in database
    db_prod = db_session.query(Product).filter(Product.id == prod["id"]).first()
    db_prod.sales_price = Decimal("999.00")
    db_plan = db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan["id"]).first()
    db_plan.price = Decimal("999.00")
    db_session.commit()

    # Re-fetch invoice via API: must remain 100.00 (immutable historical record)
    fetched_inv = client.get(f"/api/invoices/{inv['id']}").json()
    assert Decimal(fetched_inv["total_amount"]) == Decimal("100.00")
    assert Decimal(fetched_inv["lines"][0]["unit_price"]) == Decimal("100.00")
    assert Decimal(fetched_inv["lines"][0]["total_amount"]) == Decimal("100.00")

