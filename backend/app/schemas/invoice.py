from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict

InvoiceStatus = Literal["draft", "confirmed", "paid", "cancelled"]


class InvoiceGenerateRequest(BaseModel):
    billing_period_start: date
    billing_period_end: date
    due_date: date


class InvoiceLineResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    description: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal = Decimal("0.00")
    tax_rate: Decimal
    tax_amount: Decimal
    subtotal: Decimal
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    billing_period_start: date
    billing_period_end: date
    issue_date: date
    due_date: date
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    created_at: datetime
    updated_at: datetime
    lines: List[InvoiceLineResponse] = []

    model_config = ConfigDict(from_attributes=True)
