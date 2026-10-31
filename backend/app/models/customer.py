from sqlalchemy import Column, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    notify_email = Column(Boolean, default=True, nullable=False)
    notify_whatsapp = Column(Boolean, default=True, nullable=False)
    whatsapp_number = Column(String(50), nullable=True)

    subscriptions = relationship("Subscription", back_populates="customer", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    notifications = relationship("NotificationLog", back_populates="customer", cascade="all, delete-orphan")

