from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import Subscription
from app.models.plan import SubscriptionPlan
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.customer import Customer
from app.schemas.dashboard import DashboardSummaryResponse


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    today = date.today()

    active_subs = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.status.in_(["active", "confirmed"]))
        .scalar()
        or 0
    )

    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .filter(Payment.status == "success")
        .scalar()
    )

    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.outstanding_balance), Decimal("0.00")))
        .filter(Invoice.status != "cancelled")
        .scalar()
    )

    overdue_query = db.query(
        func.count(Invoice.id),
        func.coalesce(func.sum(Invoice.outstanding_balance), Decimal("0.00")),
    ).filter(
        Invoice.due_date < today,
        Invoice.status.notin_(["paid", "cancelled"]),
    ).first()

    overdue_count = overdue_query[0] or 0
    overdue_amount = overdue_query[1] or Decimal("0.00")

    interval_counts_raw = (
        db.query(SubscriptionPlan.billing_interval, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == SubscriptionPlan.id)
        .filter(Subscription.status.in_(["active", "confirmed"]))
        .group_by(SubscriptionPlan.billing_interval)
        .all()
    )
    subscriptions_by_interval = {interval: count for interval, count in interval_counts_raw}

    recent_payments = (
        db.query(Payment, Invoice, Customer)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .join(Customer, Invoice.customer_id == Customer.id)
        .order_by(Payment.id.desc())
        .limit(5)
        .all()
    )

    recent_activity = [
        {
            "type": "payment",
            "reference": pay.payment_number,
            "customer_name": cust.name,
            "amount": pay.amount,
            "date": pay.payment_date.isoformat(),
        }
        for pay, inv, cust in recent_payments
    ]

    return DashboardSummaryResponse(
        active_subscriptions_count=active_subs,
        total_revenue_collected=Decimal(str(total_revenue)),
        total_outstanding_receivables=Decimal(str(total_outstanding)),
        overdue_invoices_count=overdue_count,
        overdue_invoices_amount=Decimal(str(overdue_amount)),
        subscriptions_by_interval=subscriptions_by_interval,
        recent_activity=recent_activity,
    )

