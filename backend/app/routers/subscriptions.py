import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.plan import SubscriptionPlan
from app.models.product import Product, ProductVariant
from app.models.subscription import Subscription, SubscriptionLine
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    CustomerSubscribeRequest,
    SubscriptionResponse,
    SubscriptionStatusUpdate,
)
from app.schemas.invoice import InvoiceGenerateRequest, InvoiceResponse
from app.services.billing import generate_subscription_invoice, round_currency
from app.services.auth import get_optional_current_user, get_current_user
from app.routers.invoices import add_months, add_years

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

VALID_TRANSITIONS = {
    "draft": ["quotation", "confirmed", "active", "closed"],
    "quotation": ["confirmed", "closed"],
    "confirmed": ["active", "closed"],
    "active": ["paused", "closed"],
    "paused": ["active", "closed"],
    "closed": [],
}


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers cannot create subscriptions directly.",
        )

    customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active customer not found.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id, SubscriptionPlan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active subscription plan not found.")

    if not payload.lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subscription must contain at least one product line.")

    unique_suffix = uuid.uuid4().hex[:6].upper()
    sub_number = f"SUB-{payload.start_date.year}-{unique_suffix}"

    subscription = Subscription(
        subscription_number=sub_number,
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        discount_rule_id=payload.discount_rule_id,
        status=payload.status,
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


@router.post("/subscribe", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def customer_subscribe(
    payload: CustomerSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-link customer if missing
    if not current_user.customer_id:
        cust = db.query(Customer).filter(Customer.email == current_user.email).first()
        if not cust:
            cust = Customer(
                name=current_user.full_name or current_user.email.split("@")[0].title(),
                email=current_user.email,
                is_active=True,
            )
            db.add(cust)
            db.flush()
        current_user.customer_id = cust.id
        db.commit()
        db.refresh(current_user)

    customer = db.query(Customer).filter(Customer.id == current_user.customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found.")

    product = db.query(Product).filter(Product.id == payload.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or inactive.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id, SubscriptionPlan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found or inactive.")

    variant = None
    price_extra = Decimal("0.00")
    if payload.variant_id:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == payload.variant_id,
            ProductVariant.product_id == product.id,
        ).first()
        if not variant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product variant not found.")
        price_extra = Decimal(str(variant.price_extra))

    # Authoritative unit price from catalog (sales_price + variant price_extra)
    unit_price = Decimal(str(product.sales_price)) + price_extra
    tax_rate = Decimal("18.00")

    sub_start = payload.start_date or date.today()
    unique_suffix = uuid.uuid4().hex[:6].upper()
    sub_number = f"SUB-{sub_start.year}-{unique_suffix}"

    subscription = Subscription(
        subscription_number=sub_number,
        customer_id=customer.id,
        plan_id=plan.id,
        status="active",
        start_date=sub_start,
        next_billing_date=sub_start,
        payment_terms=payload.payment_terms,
    )
    db.add(subscription)
    db.flush()

    line_subtotal = round_currency(unit_price * Decimal(str(payload.quantity)))
    tax_amount = round_currency(line_subtotal * (tax_rate / Decimal("100.00")))
    line_total = line_subtotal + tax_amount

    sub_line = SubscriptionLine(
        subscription_id=subscription.id,
        product_id=product.id,
        variant_id=variant.id if variant else None,
        quantity=payload.quantity,
        unit_price=unit_price,
        tax_rate=tax_rate,
        amount=line_total,
    )
    db.add(sub_line)
    db.flush()

    # Automatically generate initial invoice for the subscription's first billing cycle
    try:
        if plan.billing_interval == "daily":
            period_end = sub_start
        elif plan.billing_interval == "weekly":
            period_end = sub_start + timedelta(days=6)
        elif plan.billing_interval == "monthly":
            period_end = add_months(sub_start, 1) - timedelta(days=1)
        elif plan.billing_interval == "yearly":
            period_end = add_years(sub_start, 1) - timedelta(days=1)
        else:
            period_end = add_months(sub_start, 1) - timedelta(days=1)

        generate_subscription_invoice(
            db=db,
            subscription_id=subscription.id,
            period_start=sub_start,
            period_end=period_end,
            due_date=sub_start + timedelta(days=15),
        )
    except Exception:
        pass

    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("", response_model=List[SubscriptionResponse])
def list_subscriptions(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Subscription)

    # Scoped to authenticated customer
    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        if current_user.customer_id:
            query = query.filter(Subscription.customer_id == current_user.customer_id)
        else:
            return []
    elif customer_id:
        query = query.filter(Subscription.customer_id == customer_id)

    if status_filter:
        query = query.filter(Subscription.status == status_filter)
    return query.order_by(Subscription.id.desc()).offset(skip).limit(limit).all()


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if current_user and current_user.role == "customer":
        if not current_user.customer_id or current_user.customer_id != sub.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only view their own subscriptions.",
            )

    return sub


@router.patch("/{subscription_id}/status", response_model=SubscriptionResponse)
def update_subscription_status(
    subscription_id: int,
    payload: SubscriptionStatusUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if current_user and current_user.role == "customer":
        if not current_user.customer_id or current_user.customer_id != sub.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only modify their own subscriptions.",
            )

    current_status = sub.status
    target_status = payload.status

    if current_status == target_status:
        return sub

    allowed = VALID_TRANSITIONS.get(current_status, [])
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from '{current_status}' to '{target_status}'. Allowed transitions: {allowed}",
        )

    if target_status == "paused" and not sub.plan.allow_pause:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pausing is not permitted by this subscription's plan policy.",
        )

    sub.status = target_status
    db.commit()
    db.refresh(sub)
    return sub


@router.post("/{subscription_id}/generate-invoice", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def generate_invoice(
    subscription_id: int,
    payload: InvoiceGenerateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers cannot generate invoices manually.",
        )

    return generate_subscription_invoice(
        db=db,
        subscription_id=subscription_id,
        period_start=payload.billing_period_start,
        period_end=payload.billing_period_end,
        due_date=payload.due_date,
    )
