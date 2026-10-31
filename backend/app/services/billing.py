import uuid
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


def validate_billing_period(subscription: Subscription, period_start: date, period_end: date):
    if period_start > period_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing period start date cannot be after end date.",
        )

    if period_start < subscription.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Billing period start ({period_start}) cannot be before subscription start date ({subscription.start_date}).",
        )

    if subscription.expiry_date and period_end > subscription.expiry_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Billing period end ({period_end}) cannot exceed subscription expiry date ({subscription.expiry_date}).",
        )

    interval = subscription.plan.billing_interval
    duration_days = (period_end - period_start).days + 1

    if interval == "daily" and duration_days != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Daily billing plan requires a 1-day period (got {duration_days} days).",
        )
    elif interval == "weekly" and duration_days != 7:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Weekly billing plan requires a 7-day period (got {duration_days} days).",
        )
    elif interval == "monthly" and not (28 <= duration_days <= 31):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Monthly billing plan requires a 28-31 day period (got {duration_days} days).",
        )
    elif interval == "yearly" and not (365 <= duration_days <= 366):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Yearly billing plan requires a 365-366 day period (got {duration_days} days).",
        )


def generate_subscription_invoice(
    db: Session,
    subscription_id: int,
    period_start: date,
    period_end: date,
    due_date: date,
) -> Invoice:
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if subscription.status not in ["active", "confirmed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate invoice for subscription in '{subscription.status}' state.",
        )

    validate_billing_period(subscription, period_start, period_end)

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
    total_quantity = 0
    lines_pre_calc = []

    for line in subscription.lines:
        line_subtotal = round_currency(Decimal(str(line.unit_price)) * Decimal(str(line.quantity)))
        subtotal += line_subtotal
        total_quantity += line.quantity

        desc = line.product.name
        if line.variant:
            desc += f" ({line.variant.variant_name})"

        lines_pre_calc.append(
            {
                "product_id": line.product_id,
                "variant_id": line.variant_id,
                "description": desc,
                "quantity": line.quantity,
                "unit_price": line.unit_price,
                "tax_rate": Decimal(str(line.tax_rate)),
                "subtotal": line_subtotal,
            }
        )

    # Evaluate discount with row-level lock and atomic limit check
    total_discount = Decimal("0.00")
    if subscription.discount_rule_id:
        discount_rule = (
            db.query(DiscountRule)
            .filter(DiscountRule.id == subscription.discount_rule_id, DiscountRule.is_active == True)
            .with_for_update()
            .first()
        )
        if discount_rule:
            is_valid_period = (not discount_rule.start_date or discount_rule.start_date <= period_end) and (
                not discount_rule.end_date or discount_rule.end_date >= period_start
            )
            has_uses_left = discount_rule.max_uses is None or discount_rule.current_uses < discount_rule.max_uses
            meets_threshold = (
                subtotal >= Decimal(str(discount_rule.min_purchase_amount))
                and total_quantity >= discount_rule.min_quantity
            )

            if is_valid_period and has_uses_left and meets_threshold:
                if discount_rule.discount_type == "percentage":
                    total_discount = round_currency(subtotal * (Decimal(str(discount_rule.value)) / Decimal("100.00")))
                else:
                    total_discount = round_currency(Decimal(str(discount_rule.value)))

                if total_discount > subtotal:
                    total_discount = subtotal

                discount_rule.current_uses += 1

    # Allocate discount proportionally across lines for 100% reconciliation
    allocated_discount_sum = Decimal("0.00")
    total_tax = Decimal("0.00")
    invoice_lines_data = []

    for i, item in enumerate(lines_pre_calc):
        if subtotal > Decimal("0.00") and total_discount > Decimal("0.00"):
            if i == len(lines_pre_calc) - 1:
                line_discount = round_currency(total_discount - allocated_discount_sum)
            else:
                line_discount = round_currency(total_discount * (item["subtotal"] / subtotal))
                allocated_discount_sum += line_discount
        else:
            line_discount = Decimal("0.00")

        taxable_amount = item["subtotal"] - line_discount
        line_tax = round_currency(taxable_amount * (item["tax_rate"] / Decimal("100.00")))
        line_total = taxable_amount + line_tax
        total_tax += line_tax

        invoice_lines_data.append(
            {
                "product_id": item["product_id"],
                "variant_id": item["variant_id"],
                "description": item["description"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "discount_amount": line_discount,
                "tax_rate": item["tax_rate"],
                "tax_amount": line_tax,
                "subtotal": item["subtotal"],
                "total_amount": line_total,
            }
        )

    total_amount = round_currency(subtotal - total_discount + total_tax)
    unique_suffix = uuid.uuid4().hex[:6].upper()
    invoice_number = f"INV-{period_start.year}-{unique_suffix}"

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
        discount_amount=total_discount,
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
            discount_amount=ldata["discount_amount"],
            tax_rate=ldata["tax_rate"],
            tax_amount=ldata["tax_amount"],
            subtotal=ldata["subtotal"],
            total_amount=ldata["total_amount"],
        )
        db.add(inv_line)

    db.commit()
    db.refresh(invoice)
    return invoice
