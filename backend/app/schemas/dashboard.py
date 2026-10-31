from decimal import Decimal
from typing import Dict, List, Any
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    active_subscriptions_count: int
    total_revenue_collected: Decimal
    total_outstanding_receivables: Decimal
    overdue_invoices_count: int
    overdue_invoices_amount: Decimal
    subscriptions_by_interval: Dict[str, int]
    recent_activity: List[Dict[str, Any]]
