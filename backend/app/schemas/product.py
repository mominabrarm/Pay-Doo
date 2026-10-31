from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ProductVariantBase(BaseModel):
    variant_name: str
    sku: str
    price_extra: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str
    code: str
    product_type: str = "software"
    sales_price: Decimal = Field(ge=Decimal("0.00"))
    cost_price: Decimal = Field(ge=Decimal("0.00"))
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    variants: List[ProductVariantResponse] = []

    model_config = ConfigDict(from_attributes=True)
