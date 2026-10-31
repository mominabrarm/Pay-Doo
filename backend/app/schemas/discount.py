from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

DiscountType = Literal["percentage", "fixed"]
TargetType = Literal["whole_subscription", "specific_product"]


class DiscountRuleBase(BaseModel):
    name: str
    code: str
    discount_type: DiscountType
    value: Decimal = Field(ge=Decimal("0.00"))
    min_purchase_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    min_quantity: int = Field(default=0, ge=0)
    max_uses: Optional[int] = Field(default=None, ge=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_type: TargetType = "whole_subscription"
    product_id: Optional[int] = None


class DiscountRuleCreate(DiscountRuleBase):
    pass


class DiscountRuleResponse(DiscountRuleBase):
    id: int
    current_uses: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

