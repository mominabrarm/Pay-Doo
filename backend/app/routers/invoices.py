import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.invoice import InvoiceResponse
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.schemas.intelligence import InvoiceExplanationResponse
from app.services.billing import generate_subscription_invoice
from app.services.payment import record_invoice_payment
from app.services.pdf import generate_invoice_pdf
from app.services.explain import explain_invoice_bill
from app.services.auth import (
    get_current_user,
    get_optional_current_user,
    security_bearer,
    decode_access_token,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def add_months(sourcedate: date, months: int) -> date:
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def add_years(sourcedate: date, years: int) -> date:
    try:
        return sourcedate.replace(year=sourcedate.year + years)
    except ValueError:
        return date(sourcedate.year + years, 2, 28)


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    is_overdue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice)

    # Enforce customer-level isolation
    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        if current_user.customer_id:
            query = query.filter(Invoice.customer_id == current_user.customer_id)
        else:
            return []
    elif customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    if status_filter:
        query = query.filter(Invoice.status == status_filter)
    if is_overdue is True:
        query = query.filter(
            Invoice.due_date < date.today(),
            Invoice.status.notin_(["paid", "cancelled"]),
        )
    elif is_overdue is False:
        query = query.filter(
            (Invoice.due_date >= date.today()) | (Invoice.status == "paid")
        )

    return query.order_by(Invoice.id.desc()).offset(skip).limit(limit).all()


@router.get("/payments/history", response_model=List[PaymentResponse])
def get_payment_history(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Payment).join(Invoice, Payment.invoice_id == Invoice.id)
    if current_user and current_user.role == "customer":
        if not current_user.customer_id:
            cust = db.query(Customer).filter(Customer.email == current_user.email).first()
            if cust:
                current_user.customer_id = cust.id
                db.commit()
                db.refresh(current_user)
        if current_user.customer_id:
            query = query.filter(Invoice.customer_id == current_user.customer_id)
        else:
            return []

    payments = query.order_by(Payment.id.desc()).limit(100).all()
    results = []
    for pay in payments:
        inv = pay.invoice
        results.append(
            PaymentResponse(
                payment_id=pay.id,
                payment_number=pay.payment_number,
                invoice_id=pay.invoice_id,
                amount=pay.amount,
                payment_method=pay.payment_method,
                payment_date=pay.payment_date,
                notes=pay.notes,
                status=pay.status,
                invoice_status=inv.status if inv else "confirmed",
                invoice_amount_paid=inv.amount_paid if inv else pay.amount,
                invoice_outstanding_balance=inv.outstanding_balance if inv else Decimal("0.00"),
            )
        )
    return results


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    # Enforce customer ownership check
    if current_user and current_user.role == "customer":
        if not current_user.customer_id or current_user.customer_id != invoice.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only view their own invoices.",
            )

    return invoice


@router.get("/{invoice_id}/explain", response_model=InvoiceExplanationResponse)
def explain_invoice_endpoint(
    invoice_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    req_customer_id = None
    if current_user and current_user.role == "customer":
        req_customer_id = current_user.customer_id
    return explain_invoice_bill(db, invoice_id, requesting_customer_id=req_customer_id)


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    token: Optional[str] = Query(None),
    auth=Depends(security_bearer),
    db: Session = Depends(get_db),
):
    # Support both Bearer Authorization header and query param token for browser downloads
    raw_token = None
    if auth and auth.credentials:
        raw_token = auth.credentials
    elif token:
        raw_token = token

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    current_user = None
    is_signed_invoice_token = False
    if raw_token:
        try:
            payload = decode_access_token(raw_token)
            if payload.get("purpose") == "invoice_download":
                token_inv_id = payload.get("invoice_id")
                token_cust_id = payload.get("customer_id")
                if token_inv_id != invoice_id or (token_cust_id and token_cust_id != invoice.customer_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Token is not valid for this invoice.",
                    )
                is_signed_invoice_token = True
            else:
                user_id = payload.get("sub")
                if user_id:
                    current_user = db.query(User).filter(User.id == int(user_id)).first()
        except HTTPException as e:
            if raw_token and not current_user and not is_signed_invoice_token:
                raise e

    if not is_signed_invoice_token and current_user and current_user.role == "customer":
        if not current_user.customer_id or current_user.customer_id != invoice.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only download their own invoices.",
            )

    pdf_buffer = generate_invoice_pdf(invoice)
    filename = f"Invoice-{invoice.invoice_number}.pdf"

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )


@router.post("/{invoice_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def add_payment(
    invoice_id: int,
    payload: PaymentCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    # If authenticated as customer, verify invoice belongs to customer
    if current_user and current_user.role == "customer":
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
        if not current_user.customer_id or current_user.customer_id != inv.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Customers may only pay their own invoices.",
            )

    payment = record_invoice_payment(
        db=db,
        invoice_id=invoice_id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        payment_date=payload.payment_date,
        notes=payload.notes,
    )

    try:
        from app.services.notification import dispatch_payment_notifications
        dispatch_payment_notifications(db, payment)
    except Exception:
        pass

    return PaymentResponse(
        payment_id=payment.id,
        payment_number=payment.payment_number,
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        payment_date=payment.payment_date,
        notes=payment.notes,
        status=payment.status,
        invoice_status=payment.invoice.status,
        invoice_amount_paid=payment.invoice.amount_paid,
        invoice_outstanding_balance=payment.invoice.outstanding_balance,
    )


@router.post("/run-billing-cycle", status_code=status.HTTP_200_OK)
def run_automated_billing_cycle(
    target_date: Optional[date] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers are not permitted to trigger billing cycles.",
        )

    run_date = target_date or date.today()
    due_subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.status.in_(["active", "confirmed"]),
            Subscription.next_billing_date <= run_date,
        )
        .all()
    )

    invoices_generated = 0
    total_billed = Decimal("0.00")
    skipped_count = 0

    for sub in due_subscriptions:
        p_start = sub.next_billing_date
        interval = sub.plan.billing_interval

        if interval == "daily":
            p_end = p_start
            next_date = p_start + timedelta(days=1)
        elif interval == "weekly":
            p_end = p_start + timedelta(days=6)
            next_date = p_start + timedelta(days=7)
        elif interval == "yearly":
            next_date = add_years(p_start, 1)
            p_end = next_date - timedelta(days=1)
        else:  # monthly
            next_date = add_months(p_start, 1)
            p_end = next_date - timedelta(days=1)

        try:
            inv = generate_subscription_invoice(
                db=db,
                subscription_id=sub.id,
                period_start=p_start,
                period_end=p_end,
                due_date=p_start + timedelta(days=15),
            )
            sub.next_billing_date = next_date
            db.commit()
            invoices_generated += 1
            total_billed += Decimal(str(inv.total_amount))
            try:
                from app.services.notification import dispatch_invoice_notifications
                dispatch_invoice_notifications(db, inv)
            except Exception:
                pass
        except HTTPException as e:
            if e.status_code == status.HTTP_409_CONFLICT:
                skipped_count += 1
            else:
                pass

    return {
        "status": "success",
        "run_date": run_date.isoformat(),
        "invoices_generated": invoices_generated,
        "total_billed": total_billed,
        "skipped_already_billed": skipped_count,
    }
