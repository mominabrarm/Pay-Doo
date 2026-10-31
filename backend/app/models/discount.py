from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class DiscountRule(Base, TimestampMixin):
    __tablename__ = "discount_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)  # percentage, fixed
    value = Column(Numeric(12, 2), nullable=False)
    min_purchase_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    min_quantity = Column(Integer, default=0, nullable=False)
    max_uses = Column(Integer, nullable=True)
    current_uses = Column(Integer, default=0, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    target_type = Column(String(50), default="whole_subscription", nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    product = relationship("Product")
