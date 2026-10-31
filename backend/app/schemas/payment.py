from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

PaymentMethod = Literal["bank_transfer", "credit_card", "upi", "cash"]


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_method: PaymentMethod
    payment_date: date
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    payment_id: int
    payment_number: str
    invoice_id: int
    amount: Decimal
    payment_method: str
    payment_date: date
    notes: Optional[str]
    status: str
    invoice_status: str
    invoice_amount_paid: Decimal
    invoice_outstanding_balance: Decimal

    model_config = ConfigDict(from_attributes=True)

