from datetime import date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.invoice import Invoice, InvoiceLine
from app.models.subscription import Subscription
from app.models.payment import Payment
from app.schemas.intelligence import (
    InvoiceExplanationResponse,
    InvoiceLineExplanation,
    InvoiceComparisonItem,
)
from app.services.billing import round_currency


def explain_invoice_bill(
    db: Session,
    invoice_id: int,
    requesting_customer_id: Optional[int] = None,
) -> InvoiceExplanationResponse:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice #{invoice_id} not found.",
        )

    # Customer isolation
    if requesting_customer_id is not None and invoice.customer_id != requesting_customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only view billing explanations for your own invoices.",
        )

    sub = invoice.subscription
    plan_name = sub.plan.name if sub and sub.plan else "Custom Subscription"
    interval = sub.plan.billing_interval if sub and sub.plan else "monthly"
    sub_num = sub.subscription_number if sub else f"SUB-{invoice.subscription_id}"
    customer_name = invoice.customer.name if invoice.customer else f"Customer #{invoice.customer_id}"

    # Billing period duration in days
    period_days = (invoice.billing_period_end - invoice.billing_period_start).days + 1

    # Line item explanations
    lines_explanation: List[InvoiceLineExplanation] = []
    for line in invoice.lines:
        lines_explanation.append(
            InvoiceLineExplanation(
                id=line.id,
                description=line.description,
                quantity=line.quantity,
                unit_price=round_currency(Decimal(str(line.unit_price))),
                tax_rate=round_currency(Decimal(str(line.tax_rate))),
                tax_amount=round_currency(Decimal(str(line.tax_amount))),
                discount_amount=round_currency(Decimal(str(line.discount_amount))),
                subtotal=round_currency(Decimal(str(line.subtotal))),
                total_amount=round_currency(Decimal(str(line.total_amount))),
            )
        )

    # Payment receipts associated with this invoice
    payments_raw = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice.id, Payment.status == "success")
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .all()
    )
    payments: List[Dict[str, Any]] = [
        {
            "id": p.id,
            "payment_number": p.payment_number,
            "amount": float(p.amount),
            "payment_method": p.payment_method.replace("_", " ").title(),
            "payment_date": p.payment_date.isoformat(),
        }
        for p in payments_raw
    ]

    # Friendly summary text
    friendly_summary = (
        f"Invoice {invoice.invoice_number} is ₹{invoice.total_amount:,.2f}.\n"
        f"• Base service subtotal: ₹{invoice.subtotal:,.2f}\n"
    )
    if Decimal(str(invoice.discount_amount)) > Decimal("0.00"):
        friendly_summary += f"• Promotional discount: −₹{invoice.discount_amount:,.2f}\n"
    if Decimal(str(invoice.tax_amount)) > Decimal("0.00"):
        friendly_summary += f"• Taxes applied: +₹{invoice.tax_amount:,.2f}\n"

    friendly_summary += f"• Total invoice charge: ₹{invoice.total_amount:,.2f}\n"
    friendly_summary += f"• Payments credited: ₹{invoice.amount_paid:,.2f}\n"
    friendly_summary += f"• Remaining balance: ₹{invoice.outstanding_balance:,.2f}"

    # Previous Invoice Comparison
    prev_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id == invoice.subscription_id,
            Invoice.id != invoice.id,
            Invoice.billing_period_start < invoice.billing_period_start,
            Invoice.status != "cancelled",
        )
        .order_by(Invoice.billing_period_start.desc(), Invoice.id.desc())
        .first()
    )

    comparison_metrics: List[InvoiceComparisonItem] = []
    comparison_summary: Optional[str] = None
    has_prev = False
    prev_id = None
    prev_num = None
    prev_tot = None

    if prev_invoice:
        has_prev = True
        prev_id = prev_invoice.id
        prev_num = prev_invoice.invoice_number
        prev_tot = round_currency(Decimal(str(prev_invoice.total_amount)))

        curr_sub = round_currency(Decimal(str(invoice.subtotal)))
        prev_sub = round_currency(Decimal(str(prev_invoice.subtotal)))
        diff_sub = curr_sub - prev_sub

        curr_disc = round_currency(Decimal(str(invoice.discount_amount)))
        prev_disc = round_currency(Decimal(str(prev_invoice.discount_amount)))
        diff_disc = curr_disc - prev_disc

        curr_tax = round_currency(Decimal(str(invoice.tax_amount)))
        prev_tax = round_currency(Decimal(str(prev_invoice.tax_amount)))
        diff_tax = curr_tax - prev_tax

        curr_tot = round_currency(Decimal(str(invoice.total_amount)))
        diff_tot = curr_tot - prev_tot

        pct_change = (
            round_currency((diff_tot / prev_tot) * Decimal("100.00"))
            if prev_tot > Decimal("0.00")
            else None
        )

        comparison_metrics.append(
            InvoiceComparisonItem(
                metric_name="Subtotal",
                current_value=curr_sub,
                previous_value=prev_sub,
                difference=diff_sub,
                percentage_change=(
                    round_currency((diff_sub / prev_sub) * Decimal("100.00"))
                    if prev_sub > Decimal("0.00")
                    else None
                ),
                explanation=(
                    f"Subtotal changed by ₹{diff_sub:+,.2f} based on line item pricing and quantities."
                    if diff_sub != Decimal("0.00")
                    else "Base service charges remained identical."
                ),
            )
        )

        if curr_disc > Decimal("0.00") or prev_disc > Decimal("0.00"):
            comparison_metrics.append(
                InvoiceComparisonItem(
                    metric_name="Discount Savings",
                    current_value=curr_disc,
                    previous_value=prev_disc,
                    difference=diff_disc,
                    explanation=(
                        f"Promotional discount variance of ₹{diff_disc:+,.2f} between billing periods."
                        if diff_disc != Decimal("0.00")
                        else "Applied promotional discount remained identical."
                    ),
                )
            )

        comparison_metrics.append(
            InvoiceComparisonItem(
                metric_name="Tax Amount",
                current_value=curr_tax,
                previous_value=prev_tax,
                difference=diff_tax,
                explanation=(
                    f"Tax calculation adjusted by ₹{diff_tax:+,.2f} proportional to taxable subtotal."
                    if diff_tax != Decimal("0.00")
                    else "Tax amount remained unchanged."
                ),
            )
        )

        comparison_metrics.append(
            InvoiceComparisonItem(
                metric_name="Total Invoice Amount",
                current_value=curr_tot,
                previous_value=prev_tot,
                difference=diff_tot,
                percentage_change=pct_change,
                explanation=(
                    f"Net invoice bill difference: ₹{diff_tot:+,.2f} ({pct_change:+,.2f}%)."
                    if diff_tot != Decimal("0.00")
                    else "Total bill amount is identical to previous billing cycle."
                ),
            )
        )

        if diff_tot > Decimal("0.00"):
            comparison_summary = (
                f"Your invoice increased by ₹{diff_tot:,.2f} (+{pct_change}%) compared to "
                f"previous invoice {prev_num} (₹{prev_tot:,.2f})."
            )
        elif diff_tot < Decimal("0.00"):
            comparison_summary = (
                f"Your invoice decreased by ₹{abs(diff_tot):,.2f} ({pct_change}%) compared to "
                f"previous invoice {prev_num} (₹{prev_tot:,.2f})."
            )
        else:
            comparison_summary = (
                f"Your invoice total is identical to previous invoice {prev_num} (₹{prev_tot:,.2f})."
            )
    else:
        comparison_summary = (
            f"This is the initial invoice for Subscription {sub_num}. "
            "No prior billing cycle exists for direct comparison."
        )

    return InvoiceExplanationResponse(
        invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        customer_id=invoice.customer_id,
        customer_name=customer_name,
        subscription_id=invoice.subscription_id,
        subscription_number=sub_num,
        plan_name=plan_name,
        billing_interval=interval,
        billing_period_start=invoice.billing_period_start,
        billing_period_end=invoice.billing_period_end,
        billing_period_days=period_days,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        status=invoice.status,
        subtotal=round_currency(Decimal(str(invoice.subtotal))),
        discount_amount=round_currency(Decimal(str(invoice.discount_amount))),
        tax_amount=round_currency(Decimal(str(invoice.tax_amount))),
        total_amount=round_currency(Decimal(str(invoice.total_amount))),
        amount_paid=round_currency(Decimal(str(invoice.amount_paid))),
        outstanding_balance=round_currency(Decimal(str(invoice.outstanding_balance))),
        lines=lines_explanation,
        payments=payments,
        friendly_summary=friendly_summary,
        has_previous_invoice=has_prev,
        previous_invoice_id=prev_id,
        previous_invoice_number=prev_num,
        previous_invoice_total=prev_tot,
        comparison_metrics=comparison_metrics,
        comparison_summary=comparison_summary,
    )

