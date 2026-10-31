from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import Subscription
from app.models.plan import SubscriptionPlan
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.customer import Customer
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    CustomerDashboardResponse,
    CustomerInvoiceItem,
    CustomerPaymentItem,
)


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


def get_customer_dashboard_summary(db: Session, customer_id: int) -> CustomerDashboardResponse:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} does not exist.",
        )

    # 1. Customer's own active subscriptions
    active_subs = (
        db.query(func.count(Subscription.id))
        .filter(
            Subscription.customer_id == customer_id,
            Subscription.status.in_(["active", "confirmed"]),
        )
        .scalar()
        or 0
    )

    # 2. Customer's own total paid amount
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(
            Invoice.customer_id == customer_id,
            Payment.status == "success",
        )
        .scalar()
    )

    # 3. Customer's own outstanding balance
    outstanding_bal = (
        db.query(func.coalesce(func.sum(Invoice.outstanding_balance), Decimal("0.00")))
        .filter(
            Invoice.customer_id == customer_id,
            Invoice.status != "cancelled",
        )
        .scalar()
    )

    # 4. Invoices count
    inv_count = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.customer_id == customer_id,
            Invoice.status != "cancelled",
        )
        .scalar()
        or 0
    )

    # 5. Next billing date
    next_bill = (
        db.query(func.min(Subscription.next_billing_date))
        .filter(
            Subscription.customer_id == customer_id,
            Subscription.status.in_(["active", "confirmed"]),
        )
        .scalar()
    )

    # 6. Customer's recent invoices
    recent_invoices_raw = (
        db.query(Invoice)
        .filter(Invoice.customer_id == customer_id)
        .order_by(Invoice.id.desc())
        .limit(5)
        .all()
    )
    recent_invoices = [
        CustomerInvoiceItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            issue_date=inv.issue_date,
            due_date=inv.due_date,
            status=inv.status,
            total_amount=inv.total_amount,
            amount_paid=inv.amount_paid,
            outstanding_balance=inv.outstanding_balance,
        )
        for inv in recent_invoices_raw
    ]

    # 7. Customer's recent payments
    recent_payments_raw = (
        db.query(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(Invoice.customer_id == customer_id)
        .order_by(Payment.id.desc())
        .limit(5)
        .all()
    )
    recent_payments = [
        CustomerPaymentItem(
            id=pay.id,
            payment_number=pay.payment_number,
            invoice_id=pay.invoice_id,
            amount=pay.amount,
            payment_method=pay.payment_method,
            payment_date=pay.payment_date,
        )
        for pay in recent_payments_raw
    ]

    return CustomerDashboardResponse(
        customer_id=customer.id,
        customer_name=customer.name,
        active_subscriptions_count=active_subs,
        total_paid=Decimal(str(total_paid)),
        outstanding_balance=Decimal(str(outstanding_bal)),
        invoices_count=inv_count,
        next_billing_date=next_bill,
        recent_invoices=recent_invoices,
        recent_payments=recent_payments,
    )
