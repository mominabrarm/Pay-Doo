from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.discount import DiscountRule
from app.schemas.discount import DiscountRuleCreate, DiscountRuleResponse

router = APIRouter(prefix="/discounts", tags=["Discounts"])


@router.post("", response_model=DiscountRuleResponse, status_code=status.HTTP_201_CREATED)
def create_discount(payload: DiscountRuleCreate, db: Session = Depends(get_db)):
    existing = db.query(DiscountRule).filter(DiscountRule.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discount rule with code '{payload.code}' already exists.",
        )

    discount = DiscountRule(**payload.model_dump())
    db.add(discount)
    db.commit()
    db.refresh(discount)
    return discount


@router.get("", response_model=List[DiscountRuleResponse])
def list_discounts(db: Session = Depends(get_db)):
    return db.query(DiscountRule).filter(DiscountRule.is_active == True).order_by(DiscountRule.id.asc()).all()


@router.get("/{discount_id}", response_model=DiscountRuleResponse)
def get_discount(discount_id: int, db: Session = Depends(get_db)):
    discount = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found.")
    return discount

