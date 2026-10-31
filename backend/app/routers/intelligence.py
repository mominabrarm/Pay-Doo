from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.intelligence import (
    LeakageAlertResponse,
    LeakageAlertUpdate,
    LeakageSummaryResponse,
    PlanSimulatorOption,
    SimulatorRequest,
    SimulatorResponse,
    InvoiceExplanationResponse,
)
from app.services.auth import (
    get_current_user,
    get_optional_current_user,
    require_roles,
)
from app.services.leakage import (
    scan_revenue_leakage,
    list_leakage_alerts,
    update_leakage_alert_status,
    get_leakage_summary,
)
from app.services.simulator import (
    get_simulator_plan_options,
    run_scenario_simulation,
)
from app.services.explain import explain_invoice_bill

router = APIRouter(prefix="/intelligence", tags=["Financial Intelligence"])


# -------------------------------------------------------------
# 1. REVENUE LEAKAGE DETECTION (PROTECT)
# -------------------------------------------------------------

@router.get("/alerts", response_model=List[LeakageAlertResponse])
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity_filter: Optional[str] = Query(None, alias="severity"),
    customer_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Revenue leakage detection is an administrative tool.",
        )

    return list_leakage_alerts(
        db=db,
        customer_id=customer_id,
        status_filter=status_filter,
        severity_filter=severity_filter,
        skip=skip,
        limit=limit,
    )


@router.post("/alerts/scan", response_model=List[LeakageAlertResponse])
def trigger_leakage_scan(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers cannot trigger system-wide revenue scans.",
        )

    scan_revenue_leakage(db)
    return list_leakage_alerts(db=db)


@router.patch("/alerts/{alert_id}", response_model=LeakageAlertResponse)
def update_alert(
    alert_id: int,
    payload: LeakageAlertUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers cannot update alert management status.",
        )

    user_id = current_user.id if current_user else None
    updated = update_leakage_alert_status(db, alert_id, payload, user_id=user_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revenue leakage alert #{alert_id} not found.",
        )

    alerts = list_leakage_alerts(db=db)
    for a in alerts:
        if a.id == alert_id:
            return a
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")


@router.get("/alerts/summary", response_model=LeakageSummaryResponse)
def get_alerts_summary(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Revenue leakage detection is an administrative tool.",
        )

    return get_leakage_summary(db=db, customer_id=None)


# -------------------------------------------------------------
# 2. SUBSCRIPTION IMPACT SIMULATOR (PREDICT)
# -------------------------------------------------------------

@router.get("/simulator/plans", response_model=List[PlanSimulatorOption])
def list_simulator_plans(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers cannot access pricing simulation tools.",
        )
    return get_simulator_plan_options(db)


@router.post("/simulator/calculate", response_model=SimulatorResponse)
def calculate_simulation(
    payload: SimulatorRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if current_user and current_user.role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Customers cannot execute financial projections.",
        )
    return run_scenario_simulation(db, payload)


# -------------------------------------------------------------
# 3. BILLING EXPLAINABILITY (EXPLAIN)
# -------------------------------------------------------------

@router.get("/invoices/{invoice_id}/explain", response_model=InvoiceExplanationResponse)
def explain_invoice(
    invoice_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    req_customer_id = None
    if current_user and current_user.role == "customer":
        req_customer_id = current_user.customer_id

    return explain_invoice_bill(db, invoice_id, requesting_customer_id=req_customer_id)

