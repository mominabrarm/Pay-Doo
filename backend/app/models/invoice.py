from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    status = Column(String(30), default="confirmed", nullable=False, index=True)  # draft, confirmed, paid, cancelled
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=0.00, nullable=False)
    outstanding_balance = Column(Numeric(12, 2), nullable=False)

    __table_args__ = (
        UniqueConstraint("subscription_id", "billing_period_start", "billing_period_end", name="uq_subscription_billing_period"),
    )

    subscription = relationship("Subscription", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base, TimestampMixin):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
