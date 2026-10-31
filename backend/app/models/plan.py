from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    billing_interval = Column(String(20), nullable=False)  # daily, weekly, monthly, yearly
    price = Column(Numeric(12, 2), nullable=False)
    min_quantity = Column(Integer, default=1, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    auto_close = Column(Boolean, default=False, nullable=False)
    allow_pause = Column(Boolean, default=True, nullable=False)
    allow_renewal = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    subscriptions = relationship("Subscription", back_populates="plan")

