from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class RevenueLeakageAlert(Base, TimestampMixin):
    __tablename__ = "revenue_leakage_alerts"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), nullable=False, index=True)
    alert_key = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="medium", nullable=False, index=True)  # critical, high, medium, low
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    amount_at_risk = Column(Numeric(12, 2), default=0.00, nullable=False)
    evidence = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(30), default="open", nullable=False, index=True)  # open, acknowledged, resolved, false_positive
    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    customer = relationship("Customer")
    subscription = relationship("Subscription")
    invoice = relationship("Invoice")
    resolved_by = relationship("User")

