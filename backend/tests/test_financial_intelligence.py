from datetime import date, timedelta
from decimal import Decimal
import pytest
from app.models.customer import Customer
from app.models.product import Product
from app.models.plan import SubscriptionPlan
from app.models.discount import DiscountRule
from app.models.subscription import Subscription, SubscriptionLine
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.leakage_alert import RevenueLeakageAlert


def test_leakage_detection_rules_and_alert_lifecycle(client, db_session):
    # Setup test entities
    cust = client.post("/api/customers", json={"name": "Anomaly Corp", "email": "anomaly@corp.com"}).json()
    prod = client.post("/api/products", json={"name": "Cloud Storage", "code": "CLOUD-1", "sales_price": "200.00", "cost_price": "50.00"}).json()
    plan = client.post("/api/plans", json={"name": "Monthly Cloud", "code": "PLAN-CLOUD", "billing_interval": "monthly", "price": "200.00"}).json()

    # 1. Setup Rule 1: Cancelled subscription billed
    sub_closed = client.post("/api/subscriptions", json={
        "customer_id": cust["id"],
        "plan_id": plan["id"],
        "start_date": "2026-01-01",
        "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "200.00", "tax_rate": "18.00"}],
    }).json()
    # Close subscription
    client.patch(f"/api/subscriptions/{sub_closed['id']}/status", json={"status": "closed"})
    # Manually attach an invoice for closed subscription
    inv_closed = Invoice(
        invoice_number="INV-CLOSED-TEST",
        subscription_id=sub_closed["id"],
        customer_id=cust["id"],
        billing_period_start=date(2026, 6, 1),
        billing_period_end=date(2026, 6, 30),
        issue_date=date(2026, 6, 1),
        due_date=date(2026, 6, 15),
        status="confirmed",
        subtotal=Decimal("200.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("36.00"),
        total_amount=Decimal("236.00"),
        amount_paid=Decimal("0.00"),
        outstanding_balance=Decimal("236.00"),
    )
    db_session.add(inv_closed)

    # 2. Setup Rule 2: Expired subscription receiving invoice
    sub_expired = client.post("/api/subscriptions", json={
        "customer_id": cust["id"],
        "plan_id": plan["id"],
        "start_date": "2026-01-01",
        "expiry_date": "2026-03-31",
        "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "200.00", "tax_rate": "18.00"}],
    }).json()
    inv_expired = Invoice(
        invoice_number="INV-EXPIRED-TEST",
        subscription_id=sub_expired["id"],
        customer_id=cust["id"],
        billing_period_start=date(2026, 4, 1),
        billing_period_end=date(2026, 4, 30),
        issue_date=date(2026, 4, 1),
        due_date=date(2026, 4, 15),
        status="confirmed",
        subtotal=Decimal("200.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("36.00"),
        total_amount=Decimal("236.00"),
        amount_paid=Decimal("0.00"),
        outstanding_balance=Decimal("236.00"),
    )
    db_session.add(inv_expired)

    # 3. Setup Rule 4: Payment recorded but balance unreconciled
    inv_unreconciled = Invoice(
        invoice_number="INV-UNRECON-TEST",
        subscription_id=sub_closed["id"],
        customer_id=cust["id"],
        billing_period_start=date(2026, 1, 1),
        billing_period_end=date(2026, 1, 31),
        issue_date=date(2026, 1, 1),
        due_date=date(2026, 1, 15),
        status="confirmed",
        subtotal=Decimal("500.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("500.00"),
        amount_paid=Decimal("100.00"),  # recorded as 100
        outstanding_balance=Decimal("500.00"),  # should be 400!
    )
    db_session.add(inv_unreconciled)
    db_session.commit()

    # Create admin user
    client.post("/api/auth/register", json={"email": "leakage_admin@corp.com", "password": "AdminPassword123!", "full_name": "Admin", "role": "admin"})
    admin_token = client.post("/api/auth/login", json={"email": "leakage_admin@corp.com", "password": "AdminPassword123!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Trigger scan
    scan_resp = client.post("/api/intelligence/alerts/scan", headers=admin_headers)
    assert scan_resp.status_code == 200
    alerts = scan_resp.json()
    assert len(alerts) >= 3

    rule_codes = {a["rule_code"] for a in alerts}
    assert "CANCELLED_SUB_BILLED" in rule_codes
    assert "EXPIRED_SUB_BILLED" in rule_codes
    assert "PAYMENT_UNRECONCILED" in rule_codes

    # Verify idempotency: running scan again does NOT duplicate alerts
    scan_resp_2 = client.post("/api/intelligence/alerts/scan", headers=admin_headers)
    assert len(scan_resp_2.json()) == len(alerts)

    # Test Alert Management Lifecycle: Acknowledge & Resolve
    target_alert = alerts[0]
    alert_id = target_alert["id"]

    # Acknowledge
    ack_resp = client.patch(
        f"/api/intelligence/alerts/{alert_id}",
        json={"status": "acknowledged", "resolution_notes": "Reviewed with billing manager, investigating."},
        headers=admin_headers,
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"

    # Resolve
    res_resp = client.patch(
        f"/api/intelligence/alerts/{alert_id}",
        json={"status": "resolved", "resolution_notes": "Correction credit issued and reconciled."},
        headers=admin_headers,
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"

    # Summary metrics
    summary = client.get("/api/intelligence/alerts/summary", headers=admin_headers).json()
    assert summary["resolved_alerts_count"] >= 1
    assert summary["total_open_alerts"] >= 2
    assert Decimal(str(summary["total_amount_at_risk"])) > Decimal("0.00")


def test_customer_isolation_on_leakage_alerts(client):
    # Customer 1
    c1 = client.post("/api/customers", json={"name": "Cust One", "email": "c1@leak.com"}).json()
    c2 = client.post("/api/customers", json={"name": "Cust Two", "email": "c2@leak.com"}).json()

    # Register customer 1 user
    client.post("/api/auth/register", json={"email": "c1_user@leak.com", "password": "CustPassword123!", "full_name": "Cust One", "role": "customer", "customer_id": c1["id"]})
    c1_token = client.post("/api/auth/login", json={"email": "c1_user@leak.com", "password": "CustPassword123!"}).json()["access_token"]
    c1_headers = {"Authorization": f"Bearer {c1_token}"}

    # Customer cannot trigger scan -> 403 Forbidden
    scan_attempt = client.post("/api/intelligence/alerts/scan", headers=c1_headers)
    assert scan_attempt.status_code == 403

    # Customer cannot patch alerts -> 403 Forbidden
    patch_attempt = client.patch("/api/intelligence/alerts/1", json={"status": "resolved"}, headers=c1_headers)
    assert patch_attempt.status_code == 403


def test_subscription_impact_simulator(client):
    # Admin
    client.post("/api/auth/register", json={"email": "sim_admin@corp.com", "password": "AdminPassword123!", "full_name": "Sim Admin", "role": "admin"})
    admin_token = client.post("/api/auth/login", json={"email": "sim_admin@corp.com", "password": "AdminPassword123!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup Plan & 2 Subscriptions
    c = client.post("/api/customers", json={"name": "Sim Corp", "email": "sim@corp.com"}).json()
    prod = client.post("/api/products", json={"name": "Base API", "code": "SIM-PROD", "sales_price": "1000.00", "cost_price": "100.00"}).json()
    plan = client.post("/api/plans", json={"name": "Enterprise Plan", "code": "PLAN-ENT", "billing_interval": "monthly", "price": "1000.00"}).json()

    client.post("/api/subscriptions", json={
        "customer_id": c["id"],
        "plan_id": plan["id"],
        "start_date": "2026-01-01",
        "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "1000.00", "tax_rate": "18.00"}],
    })
    client.post("/api/subscriptions", json={
        "customer_id": c["id"],
        "plan_id": plan["id"],
        "start_date": "2026-01-01",
        "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "1000.00", "tax_rate": "18.00"}],
    })

    # Test simulator plan options
    options_resp = client.get("/api/intelligence/simulator/plans", headers=admin_headers)
    assert options_resp.status_code == 200
    options = options_resp.json()
    ent_opt = next((o for o in options if o["id"] == plan["id"]), None)
    assert ent_opt is not None
    assert ent_opt["active_subscribers_count"] == 2
    assert Decimal(str(ent_opt["current_monthly_revenue"])) == Decimal("2000.00")

    # Scenario 1: Price Reduction with 15% discount
    # Current monthly: 2 subs * ₹1000 = ₹2,000.00
    # Proposed price: ₹1000 with 15% discount = ₹850.00
    # Proposed monthly: 2 subs * ₹850 = ₹1,700.00
    # Monthly diff: -₹300.00
    # Annual diff: -₹3,600.00
    sim_1 = client.post(
        "/api/intelligence/simulator/calculate",
        json={
            "plan_id": plan["id"],
            "proposed_price": "1000.00",
            "discount_percentage": "15.00",
        },
        headers=admin_headers,
    )
    assert sim_1.status_code == 200
    res_1 = sim_1.json()
    assert Decimal(str(res_1["current_monthly_revenue"])) == Decimal("2000.00")
    assert Decimal(str(res_1["proposed_monthly_revenue"])) == Decimal("1700.00")
    assert Decimal(str(res_1["monthly_difference"])) == Decimal("-300.00")
    assert Decimal(str(res_1["annualized_difference"])) == Decimal("-3600.00")
    assert Decimal(str(res_1["percentage_change"])) == Decimal("-15.00")
    assert res_1["is_positive_impact"] is False

    # Scenario 2: Price Increase from ₹1000 to ₹1200 with 0% discount
    # Proposed monthly: 2 * ₹1200 = ₹2400.00 (+₹400 / +20%)
    sim_2 = client.post(
        "/api/intelligence/simulator/calculate",
        json={
            "plan_id": plan["id"],
            "proposed_price": "1200.00",
            "discount_percentage": "0.00",
        },
        headers=admin_headers,
    )
    assert sim_2.status_code == 200
    res_2 = sim_2.json()
    assert Decimal(str(res_2["proposed_monthly_revenue"])) == Decimal("2400.00")
    assert Decimal(str(res_2["monthly_difference"])) == Decimal("400.00")
    assert Decimal(str(res_2["annualized_difference"])) == Decimal("4800.00")
    assert Decimal(str(res_2["percentage_change"])) == Decimal("20.00")
    assert res_2["is_positive_impact"] is True

    # Scenario 3: Verify simulation did NOT mutate production plan price
    check_plan = client.get(f"/api/plans", headers=admin_headers).json()
    target_p = next(p for p in check_plan if p["id"] == plan["id"])
    assert Decimal(str(target_p["price"])) == Decimal("1000.00")


def test_billing_explainability_and_invoice_comparison(client, db_session):
    # Setup Customer, Product, Plan, and Subscription
    c = client.post("/api/customers", json={"name": "Billing Corp", "email": "billing@corp.com"}).json()
    prod = client.post("/api/products", json={"name": "API Service", "code": "API-EXPLAIN", "sales_price": "500.00", "cost_price": "50.00"}).json()
    plan = client.post("/api/plans", json={"name": "Monthly Service", "code": "PLAN-EXP", "billing_interval": "monthly", "price": "500.00"}).json()

    sub = client.post("/api/subscriptions", json={
        "customer_id": c["id"],
        "plan_id": plan["id"],
        "start_date": "2026-01-01",
        "lines": [{"product_id": prod["id"], "quantity": 1, "unit_price": "500.00", "tax_rate": "18.00"}],
    }).json()

    # Generate Invoice 1 (Initial Invoice)
    inv1 = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-01-01", "billing_period_end": "2026-01-31", "due_date": "2026-01-15"},
    ).json()

    # Add partial payment of 200.00 to Invoice 1
    client.post(f"/api/invoices/{inv1['id']}/payments", json={
        "amount": "200.00",
        "payment_method": "upi",
        "payment_date": "2026-01-10",
        "notes": "Partial advance settlement",
    })

    # Explain Invoice 1 (No previous invoice)
    exp1 = client.get(f"/api/invoices/{inv1['id']}/explain").json()
    assert exp1["invoice_id"] == inv1["id"]
    assert exp1["invoice_number"] == inv1["invoice_number"]
    assert exp1["customer_name"] == "Billing Corp"
    assert exp1["plan_name"] == "Monthly Service"
    assert Decimal(str(exp1["subtotal"])) == Decimal("500.00")
    assert Decimal(str(exp1["tax_amount"])) == Decimal("90.00")
    assert Decimal(str(exp1["total_amount"])) == Decimal("590.00")
    assert Decimal(str(exp1["amount_paid"])) == Decimal("200.00")
    assert Decimal(str(exp1["outstanding_balance"])) == Decimal("390.00")
    assert len(exp1["payments"]) == 1
    assert exp1["payments"][0]["amount"] == 200.0
    assert exp1["has_previous_invoice"] is False
    assert "Initial invoice" in exp1["comparison_summary"] or "initial invoice" in exp1["comparison_summary"].lower()

    # Generate Invoice 2 (Second month with higher quantity/price to test comparison)
    # Update subscription with 2 lines for month 2
    sub_obj = db_session.query(Subscription).filter(Subscription.id == sub["id"]).first()
    sub_obj.lines[0].quantity = 2
    sub_obj.lines[0].amount = Decimal("1180.00")
    db_session.commit()

    inv2 = client.post(
        f"/api/subscriptions/{sub['id']}/generate-invoice",
        json={"billing_period_start": "2026-02-01", "billing_period_end": "2026-02-28", "due_date": "2026-02-15"},
    ).json()

    # Explain Invoice 2 (Has previous invoice comparison)
    exp2 = client.get(f"/api/invoices/{inv2['id']}/explain").json()
    assert exp2["has_previous_invoice"] is True
    assert exp2["previous_invoice_id"] == inv1["id"]
    assert exp2["previous_invoice_number"] == inv1["invoice_number"]
    assert Decimal(str(exp2["total_amount"])) == Decimal("1180.00")
    assert Decimal(str(exp2["previous_invoice_total"])) == Decimal("590.00")

    # Comparison metrics breakdown
    metrics = {m["metric_name"]: m for m in exp2["comparison_metrics"]}
    assert "Subtotal" in metrics
    assert Decimal(str(metrics["Subtotal"]["difference"])) == Decimal("500.00")
    assert "Total Invoice Amount" in metrics
    assert Decimal(str(metrics["Total Invoice Amount"]["difference"])) == Decimal("590.00")
    assert Decimal(str(metrics["Total Invoice Amount"]["percentage_change"])) == Decimal("100.00")
    assert "increased by" in exp2["comparison_summary"].lower()

    # Test Customer Ownership on Explain
    c_other = client.post("/api/customers", json={"name": "Other Corp", "email": "other@corp.com"}).json()
    client.post("/api/auth/register", json={"email": "other_user@corp.com", "password": "OtherPassword123!", "full_name": "Other User", "role": "customer", "customer_id": c_other["id"]})
    other_token = client.post("/api/auth/login", json={"email": "other_user@corp.com", "password": "OtherPassword123!"}).json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other customer attempting to explain Invoice 1 -> 403 Forbidden
    forbidden_explain = client.get(f"/api/invoices/{inv1['id']}/explain", headers=other_headers)
    assert forbidden_explain.status_code == 403
    assert "You may only view billing explanations for your own invoices" in forbidden_explain.json()["detail"]

