from datetime import date, timedelta
from decimal import Decimal
from app.database import Base, engine, SessionLocal
from app.models.customer import Customer
from app.models.product import Product, ProductVariant
from app.models.plan import SubscriptionPlan
from app.models.discount import DiscountRule
from app.models.subscription import Subscription, SubscriptionLine
from app.services.billing import generate_subscription_invoice
from app.services.payment import record_invoice_payment


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Customer).first():
        db.close()
        return

    # 1. Customers
    c1 = Customer(
        name="Nexus Infotech Ltd",
        email="billing@nexusinfotech.com",
        phone="+91-9845012345",
        address="Tower 4, Electronic City",
        city="Bengaluru",
        country="India",
    )
    c2 = Customer(
        name="Apex Digital Agency",
        email="accounts@apexdigital.in",
        phone="+91-9820054321",
        address="Bandra Kurla Complex",
        city="Mumbai",
        country="India",
    )
    c3 = Customer(
        name="Solaria Retailers",
        email="finance@solariaretail.com",
        phone="+91-9900112233",
        address="Sector 18",
        city="Gurugram",
        country="India",
    )
    db.add_all([c1, c2, c3])
    db.commit()

    # 2. Products & Variants
    p1 = Product(
        name="Brightloop ERP Core",
        code="PROD-BL-ERP",
        product_type="software",
        sales_price=Decimal("1500.00"),
        cost_price=Decimal("450.00"),
        description="Comprehensive cloud business suite",
    )
    p2 = Product(
        name="Advanced BI & Analytics Addon",
        code="PROD-BL-BI",
        product_type="addon",
        sales_price=Decimal("800.00"),
        cost_price=Decimal("200.00"),
        description="Real-time multi-dimensional reporting add-on",
    )
    db.add_all([p1, p2])
    db.commit()

    v1 = ProductVariant(
        product_id=p1.id,
        variant_name="Brand: Odoo Integration",
        sku="PROD-BL-ERP-ODOO",
        price_extra=Decimal("560.00"),
    )
    db.add(v1)
    db.commit()

    # 3. Plans
    plan1 = SubscriptionPlan(
        name="Business Pro Monthly",
        code="PLAN-BIZ-M",
        billing_interval="monthly",
        price=Decimal("2060.00"),
        min_quantity=1,
        auto_close=False,
        allow_pause=True,
        allow_renewal=True,
    )
    plan2 = SubscriptionPlan(
        name="Enterprise Annual Contract",
        code="PLAN-ENT-Y",
        billing_interval="yearly",
        price=Decimal("22000.00"),
        min_quantity=5,
        auto_close=False,
        allow_pause=False,
        allow_renewal=True,
    )
    db.add_all([plan1, plan2])
    db.commit()

    # 4. Discounts
    d1 = DiscountRule(
        name="Early Adopter 10%",
        code="DISC-EARLY-10",
        discount_type="percentage",
        value=Decimal("10.00"),
        min_purchase_amount=Decimal("1000.00"),
        min_quantity=1,
        max_uses=100,
    )
    db.add(d1)
    db.commit()

    # 5. Subscriptions
    today = date.today()
    last_month_start = today.replace(day=1) - timedelta(days=28)
    last_month_start = last_month_start.replace(day=1)
    last_month_end = today.replace(day=1) - timedelta(days=1)

    sub1 = Subscription(
        subscription_number="SUB-2026-00001",
        customer_id=c1.id,
        plan_id=plan1.id,
        discount_rule_id=d1.id,
        status="active",
        start_date=last_month_start,
        next_billing_date=today,
        payment_terms="Net 15",
    )
    db.add(sub1)
    db.flush()

    line1 = SubscriptionLine(
        subscription_id=sub1.id,
        product_id=p1.id,
        variant_id=v1.id,
        quantity=3,
        unit_price=Decimal("2060.00"),
        tax_rate=Decimal("18.00"),
        amount=Decimal("7292.40"),
    )
    db.add(line1)
    db.commit()

    # Generate historical invoice and pay it
    inv1 = generate_subscription_invoice(
        db=db,
        subscription_id=sub1.id,
        period_start=last_month_start,
        period_end=last_month_end,
        due_date=last_month_start + timedelta(days=15),
    )
    record_invoice_payment(
        db=db,
        invoice_id=inv1.id,
        amount=inv1.total_amount,
        payment_method="bank_transfer",
        payment_date=last_month_start + timedelta(days=5),
        notes="NEFT Settlement Ref #NFT982341",
    )

    # Current period invoice (unpaid/outstanding)
    current_period_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    generate_subscription_invoice(
        db=db,
        subscription_id=sub1.id,
        period_start=today.replace(day=1),
        period_end=current_period_end,
        due_date=today + timedelta(days=15),
    )

    db.close()


if __name__ == "__main__":
    seed_database()

