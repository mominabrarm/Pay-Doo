from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# ==========================================
# 1. Revenue Leakage Schemas (PROTECT)
# ==========================================

class LeakageAlertResponse(BaseModel):
    id: int
    rule_code: str
    alert_key: str
    title: str
    description: str
    severity: str
    customer_id: int
    customer_name: Optional[str] = None
    subscription_id: Optional[int] = None
    subscription_number: Optional[str] = None
    invoice_id: Optional[int] = None
    invoice_number: Optional[str] = None
    amount_at_risk: Decimal
    evidence: str
    recommended_action: str
    status: str
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeakageAlertUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|acknowledged|resolved|false_positive)$")
    resolution_notes: Optional[str] = None


class LeakageSummaryResponse(BaseModel):
    total_open_alerts: int
    critical_alerts_count: int
    total_amount_at_risk: Decimal
    resolved_alerts_count: int
    alerts_by_severity: Dict[str, int]


# ==========================================
# 2. Subscription Impact Simulator (PREDICT)
# ==========================================

class PlanSimulatorOption(BaseModel):
    id: int
    name: str
    code: str
    current_price: Decimal
    billing_interval: str
    active_subscribers_count: int
    current_monthly_revenue: Decimal
    current_annualized_revenue: Decimal


class SimulatorRequest(BaseModel):
    plan_id: Optional[int] = None
    proposed_price: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = Decimal("0.00")
    billing_interval: Optional[str] = None
    target_customer_count: Optional[int] = None


class SimulatorResponse(BaseModel):
    plan_id: Optional[int] = None
    plan_name: Optional[str] = None
    billing_interval: str
    current_price: Decimal
    proposed_price: Decimal
    discount_percentage: Decimal
    effective_proposed_price: Decimal
    affected_subscriptions_count: int
    current_monthly_revenue: Decimal
    proposed_monthly_revenue: Decimal
    monthly_difference: Decimal
    current_annualized_revenue: Decimal
    proposed_annualized_revenue: Decimal
    annualized_difference: Decimal
    percentage_change: Decimal
    is_positive_impact: bool
    disclaimer: str


# ==========================================
# 3. Billing Explainability (EXPLAIN)
# ==========================================

class InvoiceLineExplanation(BaseModel):
    id: int
    description: str
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    subtotal: Decimal
    total_amount: Decimal


class InvoiceComparisonItem(BaseModel):
    metric_name: str
    current_value: Decimal
    previous_value: Decimal
    difference: Decimal
    percentage_change: Optional[Decimal] = None
    explanation: str


class InvoiceExplanationResponse(BaseModel):
    invoice_id: int
    invoice_number: str
    customer_id: int
    customer_name: str
    subscription_id: int
    subscription_number: str
    plan_name: str
    billing_interval: str
    billing_period_start: date
    billing_period_end: date
    billing_period_days: int
    issue_date: date
    due_date: date
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    lines: List[InvoiceLineExplanation]
    payments: List[Dict[str, Any]]
    friendly_summary: str
    has_previous_invoice: bool
    previous_invoice_id: Optional[int] = None
    previous_invoice_number: Optional[str] = None
    previous_invoice_total: Optional[Decimal] = None
    comparison_metrics: List[InvoiceComparisonItem] = []
    comparison_summary: Optional[str] = None
