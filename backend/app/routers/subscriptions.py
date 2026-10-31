from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.plan import SubscriptionPlan
from app.models.product import Product
from app.models.subscription import Subscription, SubscriptionLine
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionStatusUpdate,
)
from app.schemas.invoice import InvoiceGenerateRequest, InvoiceResponse
from app.services.billing import generate_subscription_invoice, round_currency

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(payload: SubscriptionCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active customer not found.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id, SubscriptionPlan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active subscription plan not found.")

    if not payload.lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subscription must contain at least one product line.")

    sub_count = db.query(Subscription).count() + 1
    sub_number = f"SUB-{payload.start_date.year}-{sub_count:05d}"

    subscription = Subscription(
        subscription_number=sub_number,
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        discount_rule_id=payload.discount_rule_id,
        status="active",
        start_date=payload.start_date,
        expiry_date=payload.expiry_date,
        next_billing_date=payload.start_date,
        payment_terms=payload.payment_terms,
    )
    db.add(subscription)
    db.flush()

    for line in payload.lines:
        prod = db.query(Product).filter(Product.id == line.product_id).first()
        if not prod:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {line.product_id} not found.")

        line_subtotal = round_currency(Decimal(str(line.unit_price)) * Decimal(str(line.quantity)))
        tax_rate = Decimal(str(line.tax_rate))
        tax_amount = round_currency(line_subtotal * (tax_rate / Decimal("100.00")))
        line_total = line_subtotal + tax_amount

        sub_line = SubscriptionLine(
            subscription_id=subscription.id,
            product_id=line.product_id,
            variant_id=line.variant_id,
            quantity=line.quantity,
            unit_price=line.unit_price,
            tax_rate=line.tax_rate,
            amount=line_total,
        )
        db.add(sub_line)

    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("", response_model=List[SubscriptionResponse])
def list_subscriptions(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Subscription)
    if customer_id:
        query = query.filter(Subscription.customer_id == customer_id)
    if status_filter:
        query = query.filter(Subscription.status == status_filter)
    return query.order_by(Subscription.id.desc()).offset(skip).limit(limit).all()


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(subscription_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")
    return sub


@router.patch("/{subscription_id}/status", response_model=SubscriptionResponse)
def update_subscription_status(
    subscription_id: int,
    payload: SubscriptionStatusUpdate,
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if payload.status == "paused" and not sub.plan.allow_pause:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pausing is not permitted by this subscription's plan policy.",
        )

    sub.status = payload.status
    db.commit()
    db.refresh(sub)
    return sub


@router.post("/{subscription_id}/generate-invoice", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def generate_invoice(
    subscription_id: int,
    payload: InvoiceGenerateRequest,
    db: Session = Depends(get_db),
):
    return generate_subscription_invoice(
        db=db,
        subscription_id=subscription_id,
        period_start=payload.billing_period_start,
        period_end=payload.billing_period_end,
        due_date=payload.due_date,
    )

