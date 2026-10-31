from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceResponse
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment import record_invoice_payment

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    is_overdue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice)
    if customer_id:
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


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    return invoice


@router.post("/{invoice_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def add_payment(
    invoice_id: int,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
):
    payment = record_invoice_payment(
        db=db,
        invoice_id=invoice_id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        payment_date=payload.payment_date,
        notes=payload.notes,
    )

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

