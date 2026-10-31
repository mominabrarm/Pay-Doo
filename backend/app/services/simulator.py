from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.plan import SubscriptionPlan
from app.models.subscription import Subscription
from app.schemas.intelligence import (
    SimulatorRequest,
    SimulatorResponse,
    PlanSimulatorOption,
)
from app.services.billing import round_currency


INTERVAL_MONTHLY_FACTORS = {
    "monthly": Decimal("1.00"),
    "yearly": Decimal("1.00") / Decimal("12.00"),
    "weekly": Decimal("52.00") / Decimal("12.00"),
    "daily": Decimal("365.00") / Decimal("12.00"),
}

INTERVAL_ANNUAL_FACTORS = {
    "monthly": Decimal("12.00"),
    "yearly": Decimal("1.00"),
    "weekly": Decimal("52.00"),
    "daily": Decimal("365.00"),
}


def get_simulator_plan_options(db: Session) -> List[PlanSimulatorOption]:
    plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()
    options: List[PlanSimulatorOption] = []

    for p in plans:
        sub_count = (
            db.query(func.count(Subscription.id))
            .filter(
                Subscription.plan_id == p.id,
                Subscription.status.in_(["active", "confirmed"]),
            )
            .scalar()
            or 0
        )
        interval = p.billing_interval.lower()
        m_factor = INTERVAL_MONTHLY_FACTORS.get(interval, Decimal("1.00"))
        a_factor = INTERVAL_ANNUAL_FACTORS.get(interval, Decimal("12.00"))

        base_price = Decimal(str(p.price))
        m_rev = round_currency(base_price * Decimal(str(sub_count)) * m_factor)
        a_rev = round_currency(base_price * Decimal(str(sub_count)) * a_factor)

        options.append(
            PlanSimulatorOption(
                id=p.id,
                name=p.name,
                code=p.code,
                current_price=base_price,
                billing_interval=p.billing_interval,
                active_subscribers_count=sub_count,
                current_monthly_revenue=m_rev,
                current_annualized_revenue=a_rev,
            )
        )
    return options


def run_scenario_simulation(db: Session, req: SimulatorRequest) -> SimulatorResponse:
    plan: Optional[SubscriptionPlan] = None
    if req.plan_id:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == req.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription plan #{req.plan_id} not found.",
            )

    # 1. Determine baseline parameters
    if plan:
        plan_name = plan.name
        current_price = Decimal(str(plan.price))
        billing_interval = (req.billing_interval or plan.billing_interval).lower()
        actual_active = (
            db.query(func.count(Subscription.id))
            .filter(
                Subscription.plan_id == plan.id,
                Subscription.status.in_(["active", "confirmed"]),
            )
            .scalar()
            or 0
        )
    else:
        plan_name = "Custom Portfolio Scenario"
        current_price = req.proposed_price if req.proposed_price is not None else Decimal("1000.00")
        billing_interval = (req.billing_interval or "monthly").lower()
        actual_active = (
            db.query(func.count(Subscription.id))
            .filter(Subscription.status.in_(["active", "confirmed"]))
            .scalar()
            or 0
        )

    # 2. Determine affected count
    if req.target_customer_count is not None and req.target_customer_count >= 0:
        affected_count = req.target_customer_count
    else:
        affected_count = actual_active if actual_active > 0 else 1

    # 3. Determine proposed price & discount
    if req.proposed_price is not None:
        proposed_price = round_currency(req.proposed_price)
    else:
        proposed_price = current_price

    discount_pct = req.discount_percentage if req.discount_percentage is not None else Decimal("0.00")
    if discount_pct < Decimal("0.00"):
        discount_pct = Decimal("0.00")
    elif discount_pct > Decimal("100.00"):
        discount_pct = Decimal("100.00")

    effective_price = round_currency(
        proposed_price * (Decimal("1.00") - (discount_pct / Decimal("100.00")))
    )

    # 4. Normalization factors
    m_factor = INTERVAL_MONTHLY_FACTORS.get(billing_interval, Decimal("1.00"))
    a_factor = INTERVAL_ANNUAL_FACTORS.get(billing_interval, Decimal("12.00"))

    # 5. Financial Projections
    current_m_rev = round_currency(current_price * Decimal(str(affected_count)) * m_factor)
    proposed_m_rev = round_currency(effective_price * Decimal(str(affected_count)) * m_factor)
    monthly_diff = proposed_m_rev - current_m_rev

    current_a_rev = round_currency(current_price * Decimal(str(affected_count)) * a_factor)
    proposed_a_rev = round_currency(effective_price * Decimal(str(affected_count)) * a_factor)
    annual_diff = proposed_a_rev - current_a_rev

    if current_m_rev > Decimal("0.00"):
        pct_change = round_currency((monthly_diff / current_m_rev) * Decimal("100.00"))
    else:
        pct_change = Decimal("100.00") if proposed_m_rev > Decimal("0.00") else Decimal("0.00")

    return SimulatorResponse(
        plan_id=plan.id if plan else None,
        plan_name=plan_name,
        billing_interval=billing_interval,
        current_price=current_price,
        proposed_price=proposed_price,
        discount_percentage=discount_pct,
        effective_proposed_price=effective_price,
        affected_subscriptions_count=affected_count,
        current_monthly_revenue=current_m_rev,
        proposed_monthly_revenue=proposed_m_rev,
        monthly_difference=monthly_diff,
        current_annualized_revenue=current_a_rev,
        proposed_annualized_revenue=proposed_a_rev,
        annualized_difference=annual_diff,
        percentage_change=pct_change,
        is_positive_impact=monthly_diff >= Decimal("0.00"),
        disclaimer=(
            "Scenario simulation only. This calculation uses Python Decimal precision against "
            "persisted plan intervals and does not modify production subscriptions, plan rates, or billing records."
        ),
    )

