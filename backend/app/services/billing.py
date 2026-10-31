from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.subscription import Subscription
from app.models.invoice import Invoice, InvoiceLine
from app.models.discount import DiscountRule


def round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def generate_subscription_invoice(
    db: Session,
    subscription_id: int,
    period_start: date,
    period_end: date,
    due_date: date,
) -> Invoice:
    if period_start > period_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing period start date cannot be after end date.",
        )

    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if subscription.status not in ["active", "confirmed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate invoice for subscription in '{subscription.status}' state.",
        )

    existing_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id == subscription_id,
            Invoice.billing_period_start == period_start,
            Invoice.billing_period_end == period_end,
        )
        .first()
    )
    if existing_invoice:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice already generated for subscription {subscription_id} and period {period_start} to {period_end}.",
        )

    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_quantity = 0
    invoice_lines_data = []

    for line in subscription.lines:
        line_subtotal = round_currency(Decimal(str(line.unit_price)) * Decimal(str(line.quantity)))
        tax_rate = Decimal(str(line.tax_rate))
        line_tax = round_currency(line_subtotal * (tax_rate / Decimal("100.00")))
        line_total = line_subtotal + line_tax

        subtotal += line_subtotal
        total_tax += line_tax
        total_quantity += line.quantity

        desc = line.product.name
        if line.variant:
            desc += f" ({line.variant.variant_name})"

        invoice_lines_data.append(
            {
                "product_id": line.product_id,
                "variant_id": line.variant_id,
                "description": desc,
                "quantity": line.quantity,
                "unit_price": line.unit_price,
                "tax_rate": line.tax_rate,
                "tax_amount": line_tax,
                "subtotal": line_subtotal,
                "total_amount": line_total,
            }
        )

    discount_amount = Decimal("0.00")
    if subscription.discount_rule_id:
        discount_rule = (
            db.query(DiscountRule)
            .filter(DiscountRule.id == subscription.discount_rule_id, DiscountRule.is_active == True)
            .first()
        )
        if discount_rule:
            today = date.today()
            is_valid_date = (not discount_rule.start_date or discount_rule.start_date <= today) and (
                not discount_rule.end_date or discount_rule.end_date >= today
            )
            has_uses_left = discount_rule.max_uses is None or discount_rule.current_uses < discount_rule.max_uses
            meets_threshold = (
                subtotal >= Decimal(str(discount_rule.min_purchase_amount))
                and total_quantity >= discount_rule.min_quantity
            )

            if is_valid_date and has_uses_left and meets_threshold:
                if discount_rule.discount_type == "percentage":
                    discount_amount = round_currency(subtotal * (Decimal(str(discount_rule.value)) / Decimal("100.00")))
                else:
                    discount_amount = round_currency(Decimal(str(discount_rule.value)))

                if discount_amount > subtotal:
                    discount_amount = subtotal

                discount_rule.current_uses += 1

    total_amount = round_currency(subtotal - discount_amount + total_tax)
    invoice_count = db.query(Invoice).count() + 1
    invoice_number = f"INV-{period_start.year}-{invoice_count:05d}"

    invoice = Invoice(
        invoice_number=invoice_number,
        subscription_id=subscription.id,
        customer_id=subscription.customer_id,
        billing_period_start=period_start,
        billing_period_end=period_end,
        issue_date=date.today(),
        due_date=due_date,
        status="confirmed",
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=total_tax,
        total_amount=total_amount,
        amount_paid=Decimal("0.00"),
        outstanding_balance=total_amount,
    )

    db.add(invoice)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice already generated for subscription {subscription_id} and period {period_start} to {period_end}.",
        )

    for ldata in invoice_lines_data:
        inv_line = InvoiceLine(
            invoice_id=invoice.id,
            product_id=ldata["product_id"],
            variant_id=ldata["variant_id"],
            description=ldata["description"],
            quantity=ldata["quantity"],
            unit_price=ldata["unit_price"],
            tax_rate=ldata["tax_rate"],
            tax_amount=ldata["tax_amount"],
            subtotal=ldata["subtotal"],
            total_amount=ldata["total_amount"],
        )
        db.add(inv_line)

    db.commit()
    db.refresh(invoice)
    return invoice
