from datetime import date
from decimal import Decimal
from typing import Dict, List, Any, Optional
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    active_subscriptions_count: int
    total_revenue_collected: Decimal
    total_outstanding_receivables: Decimal
    overdue_invoices_count: int
    overdue_invoices_amount: Decimal
    subscriptions_by_interval: Dict[str, int]
    recent_activity: List[Dict[str, Any]]


class CustomerInvoiceItem(BaseModel):
    id: int
    invoice_number: str
    issue_date: date
    due_date: date
    status: str
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal


class CustomerPaymentItem(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    amount: Decimal
    payment_method: str
    payment_date: date


class CustomerDashboardResponse(BaseModel):
    customer_id: int
    customer_name: str
    active_subscriptions_count: int
    total_paid: Decimal
    outstanding_balance: Decimal
    invoices_count: int
    next_billing_date: Optional[date] = None
    recent_invoices: List[CustomerInvoiceItem] = []
    recent_payments: List[CustomerPaymentItem] = []
