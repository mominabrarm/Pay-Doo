import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.services.billing import round_currency

VALID_PAYMENT_METHODS = {"bank_transfer", "credit_card", "upi", "cash"}


def record_invoice_payment(
    db: Session,
    invoice_id: int,
    amount: Decimal,
    payment_method: str,
    payment_date: date,
    notes: Optional[str] = None,
) -> Payment:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if invoice.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already fully paid.",
        )
    if invoice.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment on a cancelled invoice.",
        )
    if invoice.status == "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment on a draft invoice. Confirm invoice first.",
        )

    if payment_method not in VALID_PAYMENT_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment method '{payment_method}'. Allowed: {', '.join(sorted(VALID_PAYMENT_METHODS))}.",
        )

    payment_amount = round_currency(amount)
    current_outstanding = round_currency(Decimal(str(invoice.outstanding_balance)))

    if notes and notes.strip():
        existing_dup = (
            db.query(Payment)
            .filter(
                Payment.invoice_id == invoice.id,
                Payment.notes == notes.strip(),
                Payment.amount == payment_amount,
                Payment.status == "success",
            )
            .first()
        )
        if existing_dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate payment detected: payment with reference '{notes.strip()}' already recorded.",
            )

    if payment_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero.",
        )

    if payment_amount > current_outstanding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({payment_amount}) exceeds outstanding balance ({current_outstanding}).",
        )

    unique_suffix = uuid.uuid4().hex[:6].upper()
    payment_number = f"PAY-{payment_date.year}-{unique_suffix}"

    payment = Payment(
        payment_number=payment_number,
        invoice_id=invoice.id,
        payment_method=payment_method,
        amount=payment_amount,
        payment_date=payment_date,
        notes=notes,
        status="success",
    )
    db.add(payment)

    new_amount_paid = round_currency(Decimal(str(invoice.amount_paid)) + payment_amount)
    new_outstanding = round_currency(current_outstanding - payment_amount)

    invoice.amount_paid = new_amount_paid
    invoice.outstanding_balance = new_outstanding

    if new_outstanding == Decimal("0.00"):
        invoice.status = "paid"

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)
    return payment
