from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.customer import CustomerResponse
from app.schemas.plan import SubscriptionPlanResponse

SubscriptionStatus = Literal["draft", "quotation", "confirmed", "active", "closed", "paused"]


class SubscriptionLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(ge=Decimal("0.00"))
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class SubscriptionLineResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    discount_rule_id: Optional[int] = None
    start_date: date
    expiry_date: Optional[date] = None
    payment_terms: str = "Immediate"
    lines: List[SubscriptionLineCreate]


class SubscriptionStatusUpdate(BaseModel):
    status: SubscriptionStatus


class SubscriptionResponse(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    plan_id: int
    discount_rule_id: Optional[int] = None
    status: str
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: date
    payment_terms: str
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerResponse] = None
    plan: Optional[SubscriptionPlanResponse] = None
    lines: List[SubscriptionLineResponse] = []

    model_config = ConfigDict(from_attributes=True)

