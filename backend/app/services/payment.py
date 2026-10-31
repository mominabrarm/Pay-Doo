from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.services.billing import round_currency


def record_invoice_payment(
    db: Session,
    invoice_id: int,
    amount: Decimal,
    payment_method: str,
    payment_date: date,
    notes: str = None,
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

    payment_amount = round_currency(amount)
    current_outstanding = round_currency(Decimal(str(invoice.outstanding_balance)))

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

    payment_count = db.query(Payment).count() + 1
    payment_number = f"PAY-{payment_date.year}-{payment_count:05d}"

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
