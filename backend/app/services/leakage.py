from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import Subscription, SubscriptionLine
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.discount import DiscountRule
from app.models.leakage_alert import RevenueLeakageAlert
from app.schemas.intelligence import (
    LeakageAlertResponse,
    LeakageAlertUpdate,
    LeakageSummaryResponse,
)
from app.services.billing import round_currency


def scan_revenue_leakage(db: Session) -> List[RevenueLeakageAlert]:
    """
    Deterministic rule-based revenue leakage detection scanner.
    Analyzes live database records to flag billing discrepancies and potential revenue at risk.
    Guarantees idempotency via unique alert_key.
    """
    detected_alerts: List[Dict[str, Any]] = []

    # -------------------------------------------------------------
    # RULE 1: Cancelled subscription billed again (CANCELLED_SUB_BILLED)
    # -------------------------------------------------------------
    closed_subscriptions = (
        db.query(Subscription)
        .filter(Subscription.status.in_(["closed", "cancelled"]))
        .all()
    )
    for sub in closed_subscriptions:
        for inv in sub.invoices:
            if inv.status != "cancelled":
                alert_key = f"CANCELLED_SUB_BILLED:sub_{sub.id}:inv_{inv.id}"
                detected_alerts.append({
                    "rule_code": "CANCELLED_SUB_BILLED",
                    "alert_key": alert_key,
                    "title": f"Cancelled Subscription Billed: {sub.subscription_number}",
                    "description": (
                        f"Subscription {sub.subscription_number} is in '{sub.status}' status, "
                        f"but active invoice {inv.invoice_number} exists for billing period "
                        f"{inv.billing_period_start} to {inv.billing_period_end}."
                    ),
                    "severity": "critical",
                    "customer_id": sub.customer_id,
                    "subscription_id": sub.id,
                    "invoice_id": inv.id,
                    "amount_at_risk": round_currency(Decimal(str(inv.total_amount))),
                    "evidence": (
                        f"Subscription status is '{sub.status}'. "
                        f"Invoice {inv.invoice_number} is '{inv.status}' with total "
                        f"₹{inv.total_amount} and outstanding balance ₹{inv.outstanding_balance}."
                    ),
                    "recommended_action": (
                        "Verify subscription cancellation terms. If invoice was generated in error, "
                        "cancel or credit invoice to avoid erroneous customer charge."
                    ),
                })

    # -------------------------------------------------------------
    # RULE 2: Expired subscription receiving a new invoice (EXPIRED_SUB_BILLED)
    # -------------------------------------------------------------
    expired_subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.expiry_date.isnot(None),
            Subscription.expiry_date < date.today(),
        )
        .all()
    )
    for sub in expired_subscriptions:
        for inv in sub.invoices:
            if inv.status != "cancelled" and sub.expiry_date:
                if inv.billing_period_start > sub.expiry_date or inv.billing_period_end > sub.expiry_date:
                    alert_key = f"EXPIRED_SUB_BILLED:sub_{sub.id}:inv_{inv.id}"
                    detected_alerts.append({
                        "rule_code": "EXPIRED_SUB_BILLED",
                        "alert_key": alert_key,
                        "title": f"Expired Subscription Invoiced: {sub.subscription_number}",
                        "description": (
                            f"Subscription {sub.subscription_number} expired on {sub.expiry_date}, "
                            f"but invoice {inv.invoice_number} was issued for billing period "
                            f"{inv.billing_period_start} to {inv.billing_period_end}."
                        ),
                        "severity": "high",
                        "customer_id": sub.customer_id,
                        "subscription_id": sub.id,
                        "invoice_id": inv.id,
                        "amount_at_risk": round_currency(Decimal(str(inv.total_amount))),
                        "evidence": (
                            f"Contractual expiry date: {sub.expiry_date}. "
                            f"Invoice period start: {inv.billing_period_start}, end: {inv.billing_period_end}. "
                            f"Billed amount: ₹{inv.total_amount}."
                        ),
                        "recommended_action": (
                            "Contact customer to execute formal contract renewal, or cancel the post-expiry invoice."
                        ),
                    })

    # -------------------------------------------------------------
    # RULE 3: Duplicate invoice for the same subscription and billing period (DUPLICATE_INVOICE_PERIOD)
    # -------------------------------------------------------------
    all_invoices = (
        db.query(Invoice)
        .filter(Invoice.status != "cancelled")
        .order_by(Invoice.subscription_id, Invoice.billing_period_start, Invoice.id)
        .all()
    )
    seen_periods: Dict[str, Invoice] = {}
    for inv in all_invoices:
        period_key = f"{inv.subscription_id}:{inv.billing_period_start}:{inv.billing_period_end}"
        if period_key in seen_periods:
            prior_inv = seen_periods[period_key]
            alert_key = f"DUPLICATE_INVOICE_PERIOD:sub_{inv.subscription_id}:invs_{prior_inv.id}_{inv.id}"
            detected_alerts.append({
                "rule_code": "DUPLICATE_INVOICE_PERIOD",
                "alert_key": alert_key,
                "title": f"Duplicate Billing Detected: Period {inv.billing_period_start} to {inv.billing_period_end}",
                "description": (
                    f"Subscription #{inv.subscription_id} has duplicate active invoices for identical billing period "
                    f"{inv.billing_period_start} to {inv.billing_period_end}."
                ),
                "severity": "critical",
                "customer_id": inv.customer_id,
                "subscription_id": inv.subscription_id,
                "invoice_id": inv.id,
                "amount_at_risk": round_currency(Decimal(str(inv.total_amount))),
                "evidence": (
                    f"First invoice: {prior_inv.invoice_number} (₹{prior_inv.total_amount}). "
                    f"Duplicate invoice: {inv.invoice_number} (₹{inv.total_amount}). "
                    f"Both cover period {inv.billing_period_start} to {inv.billing_period_end}."
                ),
                "recommended_action": (
                    f"Void duplicate invoice {inv.invoice_number} and retain master invoice {prior_inv.invoice_number}."
                ),
            })
        else:
            seen_periods[period_key] = inv

    # -------------------------------------------------------------
    # RULE 4: Payment recorded but invoice balance not reconciled correctly (PAYMENT_UNRECONCILED)
    # -------------------------------------------------------------
    invoices_for_recon = db.query(Invoice).filter(Invoice.status != "cancelled").all()
    for inv in invoices_for_recon:
        payments_sum = (
            db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .filter(Payment.invoice_id == inv.id, Payment.status == "success")
            .scalar()
        )
        recorded_paid = round_currency(Decimal(str(inv.amount_paid)))
        recorded_total = round_currency(Decimal(str(inv.total_amount)))
        recorded_outstanding = round_currency(Decimal(str(inv.outstanding_balance)))
        actual_payments = round_currency(Decimal(str(payments_sum)))

        expected_outstanding = round_currency(recorded_total - actual_payments)
        if expected_outstanding < Decimal("0.00"):
            expected_outstanding = Decimal("0.00")

        # Discrepancies
        has_payment_mismatch = (actual_payments != recorded_paid)
        has_balance_mismatch = (recorded_outstanding != expected_outstanding)
        has_status_mismatch = (
            (inv.status == "paid" and recorded_outstanding > Decimal("0.00")) or
            (recorded_outstanding == Decimal("0.00") and inv.status != "paid" and actual_payments >= recorded_total)
        )

        if has_payment_mismatch or has_balance_mismatch or has_status_mismatch:
            variance = abs(recorded_outstanding - expected_outstanding)
            if variance == Decimal("0.00") and has_payment_mismatch:
                variance = abs(actual_payments - recorded_paid)
            if variance == Decimal("0.00"):
                variance = Decimal("1.00")

            alert_key = f"PAYMENT_UNRECONCILED:inv_{inv.id}"
            detected_alerts.append({
                "rule_code": "PAYMENT_UNRECONCILED",
                "alert_key": alert_key,
                "title": f"Payment Ledger Discrepancy on Invoice {inv.invoice_number}",
                "description": (
                    f"Invoice {inv.invoice_number} balance does not reconcile with recorded payments."
                ),
                "severity": "high",
                "customer_id": inv.customer_id,
                "subscription_id": inv.subscription_id,
                "invoice_id": inv.id,
                "amount_at_risk": round_currency(variance),
                "evidence": (
                    f"Invoice Total: ₹{recorded_total}. "
                    f"Recorded Paid: ₹{recorded_paid}, Actual Successful Payments: ₹{actual_payments}. "
                    f"Recorded Outstanding: ₹{recorded_outstanding}, Expected Outstanding: ₹{expected_outstanding}. "
                    f"Invoice Status: '{inv.status}'."
                ),
                "recommended_action": (
                    "Trigger balance reconciliation to update invoice.amount_paid and outstanding_balance to match verified payment receipts."
                ),
            })

    # -------------------------------------------------------------
    # RULE 5: Discount applied outside its valid period (DISCOUNT_INVALID_PERIOD)
    # -------------------------------------------------------------
    subscriptions_with_discount = (
        db.query(Subscription)
        .filter(Subscription.discount_rule_id.isnot(None))
        .all()
    )
    for sub in subscriptions_with_discount:
        rule = sub.discount_rule
        if not rule:
            continue
        for inv in sub.invoices:
            if inv.status != "cancelled" and inv.discount_amount > Decimal("0.00"):
                is_invalid = False
                reasons = []
                if rule.start_date and inv.billing_period_start < rule.start_date:
                    is_invalid = True
                    reasons.append(f"Billing start {inv.billing_period_start} is before rule start {rule.start_date}")
                if rule.end_date and inv.billing_period_start > rule.end_date:
                    is_invalid = True
                    reasons.append(f"Billing start {inv.billing_period_start} is after rule expiry {rule.end_date}")
                if not rule.is_active:
                    is_invalid = True
                    reasons.append("Discount rule is deactivated")

                if is_invalid:
                    alert_key = f"DISCOUNT_INVALID_PERIOD:sub_{sub.id}:inv_{inv.id}:rule_{rule.id}"
                    detected_alerts.append({
                        "rule_code": "DISCOUNT_INVALID_PERIOD",
                        "alert_key": alert_key,
                        "title": f"Expired/Invalid Discount Applied: {rule.name}",
                        "description": (
                            f"Invoice {inv.invoice_number} received discount of ₹{inv.discount_amount} "
                            f"under rule '{rule.name}' ({rule.code}) outside its permitted validity parameters."
                        ),
                        "severity": "medium",
                        "customer_id": sub.customer_id,
                        "subscription_id": sub.id,
                        "invoice_id": inv.id,
                        "amount_at_risk": round_currency(Decimal(str(inv.discount_amount))),
                        "evidence": f"Rule validity discrepancy: {'; '.join(reasons)}. Discount applied: ₹{inv.discount_amount}.",
                        "recommended_action": (
                            "Review applied promotion terms. Remove invalid discount from recurring subscription to prevent ongoing revenue leakage."
                        ),
                    })

    # -------------------------------------------------------------
    # RULE 6: Invoice amount mathematically inconsistent with line items (INVOICE_AMOUNT_INCONSISTENCY)
    # -------------------------------------------------------------
    for inv in all_invoices:
        calc_subtotal = Decimal("0.00")
        calc_tax = Decimal("0.00")
        calc_discount = Decimal("0.00")
        for line in inv.lines:
            line_sub = round_currency(Decimal(str(line.unit_price)) * Decimal(str(line.quantity)))
            calc_subtotal += line_sub
            calc_tax += round_currency(Decimal(str(line.tax_amount)))
            calc_discount += round_currency(Decimal(str(line.discount_amount)))

        expected_total = round_currency(
            Decimal(str(inv.subtotal)) - Decimal(str(inv.discount_amount)) + Decimal(str(inv.tax_amount))
        )
        actual_total = round_currency(Decimal(str(inv.total_amount)))

        subtotal_diff = abs(round_currency(Decimal(str(inv.subtotal))) - calc_subtotal)
        total_diff = abs(actual_total - expected_total)

        if subtotal_diff > Decimal("0.05") or total_diff > Decimal("0.05"):
            alert_key = f"INVOICE_AMOUNT_INCONSISTENCY:inv_{inv.id}"
            max_variance = max(subtotal_diff, total_diff)
            detected_alerts.append({
                "rule_code": "INVOICE_AMOUNT_INCONSISTENCY",
                "alert_key": alert_key,
                "title": f"Mathematical Calculation Inconsistency on Invoice {inv.invoice_number}",
                "description": (
                    f"Invoice {inv.invoice_number} totals do not match sum of constituent line items."
                ),
                "severity": "high",
                "customer_id": inv.customer_id,
                "subscription_id": inv.subscription_id,
                "invoice_id": inv.id,
                "amount_at_risk": round_currency(max_variance),
                "evidence": (
                    f"Header Subtotal: ₹{inv.subtotal}, Line Sum Subtotal: ₹{calc_subtotal} (diff: ₹{subtotal_diff}). "
                    f"Header Total: ₹{actual_total}, Expected (Subtotal - Discount + Tax): ₹{expected_total} (diff: ₹{total_diff})."
                ),
                "recommended_action": (
                    "Recalculate invoice line items and regenerate invoice header to ensure tax and subtotal precision."
                ),
            })

    # -------------------------------------------------------------
    # Persist or update alerts in database idempotently
    # -------------------------------------------------------------
    persisted_alerts: List[RevenueLeakageAlert] = []
    for alert_data in detected_alerts:
        existing = (
            db.query(RevenueLeakageAlert)
            .filter(RevenueLeakageAlert.alert_key == alert_data["alert_key"])
            .first()
        )
        if existing:
            if existing.status in ["open", "acknowledged"]:
                existing.amount_at_risk = alert_data["amount_at_risk"]
                existing.evidence = alert_data["evidence"]
                existing.updated_at = datetime.now(timezone.utc)
            persisted_alerts.append(existing)
        else:
            new_alert = RevenueLeakageAlert(
                rule_code=alert_data["rule_code"],
                alert_key=alert_data["alert_key"],
                title=alert_data["title"],
                description=alert_data["description"],
                severity=alert_data["severity"],
                customer_id=alert_data["customer_id"],
                subscription_id=alert_data.get("subscription_id"),
                invoice_id=alert_data.get("invoice_id"),
                amount_at_risk=alert_data["amount_at_risk"],
                evidence=alert_data["evidence"],
                recommended_action=alert_data["recommended_action"],
                status="open",
            )
            db.add(new_alert)
            persisted_alerts.append(new_alert)

    db.commit()
    return persisted_alerts


def list_leakage_alerts(
    db: Session,
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[LeakageAlertResponse]:
    query = db.query(RevenueLeakageAlert)
    if customer_id:
        query = query.filter(RevenueLeakageAlert.customer_id == customer_id)
    if status_filter:
        query = query.filter(RevenueLeakageAlert.status == status_filter)
    if severity_filter:
        query = query.filter(RevenueLeakageAlert.severity == severity_filter)

    alerts = query.order_by(RevenueLeakageAlert.id.desc()).offset(skip).limit(limit).all()

    results: List[LeakageAlertResponse] = []
    for a in alerts:
        results.append(
            LeakageAlertResponse(
                id=a.id,
                rule_code=a.rule_code,
                alert_key=a.alert_key,
                title=a.title,
                description=a.description,
                severity=a.severity,
                customer_id=a.customer_id,
                customer_name=a.customer.name if a.customer else f"Customer #{a.customer_id}",
                subscription_id=a.subscription_id,
                subscription_number=a.subscription.subscription_number if a.subscription else None,
                invoice_id=a.invoice_id,
                invoice_number=a.invoice.invoice_number if a.invoice else None,
                amount_at_risk=Decimal(str(a.amount_at_risk)),
                evidence=a.evidence,
                recommended_action=a.recommended_action,
                status=a.status,
                resolution_notes=a.resolution_notes,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
        )
    return results


def update_leakage_alert_status(
    db: Session,
    alert_id: int,
    payload: LeakageAlertUpdate,
    user_id: Optional[int] = None,
) -> Optional[RevenueLeakageAlert]:
    alert = db.query(RevenueLeakageAlert).filter(RevenueLeakageAlert.id == alert_id).first()
    if not alert:
        return None

    alert.status = payload.status
    if payload.resolution_notes is not None:
        alert.resolution_notes = payload.resolution_notes
    if user_id:
        alert.resolved_by_user_id = user_id
    alert.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(alert)
    return alert


def get_leakage_summary(db: Session, customer_id: Optional[int] = None) -> LeakageSummaryResponse:
    query = db.query(RevenueLeakageAlert)
    if customer_id:
        query = query.filter(RevenueLeakageAlert.customer_id == customer_id)

    all_alerts = query.all()
    open_alerts = [a for a in all_alerts if a.status in ["open", "acknowledged"]]
    resolved_alerts = [a for a in all_alerts if a.status == "resolved"]
    critical_alerts = [a for a in open_alerts if a.severity == "critical"]

    total_at_risk = sum((Decimal(str(a.amount_at_risk)) for a in open_alerts), Decimal("0.00"))

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in open_alerts:
        sev = a.severity.lower()
        if sev in severity_counts:
            severity_counts[sev] += 1

    return LeakageSummaryResponse(
        total_open_alerts=len(open_alerts),
        critical_alerts_count=len(critical_alerts),
        total_amount_at_risk=round_currency(total_at_risk),
        resolved_alerts_count=len(resolved_alerts),
        alerts_by_severity=severity_counts,
    )
