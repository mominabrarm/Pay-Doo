from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

BillingInterval = Literal["daily", "weekly", "monthly", "yearly"]


class SubscriptionPlanBase(BaseModel):
    name: str
    code: str
    billing_interval: BillingInterval
    price: Decimal = Field(ge=Decimal("0.00"))
    min_quantity: int = Field(default=1, ge=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    auto_close: bool = False
    allow_pause: bool = True
    allow_renewal: bool = True


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
