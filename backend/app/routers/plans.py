from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.plan import SubscriptionPlan
from app.schemas.plan import SubscriptionPlanCreate, SubscriptionPlanResponse

router = APIRouter(prefix="/plans", tags=["Subscription Plans"])


@router.post("", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(payload: SubscriptionPlanCreate, db: Session = Depends(get_db)):
    existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan with code '{payload.code}' already exists.",
        )

    plan = SubscriptionPlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=List[SubscriptionPlanResponse])
def list_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).order_by(SubscriptionPlan.id.asc()).all()


@router.get("/{plan_id}", response_model=SubscriptionPlanResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")
    return plan

