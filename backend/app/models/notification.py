from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class NotificationLog(Base, TimestampMixin):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, index=True)

    channel = Column(String(30), nullable=False)  # "email", "whatsapp"
    notification_type = Column(String(50), nullable=False)  # "invoice_created", "payment_confirmation", "due_date_reminder", "manual_resend"
    provider = Column(String(50), default="mock", nullable=False)  # "resend", "twilio", "system"
    recipient = Column(String(255), nullable=False)  # email address or normalized phone number
    subject = Column(String(255), nullable=True)  # email subject line or WhatsApp headline
    message_preview = Column(Text, nullable=True)  # sanitized preview without secrets or tokens
    provider_message_id = Column(String(255), nullable=True, index=True)  # Provider-assigned message ID
    status = Column(String(30), default="pending", nullable=False, index=True)  # "pending", "sent", "delivered", "failed", "skipped_no_credentials", "skipped_preference"
    attempt_count = Column(Integer, default=1, nullable=False)
    error_message = Column(Text, nullable=True)  # safe, sanitized error message
    idempotency_key = Column(String(255), unique=True, nullable=True, index=True)

    customer = relationship("Customer", back_populates="notifications")
    invoice = relationship("Invoice", back_populates="notifications")
    payment = relationship("Payment")

